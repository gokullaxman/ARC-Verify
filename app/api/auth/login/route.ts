import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';
import { sanitizeUser } from '@/lib/password';
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  getSessionCookieOptions,
} from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role, userId } = body || {};

    // Strictly reject passwordless login-by-role or login-by-userId
    if ((role || userId) && (!email || !password)) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'PASSWORD_REQUIRED',
          message: 'Passwordless login by role or userId is disabled. Both email and password are required.',
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

    const existingUser = dbStore.getUserByEmail(email.trim());
    if (existingUser && existingUser.status === 'INACTIVE') {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'ACCOUNT_INACTIVE',
          message: 'Your account is deactivated. Contact System Administrator.',
        },
        { status: 403 }
      );
    }

    const user = dbStore.authenticate(email.trim(), password);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
        { status: 401 }
      );
    }

    const signedToken = signSessionToken({ id: user.id, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signedToken, getSessionCookieOptions());
    cookieStore.delete('sih_user_id');
    cookieStore.delete('sih_user_role');

    dbStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      details: `Authenticated login via verified password hash and signed httpOnly session for ${user.name} (${user.role}).`,
    });

    return NextResponse.json({
      success: true,
      data: sanitizeUser(user),
      message: 'Login successful',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
