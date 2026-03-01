'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    ReceiptText,
    ArrowLeftRight,
    Wallet,
    Boxes,
    Settings,
    LogOut,
    Zap,
    BookOpen,
    X,
    Crown,
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/lib/appStore';
import { useTranslation } from '@/lib/i18n';
import { useSubscription } from '@/hooks/useSubscription';

const NAV_ITEMS = [
    { href: '/dashboard',  key: 'nav.dashboard'  as const, icon: LayoutDashboard },
    { href: '/attendance', key: 'nav.attendance' as const, icon: Users },
    { href: '/bills',      key: 'nav.bills'      as const, icon: ReceiptText },
    { href: '/catalogue',  key: 'nav.catalogue'  as const, icon: BookOpen },
    { href: '/transactions', key: 'nav.transactions' as const, icon: ArrowLeftRight },
    { href: '/inventory',  key: 'nav.inventory'  as const, icon: Boxes },
    { href: '/expenses',   key: 'nav.expenses'   as const, icon: Wallet },
    { href: '/settings',   key: 'nav.settings'   as const, icon: Settings },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAppStore();
    const { t } = useTranslation();
    const { plan } = useSubscription();

    const PLAN_COLORS: Record<string, string> = {
      free:       '#64748b',
      starter:    '#3b82f6',
      pro:        '#f59e0b',
      enterprise: '#8b5cf6',
    };
    const planColor  = PLAN_COLORS[plan] ?? '#64748b';
    const planLabel  = plan.charAt(0).toUpperCase() + plan.slice(1);
    const showUpgrade = plan === 'free' || plan === 'starter';

    return (
        <aside className={clsx('sidebar', isOpen && 'sidebar--open')}>
            {/* Close button — visible on mobile */}
            <button
                className="sidebar-close-btn"
                onClick={onClose}
                aria-label="Close menu"
            >
                <X size={20} />
            </button>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, paddingLeft: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(249,115,22,0.5)', flexShrink: 0 }}>
                    <Zap size={18} color="white" />
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>Synplix</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.2 }}>Business Suite v1.1</div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 6 }}>
                    {t('nav.mainMenu')}
                </div>
                {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={clsx('nav-link', active && 'active')}
                            onClick={onClose}
                        >
                            <Icon size={17} />
                            {t(key)}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div style={{ borderTop: '1px solid var(--dropdown-divider)', paddingTop: 16 }}>
                {/* Plan badge */}
                <div
                    style={{
                        display:      'flex',
                        alignItems:   'center',
                        justifyContent: 'space-between',
                        padding:      '8px 10px',
                        marginBottom: 10,
                        background:   `rgba(${planColor === '#f59e0b' ? '245,158,11' : planColor === '#3b82f6' ? '59,130,246' : planColor === '#8b5cf6' ? '139,92,246' : '100,116,139'},0.12)`,
                        borderRadius: 9,
                        border:       `1px solid ${planColor}33`,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Crown size={13} color={planColor} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: planColor }}>{planLabel} Plan</span>
                    </div>
                    {showUpgrade && (
                        <Link
                            href="/pricing"
                            onClick={onClose}
                            style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textDecoration: 'none', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 5 }}
                        >
                            Upgrade
                        </Link>
                    )}
                </div>
                <button
                    type="button"
                    className="nav-link"
                    onClick={() => {
                        logout();
                        router.replace('/');
                        onClose();
                    }}
                    style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                >
                    <LogOut size={17} />
                    {t('nav.logout')}
                </button>
            </div>
        </aside>
    );
}
