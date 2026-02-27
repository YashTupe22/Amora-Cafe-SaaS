/**
 * app/api/subscription/admin/fix-active-free/route.ts
 *
 * One-off admin endpoint to backfill subscription plans where:
 *   status === 'active' but plan === 'free'.
 *
 * PROTECT THIS ENDPOINT with ADMIN_MIGRATION_SECRET — never expose publicly.
 *
 * Usage (local example):
 *   curl -X POST "http://localhost:3000/api/subscription/admin/fix-active-free" \
 *     -H "x-admin-migration-secret: $ADMIN_MIGRATION_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRazorpay } from '@/lib/razorpay';
import type { BillingCycle } from '@/lib/razorpayPlans';
import type { PlanName } from '@/lib/planAccess';

export async function POST(req: NextRequest) {
  const headerSecret = req.headers.get('x-admin-migration-secret');
  const expected     = process.env.ADMIN_MIGRATION_SECRET;

  if (!expected || headerSecret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const razorpay = getRazorpay();

  const snap = await db
    .collection('subscriptions')
    .where('status', '==', 'active')
    .where('plan', '==', 'free')
    .get();

  const updated: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const uid  = doc.id;
    const razorpaySubId = data.razorpaySubId as string | undefined;

    if (!razorpaySubId) {
      skipped.push({ id: uid, reason: 'missing razorpaySubId' });
      continue;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzSub: any = await razorpay.subscriptions.fetch(razorpaySubId);
      const notesPlan  = rzSub?.notes?.plan as PlanName | undefined;
      const notesCycle = rzSub?.notes?.billingCycle as BillingCycle | undefined;

      if (!notesPlan || notesPlan === 'free') {
        skipped.push({ id: uid, reason: 'no paid plan in notes' });
        continue;
      }

      const billingCycle: BillingCycle =
        notesCycle === 'annual' || notesCycle === 'monthly'
          ? notesCycle
          : 'monthly';

      const periodDays = billingCycle === 'annual' ? 365 : 30;
      const currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

      await doc.ref.update({
        plan: notesPlan,
        billingCycle,
        currentPeriodEnd,
      });

      updated.push(uid);
    } catch (e) {
      console.error('[admin/fix-active-free] Failed to repair subscription', { uid, razorpaySubId, e });
      skipped.push({ id: uid, reason: 'razorpay fetch failed' });
    }
  }

  return NextResponse.json({
    scanned: snap.size,
    updatedCount: updated.length,
    updated,
    skipped,
  });
}

