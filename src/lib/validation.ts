import { z } from 'zod';

// User schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EDITOR', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  storageQuota: z.number().positive().optional(),
});

// Document schemas
export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().nullable().optional().transform(v => v || undefined),
  documentNumber: z.string().nullable().optional().transform(v => v || undefined),
  documentType: z
    .enum([
      'GENERAL',
      'CONTRACT',
      'INVOICE',
      'REPORT',
      'MEMO',
      'LETTER',
      'POLICY',
      'PROCEDURE',
      'FORM',
      'OTHER',
    ])
    .nullable()
    .optional()
    .transform(v => v || undefined),
  direction: z.enum(['INCOMING', 'OUTGOING', 'INTERNAL']).nullable().optional().transform(v => v || undefined),
  confidentiality: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']).nullable().optional().transform(v => v || undefined),
  folderId: z.string().nullable().optional().transform(v => v || undefined),
  tags: z.array(z.string()).nullable().optional().transform(v => v || undefined),
  metadata: z.record(z.string(), z.string()).nullable().optional().transform(v => v || undefined),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().optional(),
  documentNumber: z.string().optional(),
  documentType: z
    .enum([
      'GENERAL',
      'CONTRACT',
      'INVOICE',
      'REPORT',
      'MEMO',
      'LETTER',
      'POLICY',
      'PROCEDURE',
      'FORM',
      'OTHER',
    ])
    .optional(),
  direction: z.enum(['INCOMING', 'OUTGOING', 'INTERNAL']).optional(),
  confidentiality: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']).optional(),
  status: z
    .enum(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'REJECTED'])
    .optional(),
  folderId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// Folder schemas
export const createFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

// Tag schemas
export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
});

// Share link schemas
export const createShareLinkSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  password: z.string().min(4, 'Password must be at least 4 characters').optional(),
  expiresAt: z.string().datetime().optional(),
  maxDownloads: z.number().positive().optional(),
  allowPreview: z.boolean().optional(),
  allowDownload: z.boolean().optional(),
});

// Workflow schemas
export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  documentId: z.string().min(1, 'Document ID is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional(),
  steps: z
    .array(
      z.object({
        name: z.string().min(1, 'Step name is required'),
        description: z.string().optional(),
        assignedToId: z.string().min(1, 'Assignee is required'),
        action: z.string().optional(),
        dueDate: z.string().datetime().optional(),
      })
    )
    .min(1, 'At least one step is required'),
});

export const updateWorkflowStepSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'SKIPPED']),
  comment: z.string().optional(),
});

// Comment schemas
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  parentId: z.string().optional(),
});

// Webhook schemas
export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  url: z.string().url('Invalid URL'),
  secret: z.string().optional(),
  events: z
    .array(
      z.enum([
        'document.created',
        'document.updated',
        'document.deleted',
        'document.shared',
        'workflow.created',
        'workflow.completed',
        'user.created',
      ])
    )
    .min(1, 'At least one event is required'),
});

// Search schemas
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  filters: z
    .object({
      documentType: z.string().optional(),
      direction: z.string().optional(),
      status: z.string().optional(),
      folderId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
    .optional(),
  sort: z.enum(['relevance', 'title', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().positive().optional(),
  limit: z.number().positive().max(100).optional(),
});

// Retention policy schemas
export const retentionPolicySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  daysToRetain: z.number().positive('Days must be positive'),
  action: z.enum(['archive', 'delete']),
  isActive: z.boolean().optional(),
});

// System settings schemas
export const systemSettingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
  category: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
});

// Validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}
