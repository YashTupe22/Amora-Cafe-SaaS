/**
 * app/pricing/checkout/page.tsx
 * Razorpay checkout flow:
 *  1. Reads ?plan=pro&cycle=monthly from URL
 *  2. Gets Firebase ID token
 *  3. POST /api/subscription/create → { subscriptionId, razorpayKeyId }
 *  4. Loads Razorpay JS SDK, opens modal
 *  5. On success → POST /api/subscription/verify → refresh → /dashboard?upgraded=1
 */

'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams }                         from 'next/navigation';
import Link                                                   from 'next/link';
import { auth }                                               from '@/lib/firebase';
import { useAppStore }                                        from '@/lib/appStore';
import { PLAN_PRICING, type PlanName }                        from '@/lib/planAccess';

// ─── Razorpay type shim ───────────────────────────────────────────────────────

declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key:             string;
  subscription_id: string;
  name:            string;
  description:     string;
  image?:          string;
  prefill?: {
    name?:  string;
    email?: string;
    contact?: string;
  };
  theme?: { color: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
  };
}

interface RazorpaySuccessResponse {
  razorpay_payment_id:      string;
  razorpay_subscription_id: string;
  razorpay_signature:       string;
}

interface RazorpayInstance {
  open():  void;
  close(): void;
}

// ─── Helper: load Razorpay script ─────────────────────────────────────────────

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve();
      return;
    }
    const script   = document.createElement('script');
    script.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async   = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
}

// ─── Plan labels ──────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

function CheckoutFlow() {
  const router      = useRouter();
  const params      = useSearchParams();
  const { profile, subscription } = useAppStore();

  const plan  = (params.get('plan')  ?? 'pro') as PlanName;
  const cycle = (params.get('cycle') ?? 'monthly') as 'monthly' | 'annual';

  const [step,    setStep]    = useState<'idle' | 'loading' | 'payment' | 'verifying' | 'done' | 'error'>('idle');
  const [errMsg,  setErrMsg]  = useState('');

  // Redirect free plan back to pricing
  useEffect(() => {
    if (plan === 'free') { router.replace('/pricing'); return; }
    // Already on this plan
    if (subscription?.plan === plan && subscription?.status === 'active') {
      router.replace('/pricing');
    }
  }, [plan, subscription, router]);

  const startCheckout = useCallback(async () => {
    setStep('loading');
    setErrMsg('');

    try {
      // 1. Get Firebase ID token
      const idToken = auth?.currentUser
        ? await auth.currentUser.getIdToken()
        : null;
      if (!idToken) {
        setErrMsg('You must be signed in to continue.');
        setStep('error');
        return;
      }

      // 2. Create subscription on the server
      const createRes = await fetch('/api/subscription/create', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ plan, billingCycle: cycle }),
      });
      const createData = await createRes.json() as {
        subscriptionId?: string;
        razorpayKeyId?:  string;
        error?:          string;
      };
      if (!createRes.ok || !createData.subscriptionId) {
        setErrMsg(createData.error ?? 'Failed to create subscription. Please try again.');
        setStep('error');
        return;
      }

      // 3. Load Razorpay SDK
      await loadRazorpayScript();
      setStep('payment');

      // 4. Open Razorpay checkout modal
      const rzp = new window.Razorpay({
        key:             createData.razorpayKeyId!,
        subscription_id: createData.subscriptionId!,
        name:            'Synplix Cafe Suite',
        description:     `${PLAN_LABELS[plan] ?? plan} plan — ${cycle === 'monthly' ? 'monthly' : 'annual'} billing`,
        prefill: {
          name:  profile?.name  ?? undefined,
          email: profile?.email ?? undefined,
          contact: profile?.phone ?? undefined,
        },
        theme: { color: '#f59e0b' },
        handler: async (response) => {
          setStep('verifying');
          try {
            // 5. Verify payment signature on the server
            const verifyRes = await fetch('/api/subscription/verify', {
              method:  'POST',
              headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                razorpay_payment_id:      response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature:       response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json() as { ok?: boolean; error?: string };
            if (!verifyRes.ok || !verifyData.ok) {
              setErrMsg(verifyData.error ?? 'Payment verification failed. Contact support.');
              setStep('error');
              return;
            }
            setStep('done');
            // 6. Redirect to dashboard — onAuthStateChanged will reload subscription
            setTimeout(() => {
              router.push(`/dashboard?upgraded=1&plan=${plan}`);
            }, 1000);
          } catch {
            setErrMsg('Verification request failed. Please contact support if your payment was deducted.');
            setStep('error');
          }
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            // User closed the modal without paying
            setStep('idle');
          },
        },
      });

      rzp.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      setErrMsg(msg);
      setStep('error');
    }
  }, [plan, cycle, profile, router]);

  // Auto-start checkout once
  useEffect(() => {
    if (step === 'idle') startCheckout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const price    = cycle === 'monthly' ? PLAN_PRICING[plan]?.monthly : PLAN_PRICING[plan]?.annual;
  const planName = PLAN_LABELS[plan] ?? plan;

  return (
    <div
      style={{
        minHeight:   '100vh',
        background:  'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        padding:     '32px 24px',
        fontFamily:  'system-ui, sans-serif',
        color:       '#fff',
      }}
    >
      <div
        style={{
          background:   'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          border:       '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          padding:      '40px',
          width:        '100%',
          maxWidth:     420,
          textAlign:    'center',
        }}
      >
        {/* Logo */}
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 28px rgba(249,115,22,0.5)', fontSize: 24 }}>
          ⚡
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>
          {step === 'done' ? 'Payment Successful! 🎉' : `Upgrade to ${planName}`}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: '0 0 28px' }}>
          {step === 'done'
            ? `You're now on the ${planName} plan.`
            : price
              ? `₹${price.toLocaleString('en-IN')} / ${cycle === 'monthly' ? 'month' : 'year'}`
              : ''}
        </p>

        {/* Status display */}
        {step === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Preparing secure checkout…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {step === 'payment' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Complete payment in the checkout window…</p>
          </div>
        )}

        {step === 'verifying' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Verifying payment…</p>
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
              ✓
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Redirecting to dashboard…</p>
          </div>
        )}

        {step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background:   'rgba(239,68,68,0.12)',
                border:       '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                padding:      '14px',
                fontSize:     '13px',
                color:        '#fca5a5',
                textAlign:    'left',
              }}
            >
              {errMsg}
            </div>
            <button
              onClick={startCheckout}
              style={{
                background:   'linear-gradient(135deg,#f59e0b,#ef4444)',
                border:       'none',
                borderRadius: '10px',
                padding:      '12px',
                color:        '#fff',
                fontWeight:   700,
                fontSize:     '14px',
                cursor:       'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {step === 'idle' && (
          <button
            onClick={startCheckout}
            style={{
              background:   'linear-gradient(135deg,#f59e0b,#ef4444)',
              border:       'none',
              borderRadius: '10px',
              padding:      '14px',
              color:        '#fff',
              fontWeight:   700,
              fontSize:     '15px',
              cursor:       'pointer',
              width:        '100%',
            }}
          >
            Pay Now
          </button>
        )}

        {/* Back link */}
        {(step === 'idle' || step === 'error') && (
          <Link
            href="/pricing"
            style={{ display: 'block', marginTop: 16, color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecoration: 'none' }}
          >
            ← Back to pricing
          </Link>
        )}

        {/* Security note */}
        <p style={{ marginTop: 28, fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          🔒 Secured by Razorpay · 256-bit TLS encryption
        </p>
      </div>
    </div>
  );
}

// ─── Page export (Suspense required for useSearchParams in App Router) ─────────

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutFlow />
    </Suspense>
  );
}
