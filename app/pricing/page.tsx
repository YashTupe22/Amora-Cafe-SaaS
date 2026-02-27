/**
 * app/pricing/page.tsx
 * Public pricing page — also available when logged in (shows current plan).
 * Matches the app's dark glass-card aesthetic.
 */

'use client';

import React, { useState } from 'react';
import Link                 from 'next/link';
import { PLAN_PRICING, PLAN_LIMITS, type PlanName } from '@/lib/planAccess';
import { useAppStore }      from '@/lib/appStore';

// ─── Data ─────────────────────────────────────────────────────────────────────

const PLANS: {
  key:        PlanName;
  name:       string;
  tagline:    string;
  color:      string;
  gradient:   string;
  recommended: boolean;
}[] = [
  {
    key:         'free',
    name:        'Free',
    tagline:     'Get started — no card needed',
    color:       '#64748b',
    gradient:    'linear-gradient(135deg,#475569,#334155)',
    recommended: false,
  },
  {
    key:         'starter',
    name:        'Starter',
    tagline:     'Perfect for solo cafés',
    color:       '#3b82f6',
    gradient:    'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    recommended: false,
  },
  {
    key:         'pro',
    name:        'Pro',
    tagline:     'For growing teams',
    color:       '#f59e0b',
    gradient:    'linear-gradient(135deg,#f59e0b,#ef4444)',
    recommended: true,
  },
  {
    key:         'enterprise',
    name:        'Enterprise',
    tagline:     'Multi-outlet & large chains',
    color:       '#8b5cf6',
    gradient:    'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    recommended: false,
  },
];

const FEATURES: { label: string; free: string; starter: string; pro: string; enterprise: string }[] = [
  { label: 'Outlets',           free: '1',        starter: '1',        pro: '3',          enterprise: 'Unlimited' },
  { label: 'Staff Members',     free: '1',        starter: '3',        pro: '10',         enterprise: 'Unlimited' },
  { label: 'Bills / Month',     free: '50',       starter: '500',      pro: 'Unlimited',  enterprise: 'Unlimited' },
  { label: 'Inventory Items',   free: '25',       starter: '200',      pro: 'Unlimited',  enterprise: 'Unlimited' },
  { label: 'Menu Items',        free: '15',       starter: '100',      pro: 'Unlimited',  enterprise: 'Unlimited' },
  { label: 'Attendance',        free: '—',        starter: '✓',        pro: '✓',          enterprise: '✓' },
  { label: 'PDF Export',        free: '—',        starter: '✓',        pro: '✓',          enterprise: '✓' },
  { label: 'Analytics',         free: '—',        starter: '—',        pro: '✓',          enterprise: '✓' },
  { label: 'Multi-Outlet',      free: '—',        starter: '—',        pro: '✓',          enterprise: '✓' },
  { label: 'RBAC',              free: '—',        starter: '—',        pro: '✓',          enterprise: '✓' },
  { label: '2FA Security',      free: '—',        starter: '—',        pro: '✓',          enterprise: '✓' },
  { label: 'Support',           free: 'Community', starter: 'Email',   pro: 'Priority',   enterprise: 'Dedicated CSM' },
  { label: 'Data Retention',    free: '3 months', starter: '6 months', pro: '1 year',     enterprise: 'Unlimited' },
];

function fmtPrice(p: number) {
  return p === 0 ? 'Free' : `₹${p.toLocaleString('en-IN')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [cycle, setCycle]   = useState<'monthly' | 'annual'>('monthly');
  const { session, subscription } = useAppStore();
  const currentPlan = (subscription?.plan ?? 'free') as PlanName;

  const annualSavingPct = (plan: PlanName) => {
    const m = PLAN_PRICING[plan].monthly;
    const a = PLAN_PRICING[plan].annual;
    if (!m || !a) return 0;
    return Math.round((1 - a / (m * 12)) * 100);
  };

  return (
    <div
      style={{
        minHeight:   '100vh',
        background:  'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
        padding:     '48px 24px 80px',
        fontFamily:  'system-ui, sans-serif',
        color:       '#fff',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 40px' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
        <h1 style={{ margin: '16px 0 8px', fontSize: 'clamp(28px,5vw,42px)', fontWeight: 800 }}>
          Simple, transparent pricing
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', margin: 0 }}>
          Grow your café at every stage. No hidden fees.
        </p>

        {/* Billing toggle */}
        <div
          style={{
            display:        'inline-flex',
            marginTop:      28,
            background:     'rgba(255,255,255,0.08)',
            borderRadius:   '10px',
            padding:        '4px',
            gap:            '4px',
          }}
        >
          {(['monthly', 'annual'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              style={{
                padding:      '8px 20px',
                borderRadius: '7px',
                border:       'none',
                cursor:       'pointer',
                fontWeight:   600,
                fontSize:     '14px',
                transition:   'all 0.2s',
                background:   cycle === c ? '#fff' : 'transparent',
                color:        cycle === c ? '#0f172a' : 'rgba(255,255,255,0.6)',
              }}
            >
              {c === 'monthly' ? 'Monthly' : 'Annual'}
              {c === 'annual' && (
                <span
                  style={{
                    marginLeft:  6,
                    background:  '#22c55e',
                    color:       '#fff',
                    fontSize:    '11px',
                    padding:     '2px 6px',
                    borderRadius: '4px',
                    fontWeight:  700,
                  }}
                >
                  Save up to 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap:                 '20px',
          maxWidth:            '1100px',
          margin:              '0 auto 60px',
        }}
      >
        {PLANS.map(plan => {
          const price    = cycle === 'monthly'
            ? PLAN_PRICING[plan.key].monthly
            : PLAN_PRICING[plan.key].annual;
          const saving   = annualSavingPct(plan.key);
          const isActive = currentPlan === plan.key;

          return (
            <div
              key={plan.key}
              style={{
                position:    'relative',
                background:  plan.recommended
                  ? 'rgba(245,158,11,0.12)'
                  : 'rgba(255,255,255,0.05)',
                border:      plan.recommended
                  ? '2px solid #f59e0b'
                  : '1px solid rgba(255,255,255,0.10)',
                borderRadius: '16px',
                padding:      '28px 24px 32px',
                display:      'flex',
                flexDirection: 'column',
                gap:          '12px',
              }}
            >
              {/* Recommended badge */}
              {plan.recommended && (
                <div
                  style={{
                    position:    'absolute',
                    top:         '-14px',
                    left:        '50%',
                    transform:   'translateX(-50%)',
                    background:  plan.gradient,
                    padding:     '4px 14px',
                    borderRadius: '20px',
                    fontSize:    '11px',
                    fontWeight:  700,
                    color:       '#fff',
                    whiteSpace:  'nowrap',
                  }}
                >
                  ★ MOST POPULAR
                </div>
              )}

              {/* Plan header */}
              <div>
                <span
                  style={{
                    display:      'inline-block',
                    background:   plan.gradient,
                    borderRadius: '8px',
                    padding:      '5px 12px',
                    fontSize:     '13px',
                    fontWeight:   700,
                    letterSpacing: '0.5px',
                    marginBottom: '10px',
                  }}
                >
                  {plan.name.toUpperCase()}
                </span>
                <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>
                  {plan.tagline}
                </p>
              </div>

              {/* Price */}
              <div>
                <span style={{ fontSize: '36px', fontWeight: 800 }}>
                  {fmtPrice(price)}
                </span>
                {price > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginLeft: 4 }}>
                    /{cycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                )}
                {cycle === 'annual' && saving > 0 && (
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                    Save {saving}% vs monthly
                  </div>
                )}
              </div>

              {/* Limits summary */}
              <ul
                style={{
                  listStyle: 'none',
                  padding:   0,
                  margin:    '4px 0 0',
                  display:   'flex',
                  flexDirection: 'column',
                  gap:       '7px',
                  flex:      1,
                }}
              >
                {[
                  `${PLAN_LIMITS[plan.key].outlets === Infinity ? 'Unlimited' : PLAN_LIMITS[plan.key].outlets} outlet${PLAN_LIMITS[plan.key].outlets === 1 ? '' : 's'}`,
                  `${PLAN_LIMITS[plan.key].staffAccounts === Infinity ? 'Unlimited' : PLAN_LIMITS[plan.key].staffAccounts} staff`,
                  `${PLAN_LIMITS[plan.key].billsPerMonth === Infinity ? 'Unlimited' : PLAN_LIMITS[plan.key].billsPerMonth} bills/mo`,
                  PLAN_LIMITS[plan.key].attendance    ? 'Attendance tracking' : null,
                  PLAN_LIMITS[plan.key].pdfExport     ? 'PDF export' : null,
                  PLAN_LIMITS[plan.key].analytics     ? 'Advanced analytics' : null,
                  PLAN_LIMITS[plan.key].multiOutlet   ? 'Multi-outlet' : null,
                  PLAN_LIMITS[plan.key].rbac          ? 'Team roles (RBAC)' : null,
                  PLAN_LIMITS[plan.key].twoFactor     ? '2FA security' : null,
                ]
                  .filter(Boolean)
                  .map((f, i) => (
                    <li key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', display: 'flex', gap: '7px', alignItems: 'center' }}>
                      <span style={{ color: plan.color }}>✓</span>
                      {f}
                    </li>
                  ))}
              </ul>

              {/* CTA */}
              {isActive ? (
                <button
                  disabled
                  style={{
                    marginTop:    '16px',
                    padding:      '12px',
                    borderRadius: '10px',
                    border:       `1px solid ${plan.color}`,
                    background:   'transparent',
                    color:        plan.color,
                    fontWeight:   700,
                    fontSize:     '14px',
                    cursor:       'default',
                  }}
                >
                  ✓ Current Plan
                </button>
              ) : session ? (
                <Link
                  href={plan.key === 'free' ? '/dashboard' : `/pricing/checkout?plan=${plan.key}&cycle=${cycle}`}
                  style={{
                    marginTop:    '16px',
                    display:      'block',
                    textAlign:    'center',
                    padding:      '12px',
                    borderRadius: '10px',
                    background:   plan.recommended ? plan.gradient : 'rgba(255,255,255,0.1)',
                    color:        '#fff',
                    fontWeight:   700,
                    fontSize:     '14px',
                    textDecoration: 'none',
                    border:       plan.recommended ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {plan.key === 'free' ? 'Get Started' : 'Upgrade Now'}
                </Link>
              ) : (
                <Link
                  href={`/signup?plan=${plan.key}`}
                  style={{
                    marginTop:    '16px',
                    display:      'block',
                    textAlign:    'center',
                    padding:      '12px',
                    borderRadius: '10px',
                    background:   plan.recommended ? plan.gradient : 'rgba(255,255,255,0.1)',
                    color:        '#fff',
                    fontWeight:   700,
                    fontSize:     '14px',
                    textDecoration: 'none',
                    border:       plan.recommended ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  Get Started
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 700, marginBottom: 24 }}>
          Full Feature Comparison
        </h2>
        <div
          style={{
            overflowX:    'auto',
            background:   'rgba(255,255,255,0.04)',
            borderRadius: '14px',
            border:       '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  Feature
                </th>
                {PLANS.map(p => (
                  <th key={p.key} style={{ padding: '14px 20px', textAlign: 'center', color: p.recommended ? '#f59e0b' : '#fff', fontWeight: 700 }}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row, i) => (
                <tr
                  key={row.label}
                  style={{
                    borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    background:   i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.7)' }}>
                    {row.label}
                  </td>
                  {(['free', 'starter', 'pro', 'enterprise'] as const).map(key => (
                    <td key={key} style={{ padding: '12px 20px', textAlign: 'center', color: row[key] === '—' ? 'rgba(255,255,255,0.2)' : row[key] === '✓' ? '#22c55e' : '#fff' }}>
                      {row[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ / footer nudge */}
      <div style={{ textAlign: 'center', marginTop: 56, color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
        <p>Questions? Contact us at <a href="mailto:support@amoracafe.in" style={{ color: '#f59e0b' }}>support@amoracafe.in</a></p>
        <p>All plans include a 7-day free trial. Cancel anytime.</p>
      </div>
    </div>
  );
}
