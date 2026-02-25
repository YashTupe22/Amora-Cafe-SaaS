'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/appStore';
import type { InvoiceItem } from '@/lib/mockData';

function calcTotals(items: InvoiceItem[], gstRate = 5) {
    const subTotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const gstAmount = Math.round((subTotal * gstRate) / 100);
    const half = gstAmount / 2;
    const grandTotal = subTotal + gstAmount;
    return { subTotal, gstRate, gstAmount, cgst: half, sgst: half, grandTotal };
}

export default function BillReceiptPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { data } = useAppStore();

    const bill = useMemo(
        () => data.invoices.find(inv => inv.id === params.id),
        [data.invoices, params.id],
    );

    if (!bill) {
        return (
            <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Bill not found</p>
                    <button onClick={() => router.push('/bills')} style={{ padding: '10px 18px', borderRadius: 999, border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 }}>
                        Back to Bills
                    </button>
                </div>
            </div>
        );
    }

    const { businessProfile } = data;
    const totals = calcTotals(bill.items);

    return (
        <div style={{ minHeight: '100vh', background: '#020617', padding: '32px 16px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 680, fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', color: '#020617' }}>

                {/* Controls (screen only, not printed) */}
                <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 16, justifyContent: 'flex-end' }}>
                    <button onClick={() => router.push('/bills')} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
                        ← Back
                    </button>
                    <button onClick={() => window.print()} style={{ padding: '9px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#f97316,#ef4444)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                        🖨 Print Receipt
                    </button>
                </div>

                {/* Receipt card */}
                <div style={{ background: 'white', borderRadius: 10, boxShadow: '0 25px 60px rgba(15,23,42,0.6)', overflow: 'hidden' }}>

                    {/* Header banner */}
                    <div style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', padding: '22px 28px', color: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>
                                    {businessProfile.businessName || 'Synplix'}
                                </h1>
                                <p style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>{businessProfile.address || 'Your Cafe Address'}</p>
                                {businessProfile.phone && <p style={{ fontSize: 12, opacity: 0.8 }}>📞 {businessProfile.phone}</p>}
                                {businessProfile.gst && <p style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>GSTIN: {businessProfile.gst}</p>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 14px', display: 'inline-block' }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, margin: 0 }}>BILL NO.</p>
                                    <p style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{bill.invoiceNo}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '20px 28px 28px' }}>
                        {/* Meta row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '14px 0', borderBottom: '2px dashed #e2e8f0', marginBottom: 18 }}>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Customer</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{bill.client}</p>
                                {bill.tableNo && <p style={{ fontSize: 11, color: '#64748b' }}>Table: {bill.tableNo}</p>}
                                {bill.clientPhone && <p style={{ fontSize: 11, color: '#64748b' }}>{bill.clientPhone}</p>}
                            </div>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Date & Time</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                    {new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                                {bill.orderType && (
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: bill.orderType === 'Dine-In' ? '#dcfce7' : bill.orderType === 'Takeaway' ? '#fef3c7' : '#ede9fe', color: bill.orderType === 'Dine-In' ? '#15803d' : bill.orderType === 'Takeaway' ? '#92400e' : '#6d28d9' }}>
                                        {bill.orderType}
                                    </span>
                                )}
                            </div>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Payment</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{bill.paymentMode ?? '—'}</p>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: bill.status === 'Paid' ? '#dcfce7' : '#fef3c7', color: bill.status === 'Paid' ? '#15803d' : '#92400e' }}>
                                    {bill.status}
                                </span>
                            </div>
                        </div>

                        {/* Items table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 0 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>Item</th>
                                    <th style={{ textAlign: 'center', padding: '8px 10px', color: '#64748b', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
                                    <th style={{ textAlign: 'right', padding: '8px 10px', color: '#64748b', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>Rate</th>
                                    <th style={{ textAlign: 'right', padding: '8px 10px', color: '#64748b', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.items.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 10px', fontWeight: 600, color: '#0f172a' }}>{item.description}</td>
                                        <td style={{ padding: '10px 10px', textAlign: 'center', color: '#475569' }}>{item.qty}</td>
                                        <td style={{ padding: '10px 10px', textAlign: 'right', color: '#475569' }}>₹{item.price.toLocaleString('en-IN')}</td>
                                        <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{(item.qty * item.price).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals section */}
                        <div style={{ marginTop: 16, borderTop: '2px solid #f1f5f9', paddingTop: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ minWidth: 260 }}>
                                    {[
                                        { label: 'Sub Total', value: totals.subTotal },
                                        { label: `CGST (${totals.gstRate / 2}%)`, value: totals.cgst },
                                        { label: `SGST (${totals.gstRate / 2}%)`, value: totals.sgst },
                                    ].map(row => (
                                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#64748b' }}>
                                            <span>{row.label}</span>
                                            <span style={{ fontWeight: 600 }}>₹{row.value.toLocaleString('en-IN')}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', borderTop: '2px solid #e2e8f0', marginTop: 6, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                                        <span>TOTAL</span>
                                        <span style={{ color: '#ea580c' }}>₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px dashed #e2e8f0', textAlign: 'center' }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#f97316', marginBottom: 4 }}>Thank you for dining with us! 🍽</p>
                            <p style={{ fontSize: 11, color: '#94a3b8' }}>This is a computer-generated receipt. No signature required.</p>
                            {businessProfile.gst && (
                                <p style={{ fontSize: 10, color: '#cbd5e1', marginTop: 4 }}>GSTIN: {businessProfile.gst} | Place of Supply: Maharashtra</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    div[style*="background: #020617"] { background: white !important; padding: 0 !important; }
                }
            `}</style>
        </div>
    );
}
