import crypto from 'crypto';
import { User } from '@/types';

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

/**
 * Hashes a plaintext password using salted scrypt (RFC 7914).
 * Format: scrypt$<saltHex>$<derivedKeyHex>
 */
export function hashPassword(plaintext: string, saltHex?: string): string {
  if (!plaintext || plaintext.length < 1) {
    throw new Error('Password cannot be empty');
  }
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const derived = crypto.scryptSync(plaintext, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash using constant-time comparison.
 * Rejects any non-hashed or malformed password records.
 */
export function verifyPassword(plaintext: string, storedHash: string | undefined | null): boolean {
  if (!plaintext || !storedHash || typeof plaintext !== 'string' || typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, saltHex, expectedHex] = parts;
  if (!saltHex || !expectedHex || expectedHex.length !== SCRYPT_KEYLEN * 2) {
    return false;
  }

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const actualBuf = crypto.scryptSync(plaintext, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Strips passwordHash before returning a User object over any API response.
 */
export function sanitizeUser<T extends Partial<User>>(user: T): Omit<T, 'passwordHash'> {
  const clone = { ...user };
  delete clone.passwordHash;
  return clone;
}
