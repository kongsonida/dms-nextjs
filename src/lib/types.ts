// Local type definitions matching Prisma schema enums
// These are defined locally to avoid dependency on Prisma client generation

export type Role = 'ADMIN' | 'MANAGER' | 'EDITOR' | 'VIEWER';

export type DocumentType =
  | 'GENERAL'
  | 'CONTRACT'
  | 'INVOICE'
  | 'REPORT'
  | 'MEMO'
  | 'LETTER'
  | 'POLICY'
  | 'PROCEDURE'
  | 'FORM'
  | 'OTHER';

export type DocumentDirection = 'INCOMING' | 'OUTGOING' | 'INTERNAL';

export type ConfidentialLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export type DocumentStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'REJECTED';

export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type ScanStatus = 'PENDING' | 'SCANNING' | 'CLEAN' | 'INFECTED' | 'ERROR';

export type WorkflowStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'SKIPPED';

export type NotificationType =
  | 'DOCUMENT_SHARED'
  | 'WORKFLOW_ASSIGNED'
  | 'WORKFLOW_COMPLETED'
  | 'COMMENT_ADDED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'MENTION'
  | 'SYSTEM';

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'DOWNLOAD'
  | 'UPLOAD'
  | 'SHARE'
  | 'LOCK'
  | 'UNLOCK'
  | 'CHECKOUT'
  | 'CHECKIN'
  | 'APPROVE'
  | 'REJECT'
  | 'COMMENT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PERMISSION_CHANGE';

export type UploadStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
