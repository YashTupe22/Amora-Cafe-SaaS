/**
 * lib/razorpay.ts — Razorpay SDK singleton for server-side use.
 *
 * [SECURITY] Secret keys are server-side only. Never expose to client.
 * Import this ONLY from files inside app/api/ — never from components or pages.
 *
 * Uses lazy initialisation so the module can be bundled without throwing
 * if the env vars are absent during the Next.js build step.
 */

import Razorpay from 'razorpay';

let _client: Razorpay | null = null;

/** Returns the shared Razorpay client. Throws if env vars are missing. */
export function getRazorpay(): Razorpay {
  if (_client) return _client;

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      '[Razorpay] RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env.local'
    );
  }

  _client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _client;
}
