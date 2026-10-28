import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function GET() {
  try {
    const notifications = dbStore.getNotifications();
    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'mark_all_read') {
      dbStore.markAllNotificationsRead();
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });
    }

    if (body.action === 'mark_read' && body.id) {
      dbStore.markNotificationRead(body.id);
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action or missing parameters' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
