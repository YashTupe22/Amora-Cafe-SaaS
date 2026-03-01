'use client';

import { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Badge from '@/components/ui/Badge';
import { useAppStore } from '@/lib/appStore';
import { localDate } from '@/lib/utils';
import { Plus, X, TrendingDown, Trash2 } from 'lucide-react';

const EXPENSE_CATEGORIES = ['Salaries', 'Infrastructure', 'Software', 'Marketing', 'Office', 'Travel', 'Misc'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ExpensesPage() {
  const { data, addTransaction, deleteTransaction } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(localDate());
  const [filterMonth, setFilterMonth] = useState<string>('All');

  const expenses = useMemo(() => data.transactions.filter(t => t.type === 'Expense'), [data.transactions]);

  const filtered = useMemo(() => {
    const base = expenses;
    if (filterMonth === 'All') return base;
    return base.filter(t => MONTHS[new Date(t.date).getMonth()] === filterMonth);
  }, [expenses, filterMonth]);

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const saveExpense = () => {
    if (!amount || Number(amount) <= 0) return;
    addTransaction({
      type: 'Expense',
      category,
      amount: Number(amount),
      date,
      note: note.trim(),
    });
    setAmount('');
    setNote('');
    setDate(localDate());
    setShowForm(false);
  };

  return (
    <AppLayout title="Expenses" subtitle="Track and categorize all business expenses">
      {/* Summary */}
      <div className="glass-card" style={{ padding: '18px 22px', borderColor: 'rgba(239,68,68,0.2)', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <TrendingDown size={16} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                Total Expenses {filterMonth !== 'All' ? `— ${filterMonth}` : ''}
              </span>
            </div>
            <p style={{ fontSize: 26, fontWeight: 900, color: '#ef4444' }}>₹{total.toLocaleString('en-IN')}</p>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{filtered.length} entries</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              style={{
                background: 'var(--search-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 13,
                padding: '8px 12px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Months</option>
              {MONTHS.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setCategory(EXPENSE_CATEGORIES[0]);
                setShowForm(true);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} /> Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="glass-card animate-fade-in" style={{ padding: 22, marginBottom: 20, borderColor: 'rgba(239,68,68,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>Add Expense</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={16} />
            </button>
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
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Date</label>
              <input className="dark-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '10px 12px', fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Note</label>
              <input
                className="dark-input"
                placeholder="Optional note"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ padding: '10px 12px', fontSize: 14 }}
                onKeyDown={e => e.key === 'Enter' && saveExpense()}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, gap: 10 }}>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--icon-btn-bg)', border: '1px solid var(--icon-btn-border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
            >
              Cancel
            </button>
            <button className="glow-btn" onClick={saveExpense} style={{ padding: '10px 24px', fontSize: 14 }}>
              <span>Save Expense</span>
            </button>
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
            Expenses {filterMonth !== 'All' && `— ${filterMonth}`}
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
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(tx => (
              <tr key={tx.id}>
                <td>
                  <Badge variant="danger">Expense</Badge>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{tx.category}</td>
                <td style={{ color: '#64748b', fontSize: 13 }}>{tx.note || '—'}</td>
                <td style={{ color: '#64748b' }}>{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>
                  -₹{tx.amount.toLocaleString('en-IN')}
                </td>
                <td>
                  <button onClick={() => { if (window.confirm('Delete this expense?')) deleteTransaction(tx.id); }} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={12} /> Remove
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: '32px 0' }}>
                  No expenses for this period.
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

