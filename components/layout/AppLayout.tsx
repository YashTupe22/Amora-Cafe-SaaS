'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAppStore } from '@/lib/appStore';

interface AppLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
    const { ready, currentUser } = useAppStore();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const closeSidebar = useCallback(() => setSidebarOpen(false), []);
    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

    const { profile } = useAppStore();

    useEffect(() => {
        if (!ready) return;
        if (!currentUser) { router.replace('/'); return; }
        if (profile && !profile.onboardingComplete) { router.replace('/onboarding'); }
    }, [ready, currentUser, profile, router]);

    // Close sidebar on route change (mobile UX)
    useEffect(() => {
        const t = window.setTimeout(() => closeSidebar(), 0);
        return () => window.clearTimeout(t);
    }, [pathname, closeSidebar]);

    if (!ready) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
                <p style={{ color: '#64748b', fontSize: 14 }}>Loading workspace…</p>
            </div>
        );
    }

    if (!currentUser) return null;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
            {/* Mobile overlay backdrop */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}

            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                <TopBar title={title} subtitle={subtitle} onMenuToggle={toggleSidebar} />
                <main
                    style={{
                        flex: 1,
                        padding: '24px 20px',
                        overflowY: 'auto',
                        background: 'radial-gradient(ellipse at 20% 10%, rgba(249,115,22,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(234,88,12,0.05) 0%, transparent 60%), var(--navy)',
                    }}
                    className="main-content"
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
