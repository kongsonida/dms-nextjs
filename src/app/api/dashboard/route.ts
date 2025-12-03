import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'MANAGER';

    // Build where clause based on role
    const documentWhere = isAdmin ? {} : { ownerId: userId };

    // Fetch stats in parallel
    const [
      totalDocuments,
      totalFolders,
      pendingWorkflows,
      user,
      recentDocuments,
      pendingSteps,
    ] = await Promise.all([
      // Total documents
      prisma.document.count({
        where: { ...documentWhere, isDeleted: false },
      }),

      // Total folders
      prisma.folder.count({
        where: isAdmin ? {} : { createdById: userId },
      }),

      // Pending workflows
      prisma.workflow.count({
        where: {
          status: 'ACTIVE',
          ...(isAdmin ? {} : { createdById: userId }),
        },
      }),

      // User storage info
      prisma.user.findUnique({
        where: { id: userId },
        select: { storageUsed: true, storageQuota: true },
      }),

      // Recent documents
      prisma.document.findMany({
        where: { ...documentWhere, isDeleted: false },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Pending workflow steps assigned to user
      prisma.workflowStep.findMany({
        where: {
          assignedToId: userId,
          status: 'PENDING',
          workflow: { status: 'ACTIVE' },
        },
        select: {
          id: true,
          name: true,
          dueDate: true,
          workflow: {
            select: {
              document: {
                select: { title: true },
              },
            },
          },
        },
        take: 5,
      }),
    ]);

    // Format storage used
    const storageUsedBytes = Number(user?.storageUsed || 0);
    let storageUsed = '0 MB';
    if (storageUsedBytes > 1024 * 1024 * 1024) {
      storageUsed = `${(storageUsedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (storageUsedBytes > 1024 * 1024) {
      storageUsed = `${(storageUsedBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (storageUsedBytes > 1024) {
      storageUsed = `${(storageUsedBytes / 1024).toFixed(2)} KB`;
    } else if (storageUsedBytes > 0) {
      storageUsed = `${storageUsedBytes} B`;
    }

    // Format pending tasks
    const pendingTasks = pendingSteps.map((step) => ({
      id: step.id,
      name: step.name,
      documentTitle: step.workflow.document.title,
      dueDate: step.dueDate?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalDocuments,
        totalFolders,
        pendingWorkflows,
        storageUsed,
        recentDocuments: recentDocuments.map((doc) => ({
          id: doc.id,
          title: doc.title,
          slug: doc.slug,
          status: doc.status,
          createdAt: doc.createdAt.toISOString(),
        })),
        pendingTasks,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
