import prisma from './prisma';
import { AuditAction } from '@prisma/client';

interface AuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId?: string;
  documentId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        documentId: input.documentId,
        details: input.details as object | undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging shouldn't break the main operation
  }
}

export async function logDocumentCreated(
  documentId: string,
  userId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: 'CREATE',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details,
  });
}

export async function logDocumentRead(
  documentId: string,
  userId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: 'READ',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details,
  });
}

export async function logDocumentUpdated(
  documentId: string,
  userId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: 'UPDATE',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details: { changes },
  });
}

export async function logDocumentDeleted(
  documentId: string,
  userId: string,
  permanent: boolean = false
): Promise<void> {
  await createAuditLog({
    action: 'DELETE',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details: { permanent },
  });
}

export async function logDocumentDownloaded(
  documentId: string,
  userId?: string,
  shareToken?: string
): Promise<void> {
  await createAuditLog({
    action: 'DOWNLOAD',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details: shareToken ? { viaShareLink: true, shareToken } : undefined,
  });
}

export async function logDocumentUploaded(
  documentId: string,
  userId: string,
  fileInfo: { fileName: string; fileSize: number; mimeType: string }
): Promise<void> {
  await createAuditLog({
    action: 'UPLOAD',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details: fileInfo,
  });
}

export async function logDocumentShared(
  documentId: string,
  userId: string,
  shareDetails: { shareId: string; expiresAt?: Date; maxDownloads?: number }
): Promise<void> {
  await createAuditLog({
    action: 'SHARE',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details: shareDetails,
  });
}

export async function logDocumentLocked(
  documentId: string,
  userId: string,
  reason?: string
): Promise<void> {
  await createAuditLog({
    action: 'LOCK',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details: reason ? { reason } : undefined,
  });
}

export async function logDocumentUnlocked(
  documentId: string,
  userId: string
): Promise<void> {
  await createAuditLog({
    action: 'UNLOCK',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
  });
}

export async function logDocumentCheckedOut(
  documentId: string,
  userId: string,
  version: number
): Promise<void> {
  await createAuditLog({
    action: 'CHECKOUT',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details: { version },
  });
}

export async function logDocumentCheckedIn(
  documentId: string,
  userId: string,
  version: number
): Promise<void> {
  await createAuditLog({
    action: 'CHECKIN',
    entityType: 'document',
    entityId: documentId,
    userId,
    documentId,
    details: { version },
  });
}

export async function logWorkflowApproved(
  workflowId: string,
  documentId: string,
  userId: string,
  comment?: string
): Promise<void> {
  await createAuditLog({
    action: 'APPROVE',
    entityType: 'workflow',
    entityId: workflowId,
    userId,
    documentId,
    details: comment ? { comment } : undefined,
  });
}

export async function logWorkflowRejected(
  workflowId: string,
  documentId: string,
  userId: string,
  comment?: string
): Promise<void> {
  await createAuditLog({
    action: 'REJECT',
    entityType: 'workflow',
    entityId: workflowId,
    userId,
    documentId,
    details: comment ? { comment } : undefined,
  });
}

export async function logCommentAdded(
  documentId: string,
  userId: string,
  commentId: string
): Promise<void> {
  await createAuditLog({
    action: 'COMMENT',
    entityType: 'comment',
    entityId: commentId,
    userId,
    documentId,
  });
}

export async function logUserLogin(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    action: 'LOGIN',
    entityType: 'user',
    entityId: userId,
    userId,
    ipAddress,
    userAgent,
  });
}

export async function logUserLogout(userId: string): Promise<void> {
  await createAuditLog({
    action: 'LOGOUT',
    entityType: 'user',
    entityId: userId,
    userId,
  });
}

export async function logPermissionChange(
  entityType: string,
  entityId: string,
  userId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: 'PERMISSION_CHANGE',
    entityType,
    entityId,
    userId,
    details: { changes },
  });
}

// Query audit logs
export async function getAuditLogs(options: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  documentId?: string;
  action?: AuditAction;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (options.entityType) where.entityType = options.entityType;
  if (options.entityId) where.entityId = options.entityId;
  if (options.userId) where.userId = options.userId;
  if (options.documentId) where.documentId = options.documentId;
  if (options.action) where.action = options.action;

  if (options.from || options.to) {
    where.createdAt = {};
    if (options.from) (where.createdAt as Record<string, Date>).gte = options.from;
    if (options.to) (where.createdAt as Record<string, Date>).lte = options.to;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        document: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

export async function getDocumentHistory(documentId: string, limit: number = 50) {
  return prisma.auditLog.findMany({
    where: { documentId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getUserActivity(userId: string, limit: number = 50) {
  return prisma.auditLog.findMany({
    where: { userId },
    include: {
      document: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
