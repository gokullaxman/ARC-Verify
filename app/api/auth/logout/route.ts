import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbService } from '@/lib/db';
import {
  SESSION_COOKIE_NAME,
  getSessionUserFromCookies,
  revokeSessionByToken,
} from '@/lib/session';

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromCookies(request);

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      revokeSessionByToken(token);
    }

    if (user) {
      dbService.appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: user.id,
        reason: `User ${user.name} logged out; session token revoked.`,
      });
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete('sih_user_id');
    cookieStore.delete('sih_user_role');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Logout completed' },
      { status: 200 }
    );
  }
}
