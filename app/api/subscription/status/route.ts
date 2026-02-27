/**
 * app/api/subscription/status/route.ts
 * [SECURITY] Secret keys are server-side only. Never expose to client.
 *
 * GET /api/subscription/status
 * Returns the current user's subscription plan, status, and period end.
 * Requires: Authorization: Bearer <Firebase ID Token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Firebase ID token
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const uid = decoded.uid;

    // 2. Fetch subscription document
    const subDoc = await getAdminDb().collection('subscriptions').doc(uid).get();

    if (!subDoc.exists) {
      // No subscription document → user is on the free plan
      return NextResponse.json({
        plan:              'free',
        status:            'active',
        billingCycle:      null,
        currentPeriodEnd:  null,
        cancelAtPeriodEnd: false,
        razorpaySubId:     null,
        razorpayCustomerId: null,
      });
    }

    const d = subDoc.data()!;
    return NextResponse.json({
      plan:              d.plan              ?? 'free',
      status:            d.status            ?? 'active',
      billingCycle:      d.billingCycle      ?? null,
      currentPeriodEnd:  d.currentPeriodEnd?.toDate?.()?.toISOString() ?? null,
      cancelAtPeriodEnd: d.cancelAtPeriodEnd ?? false,
      razorpaySubId:     d.razorpaySubId     ?? null,
      razorpayCustomerId: d.razorpayCustomerId ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Missing or malformed') || msg.includes('ID token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[subscription/status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
