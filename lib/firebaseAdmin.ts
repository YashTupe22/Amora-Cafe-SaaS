/**
 * lib/firebaseAdmin.ts — Firebase Admin SDK singleton.
 *
 * [SECURITY] Secret keys are server-side only. Never expose to client.
 * Import this ONLY from files inside app/api/ — never from components or pages.
 *
 * Required env vars (server-only — no NEXT_PUBLIC_ prefix):
 *   FIREBASE_ADMIN_PROJECT_ID    — same project as the client SDK
 *   FIREBASE_ADMIN_CLIENT_EMAIL  — service account email
 *   FIREBASE_ADMIN_PRIVATE_KEY   — service account private key (newlines as \n)
 *
 * Generate a service account key from:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 */

import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';

let _app: App | null = null;

function getApp(): App {
  if (_app) return _app;
  if (admin.apps.length > 0) {
    _app = admin.app();
    return _app;
  }

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID
                   ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Env vars stored in .env.local escape newlines — replace literal \n with real newline
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      '[FirebaseAdmin] Missing env vars. Set FIREBASE_ADMIN_PROJECT_ID, ' +
      'FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in .env.local'
    );
  }

  _app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  return _app;
}

/** Returns the Firebase Admin Auth service. Use to verify ID tokens. */
export function getAdminAuth() {
  getApp();
  return admin.auth();
}

/** Returns the Firebase Admin Firestore service. */
export function getAdminDb() {
  getApp();
  return admin.firestore();
}

/**
 * Verifies a Firebase ID token from an Authorization: Bearer <token> header.
 * Returns the decoded token (includes uid, email, etc.) or throws on failure.
 */
export async function verifyIdToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }
  const token = authHeader.split('Bearer ')[1];
  return getAdminAuth().verifyIdToken(token);
}
