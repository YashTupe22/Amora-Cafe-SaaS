/**
 * components/UpgradeBanner.tsx
 * Shown when a user tries to access a feature locked to a higher plan.
 * Dismissable, links to /pricing, matches the app's dark glass-card aesthetic.
 */

'use client';

import React, { useState }  from 'react';
import Link                  from 'next/link';
import type { PlanName }     from '@/lib/planAccess';
import { PLAN_PRICING }      from '@/lib/planAccess';

interface UpgradeBannerProps {
  /** Human-friendly feature name, e.g. "PDF Export" */
  feature: string;
  /** Minimum plan required to use the feature */
  requiredPlan: PlanName;
  /** Optional extra className for the wrapper div */
  className?: string;
}

const PLAN_LABELS: Record<PlanName, string> = {
  free:       'Free',
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

export default function UpgradeBanner({
  feature,
  requiredPlan,
  className = '',
}: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || requiredPlan === 'free') return null;

  const planLabel = PLAN_LABELS[requiredPlan];
  const price     = PLAN_PRICING[requiredPlan].monthly;

  return (
    <div
      role="alert"
      className={className}
      style={{
        background:   'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border:       '1px solid rgba(255,255,255,0.12)',
        borderLeft:   '4px solid #f59e0b',
        borderRadius: '12px',
        padding:      '14px 18px',
        display:      'flex',
        alignItems:   'center',
        gap:          '14px',
        marginBottom: '16px',
        flexWrap:     'wrap',
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: '20px', flexShrink: 0 }}>🔒</span>

      {/* Message */}
      <div style={{ flex: 1, minWidth: '140px' }}>
        <p style={{ margin: 0, fontWeight: 600, color: '#fff', fontSize: '14px' }}>
          {feature} requires the{' '}
          <span style={{ color: '#f59e0b' }}>{planLabel}</span> plan
        </p>
        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>
          Upgrade from ₹{price}/mo to unlock this feature.
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/pricing"
        style={{
          background:   'linear-gradient(135deg, #f59e0b, #ef4444)',
          color:        '#fff',
          padding:      '7px 18px',
          borderRadius: '8px',
          fontWeight:   600,
          fontSize:     '13px',
          textDecoration: 'none',
          whiteSpace:   'nowrap',
          flexShrink:   0,
        }}
      >
        View Plans
      </Link>

      {/* Dismiss */}
      <button
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border:     'none',
          color:      'rgba(255,255,255,0.4)',
          cursor:     'pointer',
          fontSize:   '18px',
          padding:    '0 4px',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
