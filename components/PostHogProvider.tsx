'use client';

/**
 * components/PostHogProvider.tsx
 *
 * Client component that:
 *  1. Initialises PostHog once on mount
 *  2. Captures a `$pageview` event on every App Router navigation
 *     (usePathname + useSearchParams pattern recommended by PostHog docs)
 *
 * Wrapped in <Suspense> in layout.tsx so the useSearchParams() call
 * doesn't break static rendering during `next build`.
 */

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { initAnalytics, capture } from '@/lib/analytics';

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialise once
  useEffect(() => {
    initAnalytics();
  }, []);

  // Capture pageview on every route change
  useEffect(() => {
    if (!pathname) return;
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </>
  );
}

/** Re-export posthog instance for occasional direct use. */
export { posthog };
