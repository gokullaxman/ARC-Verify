import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { requireUser, handleRouteError } from '@/lib/guard';

export async function GET(request: NextRequest) {
  try {
    const caller = await requireUser(request);
    const notifications = dbService.listNotifications(caller.id);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await requireUser(req);
    const body = await req.json();

    if (body.action === 'mark_all_read') {
      dbService.markAllNotificationsRead(caller.id);
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (body.action === 'mark_read' && body.id) {
      dbService.markNotificationRead(body.id);
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action or missing parameters' },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
