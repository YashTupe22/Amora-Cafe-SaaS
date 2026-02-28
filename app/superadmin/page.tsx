'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Crown, Search, RefreshCw, Edit3, Trash2, ChevronRight,
  Building2, Phone, MapPin, FileText, Calendar, CheckCircle,
  XCircle, AlertTriangle, Shield, LogOut, Save, X, Activity,
} from 'lucide-react';
import { useAppStore } from '@/lib/appStore';
import { auth } from '@/lib/firebase';

const ADMIN_EMAIL = 'yashrtupe01@gmail.com';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubData {
  plan:              string;
  status:            string;
  billingCycle:      string | null;
  currentPeriodEnd:  string | null;
  cancelAtPeriodEnd: boolean;
  razorpaySubId:     string | null;
  razorpayCustomerId: string | null;
  updatedAt:         string | null;
}

interface UserRow {
  uid:          string;
  name:         string;
  email:        string;
  businessName: string;
  phone:        string;
  gst:          string;
  address:      string;
  createdAt:    string | null;
  onboardingComplete: boolean;
  subscription: SubData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getIdToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

// ── Plan colours ──────────────────────────────────────────────────────────────

const planStyle: Record<string, { bg: string; border: string; text: string }> = {
  free:       { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.35)', text: '#94a3b8' },
  starter:    { bg: 'rgba(56,189,248,0.15)',  border: 'rgba(56,189,248,0.35)',  text: '#38bdf8' },
  pro:        { bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.35)', text: '#a78bfa' },
  enterprise: { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.35)',  text: '#fb923c' },
};

const statusStyle: Record<string, { bg: string; text: string }> = {
  active:    { bg: 'rgba(34,197,94,0.12)',  text: '#22c55e' },
  trialing:  { bg: 'rgba(56,189,248,0.12)', text: '#38bdf8' },
  past_due:  { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
  halted:    { bg: 'rgba(249,115,22,0.12)', text: '#fb923c' },
  cancelled: { bg: 'rgba(239,68,68,0.12)',  text: '#ef4444' },
};

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditSubModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: (uid: string, sub: SubData) => void;
}) {
  const sub = user.subscription;
  const [plan, setPlan]           = useState(sub.plan);
  const [status, setStatus]       = useState(sub.status);
  const [cycle, setCycle]         = useState(sub.billingCycle ?? 'monthly');
  const [periodEnd, setPeriodEnd] = useState(
    sub.currentPeriodEnd ? sub.currentPeriodEnd.slice(0, 10) : ''
  );
  const [cancelAtEnd, setCancelAtEnd] = useState(sub.cancelAtPeriodEnd);
  const [razorSubId, setRazorSubId]   = useState(sub.razorpaySubId ?? '');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/api/superadmin/subscription/${user.uid}`, {
        method: 'PATCH',
        body: JSON.stringify({
          plan,
          status,
          billingCycle:      plan === 'free' ? null : cycle,
          currentPeriodEnd:  periodEnd ? new Date(periodEnd).toISOString() : null,
          cancelAtPeriodEnd: cancelAtEnd,
          razorpaySubId:     razorSubId || null,
        }),
      });
      onSaved(user.uid, {
        ...sub,
        plan,
        status,
        billingCycle:      plan === 'free' ? null : cycle,
        currentPeriodEnd:  periodEnd ? new Date(periodEnd).toISOString() : null,
        cancelAtPeriodEnd: cancelAtEnd,
        razorpaySubId:     razorSubId || null,
        updatedAt:         new Date().toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    color: '#f1f5f9', fontSize: 13, outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#475569',
    letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5, display: 'block',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, boxShadow: '0 30px 80px rgba(0,0,0,0.7)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Edit Subscription</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{user.name} · {user.email}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['free', 'starter', 'pro', 'enterprise'].map(p => (
                  <option key={p} value={p} style={{ background: '#0f172a' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['active', 'trialing', 'past_due', 'halted', 'cancelled'].map(s => (
                  <option key={s} value={s} style={{ background: '#0f172a' }}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {plan !== 'free' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Billing Cycle</label>
                <select value={cycle} onChange={e => setCycle(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="monthly" style={{ background: '#0f172a' }}>Monthly</option>
                  <option value="annual"  style={{ background: '#0f172a' }}>Annual</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Period End Date</label>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>
            </div>
          )}

          {plan !== 'free' && (
            <div>
              <label style={labelStyle}>Razorpay Subscription ID</label>
              <input value={razorSubId} onChange={e => setRazorSubId(e.target.value)} placeholder="sub_xxxxxxxxxxxxx" style={inputStyle} />
            </div>
          )}

          {plan !== 'free' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={() => setCancelAtEnd(p => !p)}
                style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: cancelAtEnd ? '#ef4444' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${cancelAtEnd ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
                  position: 'relative', transition: 'all 0.2s', cursor: 'pointer',
                }}
              >
                <div style={{ position: 'absolute', top: 3, left: cancelAtEnd ? 18 : 3, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 12, color: cancelAtEnd ? '#ef4444' : '#94a3b8' }}>Cancel at period end</span>
            </label>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#ef4444' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, background: saving ? '#374151' : 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { currentUser, logout } = useAppStore();
  const router = useRouter();

  const [authed, setAuthed]         = useState<'checking' | 'ok' | 'denied'>('checking');
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [loadError, setLoadError]   = useState('');
  const [selected, setSelected]     = useState<UserRow | null>(null);
  const [editUser, setEditUser]     = useState<UserRow | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [tab, setTab]               = useState<'customers' | 'subscriptions'>('customers');

  // ── Auth gate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) { setAuthed('denied'); return; }
    if (currentUser.email === ADMIN_EMAIL) { setAuthed('ok'); }
    else { setAuthed('denied'); }
  }, [currentUser]);

  // ── Load users ───────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiFetch('/api/superadmin/users');
      setUsers(data.users ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed === 'ok') loadUsers();
  }, [authed, loadUsers]);

  // ── Delete subscription ──────────────────────────────────────────────────────
  const handleDeleteSub = async (uid: string) => {
    if (!confirm('Remove subscription? User will be downgraded to Free plan.')) return;
    setDeleting(uid);
    try {
      await apiFetch(`/api/superadmin/subscription/${uid}`, { method: 'DELETE' });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, subscription: { plan: 'free', status: 'active', billingCycle: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, razorpaySubId: null, razorpayCustomerId: null, updatedAt: null } } : u));
      if (selected?.uid === uid) setSelected(prev => prev ? { ...prev, subscription: { plan: 'free', status: 'active', billingCycle: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, razorpaySubId: null, razorpayCustomerId: null, updatedAt: null } } : null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete subscription');
    } finally {
      setDeleting(null);
    }
  };

  // ── Sub saved ─────────────────────────────────────────────────────────────────
  const handleSubSaved = (uid: string, sub: SubData) => {
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, subscription: sub } : u));
    if (selected?.uid === uid) setSelected(prev => prev ? { ...prev, subscription: sub } : null);
    setEditUser(null);
  };

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.businessName.toLowerCase().includes(q) ||
      u.subscription.plan.includes(q)
    );
  });

  const subscriptionFiltered = tab === 'subscriptions'
    ? filtered.filter(u => u.subscription.plan !== 'free')
    : filtered;

  // ── Counts ────────────────────────────────────────────────────────────────────
  const counts = {
    total:      users.length,
    paid:       users.filter(u => u.subscription.plan !== 'free').length,
    free:       users.filter(u => u.subscription.plan === 'free').length,
    cancelling: users.filter(u => u.subscription.cancelAtPeriodEnd).length,
  };

  // ── DENIED ───────────────────────────────────────────────────────────────────
  if (authed === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1a' }}>
        <p style={{ color: '#334155', fontSize: 14 }}>Verifying access…</p>
      </div>
    );
  }

  if (authed === 'denied') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1a', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={28} color="#ef4444" />
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Access Denied</p>
        <p style={{ fontSize: 13, color: '#475569', maxWidth: 300, textAlign: 'center' }}>
          This area is restricted to the system owner only. If you believe this is an error, contact support.
        </p>
        <button
          onClick={() => router.replace('/dashboard')}
          style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── AUTHED PAGE ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', color: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <header style={{ height: 64, background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>Super Admin</p>
            <p style={{ fontSize: 11, color: '#475569' }}>Amora Café — Owner Dashboard</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#475569' }}>{ADMIN_EMAIL}</span>
          <button
            onClick={() => { logout(); router.replace('/'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </header>

      <div style={{ flex: 1, padding: '28px 24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Users',  value: counts.total,      icon: <Users size={18} />,         color: '#38bdf8' },
            { label: 'Paid Plans',   value: counts.paid,       icon: <Crown size={18} />,         color: '#a78bfa' },
            { label: 'Free Plan',    value: counts.free,       icon: <Activity size={18} />,      color: '#94a3b8' },
            { label: 'Cancelling',   value: counts.cancelling, icon: <AlertTriangle size={18} />, color: '#fbbf24' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{stat.label}</span>
                <div style={{ color: stat.color }}>{stat.icon}</div>
              </div>
              <p style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs + Search + Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 4 }}>
            {(['customers', 'subscriptions'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ padding: '7px 16px', borderRadius: 7, background: tab === t ? 'rgba(249,115,22,0.15)' : 'none', border: tab === t ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent', color: tab === t ? '#fb923c' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}
              >
                {t === 'customers' ? `All Customers (${counts.total})` : `Paid Subscriptions (${counts.paid})`}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, padding: '8px 13px' }}>
              <Search size={13} color="#475569" />
              <input
                placeholder="Search users…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: 13, width: 170 }}
              />
            </div>
            <button
              onClick={loadUsers}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#94a3b8', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {loadError && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            {loadError}
          </div>
        )}

        {/* Main content — two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr', gap: 16 }}>

          {/* User list */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
                {subscriptionFiltered.length} user{subscriptionFiltered.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ maxHeight: 580, overflowY: 'auto' }}>
              {loading && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#334155' }}>Loading users…</div>
              )}
              {!loading && subscriptionFiltered.length === 0 && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#334155' }}>No users found.</div>
              )}
              {!loading && subscriptionFiltered.map(u => {
                const pc = planStyle[u.subscription.plan] ?? planStyle.free;
                const sc = statusStyle[u.subscription.status] ?? statusStyle.active;
                const isSelected = selected?.uid === u.uid;
                return (
                  <div
                    key={u.uid}
                    onClick={() => setSelected(isSelected ? null : u)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: isSelected ? 'rgba(249,115,22,0.06)' : 'transparent', transition: 'background 0.15s', borderLeft: isSelected ? '3px solid #f97316' : '3px solid transparent' }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0 }}>
                        {(u.name || u.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || '—'}</p>
                        <p style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                        {u.businessName && <p style={{ fontSize: 10, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.businessName}</p>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text, textTransform: 'capitalize' }}>
                        {u.subscription.plan}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: sc.bg, color: sc.text }}>
                        {u.subscription.status}
                      </span>
                      <ChevronRight size={14} color={isSelected ? '#f97316' : '#334155'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', alignSelf: 'start' }}>

              {/* Panel header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>User Detail</p>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Profile */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>Profile</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 11, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'white' }}>
                      {(selected.name || selected.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{selected.name || '—'}</p>
                      <p style={{ fontSize: 12, color: '#64748b' }}>{selected.email}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.businessName && (
                      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                        <Building2 size={13} color="#fb923c" />
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{selected.businessName}</span>
                      </div>
                    )}
                    {selected.phone && (
                      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                        <Phone size={13} color="#64748b" />
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{selected.phone}</span>
                      </div>
                    )}
                    {selected.address && (
                      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                        <MapPin size={13} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{selected.address}</span>
                      </div>
                    )}
                    {selected.gst && (
                      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                        <FileText size={13} color="#64748b" />
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>GST: {selected.gst}</span>
                      </div>
                    )}
                    {selected.createdAt && (
                      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                        <Calendar size={13} color="#64748b" />
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          Joined {new Date(selected.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                      {selected.onboardingComplete ? <CheckCircle size={13} color="#22c55e" /> : <XCircle size={13} color="#64748b" />}
                      <span style={{ fontSize: 12, color: selected.onboardingComplete ? '#22c55e' : '#475569' }}>
                        Onboarding {selected.onboardingComplete ? 'complete' : 'incomplete'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                {/* Subscription */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Subscription</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setEditUser(selected)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#fb923c', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                      {selected.subscription.plan !== 'free' && (
                        <button
                          onClick={() => handleDeleteSub(selected.uid)}
                          disabled={deleting === selected.uid}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: deleting === selected.uid ? 'not-allowed' : 'pointer' }}
                        >
                          <Trash2 size={11} /> {deleting === selected.uid ? '…' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const sub = selected.subscription;
                    const pc = planStyle[sub.plan] ?? planStyle.free;
                    const sc = statusStyle[sub.status] ?? statusStyle.active;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text, textTransform: 'capitalize' }}>
                            <Crown size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                            {sub.plan}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: sc.bg, color: sc.text }}>
                            {sub.status}
                          </span>
                          {sub.billingCycle && (
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: '#64748b', textTransform: 'capitalize' }}>
                              {sub.billingCycle}
                            </span>
                          )}
                          {sub.cancelAtPeriodEnd && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                              Cancelling
                            </span>
                          )}
                        </div>
                        {sub.currentPeriodEnd && (
                          <p style={{ fontSize: 12, color: '#64748b' }}>
                            {sub.cancelAtPeriodEnd ? 'Ends' : 'Renews'}{' '}
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                              {new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </p>
                        )}
                        {sub.razorpaySubId && (
                          <p style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            Sub ID: {sub.razorpaySubId}
                          </p>
                        )}
                        {sub.razorpayCustomerId && (
                          <p style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            Customer ID: {sub.razorpayCustomerId}
                          </p>
                        )}
                        {sub.updatedAt && (
                          <p style={{ fontSize: 11, color: '#1e293b' }}>
                            Last updated: {new Date(sub.updatedAt).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* UID */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                  <p style={{ fontSize: 10, color: '#1e293b' }}>UID</p>
                  <p style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 3 }}>{selected.uid}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editUser && (
        <EditSubModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={handleSubSaved}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select option { background: #0f172a; }
      `}</style>
    </div>
  );
}
