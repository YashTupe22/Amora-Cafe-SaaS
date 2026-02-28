/**
 * app/api/superadmin/users/route.ts
 * [PRIVATE — OWNER ONLY]
 *
 * GET /api/superadmin/users
 * Returns all registered users with their profile + subscription data.
 * Only accessible by the ADMIN_EMAIL owner.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'yashrtupe01@gmail.com';

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    if (decoded.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();

    // Fetch all user profile docs
    const usersSnap = await db.collection('users').get();

    // Fetch all subscription docs
    const subsSnap = await db.collection('subscriptions').get();
    const subMap: Record<string, Record<string, unknown>> = {};
    subsSnap.docs.forEach(d => { subMap[d.id] = d.data(); });

    const users = usersSnap.docs.map(d => {
      const p = d.data();
      const sub = subMap[d.id] ?? null;
      return {
        uid:          d.id,
        name:         p.name          ?? '',
        email:        p.email         ?? '',
        businessName: p.businessName  ?? '',
        phone:        p.phone         ?? '',
        gst:          p.gst           ?? '',
        address:      p.address       ?? '',
        createdAt:    p.createdAt?.toDate?.()?.toISOString() ?? null,
        onboardingComplete: p.onboardingComplete ?? false,
        subscription: sub ? {
          plan:              sub.plan              ?? 'free',
          status:            sub.status            ?? 'active',
          billingCycle:      sub.billingCycle      ?? null,
          currentPeriodEnd:  (sub.currentPeriodEnd as { toDate?: () => Date } | null)?.toDate?.()?.toISOString() ?? null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
          razorpaySubId:     sub.razorpaySubId     ?? null,
          razorpayCustomerId: sub.razorpayCustomerId ?? null,
          updatedAt:         (sub.updatedAt as { toDate?: () => Date } | null)?.toDate?.()?.toISOString() ?? null,
        } : {
          plan: 'free', status: 'active', billingCycle: null,
          currentPeriodEnd: null, cancelAtPeriodEnd: false,
          razorpaySubId: null, razorpayCustomerId: null, updatedAt: null,
        },
      };
    });

    return NextResponse.json({ users });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    if (msg.includes('Missing or malformed') || msg.includes('ID token') || msg.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[superadmin/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
