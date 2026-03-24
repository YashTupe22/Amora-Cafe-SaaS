'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/appStore';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import type { Order, OrderStatus } from '@/lib/mockData';

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getTimeSince(timestamp: Date | string): string {
  const now = Date.now();
  const orderTime = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
  const diffMs = now - orderTime;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  return `${diffMins} min ago`;
}

function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'placed':
      return 'bg-amber-500'; // Yellow
    case 'preparing':
      return 'bg-blue-500'; // Blue
    case 'ready':
      return 'bg-green-500'; // Green
    case 'served':
      return 'bg-gray-500'; // Gray (shouldn't show)
    case 'cancelled':
      return 'bg-red-500'; // Red (shouldn't show)
    default:
      return 'bg-gray-500';
  }
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'placed':
      return '🟡 NEW ORDER';
    case 'preparing':
      return '🔵 COOKING';
    case 'ready':
      return '🟢 READY';
    case 'served':
      return '⚫ SERVED';
    default:
      return status.toUpperCase();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KitchenDisplayPage() {
  const { session } = useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  // Update current time every 10 seconds for live time counters
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Initialize audio for new order alerts
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    if (typeof window !== 'undefined') {
      try {
        // We'll play a system beep or use a data URI for a simple tone
        const audio = new Audio();
        // Simple notification beep (using data URI for a short beep sound)
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+lunvw2shBSp+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILElyx6/CnWBUIQ5zn8sFuIwUrhM/z1YU2Bhxqvu7mnEoODlOq5u+zYBoGPJPb88p6LQUme8rx3I4+CRZiturqpVITC0mi4PG7aB8GM4fS88yAMQYfcsLu45ZFDBFYr+fxrV0bCECY5O/FcSYELIHO8diJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+lunvw2shBSp+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILElyx6/CnWBUIQ5zn8sFuIwUrhM/z1YU2Bhxqvu7mnEoODlOq5u+zYBoGPJPb88p6LQUme8rx3I4+CRZiturqpVITC0mi4PG7aB8GM4fS88yAMQYfcsLu45ZFDBFYr+fxrV0bCECY5O/FcSYELIHO8diJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+lunvw2shBSp+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILElyx6/CnWBUIQ5zn8sFuIwUrhM/z1YU2Bhxqvu7mnEoODlOq5u+zYBoGPJPb88p6LQUme8rx3I4+CRZiturqpVITC0mi4PG7aB8GM4fS88yAMQYfcsLu45ZFDBFYr+fxrV0bCECY5O/FcSYELIHO8diJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+lunvw2shBSp+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILElyx6/CnWBUIQ5zn8sFuIwUrhM/z1YU2Bhxqvu7mnEoODlOq5u+zYBoGPJPb88p6LQUme8rx3I4+CRZiturqpVITC0mi4PG7aB8GM4fS88yAMQYfcsLu45ZFDBFYr+fxrV0bCECY5O/FcSYELIHO8diJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+lunvw2shBSp+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILElyx6/CnWBUIQ5zn8sFuIwUrhM/z1YU2Bhxqvu7mnEoODlOq5u+zYBoGPJPb88p6LQUme8rx3I4+CRZiturqpVITC0mi4PG7aB8GM4fS88yAMQYfcsLu45ZFDBFYr+fxrV0bCECY5O/FcSYEA==';
        audioRef.current = audio;
      } catch (e) {
        console.warn('Audio initialization failed:', e);
      }
    }
  }, []);

  // Real-time Firestore listener
  useEffect(() => {
    if (!session?.uid) {
      setLoading(false);
      setError('No session found. Please ensure the app is configured correctly.');
      return;
    }

    const ordersRef = collection(db, 'users', session.uid, 'orders');
    const q = query(
      ordersRef,
      where('status', 'in', ['placed', 'preparing', 'ready']),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedOrders: Order[] = [];
        const currentOrderIds = new Set<string>();

        snapshot.forEach((doc) => {
          const data = doc.data();
          currentOrderIds.add(doc.id);
          fetchedOrders.push({
            id: doc.id,
            orderNo: data.orderNo || '',
            waiterId: data.waiterId || '',
            waiterName: data.waiterName || '',
            waiterCode: data.waiterCode || '',
            tableNumber: data.tableNumber || '',
            items: data.items || [],
            status: data.status || 'placed',
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            completedAt: data.completedAt?.toDate?.() || undefined,
            notes: data.notes || '',
          });
        });

        // Check for new orders and play sound
        const newOrderIds = Array.from(currentOrderIds).filter(
          (id) => !previousOrderIdsRef.current.has(id)
        );

        if (newOrderIds.length > 0 && previousOrderIdsRef.current.size > 0) {
          // Play alert sound for new orders (only if we had previous orders - avoid alert on initial load)
          try {
            audioRef.current?.play().catch((e) => console.warn('Audio play failed:', e));
          } catch (e) {
            console.warn('Audio alert failed:', e);
          }
        }

        previousOrderIdsRef.current = currentOrderIds;
        setOrders(fetchedOrders);
        setLoading(false);
        setError('');
      },
      (err) => {
        console.error('Firestore listener error:', err);
        setError('Failed to load orders. Please check your connection.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session?.uid]);

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!session?.uid) return;

    try {
      const orderRef = doc(db, 'users', session.uid, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === 'ready' && { completedAt: serverTimestamp() }),
      });
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Failed to update order status. Please try again.');
    }
  };

  // Get next status action
  const getNextStatusAction = (currentStatus: OrderStatus): { status: OrderStatus; label: string } | null => {
    switch (currentStatus) {
      case 'placed':
        return { status: 'preparing', label: '▶ Start Cooking' };
      case 'preparing':
        return { status: 'ready', label: '✓ Ready for Pickup' };
      case 'ready':
        return { status: 'served', label: '✓ Mark Served' };
      default:
        return null;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-2xl text-white font-semibold">Loading Kitchen Display...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-red-900/20 border-2 border-red-500 rounded-xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">⚠ Error</h2>
          <p className="text-white text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kitchen-page" style={{ 
      minHeight: '100vh', 
      background: 'var(--background, #0f172a)', 
      padding: '24px',
      color: 'var(--text-primary, white)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '48px', 
          fontWeight: '800', 
          marginBottom: '8px',
          color: 'var(--text-primary)'
        }}>
          🍳 Kitchen
        </h1>
        <p style={{ 
          fontSize: '20px', 
          color: 'var(--text-secondary, #94a3b8)',
          fontWeight: '600'
        }}>
          {orders.length} Active Order{orders.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '60vh' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '24px' }}>✨</div>
            <p style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>All Clear!</p>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>No pending orders</p>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '20px' 
        }}>
          {orders.map((order) => {
            const timeSince = getTimeSince(order.createdAt);
            const orderTime = typeof order.createdAt === 'string' 
              ? new Date(order.createdAt).getTime() 
              : order.createdAt.getTime();
            const ageMinutes = Math.floor((Date.now() - orderTime) / 60000);
            const isUrgent = ageMinutes > 15;
            const nextAction = getNextStatusAction(order.status);

            return (
              <div
                key={order.id}
                className="kitchen-order-card"
                style={{
                  background: 'var(--card-bg, rgba(30, 41, 59, 0.8))',
                  borderRadius: '16px',
                  padding: '20px',
                  border: isUrgent ? '3px solid #ef4444' : '1px solid rgba(148, 163, 184, 0.2)',
                  boxShadow: isUrgent 
                    ? '0 0 20px rgba(239, 68, 68, 0.3)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
              >
                {/* Status Badge */}
                <div style={{ 
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  background: order.status === 'placed' 
                    ? '#f59e0b' 
                    : order.status === 'preparing' 
                    ? '#3b82f6' 
                    : '#22c55e',
                  color: 'white'
                }}>
                  {getStatusLabel(order.status)}
                </div>

                {/* Order Header */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '800', 
                    marginBottom: '4px',
                    color: 'var(--text-primary)'
                  }}>
                    {order.orderNo}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    fontSize: '14px',
                    color: 'var(--text-secondary)' 
                  }}>
                    <span style={{ fontWeight: '600' }}>Table {order.tableNumber}</span>
                    <span>•</span>
                    <span>{order.waiterName || order.waiterCode}</span>
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: isUrgent ? '#ef4444' : 'var(--text-secondary)',
                    marginTop: '4px'
                  }}>
                    {timeSince}
                    {isUrgent && ' ⚠️'}
                  </div>
                </div>

                {/* Items List */}
                <div style={{ marginBottom: '16px' }}>
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        background: 'rgba(148, 163, 184, 0.08)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        borderLeft: '4px solid #3b82f6'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: '700',
                          color: 'var(--text-primary)'
                        }}>
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '18px', 
                          fontWeight: '800',
                          color: '#3b82f6'
                        }}>
                          ×{item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(251, 146, 60, 0.1)',
                    border: '1px solid rgba(251, 146, 60, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#fb923c',
                    fontWeight: '600'
                  }}>
                    💬 {order.notes}
                  </div>
                )}

                {/* Action Button */}
                {nextAction && (
                  <button
                    onClick={() => updateOrderStatus(order.id, nextAction.status)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: order.status === 'placed' 
                        ? '#3b82f6' 
                        : order.status === 'preparing' 
                        ? '#22c55e' 
                        : '#64748b',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                  >
                    {nextAction.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
