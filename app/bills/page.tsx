'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Badge from '@/components/ui/Badge';
import type { Invoice, InvoiceItem } from '@/lib/mockData';
import { Plus, X, Eye, Check, ReceiptText, Edit2, Ban } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';
import { localDate } from '@/lib/utils';
import { analytics } from '@/lib/analytics';

function getTotal(items: InvoiceItem[]) {
    return items.reduce((sum, i) => sum + i.qty * i.price, 0);
}

type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';
type PaymentMode = 'Cash' | 'Card' | 'UPI';

// ── Bill Form (Create & Edit) ────────────────────────────────────────────────

interface MenuOption {
    id: string;
    name: string;
    category: string;
    price: number;
    available: boolean;
}

interface BillFormProps {
    title: string;
    initial?: Partial<Invoice>;
    menuItems: MenuOption[];
    pastBills: Invoice[];
    onSave: (data: {
        client: string;
        date: string;
        dueDate: string;
        items: InvoiceItem[];
        tableNo: string;
        orderType: OrderType;
        paymentMode: PaymentMode;
        clientPhone: string;
        clientAddress: string;
        clientEmail: string;
    }) => void;
    onCancel: () => void;
}

function BillForm({ title, initial, menuItems, pastBills, onSave, onCancel }: BillFormProps) {
    const [customer, setCustomer] = useState(initial?.client ?? 'Walk-in');
    const [date, setDate] = useState(initial?.date ?? localDate());
    const [tableNo, setTableNo] = useState(initial?.tableNo ?? '');
    const [orderType, setOrderType] = useState<OrderType>((initial?.orderType as OrderType) ?? 'Dine-In');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>((initial?.paymentMode as PaymentMode) ?? 'Cash');
    const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? '');
    const [clientAddress, setClientAddress] = useState(initial?.clientAddress ?? '');
    const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? '');
    const [items, setItems] = useState<InvoiceItem[]>(
        initial?.items?.length ? initial.items : [{ description: '', qty: 1, price: 0 }]
    );

    const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, price: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: keyof InvoiceItem, val: string | number) =>
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

    const selectMenuItem = (i: number, itemId: string) => {
        const mi = menuItems.find(m => m.id === itemId);
        if (!mi) { updateItem(i, 'description', ''); return; }
        setItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, description: mi.name, price: mi.price } : item
        ));
    };

    const handleSave = () => {
        onSave({
            client: customer.trim() || 'Walk-in',
            date,
            dueDate: date,
            items: items.filter(it => it.description.trim()),
            tableNo,
            orderType,
            paymentMode,
            clientPhone,
            clientAddress,
            clientEmail,
        });
    };

    const labelStyle: React.CSSProperties = { fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 600 };
    const inp: React.CSSProperties = { padding: '10px 12px', fontSize: 14 };

    // Group menu options by category for the dropdown
    const groupedMenu = menuItems.reduce<Record<string, MenuOption[]>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    return (
        <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{title}</h2>
                <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            {/* Row 1 — Customer / Date / Order info */}
            <div className="rg-3" style={{ marginBottom: 16 }}>
                <div>
                    <label style={labelStyle}>Customer Name</label>
                    <input className="dark-input" placeholder="Walk-in / Name" value={customer} onChange={e => setCustomer(e.target.value)} style={inp} />
                </div>
                <div>
                    <label style={labelStyle}>Bill Date</label>
                    <input className="dark-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, colorScheme: 'dark' }} />
                </div>
                <div>
                    <label style={labelStyle}>Order Type</label>
                    <select className="dark-input" value={orderType} onChange={e => setOrderType(e.target.value as OrderType)} style={{ ...inp, width: '100%' }}>
                        <option value="Dine-In">Dine-In</option>
                        <option value="Takeaway">Takeaway</option>
                        <option value="Delivery">Delivery</option>
                    </select>
                </div>
            </div>

            {/* Row 2 — Table / Payment / Phone */}
            <div className="rg-3" style={{ marginBottom: 18 }}>
                <div>
                    <label style={labelStyle}>Table No {orderType !== 'Dine-In' && <span style={{ color: '#475569' }}>(optional)</span>}</label>
                    <input className="dark-input" placeholder="e.g. T-3" value={tableNo} onChange={e => setTableNo(e.target.value)} style={inp} />
                </div>
                <div>
                    <label style={labelStyle}>Payment Mode</label>
                    <select className="dark-input" value={paymentMode} onChange={e => setPaymentMode(e.target.value as PaymentMode)} style={{ ...inp, width: '100%' }}>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Phone {orderType !== 'Delivery' && <span style={{ color: '#475569' }}>(optional)</span>}</label>
                    <input className="dark-input" type="tel" placeholder="10-digit number" value={clientPhone} onChange={e => setClientPhone(e.target.value)} style={inp} />
                </div>
            </div>

            {/* Items — selected from catalogue */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8, padding: '0 4px' }}>
                    <span style={{ flex: 3 }}>Menu Item</span>
                    <span style={{ width: 70, textAlign: 'center' }}>Qty</span>
                    <span style={{ width: 120, textAlign: 'center' }}>Price (₹)</span>
                    <span style={{ width: 100, textAlign: 'right' }}>Total</span>
                    <span style={{ width: 32 }} />
                </div>
                {items.map((item, i) => (
                    <div key={i} className="inv-item-row">
                        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {/* Catalogue dropdown */}
                            <select
                                className="dark-input inv-desc"
                                style={{ padding: '9px 12px', fontSize: 13, width: '100%' }}
                                value={menuItems.find(m => m.name === item.description)?.id ?? ''}
                                onChange={e => {
                                    if (e.target.value) selectMenuItem(i, e.target.value);
                                    else updateItem(i, 'description', '');
                                }}
                            >
                                <option value="">— Select from Menu —</option>
                                {Object.entries(groupedMenu).map(([cat, catItems]) => (
                                    <optgroup key={cat} label={cat}>
                                        {catItems.filter(m => m.available).map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} — ₹{m.price.toLocaleString('en-IN')}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            {/* Manual override */}
                            <input
                                className="dark-input inv-desc"
                                style={{ padding: '7px 12px', fontSize: 12 }}
                                placeholder="Or type item manually…"
                                value={item.description}
                                onChange={e => updateItem(i, 'description', e.target.value)}
                            />
                        </div>
                        <input className="dark-input inv-qty" style={{ width: 70, padding: '9px 10px', fontSize: 13, textAlign: 'center' }} type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} />
                        <input className="dark-input inv-price" style={{ width: 120, padding: '9px 12px', fontSize: 13 }} type="number" min="0" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))} />
                        <span className="inv-total" style={{ width: 100, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                            ₹{(item.qty * item.price).toLocaleString('en-IN')}
                        </span>
                        <button onClick={() => removeItem(i)} style={{ width: 32, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                    </div>
                ))}
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
                    <span>Save Bill</span>
                </button>
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function BillsPage() {
    const { data, addInvoice, updateInvoice, toggleInvoiceStatus } = useAppStore();
    const bills = data.invoices;
    const catalogue = data.catalogue;

    const [showForm, setShowForm] = useState(false);
    const [editBill, setEditBill] = useState<Invoice | null>(null);
    const [preview, setPreview] = useState<Invoice | null>(null);

    const totalRevenue = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + getTotal(b.items), 0);
    const totalPending = bills.filter(b => b.status === 'Pending').reduce((s, b) => s + getTotal(b.items), 0);
    const todayBills = bills.filter(b => b.date === localDate()).length;

    // Build menu options from catalogue
    const menuOptions = catalogue.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        price: c.price,
        available: c.available,
    }));

    const handleCreate = (d: Parameters<typeof addInvoice>[0]) => {
        addInvoice(d);
        analytics.billCreated({
            orderType:   d.orderType,
            paymentMode: d.paymentMode,
            itemCount:   d.items.filter(it => it.description.trim()).length,
            total:       d.items.reduce((s, i) => s + i.qty * i.price, 0),
        });
        setShowForm(false);
    };

    const handleEdit = (d: Parameters<typeof addInvoice>[0]) => {
        if (!editBill) return;
        updateInvoice(editBill.id, d);
        setEditBill(null);
    };

    const ORDER_TYPE_COLORS: Record<string, string> = {
        'Dine-In':  '#22c55e',
        'Takeaway': '#f59e0b',
        'Delivery': '#8b5cf6',
    };

    const PAYMENT_COLORS: Record<string, string> = {
        'Cash': '#22c55e',
        'Card': '#fb923c',
        'UPI':  '#a78bfa',
    };

    return (
        <AppLayout title="Bills" subtitle="Create and manage customer bills">
            {/* Summary bar */}
            <div className="rg-3" style={{ marginBottom: 24 }}>
                {[
                    { label: "Today's Bills",  value: todayBills,                              color: '#fb923c' },
                    { label: 'Collected',       value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: '#22c55e' },
                    { label: 'Pending',         value: `₹${totalPending.toLocaleString('en-IN')}`, color: '#f59e0b' },
                    { label: 'Total Bills',     value: bills.length,                            color: '#a78bfa' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: '16px 20px' }}>
                        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{s.label}</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                <button
                    onClick={() => { setEditBill(null); setShowForm(!showForm); }}
                    className="glow-btn"
                    style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={15} /> New Bill</span>
                </button>
            </div>

            {/* Create form */}
            {showForm && !editBill && (
                <BillForm
                    title="New Bill"
                    menuItems={menuOptions}
                    pastBills={bills}
                    onSave={handleCreate}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {/* Edit form */}
            {editBill && (
                <BillForm
                    title={`Edit ${editBill.invoiceNo}`}
                    initial={editBill}
                    menuItems={menuOptions}
                    pastBills={bills}
                    onSave={handleEdit}
                    onCancel={() => setEditBill(null)}
                />
            )}

            {/* Bills list */}
            <div className="glass-card" style={{ padding: 24 }}>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Bill #</th>
                                <th>Customer / Table</th>
                                <th>Date</th>
                                <th>Order Type</th>
                                <th>Payment</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.map(bill => (
                                <tr key={bill.id}>
                                    <td style={{ fontWeight: 600, color: '#f97316' }}>{bill.invoiceNo}</td>
                                    <td>
                                        <div>
                                            <p style={{ color: '#f1f5f9', fontWeight: 500, fontSize: 13 }}>{bill.client}</p>
                                            {bill.tableNo && <p style={{ color: '#64748b', fontSize: 11 }}>{bill.tableNo}</p>}
                                        </div>
                                    </td>
                                    <td style={{ color: '#94a3b8' }}>{new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                    <td>
                                        {bill.orderType && (
                                            <span style={{ fontSize: 12, fontWeight: 600, color: ORDER_TYPE_COLORS[bill.orderType] ?? '#94a3b8', background: `${ORDER_TYPE_COLORS[bill.orderType] ?? '#64748b'}18`, padding: '3px 8px', borderRadius: 999 }}>
                                                {bill.orderType}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {bill.paymentMode && (
                                            <span style={{ fontSize: 12, fontWeight: 600, color: PAYMENT_COLORS[bill.paymentMode] ?? '#94a3b8', background: `${PAYMENT_COLORS[bill.paymentMode] ?? '#64748b'}18`, padding: '3px 8px', borderRadius: 999 }}>
                                                {bill.paymentMode}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 700, color: '#f1f5f9' }}>₹{getTotal(bill.items).toLocaleString('en-IN')}</td>
                                    <td><Badge variant={bill.status === 'Paid' ? 'success' : bill.status === 'Cancelled' ? 'danger' : 'warning'}>{bill.status}</Badge></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <button onClick={() => setPreview(bill)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                                                <Eye size={12} /> View
                                            </button>
                                            <button onClick={() => { setShowForm(false); setEditBill(bill); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                                                <Edit2 size={12} /> Edit
                                            </button>
                                            {bill.status !== 'Cancelled' && (
                                            <button onClick={() => toggleInvoiceStatus(bill.id)} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: bill.status === 'Paid' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)', border: bill.status === 'Paid' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(34,197,94,0.2)', color: bill.status === 'Paid' ? '#f59e0b' : '#22c55e' }}>
                                                <Check size={12} /> {bill.status === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                                            </button>
                                            )}
                                            <Link href={`/bills/${bill.id}`} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#fb923c', textDecoration: 'none' }}>
                                                <ReceiptText size={12} /> Receipt
                                            </Link>
                                            <button
                                                onClick={() => { if (window.confirm(`Cancel bill ${bill.invoiceNo}? This cannot be undone.`)) updateInvoice(bill.id, { status: 'Cancelled' }); }}
                                                disabled={bill.status === 'Paid' || bill.status === 'Cancelled'}
                                                title={bill.status === 'Paid' ? 'Cannot cancel a paid bill' : bill.status === 'Cancelled' ? 'Bill already cancelled' : 'Cancel bill'}
                                                style={{ padding: '6px 10px', borderRadius: 8, background: (bill.status === 'Paid' || bill.status === 'Cancelled') ? 'rgba(100,116,139,0.08)' : 'rgba(239,68,68,0.1)', border: `1px solid ${(bill.status === 'Paid' || bill.status === 'Cancelled') ? 'rgba(100,116,139,0.15)' : 'rgba(239,68,68,0.25)'}`, color: (bill.status === 'Paid' || bill.status === 'Cancelled') ? '#475569' : '#ef4444', cursor: (bill.status === 'Paid' || bill.status === 'Cancelled') ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, opacity: (bill.status === 'Paid' || bill.status === 'Cancelled') ? 0.5 : 1 }}
                                            >
                                                <Ban size={12} /> Cancel
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {bills.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', color: '#475569', padding: '40px 0', fontSize: 14 }}>
                                        No bills yet. Click "New Bill" to create one.
                                    </td>
                                </tr>
                            )}
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
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ReceiptText size={20} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{preview.invoiceNo}</h2>
                                <p style={{ fontSize: 12, color: '#64748b' }}>Synplix</p>
                            </div>
                            <div style={{ marginLeft: 'auto' }}><Badge variant={preview.status === 'Paid' ? 'success' : 'warning'}>{preview.status}</Badge></div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
                            <div>
                                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>CUSTOMER</p>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{preview.client}</p>
                                {preview.tableNo && <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Table: {preview.tableNo}</p>}
                                {preview.clientPhone && <p style={{ fontSize: 12, color: '#64748b' }}>{preview.clientPhone}</p>}
                            </div>
                            <div>
                                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>DETAILS</p>
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>{new Date(preview.date).toLocaleDateString('en-IN')}</p>
                                {preview.orderType && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Type: {preview.orderType}</p>}
                                {preview.paymentMode && <p style={{ fontSize: 12, color: '#94a3b8' }}>Payment: {preview.paymentMode}</p>}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 18, marginBottom: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 100px', gap: 8, fontSize: 11, color: '#64748b', fontWeight: 600, padding: '0 4px 8px' }}>
                                <span>Item</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Price</span><span style={{ textAlign: 'right' }}>Total</span>
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

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, alignItems: 'flex-end' }}>
                            <Link href={`/bills/${preview.id}`} style={{ padding: '9px 16px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <ReceiptText size={13} /> Print Receipt
                            </Link>
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
