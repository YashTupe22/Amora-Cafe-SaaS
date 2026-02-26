/**
 * lib/crypto.ts — Browser-safe password hashing using bcryptjs.
 *
 * Uses bcryptjs (pure-JS, no native bindings) so it works in IndexedDB
 * offline-auth flows without any network calls or Node.js APIs.
 *
 * SALT_ROUNDS = 10 is the industry standard balance between security and
 * performance that completes in ~100ms on a mid-range phone.
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const BCRYPT_PREFIX = '$2b$';

/**
 * Hash a plain-text password. Returns a bcrypt hash string.
 * Always call this before storing a password in IndexedDB.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plain-text candidate against a stored bcrypt hash.
 * Returns true only when they match. Timing-safe via bcrypt internals.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Guard: returns true when the stored value is already a bcrypt hash.
 * Used by the migration path — if the stored password does NOT start
 * with the bcrypt prefix it was saved before hashing was introduced,
 * and must be re-hashed on the user's next successful login.
 */
export function isHashed(value: string): boolean {
  return value.startsWith(BCRYPT_PREFIX);
}
