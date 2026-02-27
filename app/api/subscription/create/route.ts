/**
 * app/api/subscription/create/route.ts
 * [SECURITY] Secret keys are server-side only. Never expose to client.
 *
 * POST /api/subscription/create
 * Body: { planId: string, billingCycle: 'monthly' | 'annual' }
 * Creates a Razorpay subscription and saves a pending record to Firestore.
 * Returns: { subscriptionId, razorpayKeyId }
 * Requires: Authorization: Bearer <Firebase ID Token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';
import { getRazorpay } from '@/lib/razorpay';
import { getPlanId, type BillingCycle } from '@/lib/razorpayPlans';
import { PLAN_PRICING, type PlanName } from '@/lib/planAccess';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Firebase ID token
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const uid   = decoded.uid;
    const email = decoded.email ?? '';

    // 2. Parse & validate request body
    const body = await req.json();
    const { plan, billingCycle } = body as { plan: PlanName; billingCycle: BillingCycle };

    if (!plan || !billingCycle) {
      return NextResponse.json({ error: 'plan and billingCycle are required' }, { status: 400 });
    }
    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan. Free plan requires no subscription.' }, { status: 400 });
    }
    if (!['monthly', 'annual'].includes(billingCycle)) {
      return NextResponse.json({ error: 'billingCycle must be monthly or annual' }, { status: 400 });
    }
    if (!PLAN_PRICING[plan]) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
    }

    // 3. Resolve the Razorpay Plan ID from env vars
    const razorpayPlanId = getPlanId(plan, billingCycle);
    if (!razorpayPlanId) {
      return NextResponse.json(
        { error: `Razorpay plan ID not configured for ${plan}/${billingCycle}` },
        { status: 500 }
      );
    }

    const razorpay = getRazorpay();

    // 4. Create or reuse a Razorpay customer
    const db = getAdminDb();
    const subDocRef = db.collection('subscriptions').doc(uid);
    const existing = await subDocRef.get();
    let customerId: string = existing.data()?.razorpayCustomerId ?? '';

    if (!customerId) {
      const customer = await razorpay.customers.create({ email, notes: { uid } });
      customerId = customer.id;
      // Persist immediately so we don't create a duplicate customer on retry
      await subDocRef.set({ razorpayCustomerId: customerId }, { merge: true });
    }

    // 5. Create Razorpay subscription — pass customer_id so it is linked in Razorpay Dashboard
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = await razorpay.subscriptions.create({
      plan_id:          razorpayPlanId,
      customer_id:      customerId,
      customer_notify:  1,
      quantity:         1,
      total_count:      billingCycle === 'annual' ? 1 : 12,
      notes:            { uid, plan, billingCycle },
    } as any);

    // 6. Save pending subscription record to Firestore
    await subDocRef.set({
      plan,
      billingCycle,
      status:             'trialing',
      razorpaySubId:      subscription.id,
      razorpayCustomerId: customerId,
      cancelAtPeriodEnd:  false,
      currentPeriodEnd:   null,
      updatedAt:          FieldValue.serverTimestamp(),
      createdAt:          existing.exists ? existing.data()!.createdAt : FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      subscriptionId: subscription.id,
      razorpayKeyId:  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Missing or malformed') || msg.includes('ID token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[subscription/create]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
