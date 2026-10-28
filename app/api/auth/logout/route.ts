import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, getSessionUserFromCookies } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromCookies(request);
    if (user) {
      dbStore.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LOGOUT',
        details: `User ${user.name} logged out and invalidated signed session.`,
      });
    }

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete('sih_user_id');
    cookieStore.delete('sih_user_role');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
