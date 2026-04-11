'use client';

interface BadgeProps {
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    children: React.ReactNode;
}

const STYLES: Record<BadgeProps['variant'], React.CSSProperties> = {
    success: { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' },
    warning: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' },
    danger: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' },
    info: { background: 'rgba(113,112,255,0.14)', color: '#828fff', border: '1px solid rgba(113,112,255,0.28)' },
    neutral: { background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' },
};

export default function Badge({ variant, children }: BadgeProps) {
    return (
        <span className="badge" style={STYLES[variant]}>
            {children}
        </span>
    );
}
