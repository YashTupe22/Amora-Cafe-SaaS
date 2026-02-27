/**
 * app/api/subscription/webhook/route.ts
 * [SECURITY] Webhook secret is server-side only. Never expose to client.
 *
 * POST /api/subscription/webhook
 * Handles Razorpay webhook events for the subscription lifecycle.
 * No auth header — uses Razorpay HMAC signature for verification.
 *
 * Register this URL in the Razorpay Dashboard under:
 *   Settings → Webhooks → Add New Webhook
 * Events to enable:
 *   subscription.activated, subscription.charged,
 *   subscription.cancelled, subscription.halted, subscription.completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac }               from 'crypto';
import { getAdminDb }               from '@/lib/firebaseAdmin';
import { FieldValue }               from 'firebase-admin/firestore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RazorpayWebhookPayload {
  event:   string;
  payload: {
    subscription?: {
      entity: RazorpaySubscriptionEntity;
    };
    payment?: {
      entity: {
        id:          string;
        amount:      number;
        currency:    string;
        description: string;
      };
    };
  };
}

interface RazorpaySubscriptionEntity {
  id:                  string;
  plan_id:             string;
  status:              string;
  current_start:       number | null;
  current_end:         number | null;
  notes?:              { uid?: string; plan?: string; billingCycle?: string };
  short_url?:          string;
  charge_at?:          number;
  ended_at?:           number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  // Constant-time compare to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

/** Maps a Razorpay subscription entity status to our internal status. */
function mapStatus(rzStatus: string): string {
  switch (rzStatus) {
    case 'created':    return 'trialing';
    case 'authenticated':
    case 'active':     return 'active';
    case 'pending':    return 'past_due';
    case 'halted':     return 'halted';
    case 'cancelled':  return 'cancelled';
    case 'completed':  return 'cancelled'; // plan completed → downgrade
    case 'expired':    return 'cancelled';
    default:           return rzStatus;
  }
}

/** Returns a Firestore update payload based on the event type. */
function buildUpdate(event: string, entity: RazorpaySubscriptionEntity): Record<string, unknown> {
  const base: Record<string, unknown> = {
    razorpaySubId: entity.id,
    updatedAt:     FieldValue.serverTimestamp(),
  };

  const currentPeriodEnd = entity.current_end
    ? new Date(entity.current_end * 1000)
    : null;

  switch (event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      // Include plan from notes so renewals keep the correct plan on the doc.
      const notesPlan = entity.notes?.plan;
      return {
        ...base,
        status:           'active',
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        ...(notesPlan && notesPlan !== 'free' ? { plan: notesPlan } : {}),
      };
    }

    case 'subscription.cancelled':
    case 'subscription.completed': {
      return {
        ...base,
        status:           'cancelled',
        plan:             'free',
        billingCycle:     null,
        currentPeriodEnd: entity.ended_at ? new Date(entity.ended_at * 1000) : null,
        cancelAtPeriodEnd: false,
      };
    }

    case 'subscription.halted':
      return {
        ...base,
        status: 'halted',
        currentPeriodEnd,
      };

    default:
      return { ...base, status: mapStatus(entity.status), currentPeriodEnd };
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body — MUST use req.text(), NOT req.json(), to verify HMAC
  const rawBody  = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] RAZORPAY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // 2. Verify HMAC signature
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    console.warn('[webhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 3. Parse payload
  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { event }       = payload;
  const subEntity       = payload.payload?.subscription?.entity;

  if (!subEntity) {
    // Non-subscription event (e.g. payment-only events) — acknowledge and ignore
    return NextResponse.json({ ok: true, ignored: true });
  }

  // 4. Resolve uid from Razorpay subscription notes
  //    When creating a subscription we set notes.uid = Firebase UID (see create/route.ts)
  const uid = subEntity.notes?.uid;
  if (!uid) {
    console.warn('[webhook] No uid in subscription notes; cannot match user', subEntity.id);
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const db = getAdminDb();
    const docRef = db.collection('subscriptions').doc(uid);
    const existingSnap = await docRef.get();
    const existingData = existingSnap.data() ?? {};

    const currentSubId = existingData.razorpaySubId as string | undefined;
    const isSameSubscription = !currentSubId || currentSubId === subEntity.id;

    // Ignore ALL events from a subscription that is no longer the user's
    // current one.  This prevents a stale Starter 'subscription.charged' from
    // overwriting razorpaySubId (which would then make the subsequent
    // 'subscription.cancelled' bypass the guard and downgrade the user to Free).
    if (!isSameSubscription) {
      console.info('[webhook] Ignoring event for non-current subscription', {
        uid,
        event,
        webhookSubId: subEntity.id,
        currentSubId,
      });
      return NextResponse.json({ ok: true, ignored: true });
    }

    // 5. Build Firestore update
    const update = buildUpdate(event, subEntity);

    await docRef.set(update, { merge: true });

    console.info('[webhook] subscription update', {
      uid,
      event,
      previousPlan: existingData.plan ?? 'free',
      nextPlan:     (update.plan as string | undefined) ?? existingData.plan ?? 'free',
      razorpaySubId: subEntity.id,
    });
  } catch (err) {
    console.error('[webhook] Firestore write failed', err);
    // Return 500 so Razorpay retries the webhook
    return NextResponse.json({ error: 'DB write failed' }, { status: 500 });
  }

  // 6. Acknowledge — Razorpay expects 200 within 5 s
  return NextResponse.json({ ok: true, event });
}
