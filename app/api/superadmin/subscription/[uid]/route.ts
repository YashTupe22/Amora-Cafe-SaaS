/**
 * app/api/superadmin/subscription/[uid]/route.ts
 * [PRIVATE — OWNER ONLY]
 *
 * GET    → read subscription for user
 * PATCH  → update plan/status/currentPeriodEnd etc.
 * DELETE → remove subscription doc (downgrade to free)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'yashrtupe01@gmail.com';

async function guardAdmin(req: NextRequest) {
  const decoded = await verifyIdToken(req.headers.get('Authorization'));
  if (decoded.email !== ADMIN_EMAIL) throw new Error('Forbidden');
  return decoded;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await guardAdmin(req);
    const { uid } = await params;
    const db = getAdminDb();
    const snap = await db.collection('subscriptions').doc(uid).get();
    if (!snap.exists) return NextResponse.json({ plan: 'free', status: 'active' });
    const d = snap.data()!;
    return NextResponse.json({
      plan:              d.plan              ?? 'free',
      status:            d.status            ?? 'active',
      billingCycle:      d.billingCycle      ?? null,
      currentPeriodEnd:  d.currentPeriodEnd?.toDate?.()?.toISOString() ?? null,
      cancelAtPeriodEnd: d.cancelAtPeriodEnd ?? false,
      razorpaySubId:     d.razorpaySubId     ?? null,
      razorpayCustomerId: d.razorpayCustomerId ?? null,
    });
  } catch (err) {
    return errResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await guardAdmin(req);
    const { uid } = await params;
    const body = await req.json() as Record<string, unknown>;

    const db     = getAdminDb();
    const docRef = db.collection('subscriptions').doc(uid);

    // Convert ISO date strings to Firestore Timestamps
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    const allowed = ['plan', 'status', 'billingCycle', 'cancelAtPeriodEnd', 'razorpaySubId', 'razorpayCustomerId', 'currentPeriodEnd'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'currentPeriodEnd' && typeof body[key] === 'string') {
          update[key] = Timestamp.fromDate(new Date(body[key] as string));
        } else {
          update[key] = body[key];
        }
      }
    }

    await docRef.set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await guardAdmin(req);
    const { uid } = await params;
    const db = getAdminDb();
    await db.collection('subscriptions').doc(uid).delete();
    return NextResponse.json({ ok: true, message: 'Subscription removed — user is now on free plan' });
  } catch (err) {
    return errResponse(err);
  }
}

function errResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : 'Unknown';
  if (msg.includes('Missing or malformed') || msg.includes('ID token') || msg.includes('Forbidden') || msg.includes('Unauthorized')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.error('[superadmin/subscription]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
