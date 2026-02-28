/**
 * app/api/superadmin/notify/route.ts
 * [PRIVATE — OWNER ONLY]
 *
 * POST /api/superadmin/notify
 * Writes a notification document to users/{uid}/notifications/{docId}.
 * The user sees it the next time they open the app (or in real-time if subscribed).
 *
 * Body: { uid, type, title, message }
 * uid can be a single UID string or 'ALL' to broadcast to every user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'yashrtupe01@gmail.com';

const VALID_TYPES = ['subscription', 'info', 'bill_paid', 'bill_cancelled', 'new_bill', 'expense'];

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    if (decoded.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json() as {
      uid:     string;
      type:    string;
      title:   string;
      message: string;
    };

    const { uid, type, title, message } = body;

    if (!uid || !type || !title || !message) {
      return NextResponse.json({ error: 'uid, type, title, and message are required' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const db = getAdminDb();

    const notifPayload = {
      type,
      title,
      message,
      read:      false,
      createdAt: FieldValue.serverTimestamp(),
    };

    if (uid === 'ALL') {
      // Broadcast to every user
      const usersSnap = await db.collection('users').get();
      const batch = db.batch();
      usersSnap.docs.forEach(userDoc => {
        const ref = db.collection('users').doc(userDoc.id).collection('notifications').doc();
        batch.set(ref, notifPayload);
      });
      await batch.commit();
      return NextResponse.json({ ok: true, sent: usersSnap.size });
    } else {
      // Single user
      const ref = db.collection('users').doc(uid).collection('notifications').doc();
      await ref.set(notifPayload);
      return NextResponse.json({ ok: true, sent: 1 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    if (msg.includes('Missing or malformed') || msg.includes('ID token') || msg.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[superadmin/notify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
