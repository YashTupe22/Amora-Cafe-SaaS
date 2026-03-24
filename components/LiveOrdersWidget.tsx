'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/lib/appStore';
import type { Order, OrderStatus } from '@/lib/mockData';

type StatusFilter = 'all' | 'placed' | 'preparing' | 'ready';

const statusColors = {
  placed: '#f59e0b',
  preparing: '#3b82f6',
  ready: '#22c55e',
  served: '#6b7280',
  cancelled: '#ef4444',
};

const statusLabels = {
  placed: 'Placed',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  cancelled: 'Cancelled',
};

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const orderDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - orderDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function LiveOrdersWidget() {
  const router = useRouter();
  const { session, profile } = useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Check if restaurant interface (moved after hooks)
  const isRestaurantInterface = profile?.activeInterface === 'restaurant';

  useEffect(() => {
    if (!session?.uid || !db) {
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, 'users', session.uid, 'orders');
    const q = query(
      ordersRef,
      where('status', 'in', ['placed', 'preparing', 'ready']),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData: Order[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
          completedAt: doc.data().completedAt?.toDate?.() || doc.data().completedAt,
        })) as Order[];

        setOrders(ordersData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session?.uid]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter((order) => order.status === statusFilter));
    }
  }, [orders, statusFilter]);

  // Don't show widget for non-restaurant interface (after all hooks)
  if (!isRestaurantInterface) {
    return null;
  }

  const handleOrderClick = (orderId: string) => {
    router.push(`/kitchen#order-${orderId}`);
  };

  const handleViewKitchen = () => {
    router.push('/kitchen');
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Loading orders...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: 0
          }}>
            Active Orders
          </h3>
          <span style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '600',
          }}>
            {orders.length}
          </span>
        </div>
        
        <button
          onClick={handleViewKitchen}
          className="glow-btn"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          View Kitchen Display →
        </button>
      </div>

      {/* Filter Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        {(['all', 'placed', 'preparing', 'ready'] as StatusFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              fontWeight: '500',
              borderRadius: '8px',
              border: statusFilter === filter 
                ? '2px solid var(--purple)' 
                : '1px solid var(--glass-border)',
              background: statusFilter === filter 
                ? 'rgba(102, 126, 234, 0.1)' 
                : 'transparent',
              color: statusFilter === filter 
                ? 'var(--purple)' 
                : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {filter === 'all' ? 'All' : statusLabels[filter as OrderStatus]}
            {filter !== 'all' && (
              <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                ({orders.filter((o) => o.status === filter).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem 1rem',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📋</div>
          <p style={{ margin: 0 }}>
            {statusFilter === 'all' 
              ? 'No active orders' 
              : `No ${statusLabels[statusFilter as OrderStatus].toLowerCase()} orders`}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
          maxHeight: '500px',
          overflowY: 'auto',
          paddingRight: '0.5rem',
        }}>
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => handleOrderClick(order.id)}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Order Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '0.75rem'
              }}>
                <div>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}>
                    {order.orderNo}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)'
                  }}>
                    Table {order.tableNumber}
                  </div>
                </div>
                
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: `${statusColors[order.status]}20`,
                  color: statusColors[order.status],
                  border: `1px solid ${statusColors[order.status]}40`,
                }}>
                  {statusLabels[order.status]}
                </span>
              </div>

              {/* Order Details */}
              <div style={{ 
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{order.items.length} items</span>
                <span>{formatTimeAgo(order.createdAt)}</span>
              </div>

              {/* Items Preview */}
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                borderTop: '1px solid var(--glass-border)',
                paddingTop: '0.5rem',
                maxHeight: '60px',
                overflow: 'hidden',
              }}>
                {order.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '0.25rem' }}>
                    {item.quantity}x {item.name}
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div style={{ opacity: 0.7, fontStyle: 'italic' }}>
                    +{order.items.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
