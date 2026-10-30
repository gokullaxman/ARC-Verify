import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbService } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { sanitizeUser } from '@/lib/guard';
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  getSessionCookieOptions,
} from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Rate limit per IP
    const ipLimit = dbService.checkRateLimit(`ip:${clientIp}`, 15, 60);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'TOO_MANY_REQUESTS',
          message: 'Too many authentication attempts. Please try again after 1 minute.',
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, role, userId } = body || {};

    // Reject passwordless login attempts
    if ((role || userId) && (!email || !password)) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'PASSWORD_REQUIRED',
          message: 'Passwordless login is disabled. Both email and password are required.',
        },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'MISSING_CREDENTIALS',
          message: 'Email and password are required.',
        },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Rate limit per email
    const emailLimit = dbService.checkRateLimit(`email:${cleanEmail}`, 5, 60);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'TOO_MANY_REQUESTS',
          message: 'Too many failed login attempts for this account. Please wait 1 minute before retrying.',
        },
        { status: 429 }
      );
    }

    const user = dbService.getUserByEmail(cleanEmail);

    // Return single generic error for unknown, inactive, or incorrect password accounts
    if (!user || user.status === 'INACTIVE' || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
        { status: 401 }
      );
    }

    // Issue signed session token with jti tracked in DB
    const signedToken = signSessionToken({ id: user.id, role: user.role });
    const cookieOptions = getSessionCookieOptions();

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signedToken, cookieOptions);
    cookieStore.delete('sih_user_id');
    cookieStore.delete('sih_user_role');

    // Update lastLogin
    dbService.updateUser(user.id, { lastLogin: new Date().toISOString() });

    // Append audit event server-side
    dbService.appendAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      reason: `Authenticated login via verified scrypt password hash and signed session for ${user.name} (${user.role}).`,
    });

    const response = NextResponse.json({
      success: true,
      data: sanitizeUser(user),
      message: 'Login successful',
    });

    // Also attach cookie directly to the response object to guarantee header delivery in serverless lambdas
    response.cookies.set(SESSION_COOKIE_NAME, signedToken, cookieOptions);
    response.cookies.delete('sih_user_id');
    response.cookies.delete('sih_user_role');

    return response;
  } catch (error) {
    console.error('[Login Error]:', error);
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred during authentication.',
      },
      { status: 500 }
    );
  }
}
