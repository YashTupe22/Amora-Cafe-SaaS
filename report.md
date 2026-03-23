# Amora Cafe - Security & Code Review Report

**Generated:** 2026-03-22  
**Reviewed By:** Claude Opus 4.5, Claude Sonnet 4.5, GPT 5.2 Codex, GPT 5.3 Codex, Gemini 3 Pro

---

## Executive Summary

This comprehensive code review identified **critical security vulnerabilities** requiring immediate action, along with high-priority bugs and missing features. The most severe issue is **exposed production secrets** in the repository.

### Severity Overview

| Severity | Count | Immediate Action Required |
|----------|-------|---------------------------|
| 🔴 Critical | 4 | YES - within 24 hours |
| 🟠 High | 8 | YES - within 1 week |
| 🟡 Medium | 7 | Planned sprint |
| 🔵 Low | 2 | Backlog |

---

## 🔴 CRITICAL ISSUES (Immediate Action Required)

### 1. Production Secrets Committed to Repository

**Files:** `.env.local`  
**Detected By:** All 5 models (unanimous)

**Problem:**  
The repository contains **LIVE PRODUCTION CREDENTIALS**:
- Firebase Admin service account private key
- Razorpay live API secret (`L6ceOw0OfjPAHkLX5MK5yNFL`)
- Razorpay webhook secret
- Razorpay live key ID (`rzp_live_SLDHO1SYKZupik`)

**Danger:**  
Anyone with repository access can:
- Fully compromise Firebase Admin access
- Process fraudulent payments
- Access all user data
- Impersonate the application

**Required Actions:**
```bash
# 1. IMMEDIATELY rotate all credentials:
#    - Generate new Firebase Admin service account key
#    - Generate new Razorpay API keys and webhook secret
#    - Update production environment variables

# 2. Remove from git history (if ever pushed remotely):
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Add pre-commit hook to prevent future leaks
# Install git-secrets or similar tool
```

---

### 2. Critical Vulnerabilities in jsPDF Package

**File:** `package.json:20` (jspdf v2.5.2)  
**Detected By:** Sonnet 4.5, GPT 5.3 Codex

**Problem:**  
12 known vulnerabilities including:
- **CRITICAL:** Local File Inclusion/Path Traversal
- **CRITICAL:** HTML Injection in New Window paths
- **HIGH:** PDF Object Injection allowing Arbitrary JavaScript Execution
- **HIGH:** Multiple DoS vulnerabilities

**Required Actions:**
```bash
npm install jspdf@latest
# Test PDF export functionality after update
```

---

### 3. Sync Data Loss Vulnerability

**File:** `lib/syncEngine.ts:99-127`  
**Detected By:** Gemini 3 Pro

**Problem:**  
The `fetchAndCacheFromFirebase` function can overwrite local pending changes with old server data due to a race condition:
1. Function deletes all local `synced` records
2. If a record was modified to `pending` after fetch started but before delete, it survives
3. However, `bulkPut` then overwrites the local pending changes with stale server data

**Danger:** Users lose offline changes silently.

**Required Fix:**
```typescript
// In fetchAndCacheFromFirebase, before bulkPut:
const pendingIds = await localDb.employees
  .filter(e => e._syncStatus === 'pending')
  .primaryKeys();

const safeEmps = emps.filter(e => !pendingIds.includes(e.id));
await localDb.employees.bulkPut(safeEmps);
```

---

### 4. Build is Broken - Missing Interface Fields

**File:** `lib/appStore.tsx:878`  
**Detected By:** GPT 5.3 Codex

**Problem:**  
`LocalTransaction`, `LocalInvoice`, and `LocalInventoryItem` now require a non-optional `interface` field, but writes to IndexedDB still omit it. **Build fails and blocks deployment.**

**Required Fix:**
```typescript
// Ensure all writes include interface:
await localDb.transactions.add({
  ...transactionData,
  interface: profile.activeInterface ?? 'restaurant',
  _syncStatus: 'pending'
});
```

---

## 🟠 HIGH SEVERITY ISSUES

### 5. Hardcoded Admin Email Backdoor

**Files:** 
- `app/api/superadmin/users/route.ts:13`
- `app/api/superadmin/notify/route.ts:17`
- `app/api/superadmin/subscription/[uid]/route.ts:14`
- `app/superadmin/page.tsx:13`

**Detected By:** All models

**Problem:**  
```typescript
const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'yashrtupe01@gmail.com';
```
Hardcoded fallback email creates permanent backdoor if env var is not set.

**Required Fix:**
```typescript
const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
if (!ADMIN_EMAIL) {
  throw new Error('SUPERADMIN_EMAIL environment variable must be set');
}
```

---

### 6. High-Severity Vulnerabilities in xlsx Package

**File:** `package.json:31` (xlsx v0.18.5)  
**Detected By:** Sonnet 4.5

**Problem:**
- Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
- Regular Expression DoS (GHSA-5pgg-2g8v-p4x9)

**Required Fix:**
```bash
npm install xlsx@latest
```

---

### 7. Firestore Batch Limit Will Break at Scale

**File:** `app/api/superadmin/notify/route.ts:56-62`  
**Detected By:** Gemini 3 Pro

**Problem:**  
Notification broadcast fetches ALL users and adds writes to a single Firestore batch. **Firestore batches are limited to 500 operations.** This endpoint will permanently fail once you have 500+ users.

**Required Fix:**
```typescript
// Process in chunks of 500
const BATCH_LIMIT = 500;
const users = usersSnap.docs;

for (let i = 0; i < users.length; i += BATCH_LIMIT) {
  const batch = db.batch();
  const chunk = users.slice(i, i + BATCH_LIMIT);
  chunk.forEach(user => {
    batch.set(db.collection('notifications').doc(), notification);
  });
  await batch.commit();
}
```

---

### 8. Interface Data Not Persisted to Firestore

**File:** `lib/syncEngine.ts:238-249, 260-263, 274-280`  
**Detected By:** GPT 5.3 Codex

**Problem:**  
The `interface` field is read from Firestore but NOT written back during sync. Records created offline lose interface metadata and get incorrect defaults on re-fetch, causing cross-interface data mixing.

**Required Fix:**
Include `interface` in every Firestore `setDoc`/`updateDoc` payload.

---

### 9. Sensitive PII (Aadhaar) Stored Unencrypted

**Files:** `lib/mockData.ts:16`, `lib/syncEngine.ts:122-225`  
**Detected By:** Sonnet 4.5

**Problem:**  
Aadhaar numbers (India's national ID) are stored in plain text in both IndexedDB and Firestore. This violates India's data protection laws.

**Required Fix:**
1. Implement client-side encryption using Web Crypto API
2. Use field-level encryption in Firestore
3. Consider tokenization instead of storing actual numbers

---

### 10. Insecure Firestore Rules for User Profile

**File:** `firestore.rules:45-48`  
**Detected By:** Gemini 3 Pro

**Problem:**  
Users can modify ANY field in their profile except `id`. They could potentially modify `role`, `subscriptionStatus`, or other sensitive fields.

**Required Fix:**
```javascript
// Whitelist allowed fields
allow update: if request.auth.uid == uid
  && request.resource.data.diff(resource.data).affectedKeys()
     .hasOnly(['name', 'phone', 'address', 'settings']);
```

---

### 11. Firebase Admin SDK Leak Risk

**File:** `lib/firebaseAdmin.ts:32`  
**Detected By:** Sonnet 4.5

**Problem:**  
If this server-only module is accidentally imported into a client component, the private key could be bundled and exposed.

**Required Fix:**
```typescript
// Add at top of firebaseAdmin.ts:
import 'server-only';
```

---

### 12. Public Diagnostic Page Exposes Backend

**File:** `public/test-data.html:121-123`  
**Detected By:** GPT 5.3 Codex

**Problem:**  
Static page contains hardcoded Supabase credentials and UI for signup/login/data insert. Enables automated account creation, quota burn, and reconnaissance.

**Required Fix:**
Delete this file from production builds or gate behind authentication.

---

## 🟡 MEDIUM SEVERITY ISSUES

### 13. No Security Headers Configured

**Files:** `next.config.ts`, `middleware.ts`  
**Detected By:** Sonnet 4.5

**Missing Headers:**
- `Content-Security-Policy` (XSS protection)
- `X-Frame-Options` (clickjacking)
- `X-Content-Type-Options` (MIME sniffing)
- `Strict-Transport-Security` (HTTPS enforcement)

**Required Update:** Add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      ],
    }];
  },
};
```

---

### 14. Next.js CSRF Vulnerabilities

**File:** `package.json:22` (next v16.1.6)  
**Detected By:** Sonnet 4.5, GPT 5.3 Codex

**Problem:**
- Null origin can bypass Server Actions CSRF checks
- HTTP request smuggling in rewrites
- Unbounded disk cache growth (DoS)

**Required Fix:**
```bash
npm install next@16.2.1 eslint-config-next@16.2.1
```

---

### 15. No Rate Limiting on Authentication

**Files:** `app/page.tsx`, `app/signup/page.tsx`, `lib/appStore.tsx:684-767`  
**Detected By:** Sonnet 4.5

**Missing Features:**
- Rate limiting on login/signup
- Account lockout after failed attempts
- CAPTCHA after multiple failures
- Auth failure logging

---

### 16. Weak Middleware Auth Check

**File:** `middleware.ts:19`  
**Detected By:** Gemini 3 Pro, Sonnet 4.5

**Problem:**  
Middleware checks `Authorization` header existence but doesn't validate the token. Any value passes.

**Required Fix:**
Remove partial check or implement actual token validation.

---

### 17. OOM Risk in User Listing API

**File:** `app/api/superadmin/users/route.ts:25-28`  
**Detected By:** Gemini 3 Pro

**Problem:**  
Fetches entire `users` collection with no pagination. Will cause memory exhaustion as user base grows.

**Required Fix:**
Implement cursor-based pagination with `startAfter` and `limit`.

---

### 18. Webhook Race Condition

**File:** `app/api/subscription/webhook/route.ts:176-187`  
**Detected By:** Gemini 3 Pro

**Problem:**  
If webhook arrives before `create` endpoint finishes writing `razorpaySubId`, webhook may process incorrectly.

**Required Fix:**
Use Firestore transaction in `create` route to reserve ID immediately.

---

### 19. No CSRF Protection on API Routes

**Files:** All API routes in `app/api/`  
**Detected By:** Sonnet 4.5 (first review)

**Problem:**  
None of the API routes implement CSRF token validation.

**Required Fix:**
1. Upgrade Next.js (includes CSRF fixes)
2. Add SameSite cookie attributes
3. Add origin validation in API routes

---

## 📋 FEATURE ADDITIONS NEEDED

| Feature | Priority | Description |
|---------|----------|-------------|
| Rate Limiting | High | Implement on all auth and payment endpoints |
| Encryption | High | Encrypt PII (Aadhaar) at rest |
| Security Headers | Medium | Add CSP, HSTS, X-Frame-Options |
| Pagination | Medium | Add to all list endpoints |
| Audit Logging | Medium | Log auth failures and admin access |
| CAPTCHA | Medium | Add to signup/login after failures |
| IP Allowlisting | Low | For superadmin routes |
| Pre-commit Hooks | Low | Prevent secret commits |

---

## 📦 DEPENDENCY UPDATES REQUIRED

```bash
# Critical security updates
npm install next@latest eslint-config-next@latest
npm install jspdf@latest
npm install xlsx@latest

# Run full audit
npm audit fix

# Check remaining vulnerabilities
npm audit
```

---

## ✅ ACTION CHECKLIST

### Immediate (Today)
- [ ] Rotate ALL exposed credentials (Firebase, Razorpay)
- [ ] Remove `.env.local` from git history if committed
- [ ] Fix build error (add `interface` field to writes)

### This Week
- [ ] Update vulnerable packages (jspdf, xlsx, next)
- [ ] Remove hardcoded admin email fallback
- [ ] Delete `public/test-data.html`
- [ ] Add `import 'server-only'` to firebaseAdmin.ts
- [ ] Fix sync data loss race condition

### This Sprint
- [ ] Fix Firestore batch limit in notifications
- [ ] Add security headers to next.config.ts
- [ ] Implement pagination on user listing
- [ ] Fix Firestore rules to whitelist fields
- [ ] Implement rate limiting on auth endpoints

### Backlog
- [ ] Encrypt Aadhaar data at rest
- [ ] Add audit logging
- [ ] Implement CAPTCHA
- [ ] Add pre-commit hooks for secrets

---

*Report generated by multi-model code review using Claude Opus 4.5, Claude Sonnet 4.5, GPT 5.2 Codex, GPT 5.3 Codex, and Gemini 3 Pro.*
