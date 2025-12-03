import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserNotifications, markAllNotificationsAsRead, deleteAllNotifications } from '@/lib/notifications';

// GET /api/notifications - List user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const { notifications, total, unreadCount } = await getUserNotifications(session.user.id, {
      unreadOnly,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      total,
      unreadCount,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark all as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const count = await markAllNotificationsAsRead(session.user.id);

    return NextResponse.json({
      success: true,
      data: { markedAsRead: count },
    });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete all notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const count = await deleteAllNotifications(session.user.id);

    return NextResponse.json({
      success: true,
      data: { deleted: count },
    });
  } catch (error) {
    console.error('Delete notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
