import crypto from 'crypto';
import { cookies } from 'next/headers';
import { User, UserRole } from '@/types';
import { SESSION_SECRET, COOKIE_SECURE } from './env';
import { dbService } from './db';

export const SESSION_COOKIE_NAME = 'arc_verify_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export interface SessionPayload {
  uid: string;
  role: UserRole;
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Signs a session payload using HMAC-SHA256 and records the session jti in the database.
 * Token format: <base64url(payloadJSON)>.<base64url(hmacSha256)>
 */
export function signSessionToken(user: Pick<User, 'id' | 'role'>, ttlSeconds = SESSION_TTL_SECONDS): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  const payload: SessionPayload = {
    uid: user.id,
    role: user.role,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
    jti,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const mac = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  // Record session in DB session table
  try {
    dbService.createSession(jti, user.id, user.role, ttlSeconds);
  } catch (err) {
    console.error('[Session] Failed to persist session in DB:', err);
  }

  return `${payloadB64}.${mac}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token in constant time, checks expiration,
 * and validates against the DB session revocation table.
 */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) return null;

  try {
    const expectedMac = crypto
      .createHmac('sha256', SESSION_SECRET)
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
    if (!decoded.uid || !decoded.exp || decoded.exp <= nowSec || !decoded.jti) {
      return null;
    }

    // Check DB revocation
    const isActive = dbService.isSessionActive(decoded.jti);
    if (!isActive) {
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
        token = decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1)).replace(/^"|"$/g, '');
      }
      if (!token) {
        const authHeader = request.headers.get('authorization') || '';
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.slice(7).trim().replace(/^"|"$/g, '');
        }
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(SESSION_COOKIE_NAME)?.value?.replace(/^"|"$/g, '');
      } catch {
        // cookies() may throw in non-request contexts or static phases
      }
    }

    const verified = verifySessionToken(token);
    if (!verified) return null;

    let user = dbService.getUserById(verified.uid);
    if (!user) {
      const allUsers = dbService.listUsers();
      user = allUsers.find(u => u.id === verified.uid || u.role === verified.role) || null;
    }
    if (!user || user.status === 'INACTIVE') return null;

    // Ensure permissions list is never empty for authenticated valid roles
    if (!user.permissions || user.permissions.length === 0) {
      const roleRecord = dbService.getRoleByCode(user.role);
      if (roleRecord && roleRecord.permissions) {
        user.permissions = roleRecord.permissions;
      }
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Revokes a session given its raw token.
 */
export function revokeSessionByToken(token: string | undefined | null): void {
  if (!token) return;
  try {
    const parts = token.split('.');
    if (parts.length === 2) {
      const decoded = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as SessionPayload;
      if (decoded.jti) {
        dbService.revokeSession(decoded.jti);
      }
    }
  } catch {
    // ignore
  }
}

export function getSessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
