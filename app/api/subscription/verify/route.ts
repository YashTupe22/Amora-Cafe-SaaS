/**
 * app/api/subscription/verify/route.ts
 * [SECURITY] Secret keys are server-side only. Never expose to client.
 *
 * POST /api/subscription/verify
 * Body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
 * Verifies Razorpay HMAC signature and activates the subscription in Firestore.
 * Requires: Authorization: Bearer <Firebase ID Token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';
import { getRazorpay } from '@/lib/razorpay';
import type { BillingCycle } from '@/lib/razorpayPlans';
import type { PlanName } from '@/lib/planAccess';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Firebase ID token
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const uid = decoded.uid;

    // 2. Parse body
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing Razorpay payment fields' }, { status: 400 });
    }

    // 3. Verify HMAC signature
    //    Signature = HMAC-SHA256(payment_id + '|' + subscription_id, key_secret)
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('[subscription/verify] RAZORPAY_KEY_SECRET not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const payload   = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const expected  = createHmac('sha256', keySecret).update(payload).digest('hex');

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    // 4. Update subscription status to active in Firestore
    const db        = getAdminDb();
    const subDocRef = db.collection('subscriptions').doc(uid);
    const existing  = await subDocRef.get();

    if (!existing.exists || existing.data()!.razorpaySubId !== razorpay_subscription_id) {
      return NextResponse.json({ error: 'Subscription not found for this user' }, { status: 404 });
    }

    const data = existing.data() ?? {};

    // Calculate period end: 30 days for monthly, 365 days for annual
    const billingCycle      = (data.billingCycle as BillingCycle | undefined) ?? 'monthly';
    const periodDays        = billingCycle === 'annual' ? 365 : 30;
    const currentPeriodEnd  = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    let plan: PlanName = (data.plan as PlanName) ?? 'free';

    // If the plan was never seeded (or is still 'free') but payment verification
    // succeeded, recover the canonical plan from Razorpay subscription notes.
    if (!plan || plan === 'free') {
      try {
        const razorpay = getRazorpay();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzSub: any = await razorpay.subscriptions.fetch(razorpay_subscription_id);
        const notesPlan = rzSub?.notes?.plan as PlanName | undefined;
        const notesCycle = rzSub?.notes?.billingCycle as BillingCycle | undefined;
        if (notesPlan && notesPlan !== 'free') {
          plan = notesPlan;
        }
        if (notesCycle === 'monthly' || notesCycle === 'annual') {
          // Override billing cycle if Razorpay has a more trustworthy value.
          // This also ensures older docs with numeric billingCycle get corrected.
          const daysFromNotes = notesCycle === 'annual' ? 365 : 30;
          const endFromNotes  = new Date(Date.now() + daysFromNotes * 24 * 60 * 60 * 1000);
          (currentPeriodEnd as Date) = endFromNotes;
        }
      } catch (e) {
        console.warn('[subscription/verify] Failed to recover plan from Razorpay subscription', e);
      }
    }

    await subDocRef.update({
      status:           'active',
      plan,
      currentPeriodEnd,
      updatedAt:        FieldValue.serverTimestamp(),
    });

    console.info('[subscription/verify] activated', {
      uid,
      plan,
      billingCycle,
      razorpay_subscription_id,
    });

    return NextResponse.json({ ok: true, plan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Missing or malformed') || msg.includes('ID token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[subscription/verify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
