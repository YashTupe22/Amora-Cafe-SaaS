/**
 * lib/analytics.ts — PostHog product analytics initialisation.
 *
 * Guards:
 *  - Only runs in the browser (SSR-safe)
 *  - Skips all tracking when demo mode is active (isDemoMode flag)
 *  - Initialised once; subsequent calls to init() are no-ops
 *
 * GDPR:
 *  - opt_out_capturing_by_default: false — we rely on in-app consent toggle
 *  - person_profiles: 'identified_only' — no anonymous profile bloat
 *  - capture_pageview: false — pageviews are captured manually by
 *    PostHogProvider so we get accurate App Router route changes
 */

import posthog from 'posthog-js';

const isBrowser = typeof window !== 'undefined';

// Set to true during demo login; all capture() calls become no-ops.
let _isDemoMode = false;

export function setDemoMode(demo: boolean) {
  _isDemoMode = demo;
}

export function initAnalytics() {
  if (!isBrowser) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    console.warn('[Analytics] NEXT_PUBLIC_POSTHOG_KEY not set — PostHog disabled.');
    return;
  }

  if (posthog.__loaded) return; // Already initialised

  posthog.init(apiKey, {
    api_host:                   process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    person_profiles:            'identified_only',
    capture_pageview:           false, // Handled manually in PostHogProvider
    capture_pageleave:          true,
    opt_out_capturing_by_default: false,
    persistence:                'localStorage',
  });
}

/**
 * Identify the logged-in user. Call after successful login.
 */
export function identifyUser(uid: string, traits: { email: string; businessName?: string }) {
  if (!isBrowser || _isDemoMode) return;
  posthog.identify(uid, traits);
}

/**
 * Reset the PostHog session. Call on logout.
 */
export function resetAnalytics() {
  if (!isBrowser) return;
  _isDemoMode = false;
  posthog.reset();
}

/**
 * Capture a named event. No-op in demo mode or when PostHog is not loaded.
 */
export function capture(event: string, properties?: Record<string, unknown>) {
  if (!isBrowser || _isDemoMode) return;
  posthog.capture(event, properties);
}

// ─── Named event helpers ──────────────────────────────────────────────────────

export const analytics = {
  /** Fired after a bill (invoice) is successfully created. */
  billCreated: (props?: { orderType?: string; paymentMode?: string; itemCount?: number; total?: number }) =>
    capture('bill_created', props),

  /** Fired after exportDashboardPdf() is called. */
  invoiceExportedPdf: () =>
    capture('invoice_exported_pdf'),

  /** Fired after exportAppDataToExcel() is called. */
  dataExportedExcel: () =>
    capture('data_exported_excel'),

  /** Fired after a new employee record is saved. */
  employeeAdded: (props?: { role?: string }) =>
    capture('employee_added', props),

  /** Fired at the end of the onboarding wizard (step 3 finish). */
  onboardingCompleted: () =>
    capture('onboarding_completed'),

  /** Fired when loginDemo() is called. */
  demoModeEntered: () =>
    capture('demo_mode_entered'),

  /** Fired when the 2FA toggle is changed in Settings. */
  settings2faToggled: (enabled: boolean) =>
    capture('settings_2fa_toggled', { enabled }),

  /** Fired when the language is changed in Settings. */
  languageSwitched: (lang: string) =>
    capture('language_switched', { lang }),
};
