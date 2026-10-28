import { NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/session';
import { sanitizeUser } from '@/lib/password';

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromCookies(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Not authenticated. Valid signed session cookie required.',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to verify session' },
      { status: 500 }
    );
  }
}
