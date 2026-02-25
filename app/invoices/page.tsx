'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Badge from '@/components/ui/Badge';
import type { Invoice, InvoiceItem } from '@/lib/mockData';
import { Plus, X, Eye, Check, FileText, Edit2, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';
import { localDate } from '@/lib/utils';

function getTotal(items: InvoiceItem[]) {
    return items.reduce((sum, i) => sum + i.qty * i.price, 0);
}

// ── Invoice Form (shared by Create & Edit) ──────────────────────────────────

interface InvOption {
    id: string;
    name: string;
    sellingPrice: number;
    currentQty: number;
}

interface InvoiceFormProps {
    title: string;
    initial?: Partial<Invoice>;
    inventory: InvOption[];
    pastInvoices: Invoice[];
    onSave: (data: {
        client: string; date: string; dueDate: string; items: InvoiceItem[];
        clientEmail: string; clientPhone: string; clientAddress: string;
    }) => void;
    onCancel: () => void;
}

function InvoiceForm({ title, initial, inventory, pastInvoices, onSave, onCancel }: InvoiceFormProps) {
    const [client, setClient] = useState(initial?.client ?? '');
    const [date, setDate] = useState(initial?.date ?? localDate());
    const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
    const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? '');
    const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? '');
    const [clientAddress, setClientAddress] = useState(initial?.clientAddress ?? '');
    const [clientAutoFilled, setClientAutoFilled] = useState(false);
    const [items, setItems] = useState<InvoiceItem[]>(
        initial?.items?.length ? initial.items : [{ description: '', qty: 1, price: 0 }]
    );

    // ── Client auto-fill ──────────────────────────────────────────────────
    const handleClientChange = (val: string) => {
        setClient(val);
        const match = pastInvoices.find(
            inv => inv.id !== initial?.id &&
                   inv.client.trim().toLowerCase() === val.trim().toLowerCase()
        );
        if (match) {
            setClientEmail(match.clientEmail ?? '');
            setClientPhone(match.clientPhone ?? '');
            setClientAddress(match.clientAddress ?? '');
            setClientAutoFilled(true);
        } else {
            setClientAutoFilled(false);
        }
    };

    const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, price: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: keyof InvoiceItem, val: string | number) =>
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

    const selectInventoryItem = (i: number, itemId: string) => {
        const inv = inventory.find(it => it.id === itemId);
        if (!inv) { updateItem(i, 'description', ''); return; }
        setItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, description: inv.name, price: inv.sellingPrice } : item
        ));
    };

    const handleSave = () => {
        if (!client.trim()) return;
        onSave({
            client: client.trim(), date,
            dueDate: dueDate || date,
            items: items.filter(it => it.description.trim()),
            clientEmail, clientPhone, clientAddress,
        });
    };

    const labelStyle = { fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 };
    const inp = { padding: '10px 12px', fontSize: 14 };

    return (
        <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{title}</h2>
                <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            {/* Client info row */}
            <div className="rg-3" style={{ marginBottom: 16 }}>
                <div>
                    <label style={labelStyle}>Client Name *</label>
                    <input
                        className="dark-input"
                        placeholder="Client / company"
                        value={client}
                        onChange={e => handleClientChange(e.target.value)}
                        style={inp}
                    />
                    {clientAutoFilled && (
                        <p style={{ fontSize: 11, color: '#ea580c', marginTop: 4, fontWeight: 600 }}>
                            ✓ Returning client — contact details auto-filled.
                        </p>
                    )}
                </div>
                <div>
                    <label style={labelStyle}>Invoice Date</label>
                    <input className="dark-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, colorScheme: 'dark' }} />
                </div>
                <div>
                    <label style={labelStyle}>Due Date</label>
                    <input className="dark-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...inp, colorScheme: 'dark' }} />
                </div>
            </div>

            {/* Client contact info */}
            <div className="rg-3" style={{ marginBottom: 18 }}>
                <div>
                    <label style={labelStyle}>Client Email</label>
                    <input className="dark-input" type="email" placeholder="client@company.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} style={inp} />
                </div>
                <div>
                    <label style={labelStyle}>Client Phone</label>
                    <input className="dark-input" type="tel" placeholder="10-digit number" value={clientPhone} onChange={e => setClientPhone(e.target.value)} style={inp} />
                </div>
                <div>
                    <label style={labelStyle}>Client Address</label>
                    <input className="dark-input" placeholder="City, State, PIN" value={clientAddress} onChange={e => setClientAddress(e.target.value)} style={inp} />
                </div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8, padding: '0 4px' }}>
                    <span style={{ flex: 3 }}>Description / Item</span>
                    <span style={{ width: 70, textAlign: 'center' }}>Qty</span>
                    <span style={{ width: 120, textAlign: 'center' }}>Price (₹)</span>
                    <span style={{ width: 100, textAlign: 'right' }}>Total</span>
                    <span style={{ width: 32 }} />
                </div>
                {items.map((item, i) => {
                    const invMatch = inventory.find(it => it.name === item.description);
                    const overStock = invMatch && item.qty > invMatch.currentQty;
                    return (
                        <div key={i} className="inv-item-row">
                            {/* Inventory dropdown + manual fallback */}
                            <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <select
                                    className="dark-input inv-desc"
                                    style={{ padding: '9px 12px', fontSize: 13, width: '100%' }}
                                    value={inventory.find(it => it.name === item.description)?.id ?? ''}
                                    onChange={e => {
                                        if (e.target.value) selectInventoryItem(i, e.target.value);
                                        else updateItem(i, 'description', '');
                                    }}
                                >
                                    <option value="">— Select from Inventory —</option>
                                    {inventory.map(it => (
                                        <option key={it.id} value={it.id}>
                                            {it.name} — ₹{it.sellingPrice.toLocaleString('en-IN')} (Stock: {it.currentQty} {it.currentQty <= 0 ? '⚠ Out' : ''})
                                        </option>
                                    ))}
                                </select>
                                <input
                                    className="dark-input inv-desc"
                                    style={{ padding: '7px 12px', fontSize: 12 }}
                                    placeholder="Or type description manually"
                                    value={item.description}
                                    onChange={e => updateItem(i, 'description', e.target.value)}
                                />
                                {overStock && (
                                    <p style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>
                                        ⚠ Qty exceeds current stock ({invMatch!.currentQty} available)
                                    </p>
                                )}
                            </div>
                            <input className="dark-input inv-qty" style={{ width: 70, padding: '9px 10px', fontSize: 13, textAlign: 'center' }} type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} />
                            <input className="dark-input inv-price" style={{ width: 120, padding: '9px 12px', fontSize: 13 }} type="number" min="0" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))} />
                            <span className="inv-total" style={{ width: 100, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                                ₹{(item.qty * item.price).toLocaleString('en-IN')}
                            </span>
                            <button onClick={() => removeItem(i)} style={{ width: 32, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                        </div>
                    );
                })}
                <button onClick={addItem} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', border: '1px dashed rgba(249,115,22,0.3)', color: '#fb923c', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={13} /> Add Item
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
                <div>
                    <p style={{ fontSize: 12, color: '#64748b' }}>Total Amount</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#fb923c' }}>₹{getTotal(items).toLocaleString('en-IN')}</p>
                </div>
                <button className="glow-btn" onClick={handleSave} style={{ padding: '11px 28px', fontSize: 14 }}>
                    <span>Save Invoice</span>
                </button>
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
    const { data, addInvoice, updateInvoice, toggleInvoiceStatus, updateInventory, deleteInvoice } = useAppStore();
    const invoices = data.invoices;
    const inventory = data.inventory;
    const [showForm, setShowForm] = useState(false);
    const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
    const [preview, setPreview] = useState<Invoice | null>(null);

    // ── Deduct / restore inventory qty ───────────────────────────────────────
    const deductInventory = (items: InvoiceItem[], sign: 1 | -1) => {
        const deltas: Record<string, number> = {};
        for (const item of items) {
            const match = inventory.find(
                iv => iv.name.trim().toLowerCase() === item.description.trim().toLowerCase()
            );
            if (match) deltas[match.id] = (deltas[match.id] ?? 0) + item.qty * sign;
        }
        if (Object.keys(deltas).length === 0) return;
        updateInventory(prev =>
            prev.map(iv =>
                deltas[iv.id] !== undefined
                    ? { ...iv, currentQty: Math.max(0, iv.currentQty - deltas[iv.id]) }
                    : iv
            )
        );
    };

    const handleCreate = (d: Parameters<typeof addInvoice>[0]) => {
        addInvoice(d);
        deductInventory(d.items, 1);   // deduct from stock
        setShowForm(false);
    };

    const handleEdit = (d: Parameters<typeof addInvoice>[0]) => {
        if (!editInvoice) return;
        deductInventory(editInvoice.items, -1);  // restore old stock
        deductInventory(d.items, 1);              // deduct new stock
        updateInvoice(editInvoice.id, d);
        setEditInvoice(null);
    };

    const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + getTotal(i.items), 0);
    const totalPending = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + getTotal(i.items), 0);

    const invItems = inventory.map(it => ({
        id: it.id,
        name: it.name,
        sellingPrice: it.sellingPrice,
        currentQty: it.currentQty,
    }));

    return (
        <AppLayout title="Invoices" subtitle="Manage client invoices and payment status">
            {/* Summary bar */}
            <div className="rg-3" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total Invoices', value: invoices.length, color: '#fb923c' },
                    { label: 'Paid', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: '#22c55e' },
                    { label: 'Pending', value: `₹${totalPending.toLocaleString('en-IN')}`, color: '#f59e0b' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{s.label}</p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                <button
                    onClick={() => { setEditInvoice(null); setShowForm(!showForm); }}
                    className="glow-btn"
                    style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={15} /> Create Invoice</span>
                </button>
            </div>

            {/* Create Invoice Form */}
            {showForm && !editInvoice && (
                <InvoiceForm
                    title="New Invoice"
                    inventory={invItems}
                    pastInvoices={invoices}
                    onSave={handleCreate}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {/* Edit Invoice Form */}
            {editInvoice && (
                <InvoiceForm
                    title={`Edit ${editInvoice.invoiceNo}`}
                    initial={editInvoice}
                    inventory={invItems}
                    pastInvoices={invoices}
                    onSave={handleEdit}
                    onCancel={() => setEditInvoice(null)}
                />
            )}

            {/* Invoices list */}
            <div className="glass-card" style={{ padding: 24 }}>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Client</th>
                                <th>Date</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(inv => (
                                <tr key={inv.id}>
                                    <td style={{ fontWeight: 600, color: '#fb923c' }}>{inv.invoiceNo}</td>
                                    <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{inv.client}</td>
                                    <td style={{ color: '#94a3b8' }}>{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                    <td style={{ color: '#94a3b8' }}>{new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                    <td style={{ fontWeight: 700, color: '#f1f5f9' }}>₹{getTotal(inv.items).toLocaleString('en-IN')}</td>
                                    <td><Badge variant={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <button onClick={() => setPreview(inv)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                                                <Eye size={12} /> View
                                            </button>
                                            <button
                                                onClick={() => { setShowForm(false); setEditInvoice(inv); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                                            >
                                                <Edit2 size={12} /> Edit
                                            </button>
                                            <button
                                                onClick={() => toggleInvoiceStatus(inv.id)}
                                                style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: inv.status === 'Paid' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)', border: inv.status === 'Paid' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(34,197,94,0.2)', color: inv.status === 'Paid' ? '#f59e0b' : '#22c55e' }}
                                            >
                                                <Check size={12} /> {inv.status === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                                            </button>
                                            <Link
                                                href={`/invoices/${inv.id}`}
                                                style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(15,23,42,0.96)', border: '1px solid rgba(148,163,184,0.5)', color: '#0f172a', textDecoration: 'none', backgroundImage: 'linear-gradient(135deg,#e5e7eb,#cbd5f5)' }}
                                            >
                                                GST
                                            </Link>
                                            <button
                                                onClick={() => { if (window.confirm(`Delete invoice ${inv.invoiceNo}?`)) deleteInvoice(inv.id); }}
                                                style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                                            >
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Preview Modal */}
            {preview && (
                <div className="modal-overlay" onClick={() => setPreview(null)}>
                    <div className="glass-card animate-fade-in modal-inner" style={{ width: '100%', maxWidth: 560, padding: 32, position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FileText size={20} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{preview.invoiceNo}</h2>
                                <p style={{ fontSize: 12, color: '#64748b' }}>Synplix</p>
                            </div>
                            <div style={{ marginLeft: 'auto' }}><Badge variant={preview.status === 'Paid' ? 'success' : 'warning'}>{preview.status}</Badge></div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
                            <div>
                                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>BILLED TO</p>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{preview.client}</p>
                                {preview.clientEmail && <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{preview.clientEmail}</p>}
                                {preview.clientPhone && <p style={{ fontSize: 12, color: '#64748b' }}>{preview.clientPhone}</p>}
                                {preview.clientAddress && <p style={{ fontSize: 12, color: '#64748b' }}>{preview.clientAddress}</p>}
                            </div>
                            <div>
                                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>DATES</p>
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>Issued: {new Date(preview.date).toLocaleDateString('en-IN')}</p>
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>Due: {new Date(preview.dueDate).toLocaleDateString('en-IN')}</p>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 18, marginBottom: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 100px', gap: 8, fontSize: 11, color: '#64748b', fontWeight: 600, padding: '0 4px 8px' }}>
                                <span>Description</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Price</span><span style={{ textAlign: 'right' }}>Total</span>
                            </div>
                            {preview.items.map((item, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 100px', gap: 8, padding: '10px 4px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 14 }}>
                                    <span style={{ color: '#f1f5f9' }}>{item.description}</span>
                                    <span style={{ textAlign: 'center', color: '#94a3b8' }}>{item.qty}</span>
                                    <span style={{ textAlign: 'right', color: '#94a3b8' }}>₹{item.price.toLocaleString('en-IN')}</span>
                                    <span style={{ textAlign: 'right', fontWeight: 600, color: '#f1f5f9' }}>₹{(item.qty * item.price).toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 13, color: '#64748b' }}>Total Amount</p>
                                <p style={{ fontSize: 28, fontWeight: 800, color: '#fb923c', marginTop: 4 }}>₹{getTotal(preview.items).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}