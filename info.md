# Task 3 — Razorpay Frontend Checkout Integration

## Overview
Task 3 wires up the frontend so users can actually **pay** and upgrade their plan.
Task 2 built all the server APIs; this task builds the client-side checkout flow on top of them.

---

## What YOU need to do (manual steps)

### 1. Create a Razorpay account
- Sign up at https://razorpay.com
- Complete KYC (required before going live; test mode works without it)

### 2. Create Subscription Plans in Razorpay Dashboard
Go to **Dashboard → Subscriptions → Plans → Create Plan** and create one plan for each paid tier × billing cycle:

| Plan           | Interval | Interval Count | Amount (paise) | Notes             |
|---------------|----------|----------------|----------------|-------------------|
| Starter Monthly | monthly  | 1              | 49900          | ₹499              |
| Starter Annual  | yearly   | 1              | 479900         | ₹4,799            |
| Pro Monthly     | monthly  | 1              | 99900          | ₹999              |
| Pro Annual      | yearly   | 1              | 959900         | ₹9,599            |
| Enterprise Monthly | monthly | 1             | 199900         | ₹1,999            |
| Enterprise Annual  | yearly  | 1              | 1919900        | ₹19,199           |

Copy each **Plan ID** (looks like `plan_XXXXXXXXXXXXXXXX`).

### 3. Fill in `.env.local`
Copy `.env.example` → `.env.local` and populate:

```env
# Firebase Client (from Firebase Console → Project Settings → Web App)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (from Firebase Console → Project Settings → Service Accounts → Generate key)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Razorpay (from Razorpay Dashboard → Settings → API Keys)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...       ← safe to be public
RAZORPAY_KEY_SECRET=...                        ← keep secret
RAZORPAY_WEBHOOK_SECRET=...                    ← set after step 4

# Razorpay Plan IDs (from step 2 above)
RAZORPAY_PLAN_STARTER_MONTHLY=plan_...
RAZORPAY_PLAN_STARTER_ANNUAL=plan_...
RAZORPAY_PLAN_PRO_MONTHLY=plan_...
RAZORPAY_PLAN_PRO_ANNUAL=plan_...
RAZORPAY_PLAN_ENTERPRISE_MONTHLY=plan_...
RAZORPAY_PLAN_ENTERPRISE_ANNUAL=plan_...
```

### 4. Register the Webhook in Razorpay Dashboard
Go to **Dashboard → Settings → Webhooks → Add New Webhook**:
- **Webhook URL**: `https://your-domain.com/api/subscription/webhook`
  - For local testing use **ngrok**: `ngrok http 3000` → copy the HTTPS URL
- **Secret**: generate a random string (e.g. `openssl rand -hex 32`), paste into both the Razorpay form and `RAZORPAY_WEBHOOK_SECRET`
- **Events to enable**:
  - `subscription.activated`
  - `subscription.charged`
  - `subscription.cancelled`
  - `subscription.halted`
  - `subscription.completed`

### 5. Testing
Use Razorpay **test mode** (key starts with `rzp_test_`).
Test card: `4111 1111 1111 1111`, any future expiry, any CVV.
Test UPI: `success@razorpay`

---

## What I (Copilot) will build

### A. `app/pricing/checkout/page.tsx`
The full checkout flow:
1. Reads `?plan=pro&cycle=monthly` from URL
2. Gets the Firebase ID token from the current session
3. Calls `POST /api/subscription/create` → receives `{ subscriptionId, razorpayKeyId }`
4. Loads the Razorpay JS SDK and opens the **checkout modal** pre-filled with user details
5. On payment success (`handler` callback) → calls `POST /api/subscription/verify` with the 3 Razorpay signature fields
6. On verification success → refreshes the subscription in appStore → redirects to `/dashboard?upgraded=1`
7. Handles loading states, errors, and the back button gracefully

### B. `hooks/useSubscription.ts`
Client hook that:
- Reads the `subscription` object already in appStore
- Exposes typed helpers: `plan`, `isActive`, `canAccess(feature)`, `requiresUpgrade(feature)`, `cancelAtPeriodEnd`
- Provides `refreshSubscription()` to re-fetch from the server after a payment

### C. `components/PlanGate.tsx`
Wrapper component:
```tsx
<PlanGate feature="pdfExport" fallback={<UpgradeBanner feature="PDF Export" requiredPlan="starter" />}>
  <PDFExportButton />
</PlanGate>
```
- Reads plan from `useSubscription()`
- Renders children when the user has access
- Renders `fallback` (UpgradeBanner by default) otherwise

### D. Sidebar plan badge
- Small pill at the bottom of the sidebar showing the current plan name  
- "Upgrade" link appears for Free/Starter users
- Clicking it goes to `/pricing`

### E. Dashboard success toast
- Reads `?upgraded=1` from the URL after redirect from checkout
- Shows a one-time success message: "🎉 You're now on the Pro plan!"

---

## File Checklist
| File | Status |
|------|--------|
| `app/pricing/checkout/page.tsx` | 🔲 to build |
| `hooks/useSubscription.ts` | 🔲 to build |
| `components/PlanGate.tsx` | 🔲 to build |
| `components/layout/Sidebar.tsx` | 🔲 to modify (plan badge) |
| `app/dashboard/page.tsx` | 🔲 to modify (success toast) |

---

## Architecture Notes
- The Razorpay JS SDK is loaded **dynamically** in the browser via a `<script>` tag inject — no npm package needed on the client (Razorpay does not publish an ESM bundle)
- The Firebase ID token is obtained via `getIdToken()` on the `auth.currentUser` object
- All payment amounts, plan IDs, and secrets live **server-side only** — the client only ever receives a `subscriptionId` and the public `keyId`
- Webhook handles server-authoritative state (the source of truth); the verify route is a fast-path for immediate UX feedback
