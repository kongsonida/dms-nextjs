import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessAdmin } from '@/lib/auth';
import { getAuditLogs } from '@/lib/audit';

// GET /api/audit - List audit logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canAccessAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const documentId = searchParams.get('documentId') || undefined;
    const action = searchParams.get('action') as any;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const { logs, total } = await getAuditLogs({
      entityType,
      entityId,
      userId,
      documentId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({
      success: true,
      data: logs.map((log: typeof logs[number]) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        user: log.user,
        document: log.document,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list audit logs' },
      { status: 500 }
    );
  }
}
