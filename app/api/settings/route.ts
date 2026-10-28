import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { requireUser, handleRouteError } from '@/lib/guard';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const settings = dbService.getSystemSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const caller = await requireUser(request, 'SYSTEM_SETTINGS');
    const body = await request.json();

    const updatedSettings = dbService.updateSystemSettings(body, caller.id);

    dbService.appendAuditEvent({
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'SYSTEM_SETTINGS_UPDATE',
      entityType: 'SystemSettings',
      entityId: 'global',
      reason: `System settings updated by ${caller.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'System settings and AI thresholds successfully updated and applied.',
      data: updatedSettings,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
