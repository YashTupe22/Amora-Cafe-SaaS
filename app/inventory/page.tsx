'use client';

import { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/ui/StatCard';
import LimitBar from '@/components/ui/LimitBar';
import { useAppStore } from '@/lib/appStore';
import { useSubscription } from '@/hooks/useSubscription';
import { getPlanLimit } from '@/lib/planAccess';
import type { PlanName } from '@/lib/planAccess';
import type { InventoryItem } from '@/lib/mockData';
import { Plus, Package2, AlertTriangle, BarChart2, Trash2 } from 'lucide-react';

type DraftItem = Omit<InventoryItem, 'id'>;

export default function InventoryPage() {
  const { data, updateInventory, deleteInventoryItem } = useAppStore();
  const inventory = data.inventory as InventoryItem[];
  const { plan } = useSubscription();

  // ── Plan limit: inventory items ─────────────────────────────────
  const inventoryLimit = getPlanLimit(plan as PlanName, 'inventoryItems');
  const atInvLimit     = isFinite(inventoryLimit) && inventory.length >= inventoryLimit;

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<InventoryItem | null>(null);
  const [draft, setDraft] = useState<DraftItem>({
    name: '',
    sku: '',
    category: 'General',
    unit: 'Unit',
    openingQty: 0,
    currentQty: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    reorderLevel: 0,
    gstRate: 18,
  });

  const { totalItems, totalStockQty, totalStockValue, lowStockCount } = useMemo(() => {
    const totalItems = inventory.length;
    const totalStockQty = inventory.reduce((s, i) => s + i.currentQty, 0);
    const totalStockValue = inventory.reduce((s, i) => s + i.currentQty * i.purchasePrice, 0);
    const lowStockCount = inventory.filter(i => i.currentQty <= i.reorderLevel).length;
    return { totalItems, totalStockQty, totalStockValue, lowStockCount };
  }, [inventory]);

  const startAdd = () => {
    setEditingId(null);
    setMergeTarget(null);
    setDraft({
      name: '',
      sku: '',
      category: 'General',
      unit: 'Unit',
      openingQty: 0,
      currentQty: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      reorderLevel: 0,
      gstRate: 18,
    });
    setShowForm(true);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setMergeTarget(null);
    const { ...rest } = item;
    setDraft(rest);
    setShowForm(true);
  };

  const saveItem = () => {
    if (!draft.name.trim()) return;
    if (!draft.sku.trim()) return;
    if (!editingId && atInvLimit) return; // hard stop — cannot add new item at limit
    if (editingId) {
      updateInventory(prev =>
        prev.map(i => (i.id === editingId ? { ...i, ...draft, name: draft.name.trim(), sku: draft.sku.trim() } : i)),
      );
    } else {
      const trimmedName = draft.name.trim().toLowerCase();
      const existing = inventory.find(i => i.name.trim().toLowerCase() === trimmedName);
      if (existing) {
        // Merge: add the user-entered qtys on top of existing stock
        const addOpening = Number(draft.openingQty) || 0;
        const addCurrent = Number(draft.currentQty) || 0;
        updateInventory(prev =>
          prev.map(i =>
            i.id === existing.id
              ? {
                  ...i,
                  openingQty:    i.openingQty + addOpening,
                  currentQty:    i.currentQty + addCurrent,
                  // Update prices only if the user changed them from the auto-filled values
                  purchasePrice: draft.purchasePrice > 0 ? draft.purchasePrice : i.purchasePrice,
                  sellingPrice:  draft.sellingPrice  > 0 ? draft.sellingPrice  : i.sellingPrice,
                }
              : i,
          ),
        );
      } else {
        const id = 'inv-item-' + Date.now().toString(36);
        updateInventory(prev => [
          ...prev,
          {
            id,
            ...draft,
            name: draft.name.trim(),
            sku: draft.sku.trim(),
          },
        ]);
      }
    }
    setShowForm(false);
    setEditingId(null);
    setMergeTarget(null);
  };

  return (
    <AppLayout title="Inventory" subtitle="Simple stock tracking tailored for Indian service businesses">
      {/* Usage limit bar */}
      <LimitBar used={inventory.length} limit={inventoryLimit} label="Inventory items" />
      {/* Overview row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 18,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Total SKUs"
          value={String(totalItems)}
          sub="Unique inventory items"
          trend="neutral"
          trendValue=""
          iconBg="linear-gradient(135deg, rgba(249,115,22,0.3), rgba(249,115,22,0.1))"
          icon={<Package2 size={20} color="#f97316" />}
        />
        <StatCard
          label="Total Stock Qty"
          value={totalStockQty.toLocaleString('en-IN')}
          sub="Across all units"
          trend="neutral"
          trendValue=""
          iconBg="linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))"
          icon={<BarChart2 size={20} color="#22c55e" />}
        />
        <StatCard
          label="Stock Value"
          value={`₹${totalStockValue.toLocaleString('en-IN')}`}
          sub="Based on purchase price"
          trend="neutral"
          trendValue=""
          iconBg="linear-gradient(135deg, rgba(248,250,252,0.12), rgba(148,163,184,0.08))"
          icon={<BarChart2 size={20} color="#e5e7eb" />}
        />
        <StatCard
          label="Low Stock Items"
          value={String(lowStockCount)}
          sub="At or below reorder level"
          trend={lowStockCount > 0 ? 'down' : 'up'}
          trendValue=""
          iconBg="linear-gradient(135deg, rgba(248,113,113,0.3), rgba(248,113,113,0.1))"
          icon={<AlertTriangle size={20} color="#f97316" />}
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <button
          onClick={() => { if (!atInvLimit) startAdd(); }}
          className="glow-btn"
          disabled={atInvLimit}
          style={{ padding: '9px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, opacity: atInvLimit ? 0.45 : 1, cursor: atInvLimit ? 'not-allowed' : 'pointer' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Add Item
          </span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card animate-fade-in" style={{ padding: 22, marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>
              {editingId ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h3>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Item Name *</label>
              <input
                className="dark-input"
                placeholder="e.g. Cloud Server Credits"
                value={draft.name}
                onChange={e => {
                  const val = e.target.value;
                  setDraft(d => ({ ...d, name: val }));
                  if (!editingId) {
                    const match = inventory.find(
                      i => i.name.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (match) {
                      setMergeTarget(match);
                      setDraft(d => ({
                        ...d,
                        name: val,
                        sku: match.sku,
                        category: match.category,
                        unit: match.unit,
                        purchasePrice: match.purchasePrice,
                        sellingPrice: match.sellingPrice,
                        reorderLevel: match.reorderLevel,
                        gstRate: match.gstRate,
                        // qty fields stay 0 — user enters new stock
                        openingQty: 0,
                        currentQty: 0,
                      }));
                    } else {
                      setMergeTarget(null);
                    }
                  }
                }}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
              {mergeTarget && (
                <p style={{ fontSize: 11, color: '#ea580c', marginTop: 5, fontWeight: 600 }}>
                  ✓ Existing item found — SKU / prices auto-filled. Enter qty to add to current stock ({mergeTarget.currentQty} {mergeTarget.unit}).
                </p>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>SKU / Code *</label>
              <input
                className="dark-input"
                placeholder="Internal code"
                value={draft.sku}
                onChange={e => setDraft(d => ({ ...d, sku: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Category</label>
              <input
                className="dark-input"
                placeholder="Services, Infra, etc."
                value={draft.category}
                onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Unit</label>
              <input
                className="dark-input"
                placeholder="Hours, Credits…"
                value={draft.unit}
                onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Opening Qty</label>
              <input
                className="dark-input"
                type="number"
                min="0"
                value={draft.openingQty}
                onChange={e => setDraft(d => ({ ...d, openingQty: Number(e.target.value) || 0 }))}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Current Qty</label>
              <input
                className="dark-input"
                type="number"
                min="0"
                value={draft.currentQty}
                onChange={e => setDraft(d => ({ ...d, currentQty: Number(e.target.value) || 0 }))}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Purchase Price (₹)</label>
              <input
                className="dark-input"
                type="number"
                min="0"
                value={draft.purchasePrice}
                onChange={e => setDraft(d => ({ ...d, purchasePrice: Number(e.target.value) || 0 }))}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Selling Price (₹)</label>
              <input
                className="dark-input"
                type="number"
                min="0"
                value={draft.sellingPrice}
                onChange={e => setDraft(d => ({ ...d, sellingPrice: Number(e.target.value) || 0 }))}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Reorder Level</label>
              <input
                className="dark-input"
                type="number"
                min="0"
                value={draft.reorderLevel}
                onChange={e => setDraft(d => ({ ...d, reorderLevel: Number(e.target.value) || 0 }))}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>GST Rate (%)</label>
              <input
                className="dark-input"
                type="number"
                min="0"
                max="28"
                value={draft.gstRate}
                onChange={e => setDraft(d => ({ ...d, gstRate: Number(e.target.value) || 0 }))}
                style={{ padding: '10px 12px', fontSize: 14 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setMergeTarget(null);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button className="glow-btn" onClick={saveItem} style={{ padding: '10px 22px', fontSize: 14 }}>
              <span>{editingId ? 'Save Changes' : 'Add Item'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Inventory table */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', marginBottom: 14 }}>Inventory List</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Current Qty</th>
                <th style={{ textAlign: 'right' }}>Reorder</th>
                <th style={{ textAlign: 'right' }}>Purchase (₹)</th>
                <th style={{ textAlign: 'right' }}>Stock Value (₹)</th>
                <th style={{ textAlign: 'center' }}>GST %</th>
                <th>Health</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const value = item.currentQty * item.purchasePrice;
                const low = item.currentQty <= item.reorderLevel;
                return (
                  <tr key={item.id}>
                    <td style={{ color: '#f1f5f9', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ color: '#64748b', fontSize: 12 }}>{item.sku}</td>
                    <td style={{ color: '#94a3b8' }}>{item.category}</td>
                    <td style={{ color: '#94a3b8' }}>{item.unit}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.currentQty.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: '#64748b' }}>{item.reorderLevel}</td>
                    <td style={{ textAlign: 'right', color: '#94a3b8' }}>₹{item.purchasePrice.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#e5e7eb' }}>₹{value.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>{item.gstRate}%</td>
                    <td>
                      <span>
                        {low ? (
                          <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>Low</span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>OK</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => startEdit(item)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(148,163,184,0.4)',
                          background: 'rgba(15,23,42,0.4)',
                          color: '#e5e7eb',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Delete ${item.name}?`)) deleteInventoryItem(item.id); }}
                        style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', color: '#475569', padding: '32px 0' }}>
                    No items yet. Add your first inventory item to start tracking stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

