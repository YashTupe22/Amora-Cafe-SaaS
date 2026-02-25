import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase must only initialise in the browser — the SDK throws auth/invalid-api-key
// when evaluated on the server (SSR / static prerendering).
// NEXT_PUBLIC_* vars are inlined by Next.js into the client bundle at build time;
// on the server they may not be present, so all checks are inside the isBrowser guard.
const isBrowser = typeof window !== 'undefined';

let _auth: Auth | null = null;
let _db: Firestore | null = null;

if (isBrowser) {
  const hasConfig = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  if (!hasConfig) {
    console.warn('[Firebase] Missing env vars — check NEXT_PUBLIC_FIREBASE_* in .env.local.');
  } else {
    try {
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      _auth = getAuth(app);
      _db = getFirestore(app);
    } catch (e) {
      console.warn('[Firebase] Initialisation failed:', e);
    }
  }
}

export const auth = _auth as Auth;
export const db   = _db as Firestore;
