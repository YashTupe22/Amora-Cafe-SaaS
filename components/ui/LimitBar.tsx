/**
 * components/ui/LimitBar.tsx
 * Shows a usage progress bar (used / limit) for plan-based numeric limits.
 * Turns yellow near 80 %, red at 100 %, and shows an upgrade link.
 * Returns null when the plan has no limit (Infinity).
 */

'use client';

import Link from 'next/link';

interface LimitBarProps {
  /** Items used so far */
  used: number;
  /** Plan limit; pass Infinity for unlimited plans (component renders nothing) */
  limit: number;
  /** Human-readable label shown left of the counter, e.g. "Bills this month" */
  label: string;
}

export default function LimitBar({ used, limit, label }: LimitBarProps) {
  if (!isFinite(limit) || limit === 0) return null;

  const pct    = Math.min((used / limit) * 100, 100);
  const isAt   = pct >= 100;
  const isNear = pct >= 80;

  const barColor   = isAt ? '#ef4444' : isNear ? '#f59e0b' : '#22c55e';
  const bgColor    = isAt ? 'rgba(239,68,68,0.08)' : isNear ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)';
  const bdColor    = isAt ? 'rgba(239,68,68,0.25)'  : isNear ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)';
  const btnBg      = isAt ? 'rgba(239,68,68,0.15)'  : 'rgba(245,158,11,0.12)';
  const btnBorder  = isAt ? 'rgba(239,68,68,0.3)'   : 'rgba(245,158,11,0.3)';
  const btnColor   = isAt ? '#ef4444' : '#f59e0b';

  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          14,
        padding:      '10px 16px',
        borderRadius: 10,
        background:   bgColor,
        border:       `1px solid ${bdColor}`,
        marginBottom: 16,
      }}
    >
      {/* Progress section */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div
            style={{
              height:     '100%',
              width:      `${pct}%`,
              borderRadius: 999,
              background: barColor,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Upgrade link — only when near or at limit */}
      {(isAt || isNear) && (
        <Link
          href="/pricing"
          style={{
            padding:        '5px 14px',
            borderRadius:   8,
            background:     btnBg,
            border:         `1px solid ${btnBorder}`,
            color:          btnColor,
            fontSize:       11,
            fontWeight:     700,
            textDecoration: 'none',
            whiteSpace:     'nowrap',
          }}
        >
          {isAt ? 'Limit reached — Upgrade' : 'Upgrade'}
        </Link>
      )}
    </div>
  );
}
