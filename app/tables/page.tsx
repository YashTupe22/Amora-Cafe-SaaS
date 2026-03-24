'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/appStore';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { Check, X, Plus, Trash2 } from 'lucide-react';

interface Table {
  id: string;
  tableNumber: string;
  status: 'free' | 'occupied';
  currentOrderId?: string;
  occupiedAt?: Date;
  lastUpdated: Date;
}

export default function TablesPage() {
  const { session } = useAppStore();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Load tables from Firestore
  useEffect(() => {
    if (!session?.uid) {
      setLoading(false);
      return;
    }

    const tablesRef = collection(db, 'users', session.uid, 'tables');
    const q = query(tablesRef, orderBy('tableNumber', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTables: Table[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedTables.push({
            id: doc.id,
            tableNumber: data.tableNumber || '',
            status: data.status || 'free',
            currentOrderId: data.currentOrderId,
            occupiedAt: data.occupiedAt?.toDate?.() || undefined,
            lastUpdated: data.lastUpdated?.toDate?.() || new Date(),
          });
        });
        // Sort numerically if possible
        fetchedTables.sort((a, b) => {
          const numA = parseInt(a.tableNumber);
          const numB = parseInt(b.tableNumber);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.tableNumber.localeCompare(b.tableNumber);
        });
        setTables(fetchedTables);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading tables:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session?.uid]);

  // Initialize default tables if none exist
  useEffect(() => {
    if (!loading && tables.length === 0 && session?.uid) {
      initializeDefaultTables();
    }
  }, [loading, tables.length, session?.uid]);

  const initializeDefaultTables = async () => {
    if (!session?.uid) return;

    try {
      const promises = [];
      for (let i = 1; i <= 12; i++) {
        const tableRef = doc(db, 'users', session.uid, 'tables', `table-${i}`);
        promises.push(
          setDoc(tableRef, {
            tableNumber: String(i),
            status: 'free',
            lastUpdated: serverTimestamp(),
          })
        );
      }
      await Promise.all(promises);
    } catch (error) {
      console.error('Error initializing tables:', error);
    }
  };

  const toggleTableStatus = async (tableId: string, currentStatus: 'free' | 'occupied') => {
    if (!session?.uid) return;

    const newStatus = currentStatus === 'free' ? 'occupied' : 'free';
    const tableRef = doc(db, 'users', session.uid, 'tables', tableId);

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        lastUpdated: serverTimestamp(),
      };
      if (newStatus === 'occupied') {
        updateData.occupiedAt = serverTimestamp();
      } else {
        updateData.occupiedAt = null;
        updateData.currentOrderId = null;
      }
      await updateDoc(tableRef, updateData);
    } catch (error) {
      console.error('Error updating table status:', error);
    }
  };

  const addNewTable = async () => {
    if (!session?.uid || !newTableNumber.trim()) return;

    const tableRef = doc(db, 'users', session.uid, 'tables', `table-${Date.now()}`);
    try {
      await setDoc(tableRef, {
        tableNumber: newTableNumber.trim(),
        status: 'free',
        lastUpdated: serverTimestamp(),
      });
      setShowAddModal(false);
      setNewTableNumber('');
    } catch (error) {
      console.error('Error adding table:', error);
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!session?.uid) return;

    try {
      await deleteDoc(doc(db, 'users', session.uid, 'tables', tableId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading tables...</p>
        </div>
      </div>
    );
  }

  const freeCount = tables.filter((t) => t.status === 'free').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="page-title">🍽️ Table Management</h1>
          <button
            className="glow-btn"
            onClick={() => setShowAddModal(true)}
            style={{ padding: '10px 20px' }}
          >
            <Plus size={16} />
            <span>Add Table</span>
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="glass-card" style={{ padding: '16px 24px', flex: '1', minWidth: '150px' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#22c55e', marginBottom: '4px' }}>
              {freeCount}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Free Tables
            </div>
          </div>
          <div className="glass-card" style={{ padding: '16px 24px', flex: '1', minWidth: '150px' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', marginBottom: '4px' }}>
              {occupiedCount}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Occupied
            </div>
          </div>
          <div className="glass-card" style={{ padding: '16px 24px', flex: '1', minWidth: '150px' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {tables.length}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Total Tables
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
      }}>
        {tables.map((table) => (
          <div
            key={table.id}
            className="glass-card"
            style={{
              padding: '24px',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              border: table.status === 'free' 
                ? '2px solid rgba(34, 197, 94, 0.3)' 
                : '2px solid rgba(245, 158, 11, 0.3)',
              background: table.status === 'free'
                ? 'rgba(34, 197, 94, 0.05)'
                : 'rgba(245, 158, 11, 0.05)',
              position: 'relative',
            }}
          >
            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(table.id);
              }}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.6,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
              <Trash2 size={12} />
            </button>

            {/* Status Indicator */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: table.status === 'free' ? '#22c55e' : '#f59e0b',
              boxShadow: `0 0 8px ${table.status === 'free' ? '#22c55e' : '#f59e0b'}`,
            }} />

            {/* Table Number */}
            <div 
              onClick={() => toggleTableStatus(table.id, table.status)}
              style={{
                cursor: 'pointer',
                padding: '12px',
              }}
            >
              <div style={{
                fontSize: '48px',
                fontWeight: '800',
                color: table.status === 'free' ? '#22c55e' : '#f59e0b',
                marginBottom: '8px',
                lineHeight: 1,
              }}>
                {table.tableNumber}
              </div>

              {/* Status Label */}
              <div style={{
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: table.status === 'free' ? '#22c55e' : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}>
                {table.status === 'free' ? (
                  <>
                    <Check size={14} />
                    Free
                  </>
                ) : (
                  <>
                    <X size={14} />
                    Occupied
                  </>
                )}
              </div>

              {/* Occupied Time */}
              {table.status === 'occupied' && table.occupiedAt && (
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  marginTop: '8px',
                }}>
                  Since {table.occupiedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <p>No tables configured. Click "Add Table" to get started.</p>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass-card"
            style={{
              padding: 32,
              maxWidth: 400,
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
              Add New Table
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                Table Number / Name
              </label>
              <input
                className="dark-input"
                type="text"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="e.g., 13, VIP-1, Patio-3"
                autoFocus
                style={{ padding: '10px 12px', fontSize: '14px', width: '100%' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTableNumber.trim()) addNewTable();
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setNewTableNumber('');
                }}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                className="glow-btn"
                onClick={addNewTable}
                disabled={!newTableNumber.trim()}
                style={{ padding: '10px 20px', opacity: newTableNumber.trim() ? 1 : 0.5 }}
              >
                <Plus size={16} />
                <span>Add Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="glass-card"
            style={{
              padding: 32,
              maxWidth: 400,
              width: '90%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Delete Table?
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
                style={{ padding: '10px 24px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTable(showDeleteConfirm)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  background: '#ef4444',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
