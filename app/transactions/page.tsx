'use client';

import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Badge from '@/components/ui/Badge';
import type { TransactionType } from '@/lib/mockData';
import { Plus, X, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';
import { localDate } from '@/lib/utils';

const INCOME_CATEGORIES = ['Client Payment', 'Consulting', 'Recurring', 'Other Income'];
const EXPENSE_CATEGORIES = ['Salaries', 'Infrastructure', 'Software', 'Marketing', 'Office', 'Travel', 'Misc'];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function TransactionsPage() {
    const { data, addTransaction: addTx, deleteTransaction } = useAppStore();
    const transactions = data.transactions;
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState<TransactionType>('Income');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
    const [note, setNote] = useState('');
    const [date, setDate] = useState(localDate());
    const [filterMonth, setFilterMonth] = useState<string>('All');

    const addTransaction = () => {
        if (!amount || Number(amount) <= 0) return;
        addTx({
            type: formType,
            category,
            amount: Number(amount),
            date,
            note: note.trim(),
        });
        setAmount(''); setNote(''); setDate(localDate());
        setShowForm(false);
    };

    const filtered = useMemo(() => {
        if (filterMonth === 'All') return transactions;
        return transactions.filter(t => {
            const m = new Date(t.date).getMonth();
            return MONTHS[m] === filterMonth;
        });
    }, [transactions, filterMonth]);

    const totalIn = filtered.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const totalOut = filtered.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const net = totalIn - totalOut;

    return (
        <AppLayout title="Transactions" subtitle="Track all income and expense entries">

            {/* Summary Panel */}
            <div className="rg-3" style={{ marginBottom: 24 }}>
                <div className="glass-card" style={{ padding: '18px 22px', borderColor: 'rgba(34,197,94,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <TrendingUp size={16} color="#22c55e" />
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total Income</span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#22c55e' }}>₹{totalIn.toLocaleString('en-IN')}</p>
                </div>
                <div className="glass-card" style={{ padding: '18px 22px', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <TrendingDown size={16} color="#ef4444" />
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total Expenses</span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>₹{totalOut.toLocaleString('en-IN')}</p>
                </div>
                <div className="glass-card" style={{ padding: '18px 22px', borderColor: net >= 0 ? 'rgba(249,115,22,0.2)' : 'rgba(245,158,11,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <Minus size={16} color={net >= 0 ? '#fb923c' : '#f59e0b'} />
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Net Balance</span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 800, color: net >= 0 ? '#fb923c' : '#f59e0b' }}>
                        {net >= 0 ? '+' : '-'}₹{Math.abs(net).toLocaleString('en-IN')}
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                {/* Month filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>Filter:</span>
                    <select
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        style={{
                            background: 'var(--search-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 8,
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            padding: '6px 12px',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="All">All Months</option>
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {/* Add buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => { setFormType('Income'); setCategory(INCOME_CATEGORIES[0]); setShowForm(true); }}
                        style={{ padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <Plus size={14} /> Add Income
                    </button>
                    <button
                        onClick={() => { setFormType('Expense'); setCategory(EXPENSE_CATEGORIES[0]); setShowForm(true); }}
                        style={{ padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <Plus size={14} /> Add Expense
                    </button>
                </div>
            </div>

            {/* Add Transaction Form */}
            {showForm && (
                <div className="glass-card animate-fade-in" style={{ padding: 22, marginBottom: 20, borderColor: formType === 'Income' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: formType === 'Income' ? '#22c55e' : '#ef4444' }}>
                            Add {formType}
                        </h3>
                        <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
                    </div>
                    <div className="rg-4" style={{ alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Amount (₹) *</label>
                            <input className="dark-input" type="number" min="1" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: '10px 12px', fontSize: 14 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Category</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                style={{ background: 'var(--search-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, padding: '10px 12px', width: '100%', outline: 'none' }}
                            >
                                {(formType === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Date</label>
                            <input className="dark-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '10px 12px', fontSize: 14 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Note</label>
                            <input className="dark-input" placeholder="Optional note" value={note} onChange={e => setNote(e.target.value)} style={{ padding: '10px 12px', fontSize: 14 }} onKeyDown={e => e.key === 'Enter' && addTransaction()} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <button className="glow-btn" onClick={addTransaction} style={{ padding: '10px 24px', fontSize: 14 }}>
                            <span>Save Transaction</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Transaction List */}
            <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Transactions {filterMonth !== 'All' && `— ${filterMonth}`}
                    </h2>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{filtered.length} entries</span>
                </div>
                <div className="table-scroll">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Note</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>                            <th></th>                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(tx => (
                            <tr key={tx.id}>
                                <td>
                                    <Badge variant={tx.type === 'Income' ? 'success' : 'danger'}>{tx.type}</Badge>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{tx.category}</td>
                                <td style={{ color: '#64748b', fontSize: 13 }}>{tx.note || '—'}</td>
                                <td style={{ color: '#64748b' }}>{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: tx.type === 'Income' ? '#22c55e' : '#ef4444' }}>
                                    {tx.type === 'Income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                                </td>
                                <td>
                                    <button onClick={() => { if (window.confirm('Delete this transaction?')) deleteTransaction(tx.id); }} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Trash2 size={12} /> Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: '32px 0' }}>
                                    No transactions for this period.
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
