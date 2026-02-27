/**
 * lib/planAccess.ts — Subscription plan feature gating.
 *
 * Source of truth for all plan limits and feature flags.
 * Use canAccess() and getPlanLimit() throughout the app to gate features.
 * Plans are defined from the Synplix Subscription Model document.
 */

export type PlanName = 'free' | 'starter' | 'pro' | 'enterprise';

// Sentinel value for "no limit"
const UNLIMITED = Infinity;

// ── Plan limits & feature flags ───────────────────────────────────────────────
export const PLAN_LIMITS = {
  free: {
    // Numeric limits
    outlets:           1,
    staffAccounts:     1,
    billsPerMonth:     50,
    inventoryItems:    25,
    menuItems:         15,
    dataRetentionMonths: 3,
    // Boolean features
    offlineMode:       true,
    gstBilling:        true,
    attendance:        false,
    pdfExport:         false,
    analytics:         false,
    multiOutlet:       false,
    rbac:              false,
    twoFactor:         false,
    // Meta
    support:           'Community',
  },
  starter: {
    outlets:           1,
    staffAccounts:     3,
    billsPerMonth:     500,
    inventoryItems:    200,
    menuItems:         100,
    dataRetentionMonths: 6,
    offlineMode:       true,
    gstBilling:        true,
    attendance:        true,
    pdfExport:         true,
    analytics:         false,
    multiOutlet:       false,
    rbac:              false,
    twoFactor:         false,
    support:           'Email',
  },
  pro: {
    outlets:           3,
    staffAccounts:     10,
    billsPerMonth:     UNLIMITED,
    inventoryItems:    UNLIMITED,
    menuItems:         UNLIMITED,
    dataRetentionMonths: 12,
    offlineMode:       true,
    gstBilling:        true,
    attendance:        true,
    pdfExport:         true,
    analytics:         true,
    multiOutlet:       true,
    rbac:              true,
    twoFactor:         true,
    support:           'Priority Email',
  },
  enterprise: {
    outlets:           UNLIMITED,
    staffAccounts:     UNLIMITED,
    billsPerMonth:     UNLIMITED,
    inventoryItems:    UNLIMITED,
    menuItems:         UNLIMITED,
    dataRetentionMonths: UNLIMITED,
    offlineMode:       true,
    gstBilling:        true,
    attendance:        true,
    pdfExport:         true,
    analytics:         true,
    multiOutlet:       true,
    rbac:              true,
    twoFactor:         true,
    support:           'Dedicated CSM',
  },
} as const;

export type PlanLimitKey = keyof typeof PLAN_LIMITS['free'];

// ── Pricing ───────────────────────────────────────────────────────────────────
export const PLAN_PRICING: Record<PlanName, { monthly: number; annual: number; annualSavingPct: number }> = {
  free:       { monthly: 0,     annual: 0,      annualSavingPct: 0  },
  starter:    { monthly: 499,   annual: 4799,   annualSavingPct: 20 },
  pro:        { monthly: 999,   annual: 9599,   annualSavingPct: 20 },
  enterprise: { monthly: 1999,  annual: 19199,  annualSavingPct: 20 },
};

export const PLAN_DISPLAY_NAMES: Record<PlanName, string> = {
  free:       'Free',
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

/** The plan to highlight as recommended on the pricing page. */
export const RECOMMENDED_PLAN: PlanName = 'pro';

// ── Access helpers ────────────────────────────────────────────────────────────

/**
 * Returns true when the given plan has access to a boolean feature,
 * or if the limit is non-zero/non-finite for numeric limits.
 */
export function canAccess(plan: PlanName, feature: PlanLimitKey): boolean {
  const val = PLAN_LIMITS[plan][feature];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  return false;
}

/**
 * Returns the numeric limit for a plan & limit name.
 * Returns Infinity for unlimited. Returns 0 for boolean features.
 */
export function getPlanLimit(plan: PlanName, limitName: PlanLimitKey): number {
  const val = PLAN_LIMITS[plan][limitName];
  if (typeof val === 'number') return val;
  return 0;
}

/**
 * Returns true when the feature requires upgrading from the current plan.
 * Useful for showing upgrade prompts.
 */
export function requiresUpgrade(currentPlan: PlanName, feature: PlanLimitKey): boolean {
  return !canAccess(currentPlan, feature);
}

/**
 * Returns the cheapest plan that enables a given feature.
 */
export function minPlanFor(feature: PlanLimitKey): PlanName {
  const order: PlanName[] = ['free', 'starter', 'pro', 'enterprise'];
  return order.find(p => canAccess(p, feature)) ?? 'enterprise';
}
