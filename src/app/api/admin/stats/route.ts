import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get user stats
    const [totalUsers, activeUsers, newUsersThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

    // Get document stats
    const [totalDocuments, documentsThisMonth, pendingReview] = await Promise.all([
      prisma.document.count({ where: { isDeleted: false } }),
      prisma.document.count({
        where: { isDeleted: false, createdAt: { gte: startOfMonth } },
      }),
      prisma.document.count({
        where: { isDeleted: false, status: 'PENDING_REVIEW' },
      }),
    ]);

    // Get storage stats
    const storageResult = await prisma.user.aggregate({
      _sum: { storageUsed: true },
    });
    const totalStorageUsed = Number(storageResult._sum.storageUsed || 0);
    const totalStorageQuota = 10 * 1024 * 1024 * 1024; // 10GB default total

    // Get activity stats
    const [todayActions, weekActions] = await Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: startOfWeek } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsersThisMonth,
        },
        documents: {
          total: totalDocuments,
          thisMonth: documentsThisMonth,
          pendingReview: pendingReview,
        },
        storage: {
          used: totalStorageUsed,
          total: totalStorageQuota,
          percentage: (totalStorageUsed / totalStorageQuota) * 100,
        },
        activity: {
          todayActions,
          weekActions,
        },
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
