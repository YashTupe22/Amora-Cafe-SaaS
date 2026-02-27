/**
 * components/PlanGate.tsx
 * Renders children if the user's plan has access to `feature`.
 * Otherwise renders `fallback` (defaults to <UpgradeBanner>).
 *
 * Usage:
 *   <PlanGate feature="pdfExport">
 *     <PDFExportButton />
 *   </PlanGate>
 *
 *   <PlanGate feature="analytics" fallback={<p>Analytics requires Pro.</p>}>
 *     <AnalyticsPanel />
 *   </PlanGate>
 */

'use client';

import React                 from 'react';
import { useSubscription }   from '@/hooks/useSubscription';
import UpgradeBanner         from '@/components/UpgradeBanner';
import { minPlanFor }        from '@/lib/planAccess';

// Feature → human-readable label map (extend as needed)
const FEATURE_LABELS: Record<string, string> = {
  attendance:      'Attendance Tracking',
  pdfExport:       'PDF Export',
  analytics:       'Advanced Analytics',
  multiOutlet:     'Multi-Outlet Management',
  rbac:            'Team Roles (RBAC)',
  twoFactor:       '2FA Security',
  advancedReports: 'Advanced Reports',
  prioritySupport: 'Priority Support',
};

interface PlanGateProps {
  /** Feature key — must match a key in PLAN_LIMITS (e.g. "pdfExport", "analytics") */
  feature:  string;
  /** Rendered when access is denied. Defaults to <UpgradeBanner>. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function PlanGate({ feature, fallback, children }: PlanGateProps) {
  const { canAccess } = useSubscription();

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  const requiredPlan = minPlanFor(feature);
  const label        = FEATURE_LABELS[feature] ?? feature;

  return (
    <UpgradeBanner
      feature={label}
      requiredPlan={requiredPlan}
    />
  );
}
