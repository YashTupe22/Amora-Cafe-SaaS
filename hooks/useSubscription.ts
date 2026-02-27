/**
 * hooks/useSubscription.ts
 * Client-side hook — reads subscription state already loaded in appStore.
 * Use this instead of reaching into appStore directly so call sites stay clean
 * and plan access checks are centrally typed.
 */

'use client';

import { useCallback } from 'react';
import { useAppStore }   from '@/lib/appStore';
import { canAccess, requiresUpgrade, minPlanFor, type PlanName } from '@/lib/planAccess';

export type { PlanName };

// ─── Return type ─────────────────────────────────────────────────────────────

export interface UseSubscriptionReturn {
  /** Current plan name — defaults to 'free' when unauthenticated or not loaded */
  plan:             PlanName;
  /** Raw subscription status string */
  status:           string;
  /** Whether the subscription is actively paid (active or trialing) */
  isActive:         boolean;
  /** Whether the subscription will cancel at the end of the current period */
  cancelAtPeriodEnd: boolean;
  /** ISO string of the current period end date, or null */
  currentPeriodEnd: string | null;
  /** Check whether the user's plan includes a feature */
  canAccess:        (feature: string) => boolean;
  /** true when the user must upgrade to use this feature */
  requiresUpgrade:  (feature: string) => boolean;
  /** Minimum plan that unlocks a feature */
  minPlanFor:       (feature: string) => PlanName;
  /**
   * Re-fetch subscription status from the server and update appStore.
   * Call this after a successful payment to reflect the new plan instantly.
   */
  refreshSubscription: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription(): UseSubscriptionReturn {
  const { subscription, reloadSubscription } = useAppStore();

  const plan = (subscription?.plan ?? 'free') as PlanName;

  const refreshSubscription = useCallback(async () => {
    // Re-fetch from Firestore via appStore — updates React state immediately.
    await reloadSubscription();
  }, [reloadSubscription]);

  return {
    plan,
    status:           subscription?.status           ?? 'active',
    isActive:         subscription
      ? subscription.status === 'active' || subscription.status === 'trialing'
      : true, // free plan is always "active"
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd:  subscription?.currentPeriodEnd
      ? subscription.currentPeriodEnd.toISOString()
      : null,
    canAccess:        (feature: string) => canAccess(plan, feature),
    requiresUpgrade:  (feature: string) => requiresUpgrade(plan, feature),
    minPlanFor:       (feature: string) => minPlanFor(feature),
    refreshSubscription,
  };
}
