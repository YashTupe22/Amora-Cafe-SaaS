# 🔥 Firebase Backend Setup

Synplix uses **Firebase** as its sole backend — Authentication for user identity and Firestore for data persistence.

---

## Prerequisites

- A Google account
- [Node.js 18+](https://nodejs.org)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

---

## Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Enter a project name (e.g. `synplix-prod`)
4. (Optional) Disable Google Analytics if not needed → click **Create project**

---

## Step 2 — Enable Authentication

1. In the Firebase console, click **Authentication** in the left sidebar
2. Click **Get started**
3. Under **Sign-in providers**, enable **Email/Password**
4. Toggle it **ON** → click **Save**

---

## Step 3 — Create a Firestore Database

1. Click **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Production mode** (we will deploy proper rules in Step 5)
4. Select a region closest to your users (e.g. `asia-south1` for India)
5. Click **Enable**

---

## Step 4 — Register a Web App & Get Config

1. In Project Overview, click the **Web** icon (`</>`)
2. Enter an app nickname (e.g. `Synplix Web`)
3. Click **Register app**
4. Copy the `firebaseConfig` values shown
5. Add them to your `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## Step 5 — Deploy Security Rules

The security rules are in `firestore.rules`. They enforce:
- Users can only read/write their own data
- `support_requests` are write-only from the client
- Field-level validation on amounts, required fields, document size limits

### Deploy via Firebase CLI

```bash
# Authenticate
firebase login

# Link to your project
firebase use your_project_id

# Deploy rules and composite indexes
firebase deploy --only firestore
```

This deploys both `firestore.rules` and `firestore.indexes.json`.

---

## Step 6 — Verify Setup

1. Start the dev server: `npm run dev`
2. Open [http://localhost:3001](http://localhost:3001)
3. Sign up with a new account
4. Complete the onboarding wizard
5. Add a transaction or create a bill
6. Refresh — data should persist ✅
7. Check the Firebase console → **Firestore Database** → you should see your data under `users/{uid}/`

---

## Firestore Data Model

```
users/
  {uid}/                          ← Business profile & settings
    employees/
      {docId}                     ← Staff records
    invoices/
      {docId}                     ← Bills / invoices
    transactions/
      {docId}                     ← Income & expense ledger
    inventory/
      {docId}                     ← Stock items
support_requests/
  {docId}                         ← Help-desk submissions (admin read-only)
```

---

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
→ Check that all `NEXT_PUBLIC_FIREBASE_*` variables are correctly set in `.env.local` and restart the dev server.

### "Missing or insufficient permissions"
→ Your security rules are blocking the write. Check:
1. The user is authenticated (`request.auth != null`)
2. The `uid` in the path matches `request.auth.uid`
3. You've deployed the latest `firestore.rules` via `firebase deploy --only firestore`

### "Failed to fetch" on login
→ Firebase is unreachable. Check your internet connection; disable VPN/ad-blockers that might block `*.firebaseapp.com`.

### Offline mode not working after rules deployment
→ The sync engine uses Firestore batched writes which are covered by the same user-ownership rules. Ensure `request.auth.uid == uid` is satisfied — i.e. the user is still signed in when the sync flush occurs.

---

## Optional: Enable Multi-Factor Authentication (MFA)

1. In the Firebase console → **Authentication** → **Sign-in providers**
2. Scroll to **Advanced** → enable **SMS Multi-factor Authentication**
3. Add your app's domain to the **Authorised domains** list
4. Phone SMS MFA requires billing (Blaze plan) — enable in Project Settings

---

*Built by [Applix Infotech](https://applix.in)*
