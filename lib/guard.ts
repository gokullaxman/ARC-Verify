import { NextResponse } from 'next/server';
import { User, PermissionKey } from '@/types';
import { getSessionUserFromCookies } from './session';
import { hasPermission } from './auth';

export class HttpError extends Error {
  public status: number;
  public errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

/**
 * Primary Authorization & Identity Guard (Requirement B1-B8, B16-B18)
 *
 * Single gating helper for API routes:
 * 1. Resolves authenticated User from HMAC-verified session cookie or Bearer header.
 * 2. Rejects unauthenticated callers with HTTP 401.
 * 3. Checks required permission (if specified) and rejects unauthorized callers with HTTP 403.
 * 4. Never reads unvalidated sih_user_id or falls back to an unauthenticated mock user.
 */
export async function requireUser(req: Request, perm?: PermissionKey): Promise<User> {
  const user = await getSessionUserFromCookies(req);
  if (!user) {
    throw new HttpError(
      401,
      'Authentication required. Valid signed session cookie or Bearer token is missing or expired.',
      'UNAUTHORIZED'
    );
  }

  if (user.status === 'INACTIVE') {
    throw new HttpError(
      403,
      'Account is inactive. Access denied.',
      'ACCOUNT_INACTIVE'
    );
  }

  if (perm && !hasPermission(user, perm)) {
    throw new HttpError(
      403,
      `Forbidden: Missing required privilege '${perm}' to perform this action.`,
      'FORBIDDEN'
    );
  }

  return user;
}

/**
 * Standardized API Route error handler to format HttpError or unexpected errors.
 */
export function handleRouteError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        success: false,
        errorCode: error.errorCode || (error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST'),
        message: error.message,
      },
      { status: error.status }
    );
  }

  const err = error as any;
  console.error('[API Error]:', err);
  return NextResponse.json(
    {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred.',
    },
    { status: 500 }
  );
}

/**
 * Strips sensitive fields like passwordHash from user records before returning to clients.
 */
export function sanitizeUser<T extends Partial<User>>(user: T): Omit<T, 'passwordHash'> {
  const sanitized = { ...user };
  delete (sanitized as any).passwordHash;
  return sanitized;
}

