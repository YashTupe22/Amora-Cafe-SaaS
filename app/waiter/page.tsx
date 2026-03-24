'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/appStore';
import { generateOrderNumber } from '@/lib/waiterUtils';
import { MENU_CATEGORIES } from '@/lib/mockData';
import type { MenuCategory, CatalogueItem, Order, OrderItem } from '@/lib/mockData';
import { doc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface WaiterSession {
  id: string;
  name: string;
  code: string;
  loginTime: string;
}

export default function WaiterOrderPage() {
  const router = useRouter();
  const { data, profile, session: appSession } = useAppStore();
  const [session, setSession] = useState<WaiterSession | null>(null);
  const [mounted, setMounted] = useState(false);

  // Order state
  const [selectedItems, setSelectedItems] = useState<Map<string, { item: CatalogueItem; quantity: number }>>(new Map());
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<MenuCategory | 'All'>('All');
  const [showOrderSidebar, setShowOrderSidebar] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');

  const uidRef = useRef<string | null>(null);

  // Session check
  useEffect(() => {
    setMounted(true);
    const sessionData = sessionStorage.getItem('waiter-session');
    
    if (!sessionData) {
      router.push('/waiter-login');
      return;
    }

    try {
      const parsed = JSON.parse(sessionData);
      setSession(parsed);
    } catch {
      router.push('/waiter-login');
    }
  }, [router]);

  // Get UID ref
  useEffect(() => {
    if (appSession?.uid) {
      uidRef.current = appSession.uid;
    }
  }, [appSession]);

  // Filter catalogue
  const filteredCatalogue = useMemo(() => {
    let items = data.catalogue.filter(item => item.available);
    
    // Category filter
    if (filterCategory !== 'All') {
      items = items.filter(item => item.category === filterCategory);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [data.catalogue, filterCategory, searchQuery]);

  // Group by category
  const groupedCatalogue = useMemo(() => {
    const map = new Map<MenuCategory, CatalogueItem[]>();
    MENU_CATEGORIES.forEach(cat => map.set(cat, []));
    filteredCatalogue.forEach(item => {
      const arr = map.get(item.category);
      if (arr) arr.push(item);
    });
    return map;
  }, [filteredCatalogue]);

  // Calculate totals
  const orderSummary = useMemo(() => {
    let subtotal = 0;
    selectedItems.forEach(({ item, quantity }) => {
      subtotal += item.price * quantity;
    });
    return { subtotal, itemCount: selectedItems.size };
  }, [selectedItems]);

  // Add item to order
  const addToOrder = useCallback((item: CatalogueItem) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(item.id);
      if (existing) {
        newMap.set(item.id, { item, quantity: existing.quantity + 1 });
      } else {
        newMap.set(item.id, { item, quantity: 1 });
      }
      return newMap;
    });
  }, []);

  // Update quantity
  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(itemId);
      if (!existing) return prev;
      
      const newQuantity = existing.quantity + delta;
      if (newQuantity <= 0) {
        newMap.delete(itemId);
      } else {
        newMap.set(itemId, { ...existing, quantity: newQuantity });
      }
      return newMap;
    });
  }, []);

  // Remove item
  const removeItem = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  }, []);

  // Clear order
  const clearOrder = useCallback(() => {
    setSelectedItems(new Map());
    setTableNumber('');
    setNotes('');
  }, []);

  // Place order
  const placeOrder = useCallback(async () => {
    if (!session || selectedItems.size === 0 || !tableNumber.trim()) return;
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);

    try {
      const uid = uidRef.current;
      if (!uid) throw new Error('User not authenticated');
      if (!db) throw new Error('Database not available');

      // Get order count from Firestore
      const ordersCol = collection(db, 'users', uid, 'orders');
      const ordersQuery = query(ordersCol, orderBy('createdAt', 'desc'), limit(1));
      const snapshot = await getDocs(ordersQuery);
      
      let orderCount = 0;
      if (!snapshot.empty) {
        const lastOrder = snapshot.docs[0].data();
        if (lastOrder.orderNo) {
          const match = lastOrder.orderNo.match(/ORD-(\d+)/);
          if (match) {
            orderCount = parseInt(match[1], 10);
          }
        }
      }
      
      const orderNo = generateOrderNumber(orderCount);
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build order items
      const orderItems: OrderItem[] = Array.from(selectedItems.values()).map(({ item, quantity }) => ({
        itemId: item.id,
        name: item.name,
        quantity,
        price: item.price,
        category: item.category,
      }));

      // Create order object
      const order: Order = {
        id: orderId,
        orderNo,
        waiterId: session.id,
        waiterName: session.name,
        waiterCode: session.code,
        tableNumber: tableNumber.trim(),
        items: orderItems,
        status: 'placed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      // Save to Firestore
      await setDoc(doc(ordersCol, orderId), {
        orderNo: order.orderNo,
        waiterId: order.waiterId,
        waiterName: order.waiterName,
        waiterCode: order.waiterCode,
        tableNumber: order.tableNumber,
        items: order.items,
        status: order.status,
        notes: order.notes ?? '',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      });

      // Show success
      setLastOrderNumber(orderNo);
      setShowSuccessModal(true);
      
      // Clear form
      clearOrder();
      setShowOrderSidebar(false);

    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  }, [session, selectedItems, tableNumber, notes, isPlacingOrder, profile, clearOrder]);

  // Handle logout
  const handleLogout = useCallback(() => {
    if (!adminPassword.trim()) {
      setPasswordError('Password required');
      return;
    }

    // Check against stored admin password in profile
    const storedAdminPassword = profile?.adminPassword;
    
    if (storedAdminPassword && adminPassword === storedAdminPassword) {
      sessionStorage.removeItem('waiter-session');
      router.push('/waiter-login');
    } else if (!storedAdminPassword && adminPassword === 'admin123') {
      // Fallback: If admin password not set, use default
      sessionStorage.removeItem('waiter-session');
      router.push('/waiter-login');
    } else {
      setPasswordError('Incorrect admin password');
    }
  }, [adminPassword, router, profile]);

  if (!mounted || !session) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      paddingBottom: 80,
    }}>
      {/* Top Bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(15,23,42,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(148,163,184,0.1)',
        padding: '16px 20px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div>
            <h1 style={{
              fontSize: 18,
              fontWeight: 700,
              margin: 0,
              marginBottom: 2,
              color: 'white',
            }}>
              {session.name}
            </h1>
            <p style={{
              fontSize: 12,
              color: '#94a3b8',
              margin: 0,
            }}>
              Waiter Code: {session.code}
            </p>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '20px' }}>
        {/* Search & Filters */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              borderRadius: 10,
              background: 'rgba(30,41,59,0.5)',
              border: '1px solid rgba(148,163,184,0.2)',
              color: 'white',
              outline: 'none',
              marginBottom: 12,
            }}
          />

          {/* Category Pills */}
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            overflowX: 'auto',
            paddingBottom: 4,
          }}>
            {(['All', ...MENU_CATEGORIES] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat as MenuCategory | 'All')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: filterCategory === cat ? 'rgba(249,115,22,0.2)' : 'rgba(30,41,59,0.5)',
                  border: `1px solid ${filterCategory === cat ? 'rgba(249,115,22,0.4)' : 'rgba(148,163,184,0.2)'}`,
                  color: filterCategory === cat ? '#fb923c' : '#94a3b8',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items by Category */}
        {MENU_CATEGORIES.map(category => {
          const items = groupedCatalogue.get(category) ?? [];
          if (items.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: 24 }}>
              <h2 style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#f97316',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '2px solid rgba(249,115,22,0.2)',
              }}>
                {category}
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12,
              }}>
                {items.map(item => {
                  const inOrder = selectedItems.get(item.id);
                  const quantity = inOrder?.quantity ?? 0;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'rgba(30,41,59,0.5)',
                        backdropFilter: 'blur(10px)',
                        border: quantity > 0 
                          ? '1px solid rgba(249,115,22,0.4)' 
                          : '1px solid rgba(148,163,184,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => addToOrder(item)}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 8,
                      }}>
                        <h3 style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'white',
                          margin: 0,
                          flex: 1,
                        }}>
                          {item.name}
                        </h3>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#fb923c',
                          marginLeft: 8,
                        }}>
                          ₹{item.price}
                        </span>
                      </div>

                      {item.description && (
                        <p style={{
                          fontSize: 12,
                          color: '#94a3b8',
                          margin: 0,
                          marginBottom: 12,
                        }}>
                          {item.description}
                        </p>
                      )}

                      {quantity > 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: 'rgba(249,115,22,0.2)',
                              border: '1px solid rgba(249,115,22,0.3)',
                              color: '#fb923c',
                              cursor: 'pointer',
                              fontSize: 16,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            −
                          </button>
                          <span style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#fb923c',
                            minWidth: 24,
                            textAlign: 'center',
                          }}>
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: 'rgba(249,115,22,0.2)',
                              border: '1px solid rgba(249,115,22,0.3)',
                              color: '#fb923c',
                              cursor: 'pointer',
                              fontSize: 16,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, #f97316, #ea580c)',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Add to Order
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredCatalogue.length === 0 && (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: '#64748b',
          }}>
            <p style={{ fontSize: 14 }}>No items found</p>
          </div>
        )}
      </div>

      {/* Floating Order Button */}
      {selectedItems.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          right: 20,
          zIndex: 200,
        }}>
          <button
            onClick={() => setShowOrderSidebar(true)}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(249,115,22,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>View Order ({orderSummary.itemCount} items)</span>
            <span>₹{orderSummary.subtotal.toLocaleString('en-IN')}</span>
          </button>
        </div>
      )}

      {/* Order Sidebar */}
      {showOrderSidebar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setShowOrderSidebar(false)}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '80vh',
              background: 'rgba(15,23,42,0.98)',
              backdropFilter: 'blur(20px)',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              border: '1px solid rgba(148,163,184,0.2)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              overflowY: 'auto',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <h2 style={{
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                color: 'white',
              }}>
                Your Order
              </h2>
              <button
                onClick={() => setShowOrderSidebar(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(71,85,105,0.3)',
                  border: '1px solid rgba(71,85,105,0.4)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            {/* Order Items */}
            <div style={{ marginBottom: 20 }}>
              {Array.from(selectedItems.values()).map(({ item, quantity }) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(30,41,59,0.5)',
                    border: '1px solid rgba(148,163,184,0.1)',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'white',
                      margin: 0,
                      marginBottom: 2,
                    }}>
                      {item.name}
                    </h4>
                    <p style={{
                      fontSize: 12,
                      color: '#94a3b8',
                      margin: 0,
                    }}>
                      ₹{item.price} × {quantity}
                    </p>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: 'rgba(249,115,22,0.2)',
                        border: '1px solid rgba(249,115,22,0.3)',
                        color: '#fb923c',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      −
                    </button>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'white',
                      minWidth: 20,
                      textAlign: 'center',
                    }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: 'rgba(249,115,22,0.2)',
                        border: '1px solid rgba(249,115,22,0.3)',
                        color: '#fb923c',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      +
                    </button>
                  </div>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fb923c',
                    minWidth: 60,
                    textAlign: 'right',
                  }}>
                    ₹{(item.price * quantity).toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>

            {/* Table Number */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#94a3b8',
                marginBottom: 6,
              }}>
                Table Number *
              </label>
              <input
                type="text"
                placeholder="e.g., T-3"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 14,
                  borderRadius: 10,
                  background: 'rgba(30,41,59,0.5)',
                  border: '1px solid rgba(148,163,184,0.2)',
                  color: 'white',
                  outline: 'none',
                }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#94a3b8',
                marginBottom: 6,
              }}>
                Special Instructions (Optional)
              </label>
              <textarea
                placeholder="Any special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 14,
                  borderRadius: 10,
                  background: 'rgba(30,41,59,0.5)',
                  border: '1px solid rgba(148,163,184,0.2)',
                  color: 'white',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Total */}
            <div style={{
              padding: 16,
              borderRadius: 10,
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.2)',
              marginBottom: 16,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#94a3b8',
                }}>
                  Total Amount
                </span>
                <span style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fb923c',
                }}>
                  ₹{orderSummary.subtotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={clearOrder}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: 10,
                  background: 'rgba(71,85,105,0.3)',
                  border: '1px solid rgba(71,85,105,0.4)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Clear All
              </button>
              <button
                onClick={placeOrder}
                disabled={!tableNumber.trim() || isPlacingOrder}
                style={{
                  flex: 2,
                  padding: '14px 20px',
                  borderRadius: 10,
                  background: !tableNumber.trim() || isPlacingOrder
                    ? 'rgba(71,85,105,0.3)'
                    : 'linear-gradient(135deg, #f97316, #ea580c)',
                  border: 'none',
                  color: 'white',
                  cursor: !tableNumber.trim() || isPlacingOrder ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  opacity: !tableNumber.trim() || isPlacingOrder ? 0.5 : 1,
                }}
              >
                {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => {
            setShowLogoutModal(false);
            setAdminPassword('');
            setPasswordError('');
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              padding: 32,
              borderRadius: 16,
              background: 'rgba(30,41,59,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(148,163,184,0.2)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              marginBottom: 8,
            }}>
              Admin Password Required
            </h2>
            <p style={{
              fontSize: 13,
              color: '#94a3b8',
              marginBottom: 20,
            }}>
              Enter admin password to logout.
            </p>

            <input
              type="password"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="Admin password"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 14,
                borderRadius: 10,
                background: 'rgba(15,23,42,0.5)',
                border: passwordError ? '1px solid #ef4444' : '1px solid rgba(148,163,184,0.2)',
                color: 'white',
                outline: 'none',
                marginBottom: 12,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogout();
              }}
            />

            {passwordError && (
              <p style={{
                marginBottom: 16,
                fontSize: 12,
                color: '#ef4444',
              }}>
                {passwordError}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  setAdminPassword('');
                  setPasswordError('');
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'rgba(71,85,105,0.3)',
                  border: '1px solid rgba(71,85,105,0.4)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              padding: 32,
              borderRadius: 16,
              background: 'rgba(30,41,59,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(148,163,184,0.2)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 60,
              height: 60,
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}>
              ✓
            </div>

            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              marginBottom: 8,
            }}>
              Order Placed Successfully!
            </h2>
            <p style={{
              fontSize: 14,
              color: '#94a3b8',
              marginBottom: 8,
            }}>
              Order Number: <span style={{ color: '#fb923c', fontWeight: 700 }}>{lastOrderNumber}</span>
            </p>
            <p style={{
              fontSize: 13,
              color: '#64748b',
              marginBottom: 24,
            }}>
              The kitchen has been notified.
            </p>

            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
              }}
            >
              Take Another Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
