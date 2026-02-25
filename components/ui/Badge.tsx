'use client';

interface BadgeProps {
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    children: React.ReactNode;
}

const STYLES: Record<BadgeProps['variant'], React.CSSProperties> = {
    success: { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' },
    warning: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' },
    danger: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' },
    info: { background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' },
    neutral: { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' },
};

export default function Badge({ variant, children }: BadgeProps) {
    return (
        <span className="badge" style={STYLES[variant]}>
            {children}
        </span>
    );
}
