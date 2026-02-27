/**
 * lib/razorpayPlans.ts — Razorpay Plan ID mapping.
 *
 * Each Razorpay plan is pre-created in the Razorpay dashboard.
 * The resulting plan IDs are stored as env vars and mapped here.
 *
 * This file is safe to import in API routes.
 * NOTE: process.env values are undefined at import time in Edge — always call
 * getPlanId() at request time, not at module initialisation.
 */

export type BillingCycle = 'monthly' | 'annual';

export const PAID_PLANS = ['starter', 'pro', 'enterprise'] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

/**
 * Maps plan × billing-cycle to the Razorpay Plan ID env var.
 * Values are undefined if the env var is not set.
 */
export function getPlanId(plan: string, cycle: BillingCycle): string | null {
  const key = `RAZORPAY_PLAN_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
  return process.env[key] ?? null;
}

/** Sanity check — call during server startup in development to warn of missing IDs. */
export function warnMissingPlanIds() {
  for (const plan of PAID_PLANS) {
    for (const cycle of ['monthly', 'annual'] as BillingCycle[]) {
      if (!getPlanId(plan, cycle)) {
        console.warn(`[RazorpayPlans] Missing env var for ${plan}/${cycle}`);
      }
    }
  }
}
