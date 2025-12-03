import crypto from 'crypto';
import prisma from './prisma';
import { addWebhookJob } from './queue';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

type WebhookEvent =
  | 'document.created'
  | 'document.updated'
  | 'document.deleted'
  | 'document.shared'
  | 'workflow.created'
  | 'workflow.completed'
  | 'user.created';

export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function dispatchWebhook(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  // Find all active webhooks that subscribe to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      isActive: true,
    },
  });

  const matchingWebhooks = webhooks.filter((webhook) => {
    const events = webhook.events as string[];
    return events.includes(event);
  });

  // Queue webhook deliveries
  for (const webhook of matchingWebhooks) {
    await addWebhookJob({
      webhookId: webhook.id,
      event,
      payload: {
        event,
        timestamp: new Date().toISOString(),
        data,
      },
    });
  }
}

export async function deliverWebhook(
  webhookId: string,
  event: string,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook || !webhook.isActive) {
    return { success: false, error: 'Webhook not found or inactive' };
  }

  const payloadString = JSON.stringify(payload);
  const signature = webhook.secret ? generateSignature(payloadString, webhook.secret) : undefined;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'DMS-Webhook/1.0',
      'X-Webhook-Event': event,
    };

    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
    });

    const responseText = await response.text();

    // Log the webhook delivery
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event,
        payload,
        response: responseText.substring(0, 1000), // Truncate long responses
        statusCode: response.status,
        success: response.ok,
      },
    });

    return {
      success: response.ok,
      statusCode: response.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log the failed delivery
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event,
        payload,
        success: false,
        error: errorMessage,
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Event dispatchers for common actions
export async function onDocumentCreated(document: {
  id: string;
  title: string;
  fileName: string;
  ownerId: string;
  ownerName?: string;
}): Promise<void> {
  await dispatchWebhook('document.created', {
    documentId: document.id,
    title: document.title,
    fileName: document.fileName,
    ownerId: document.ownerId,
    ownerName: document.ownerName,
  });
}

export async function onDocumentUpdated(document: {
  id: string;
  title: string;
  changes: Record<string, unknown>;
  updatedBy: string;
}): Promise<void> {
  await dispatchWebhook('document.updated', {
    documentId: document.id,
    title: document.title,
    changes: document.changes,
    updatedBy: document.updatedBy,
  });
}

export async function onDocumentDeleted(document: {
  id: string;
  title: string;
  deletedBy: string;
  permanent: boolean;
}): Promise<void> {
  await dispatchWebhook('document.deleted', {
    documentId: document.id,
    title: document.title,
    deletedBy: document.deletedBy,
    permanent: document.permanent,
  });
}

export async function onDocumentShared(share: {
  documentId: string;
  documentTitle: string;
  sharedBy: string;
  shareToken: string;
  expiresAt?: Date;
}): Promise<void> {
  await dispatchWebhook('document.shared', {
    documentId: share.documentId,
    documentTitle: share.documentTitle,
    sharedBy: share.sharedBy,
    shareToken: share.shareToken,
    expiresAt: share.expiresAt?.toISOString(),
  });
}

export async function onWorkflowCreated(workflow: {
  id: string;
  name: string;
  documentId: string;
  documentTitle: string;
  createdBy: string;
}): Promise<void> {
  await dispatchWebhook('workflow.created', {
    workflowId: workflow.id,
    name: workflow.name,
    documentId: workflow.documentId,
    documentTitle: workflow.documentTitle,
    createdBy: workflow.createdBy,
  });
}

export async function onWorkflowCompleted(workflow: {
  id: string;
  name: string;
  documentId: string;
  documentTitle: string;
  completedBy: string;
  status: string;
}): Promise<void> {
  await dispatchWebhook('workflow.completed', {
    workflowId: workflow.id,
    name: workflow.name,
    documentId: workflow.documentId,
    documentTitle: workflow.documentTitle,
    completedBy: workflow.completedBy,
    status: workflow.status,
  });
}

export async function onUserCreated(user: {
  id: string;
  email: string;
  name?: string;
  role: string;
}): Promise<void> {
  await dispatchWebhook('user.created', {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}
