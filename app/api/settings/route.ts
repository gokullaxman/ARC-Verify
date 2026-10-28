import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';
import { hasPermission } from '@/lib/auth';

export async function GET() {
  try {
    const settings = dbStore.getSystemSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;
    const user = userId ? dbStore.getUserById(userId) : dbStore.getCurrentUser();

    if (!user || !hasPermission(user, 'SYSTEM_SETTINGS')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Modifying system settings requires SUPER_ADMIN or SYSTEM_SETTINGS privilege.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updatedSettings = dbStore.updateSystemSettings(body);
    return NextResponse.json({
      success: true,
      message: 'System settings and AI thresholds successfully updated and applied.',
      data: updatedSettings
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
