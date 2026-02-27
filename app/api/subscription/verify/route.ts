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

    // Calculate period end: 30 days for monthly, 365 days for annual
    const billingCycle      = existing.data()!.billingCycle as string;
    const periodDays        = billingCycle === 'annual' ? 365 : 30;
    const currentPeriodEnd  = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    await subDocRef.update({
      status:           'active',
      currentPeriodEnd: currentPeriodEnd,
      updatedAt:        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, plan: existing.data()!.plan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Missing or malformed') || msg.includes('ID token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[subscription/verify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
