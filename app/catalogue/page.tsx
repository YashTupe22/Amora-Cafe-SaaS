'use client';

import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Badge from '@/components/ui/Badge';
import LimitBar from '@/components/ui/LimitBar';
import { Plus, X, Edit2, Trash2, Search, BookOpen, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';
import { useSubscription } from '@/hooks/useSubscription';
import { getPlanLimit } from '@/lib/planAccess';
import type { PlanName } from '@/lib/planAccess';
import type { CatalogueItem, MenuCategory } from '@/lib/mockData';
import { MENU_CATEGORIES } from '@/lib/mockData';

// ── Category pill colours ────────────────────────────────────────────────────
const CAT_COLORS: Record<MenuCategory, { bg: string; color: string; dot: string }> = {
    Chinese:     { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', dot: '#ef4444' },
    Continental: { bg: 'rgba(249,115,22,0.12)',  color: '#fb923c', dot: '#f97316' },
    Mocktail:    { bg: 'rgba(168,85,247,0.12)',  color: '#c084fc', dot: '#a855f7' },
    Biryani:     { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', dot: '#f59e0b' },
    Dessert:     { bg: 'rgba(236,72,153,0.12)',  color: '#f472b6', dot: '#ec4899' },
};

// ── Item Form ───────────────────────────────────────────────────────────────
interface ItemFormProps {
    title: string;
    initial?: Partial<CatalogueItem>;
    onSave: (data: Omit<CatalogueItem, 'id'>) => void;
    onCancel: () => void;
}

function ItemForm({ title, initial, onSave, onCancel }: ItemFormProps) {
    const [name, setName] = useState(initial?.name ?? '');
    const [category, setCategory] = useState<MenuCategory>(initial?.category ?? 'Chinese');
    const [price, setPrice] = useState(initial?.price ?? 0);
    const [description, setDescription] = useState(initial?.description ?? '');
    const [available, setAvailable] = useState(initial?.available ?? true);

    const labelStyle: React.CSSProperties = { fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 600 };
    const inp: React.CSSProperties = { padding: '10px 12px', fontSize: 14 };

    const handleSave = () => {
        if (!name.trim() || price <= 0) return;
        onSave({ name: name.trim(), category, price, description: description.trim(), available });
    };

    return (
        <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
                <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            <div className="rg-3" style={{ marginBottom: 16 }}>
                <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Item Name *</label>
                    <input className="dark-input" placeholder="e.g. Chicken Biryani" value={name} onChange={e => setName(e.target.value)} style={inp} />
                </div>
                <div>
                    <label style={labelStyle}>Category *</label>
                    <select className="dark-input" value={category} onChange={e => setCategory(e.target.value as MenuCategory)} style={{ ...inp, width: '100%' }}>
                        {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Price (₹) *</label>
                    <input className="dark-input" type="number" min="0" placeholder="0" value={price} onChange={e => setPrice(Number(e.target.value))} style={inp} />
                </div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Description (optional)</label>
                <input className="dark-input" placeholder="Short description shown on bill…" value={description} onChange={e => setDescription(e.target.value)} style={inp} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <button
                        type="button"
                        onClick={() => setAvailable(v => !v)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: available ? '#22c55e' : '#64748b' }}
                    >
                        {available ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                    {available ? 'Available' : 'Unavailable'}
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--icon-btn-bg)', border: '1px solid var(--icon-btn-border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
                        Cancel
                    </button>
                    <button className="glow-btn" onClick={handleSave} style={{ padding: '10px 24px', fontSize: 14 }}>
                        <span>Save Item</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CataloguePage() {
    const { data, updateCatalogue } = useAppStore();
    const catalogue = data.catalogue;
    const { plan } = useSubscription();

    // ── Plan limit: menu items ────────────────────────────────────────
    const menuItemLimit  = getPlanLimit(plan as PlanName, 'menuItems');
    const atMenuLimit    = isFinite(menuItemLimit) && catalogue.length >= menuItemLimit;

    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<CatalogueItem | null>(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState<MenuCategory | 'All'>('All');

    // Stats
    const totalItems = catalogue.length;
    const availableItems = catalogue.filter(i => i.available).length;
    const avgPrice = totalItems > 0 ? Math.round(catalogue.reduce((s, i) => s + i.price, 0) / totalItems) : 0;

    const filtered = useMemo(() => {
        let items = catalogue;
        if (filterCat !== 'All') items = items.filter(i => i.category === filterCat);
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
        }
        return items;
    }, [catalogue, filterCat, search]);

    // Group by category for display
    const grouped = useMemo(() => {
        const map = new Map<MenuCategory, CatalogueItem[]>();
        MENU_CATEGORIES.forEach(c => map.set(c, []));
        filtered.forEach(item => {
            const arr = map.get(item.category);
            if (arr) arr.push(item);
        });
        return map;
    }, [filtered]);

    const handleCreate = (data: Omit<CatalogueItem, 'id'>) => {
        if (atMenuLimit) return; // hard stop at plan limit
        const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
        updateCatalogue(prev => [...prev, { id, ...data }]);
        setShowForm(false);
    };

    const handleEdit = (data: Omit<CatalogueItem, 'id'>) => {
        if (!editItem) return;
        updateCatalogue(prev => prev.map(i => i.id === editItem.id ? { ...i, ...data } : i));
        setEditItem(null);
    };

    const handleDelete = (id: string, name: string) => {
        if (!window.confirm(`Remove "${name}" from the catalogue?`)) return;
        updateCatalogue(prev => prev.filter(i => i.id !== id));
    };

    const toggleAvailability = (id: string) => {
        updateCatalogue(prev => prev.map(i => i.id === id ? { ...i, available: !i.available } : i));
    };

    return (
        <AppLayout title="Catalogue" subtitle="Manage your menu items and prices across all categories">
            {/* Usage limit bar */}
            <LimitBar used={catalogue.length} limit={menuItemLimit} label="Menu items" />
            {/* Summary bar */}
            <div className="rg-3" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total Items',    value: totalItems,          color: '#fb923c' },
                    { label: 'Available Now',  value: availableItems,      color: '#22c55e' },
                    { label: 'Avg Item Price', value: `₹${avgPrice}`,      color: '#f59e0b' },
                    { label: 'Categories',     value: MENU_CATEGORIES.length, color: '#a78bfa' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: '16px 20px' }}>
                        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{s.label}</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
                {/* Search */}
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input className="dark-input" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, fontSize: 13, padding: '9px 12px 9px 34px', width: '100%' }} />
                </div>
                {/* Category filter pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['All', ...MENU_CATEGORIES] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCat(cat as MenuCategory | 'All')}
                            style={{
                                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                background: filterCat === cat ? (cat === 'All' ? 'rgba(249,115,22,0.2)' : CAT_COLORS[cat as MenuCategory].bg) : 'var(--icon-btn-bg)',
                                border: `1px solid ${filterCat === cat ? (cat === 'All' ? 'rgba(249,115,22,0.4)' : CAT_COLORS[cat as MenuCategory].dot) : 'var(--icon-btn-border)'}`,
                                color: filterCat === cat ? (cat === 'All' ? '#fb923c' : CAT_COLORS[cat as MenuCategory].color) : '#64748b',
                                transition: 'all 0.15s',
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                {/* Add button */}
                <button
                    onClick={() => { if (!atMenuLimit) { setEditItem(null); setShowForm(!showForm); } }}
                    className="glow-btn"
                    disabled={atMenuLimit}
                    style={{ padding: '9px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: atMenuLimit ? 0.45 : 1, cursor: atMenuLimit ? 'not-allowed' : 'pointer' }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={14} /> Add Item</span>
                </button>
            </div>

            {/* Create / Edit Form */}
            {showForm && !editItem && (
                <ItemForm title="New Menu Item" onSave={handleCreate} onCancel={() => setShowForm(false)} />
            )}
            {editItem && (
                <ItemForm title={`Edit — ${editItem.name}`} initial={editItem} onSave={handleEdit} onCancel={() => setEditItem(null)} />
            )}

            {/* Category sections */}
            {MENU_CATEGORIES.map(cat => {
                const items = grouped.get(cat) ?? [];
                if (items.length === 0 && filterCat !== 'All' && filterCat !== cat) return null;
                const col = CAT_COLORS[cat];
                return (
                    <div key={cat} className="glass-card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
                        {/* Category header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', background: 'var(--icon-btn-bg)' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: col.color }}>{cat}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                {items.filter(i => i.available).length}/{items.length} available
                            </span>
                        </div>

                        {items.length === 0 ? (
                            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                                No items in this category yet. <button onClick={() => { setShowForm(true); }} style={{ background: 'none', border: 'none', color: '#fb923c', cursor: 'pointer', fontSize: 13 }}>Add one</button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1 }}>
                                {items.map(item => (
                                    <div key={item.id} style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, borderRight: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', opacity: item.available ? 1 : 0.5 }}>
                                        {/* Icon */}
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <BookOpen size={16} color={col.color} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{item.name}</p>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: '#fb923c', whiteSpace: 'nowrap' }}>₹{item.price}</span>
                                            </div>
                                            {item.description && (
                                                <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.description}</p>
                                            )}
                                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                                <button onClick={() => toggleAvailability(item.id)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: item.available ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${item.available ? 'rgba(34,197,94,0.25)' : 'rgba(100,116,139,0.2)'}`, color: item.available ? '#22c55e' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {item.available ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                                    {item.available ? 'Available' : 'Off'}
                                                </button>
                                                <button onClick={() => { setShowForm(false); setEditItem(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                                    <Edit2 size={11} /> Edit
                                                </button>
                                                <button onClick={() => handleDelete(item.id, item.name)} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                                    <Trash2 size={11} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </AppLayout>
    );
}
