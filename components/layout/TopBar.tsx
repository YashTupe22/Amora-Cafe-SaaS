'use client';

import { Bell, Search, Menu, LogOut, Settings, X, LayoutDashboard, FileText, ArrowLeftRight, Boxes, Users, CheckCircle, XCircle, CreditCard, TrendingDown, Info, Trash2, MapPin, Phone, Building2, Crown, CalendarClock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/appStore';
import type { AppNotificationType } from '@/lib/appStore';
import { useSubscription } from '@/hooks/useSubscription';

// ── Notification helpers ─────────────────────────────────────────────────────

function timeAgo(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return 'just now';
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function notifIcon(type: AppNotificationType) {
  const s = 15;
  switch (type) {
    case 'bill_paid':     return <CheckCircle  size={s} color="#22c55e" />;
    case 'bill_cancelled':return <XCircle      size={s} color="#ef4444" />;
    case 'subscription':  return <CreditCard   size={s} color="#a78bfa" />;
    case 'new_bill':      return <FileText     size={s} color="#38bdf8" />;
    case 'expense':       return <TrendingDown size={s} color="#f87171" />;
    default:              return <Info         size={s} color="#94a3b8" />;
  }
}

function notifAccent(type: AppNotificationType): string {
  switch (type) {
    case 'bill_paid':     return 'rgba(34,197,94,0.12)';
    case 'bill_cancelled':return 'rgba(239,68,68,0.12)';
    case 'subscription':  return 'rgba(167,139,250,0.12)';
    case 'new_bill':      return 'rgba(56,189,248,0.12)';
    case 'expense':       return 'rgba(248,113,113,0.12)';
    default:              return 'rgba(255,255,255,0.06)';
  }
}

interface TopBarProps {
    title: string;
    subtitle?: string;
    onMenuToggle: () => void;
}

interface SearchResult {
    type: string;
    label: string;
    sub: string;
    href: string;
    icon: React.ReactNode;
}

export default function TopBar({ title, subtitle, onMenuToggle }: TopBarProps) {
    const router = useRouter();
    const { profile, currentUser, data, logout, isOnline, notifications, unreadCount, markAllRead, dismissNotification, clearAllNotifications, updatePreferences } = useAppStore();
    const { plan, status, isActive, cancelAtPeriodEnd, currentPeriodEnd } = useSubscription();

    const [query, setQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const profileRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const results = useMemo<SearchResult[]>(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];

        const found: SearchResult[] = [];

        data.employees
            .filter(e => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach(e => found.push({ type: 'Employee', label: e.name, sub: e.role, href: '/attendance', icon: <Users size={14} /> }));

        data.invoices
            .filter(i => i.client.toLowerCase().includes(q) || i.invoiceNo.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach(i => found.push({ type: 'Invoice', label: i.invoiceNo, sub: i.client, href: '/invoices', icon: <FileText size={14} /> }));

        data.transactions
            .filter(t => t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach(t => found.push({ type: t.type, label: t.category, sub: t.note, href: '/transactions', icon: <ArrowLeftRight size={14} /> }));

        data.inventory
            .filter(i => i.name.toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q))
            .slice(0, 3)
            .forEach(i => found.push({ type: 'Inventory', label: i.name, sub: i.sku || i.category, href: '/inventory', icon: <Boxes size={14} /> }));

        return found.slice(0, 8);
    }, [query, data.employees, data.invoices, data.transactions, data.inventory]);

    const initials = (profile?.name || currentUser?.name || 'AI').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    const handleLogout = () => {
        setShowProfile(false);
        logout();
        router.replace('/');
    };

    return (
        <header style={{ height: 68, background: 'var(--topbar-bg)', borderBottom: '1px solid var(--topbar-border)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 30, gap: 12 }}>

            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <button className="menu-toggle-btn" onClick={onMenuToggle} aria-label="Toggle menu">
                    <Menu size={20} />
                </button>
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
                    {subtitle && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</p>}
                </div>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

                {/* ── Online / Offline badge ── */}
                <div
                    title={isOnline ? 'Online — all data synced' : 'Offline — changes saved locally'}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: isOnline ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${isOnline ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        borderRadius: 20, padding: '4px 9px', fontSize: 11, fontWeight: 600,
                        color: isOnline ? '#22c55e' : '#ef4444',
                        cursor: 'default', userSelect: 'none',
                        transition: 'all 0.4s ease',
                    }}
                >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444', display: 'inline-block', animation: isOnline ? 'none' : 'pulse 1.5s infinite' }} />
                    {isOnline ? 'Online' : 'Offline'}
                </div>

                {/* ── Search ── */}
                <div ref={searchRef} className="topbar-search" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--search-bg)', border: `1px solid ${showSearch ? 'var(--search-focus-border)' : 'var(--search-border)'}`, borderRadius: 10, padding: '7px 12px', transition: 'border-color 0.2s' }}>
                        <Search size={14} color="var(--text-secondary)" />
                        <input
                            id="global-search"
                            placeholder="Search…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onFocus={() => setShowSearch(true)}
                            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, width: 130 }}
                        />
                        {query && (
                            <button onClick={() => { setQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}>
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Search results dropdown */}
                    {showSearch && query.trim() && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, background: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)', borderRadius: 12, boxShadow: 'var(--dropdown-shadow)', zIndex: 100, overflow: 'hidden' }}>
                            {results.length === 0 ? (
                                <div style={{ padding: '16px 18px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>No results for &quot;{query}&quot;</div>
                            ) : (
                                <>
                                    <div style={{ padding: '10px 14px 6px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                        {results.length} result{results.length > 1 ? 's' : ''}
                                    </div>
                                    {results.map((r, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { router.push(r.href); setQuery(''); setShowSearch(false); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg-active)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        >
                                            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb923c', flexShrink: 0 }}>
                                                {r.icon}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</p>
                                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.type} · {r.sub}</p>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Notification bell ── */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => {
                            setShowNotifications(p => !p);
                            if (!showNotifications) markAllRead();
                        }}
                        style={{ width: 36, height: 36, borderRadius: 10, background: showNotifications ? 'var(--icon-btn-active-bg)' : 'var(--icon-btn-bg)', border: `1px solid ${showNotifications ? 'var(--icon-btn-active-border)' : 'var(--icon-btn-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', color: 'var(--text-secondary)', flexShrink: 0, transition: 'all 0.2s' }}
                        aria-label="Notifications"
                    >
                        <Bell size={16} />
                        {unreadCount > 0 && (
                            <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: '#f97316', boxShadow: '0 0 6px rgba(249,115,22,0.9)', fontSize: 9, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 340, background: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)', borderRadius: 14, boxShadow: 'var(--dropdown-shadow)', zIndex: 100, overflow: 'hidden' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid var(--dropdown-divider)' }}>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{notifications.length === 0 ? 'All caught up' : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}</p>
                                </div>
                                {notifications.length > 0 && (
                                    <button
                                        onClick={() => clearAllNotifications()}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: '4px 6px', borderRadius: 6, transition: 'color 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                                    >
                                        <Trash2 size={12} /> Clear all
                                    </button>
                                )}
                            </div>

                            {/* List */}
                            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                                        <Bell size={28} color="var(--empty-icon)" style={{ margin: '0 auto 10px' }} />
                                        <p style={{ fontSize: 13, color: 'var(--empty-title)', fontWeight: 600 }}>No notifications yet</p>
                                        <p style={{ fontSize: 11, color: 'var(--empty-desc)', marginTop: 4 }}>Bill payments, upgrades & more will appear here</p>
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div
                                            key={n.id}
                                            style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 14px', borderBottom: '1px solid var(--dropdown-divider)', background: n.read ? 'transparent' : 'rgba(249,115,22,0.03)', transition: 'background 0.15s' }}
                                        >
                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: notifAccent(n.type), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                {notifIcon(n.type)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{n.title}</p>
                                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                                                <p style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>{timeAgo(n.createdAt)}</p>
                                            </div>
                                            <button
                                                onClick={() => dismissNotification(n.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2, borderRadius: 4, flexShrink: 0, display: 'flex', transition: 'color 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                                                aria-label="Dismiss"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Profile avatar + dropdown ── */}
                <div ref={profileRef} style={{ position: 'relative' }}>
                    <button
                        id="profile-avatar-btn"
                        onClick={() => setShowProfile(p => !p)}
                        style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'white', cursor: 'pointer', border: showProfile ? '2px solid rgba(249,115,22,0.6)' : '2px solid transparent', boxShadow: '0 0 12px rgba(249,115,22,0.3)', transition: 'border-color 0.2s', flexShrink: 0 }}
                        aria-label="Profile menu"
                    >
                        {initials}
                    </button>

                    {showProfile && (() => {
                        const planColors: Record<string, { bg: string; border: string; text: string }> = {
                            free:       { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' },
                            starter:    { bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)',  text: '#38bdf8' },
                            pro:        { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', text: '#a78bfa' },
                            enterprise: { bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)',  text: '#fb923c' },
                        };
                        const pc = planColors[plan] || planColors.free;
                        const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
                        const daysLeft = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000)) : null;

                        return (
                        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 290, background: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)', borderRadius: 14, boxShadow: 'var(--dropdown-shadow)', zIndex: 100, overflow: 'hidden' }}>
                            {/* User info */}
                            <div style={{ padding: '16px', borderBottom: '1px solid var(--dropdown-divider)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'white', flexShrink: 0 }}>{initials}</div>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || currentUser?.name || 'User'}</p>
                                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email || currentUser?.email || ''}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Restaurant / Cafe Info */}
                            {(profile?.businessName || profile?.address || profile?.phone || profile?.gst) && (
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--dropdown-divider)' }}>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Restaurant Info</p>

                                    {profile?.businessName && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <Building2 size={13} color="#fb923c" style={{ flexShrink: 0 }} />
                                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.businessName}</p>
                                        </div>
                                    )}
                                    {profile?.address && (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                                            <MapPin size={13} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 1 }} />
                                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{profile.address}</p>
                                        </div>
                                    )}
                                    {profile?.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <Phone size={13} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                                            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{profile.phone}</p>
                                        </div>
                                    )}
                                    {profile?.gst && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <FileText size={13} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                                            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>GST: {profile.gst}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Subscription Info */}
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--dropdown-divider)' }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Subscription</p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Crown size={14} color={pc.text} />
                                    <span style={{ fontSize: 12, fontWeight: 700, color: pc.text, textTransform: 'capitalize' }}>{plan}</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text, textTransform: 'capitalize' }}>
                                        {cancelAtPeriodEnd ? 'Cancelling' : status}
                                    </span>
                                </div>

                                {plan !== 'free' && periodEnd && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CalendarClock size={13} color="var(--text-secondary)" />
                                        <div>
                                            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                                {cancelAtPeriodEnd ? 'Ends' : 'Renews'} on{' '}
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {periodEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </p>
                                            {daysLeft !== null && daysLeft <= 7 && (
                                                <p style={{ fontSize: 10, color: '#f97316', fontWeight: 600, marginTop: 2 }}>
                                                    {daysLeft === 0 ? 'Expires today!' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {plan === 'free' && (
                                    <button
                                        onClick={() => { setShowProfile(false); router.push('/pricing'); }}
                                        style={{ width: '100%', marginTop: 4, padding: '7px 0', borderRadius: 8, background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                                    >
                                        Upgrade Plan
                                    </button>
                                )}
                            </div>

                            {/* Menu items */}
                            {[
                                { id: 'profile-menu-dashboard', icon: <LayoutDashboard size={15} />, label: 'Dashboard', href: '/dashboard' },
                                { id: 'profile-menu-settings', icon: <Settings size={15} />, label: 'Settings', href: '/settings' },
                            ].map(item => (
                                <button
                                    key={item.href}
                                    id={item.id}
                                    onClick={() => { setShowProfile(false); router.push(item.href); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s, color 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}

                            <div style={{ borderTop: '1px solid var(--dropdown-divider)', margin: '4px 0' }} />

                            <button
                                id="profile-menu-logout"
                                onClick={handleLogout}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.07)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                                <LogOut size={15} />
                                Sign Out
                            </button>
                        </div>
                        );
                    })()}
                </div>
            </div>
        </header>
    );
}
