import prisma from './prisma';
import { NotificationType } from '@prisma/client';
import { sendNotificationEmail } from './email';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  sendEmail?: boolean;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    // Create notification in database
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      },
    });

    // Send email if requested
    if (input.sendEmail) {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      });

      if (user) {
        await sendNotificationEmail(user.email, input.title, input.message, input.link);
      }
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function notifyDocumentShared(
  userId: string,
  documentTitle: string,
  sharedBy: string,
  shareLink: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'DOCUMENT_SHARED',
    title: 'Document Shared With You',
    message: `${sharedBy} has shared "${documentTitle}" with you.`,
    link: shareLink,
    sendEmail: true,
  });
}

export async function notifyWorkflowAssigned(
  userId: string,
  workflowName: string,
  documentTitle: string,
  assignedBy: string,
  workflowLink: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'WORKFLOW_ASSIGNED',
    title: 'New Workflow Assignment',
    message: `${assignedBy} has assigned you to the workflow "${workflowName}" for document "${documentTitle}".`,
    link: workflowLink,
    sendEmail: true,
  });
}

export async function notifyWorkflowCompleted(
  userId: string,
  workflowName: string,
  documentTitle: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'WORKFLOW_COMPLETED',
    title: 'Workflow Completed',
    message: `The workflow "${workflowName}" for document "${documentTitle}" has been completed.`,
    sendEmail: true,
  });
}

export async function notifyCommentAdded(
  userId: string,
  documentTitle: string,
  commenterName: string,
  documentLink: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'COMMENT_ADDED',
    title: 'New Comment',
    message: `${commenterName} commented on "${documentTitle}".`,
    link: documentLink,
    sendEmail: false,
  });
}

export async function notifyDocumentApproved(
  userId: string,
  documentTitle: string,
  approverName: string,
  documentLink: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'DOCUMENT_APPROVED',
    title: 'Document Approved',
    message: `Your document "${documentTitle}" has been approved by ${approverName}.`,
    link: documentLink,
    sendEmail: true,
  });
}

export async function notifyDocumentRejected(
  userId: string,
  documentTitle: string,
  rejectorName: string,
  reason: string,
  documentLink: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'DOCUMENT_REJECTED',
    title: 'Document Rejected',
    message: `Your document "${documentTitle}" has been rejected by ${rejectorName}. Reason: ${reason}`,
    link: documentLink,
    sendEmail: true,
  });
}

export async function notifyMention(
  userId: string,
  mentionedBy: string,
  context: string,
  link: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'MENTION',
    title: 'You were mentioned',
    message: `${mentionedBy} mentioned you: "${context}"`,
    link,
    sendEmail: false,
  });
}

export async function notifySystem(
  userId: string,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'SYSTEM',
    title,
    message,
    link,
    sendEmail: false,
  });
}

// Query notifications
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const where: Record<string, unknown> = { userId };

  if (options.unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, total, unreadCount };
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return false;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });

  return true;
}

export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return result.count;
}

export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return false;
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return true;
}

export async function deleteAllNotifications(userId: string): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: { userId },
  });

  return result.count;
}
