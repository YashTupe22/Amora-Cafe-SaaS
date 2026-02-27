/**
 * app/api/subscription/cancel/route.ts
 * [SECURITY] Secret keys are server-side only. Never expose to client.
 *
 * POST /api/subscription/cancel
 * Cancels the user's Razorpay subscription at period end (no immediate downgrade).
 * Sets cancelAtPeriodEnd = true in Firestore.
 * Requires: Authorization: Bearer <Firebase ID Token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';
import { getRazorpay } from '@/lib/razorpay';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Firebase ID token
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const uid = decoded.uid;

    // 2. Fetch existing subscription
    const db        = getAdminDb();
    const subDocRef = db.collection('subscriptions').doc(uid);
    const subDoc    = await subDocRef.get();

    if (!subDoc.exists) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const data = subDoc.data()!;

    if (data.plan === 'free') {
      return NextResponse.json({ error: 'Free plan cannot be cancelled' }, { status: 400 });
    }
    if (data.status === 'cancelled') {
      return NextResponse.json({ error: 'Subscription is already cancelled' }, { status: 400 });
    }
    if (data.cancelAtPeriodEnd) {
      return NextResponse.json({ error: 'Cancellation already scheduled' }, { status: 400 });
    }

    // 3. Cancel on Razorpay — cancel_at_cycle_end = true means it stays active until period end
    const razorpaySubId = data.razorpaySubId as string | null;
    if (razorpaySubId) {
      await getRazorpay().subscriptions.cancel(razorpaySubId, true);
    }

    // 4. Update Firestore — mark cancelAtPeriodEnd; do NOT downgrade the plan yet
    await subDocRef.update({
      cancelAtPeriodEnd: true,
      updatedAt:         FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok:                true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd:  data.currentPeriodEnd?.toDate?.()?.toISOString() ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Missing or malformed') || msg.includes('ID token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[subscription/cancel]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
