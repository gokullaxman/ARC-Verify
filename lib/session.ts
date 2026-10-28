import crypto from 'crypto';
import { cookies } from 'next/headers';
import { User, UserRole } from '@/types';
import { dbStore } from './store';

export const SESSION_COOKIE_NAME = 'arc_verify_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSessionSecret(): string {
  return (
    process.env.ARC_VERIFY_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'arc-verify-sih-26261-hmac-sha256-session-secret-key-2026'
  );
}

export interface SessionPayload {
  uid: string;
  role: UserRole;
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Signs a session payload using HMAC-SHA256.
 * Token format: <base64url(payloadJSON)>.<base64url(hmacSha256)>
 */
export function signSessionToken(user: Pick<User, 'id' | 'role'>, ttlSeconds = SESSION_TTL_SECONDS): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: user.id,
    role: user.role,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
    jti: crypto.randomUUID(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const mac = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${mac}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token in constant time and checks expiration.
 */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) return null;

  try {
    const expectedMac = crypto
      .createHmac('sha256', getSessionSecret())
      .update(payloadB64)
      .digest();
    const actualMac = Buffer.from(signatureB64, 'base64url');

    if (expectedMac.length !== actualMac.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(expectedMac, actualMac)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!decoded.uid || !decoded.exp || decoded.exp <= nowSec) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Resolves the authenticated User from a Request's Cookie or Authorization header,
 * falling back to Next.js cookies() store when called inside App Router handlers.
 * Never falls back to an unauthenticated default user.
 */
export async function getSessionUserFromCookies(request?: Request): Promise<User | null> {
  try {
    let token: string | undefined;

    if (request) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader
        .split(';')
        .map(p => p.trim())
        .find(p => p.startsWith(`${SESSION_COOKIE_NAME}=`));
      if (match) {
        token = decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1));
      }
      if (!token) {
        const authHeader = request.headers.get('authorization') || '';
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.slice(7).trim();
        }
      }
    }

    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    }

    const verified = verifySessionToken(token);
    if (!verified) return null;

    const user = dbStore.getUserById(verified.uid);
    if (!user || user.status === 'INACTIVE') return null;

    return user;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
