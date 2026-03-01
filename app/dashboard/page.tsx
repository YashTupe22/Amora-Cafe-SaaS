'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/ui/StatCard';
import { TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { useAppStore } from '@/lib/appStore';
import { useSubscription } from '@/hooks/useSubscription';
import { exportDashboardPdf } from '@/lib/exportDashboardPdf';

function formatCurrency(v: number) {
    if (v < 0) return `-₹${Math.abs(v).toLocaleString('en-IN')}`;
    return `₹${v.toLocaleString('en-IN')}`;
}

type TooltipPayloadEntry = { name?: string; value?: number; color?: string };
type TooltipLikeProps = { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string };

const CustomTooltip = ({ active, payload, label }: TooltipLikeProps) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card" style={{ padding: '10px 14px', minWidth: 140, background: 'var(--navy-light)', borderColor: 'rgba(148,163,184,0.4)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
            {payload.map((entry, idx) => {
                const name = entry?.name ?? `Series ${idx + 1}`;
                const value = typeof entry?.value === 'number' ? entry.value : 0;
                const color = entry?.color ?? 'var(--text-primary)';
                return (
                    <p key={name + idx} style={{ fontSize: 13, fontWeight: 600, color }}>
                        {name}: {formatCurrency(value)}
                    </p>
                );
            })}
        </div>
    );
};

function DashboardContent() {
    const { dashboard, currentUser, profile, data } = useAppStore();
    const isDark = profile?.darkMode !== false;
    const searchParams = useSearchParams();
    const { canAccess } = useSubscription();
    const canPdf = canAccess('pdfExport');
    const [showWelcome,  setShowWelcome]  = useState(false);
    const [showUpgraded, setShowUpgraded] = useState(false);

    useEffect(() => {
        if (searchParams.get('welcome') === '1' && currentUser) {
            const t1 = window.setTimeout(() => setShowWelcome(true), 0);
            const t2 = window.setTimeout(() => setShowWelcome(false), 2600);
            return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
        }
        return;
    }, [searchParams, currentUser]);

    useEffect(() => {
        if (searchParams.get('upgraded') === '1') {
            const t1 = window.setTimeout(() => setShowUpgraded(true), 300);
            const t2 = window.setTimeout(() => setShowUpgraded(false), 5000);
            return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
        }
        return;
    }, [searchParams]);

    return (
        <AppLayout
            title="Dashboard"
            subtitle="Welcome to Synplix — here's today's snapshot."
        >
            {showWelcome && currentUser && (
                <div
                    className="glass-card"
                    style={{
                        position: 'fixed',
                        top: 20,
                        right: 24,
                        zIndex: 40,
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderRadius: 999,
                        background:
                            'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(249,115,22,0.2))',
                        border: '1px solid rgba(249,115,22,0.6)',
                        boxShadow: '0 18px 40px rgba(15,23,42,0.7)',
                        backdropFilter: 'blur(20px)',
                        animation: 'fade-down 0.35s ease-out',
                    }}
                >
                    <div
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            background: 'linear-gradient(135deg,#0ea5e9,#22c55e)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 14,
                            fontWeight: 700,
                        }}
                    >
                        {currentUser.name
                            .split(' ')
                            .map(w => w[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Welcome back,</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {currentUser.name.split(' ')[0]} 👋
                        </p>
                    </div>
                </div>
            )}
            {showUpgraded && (
                <div
                    style={{
                        position:       'fixed',
                        top:            20,
                        right:          24,
                        zIndex:         40,
                        padding:        '14px 20px',
                        display:        'flex',
                        alignItems:     'center',
                        gap:            12,
                        borderRadius:   999,
                        background:     'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.15))',
                        border:         '1px solid rgba(245,158,11,0.7)',
                        boxShadow:      '0 18px 40px rgba(15,23,42,0.7)',
                        backdropFilter: 'blur(20px)',
                        animation:      'fade-down 0.35s ease-out',
                    }}
                >
                    <span style={{ fontSize: 20 }}>🎉</span>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#fef3c7' : '#92400e', margin: 0 }}>
                            Plan upgraded successfully!
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            Your new features are now active.
                        </p>
                    </div>
                </div>
            )}
            {/* Top actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                {!canPdf && (
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                        PDF export requires <a href="/pricing" style={{ color: '#fb923c', fontWeight: 700, textDecoration: 'none' }}>Starter plan</a>
                    </span>
                )}
                <button
                    className="glow-btn"
                    style={{ padding: '9px 18px', fontSize: 13, opacity: canPdf ? 1 : 0.4, cursor: canPdf ? 'pointer' : 'not-allowed' }}
                    onClick={() => { if (canPdf) exportDashboardPdf(dashboard, profile); }}
                    disabled={!canPdf}
                >
                    <span>Download PDF</span>
                </button>
            </div>
            {/* Stat Cards */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 18,
                    marginBottom: 28,
                }}
            >
                <StatCard
                    label="Total Sales"
                    value={formatCurrency(dashboard.totalRevenue)}
                    sub="All paid bills"
                    trend={dashboard.netProfit >= 0 ? 'up' : 'down'}
                    trendValue=""
                    iconBg="linear-gradient(135deg, rgba(249,115,22,0.3), rgba(249,115,22,0.1))"
                    icon={<DollarSign size={20} color="#f97316" />}
                />
                <StatCard
                    label="Total Expenses"
                    value={formatCurrency(dashboard.totalExpenses)}
                    sub="Kitchen & operations"
                    trend="neutral"
                    trendValue=""
                    iconBg="linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))"
                    icon={<TrendingDown size={20} color="#ef4444" />}
                />
                <StatCard
                    label="Net Profit"
                    value={formatCurrency(dashboard.netProfit)}
                    sub="Sales minus expenses"
                    trend={dashboard.netProfit >= 0 ? 'up' : 'down'}
                    trendValue=""
                    iconBg="linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))"
                    icon={<TrendingUp size={20} color="#22c55e" />}
                />
                <StatCard
                    label="Pending Bills"
                    value={formatCurrency(dashboard.pendingPayments)}
                    sub="Unpaid bills"
                    trend="neutral"
                    trendValue=""
                    iconBg="linear-gradient(135deg, rgba(234,88,12,0.3), rgba(234,88,12,0.1))"
                    icon={<Clock size={20} color="#ea580c" />}
                />
            </div>

            {/* Charts Row */}
            <div className="chart-grid">
                {/* Revenue Line Chart */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 20 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Sales vs Expenses</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Last 6 months (based on transactions)</p>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={dashboard.revenueChart} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                            <CartesianGrid stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'} strokeDasharray="4 4" />
                            <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                name="Sales"
                                stroke="#f97316"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: '#fb923c' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="expenses"
                                name="Expenses"
                                stroke="#ef4444"
                                strokeWidth={2.5}
                                strokeDasharray="6 3"
                                dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: '#f87171' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Expense Pie Chart */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Expense Breakdown</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>By category</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={dashboard.expensePie}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={88}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {dashboard.expensePie.map(entry => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                                <Tooltip
                                    formatter={(v: unknown, name: unknown) => [`₹${Number(v).toLocaleString('en-IN')}`, String(name)]}
                                    contentStyle={{
                                        background: 'var(--navy-light)',
                                        border: '1px solid rgba(148,163,184,0.4)',
                                        borderRadius: 8,
                                        color: 'var(--text-primary)',
                                        fontSize: 13,
                                    }}
                                />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Legend */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                        {dashboard.expensePie.map(item => (
                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</span>
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
                                    ₹{item.value.toLocaleString('en-IN')}
                                </span>
                            </div>
                        ))}
                        {dashboard.expensePie.length === 0 && (
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>No expense data yet. Add expenses from Transactions or Expenses page.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row — Last 5 Transactions + Top Clients */}
            <div className="chart-grid" style={{ marginTop: 0 }}>
                {/* Last 5 Transactions */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Last 5 Transactions</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Most recent activity</p>
                    </div>
                    {(() => {
                        const last5 = [...(data.transactions ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
                        if (last5.length === 0) return (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', paddingTop: 8 }}>No transactions yet.</p>
                        );
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {last5.map((tx, idx) => (
                                    <div
                                        key={tx.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '11px 0',
                                            borderBottom: idx < last5.length - 1 ? '1px solid var(--glass-border)' : 'none',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div
                                                style={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 8,
                                                    background: tx.type === 'Income' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 14,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {tx.type === 'Income' ? '↗' : '↙'}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                                    {tx.note || tx.category}
                                                </p>
                                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} · {tx.category}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 700,
                                                color: tx.type === 'Income' ? '#22c55e' : '#ef4444',
                                                flexShrink: 0,
                                                marginLeft: 8,
                                            }}
                                        >
                                            {tx.type === 'Income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                {/* Top Clients */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Top Customers (by Bill Value)</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Ranked by total amount paid</p>
                    </div>
                    {(() => {
                        const clientMap = new Map<string, number>();
                        (data.invoices ?? []).filter(i => i.status === 'Paid').forEach(inv => {
                            const total = inv.items.reduce((s, it) => s + it.qty * it.price, 0);
                            clientMap.set(inv.client, (clientMap.get(inv.client) ?? 0) + total);
                        });
                        const sorted = Array.from(clientMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
                        if (sorted.length === 0) return (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', paddingTop: 8 }}>No paid bills yet.</p>
                        );
                        const max = sorted[0][1];
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                                {sorted.map(([client, revenue], idx) => (
                                    <div key={client}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span
                                                    style={{
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: 6,
                                                        background: idx === 0 ? 'rgba(245,158,11,0.2)' : 'rgba(249,115,22,0.1)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        color: idx === 0 ? '#f59e0b' : '#fb923c',
                                                    }}
                                                >
                                                    {idx + 1}
                                                </span>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{client}</span>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                                                ₹{revenue.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 3, background: 'var(--glass-border)', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    width: `${Math.round((revenue / max) * 100)}%`,
                                                    height: '100%',
                                                    borderRadius: 3,
                                                    background: idx === 0
                                                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                                        : 'linear-gradient(90deg, #f97316, #ea580c)',
                                                    transition: 'width 0.4s ease',
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </AppLayout>
    );
}

export default function DashboardPage() {
    return (
        <Suspense>
            <DashboardContent />
        </Suspense>
    );
}
