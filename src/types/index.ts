import { Role, DocumentStatus, DocumentType, DocumentDirection, ConfidentialLevel, WorkflowStatus, Priority, StepStatus, OcrStatus, ScanStatus } from '@prisma/client';

// Re-export Prisma types
export { Role, DocumentStatus, DocumentType, DocumentDirection, ConfidentialLevel, WorkflowStatus, Priority, StepStatus, OcrStatus, ScanStatus };

// User types
export interface UserSummary {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
}

export interface UserProfile extends UserSummary {
  storageQuota: bigint;
  storageUsed: bigint;
  createdAt: Date;
}

// Document types
export interface DocumentSummary {
  id: string;
  title: string;
  slug: string;
  fileName: string;
  mimeType: string;
  fileSize: bigint;
  status: DocumentStatus;
  documentType: DocumentType;
  createdAt: Date;
  updatedAt: Date;
  owner: UserSummary;
}

export interface DocumentDetail extends DocumentSummary {
  description: string | null;
  documentNumber: string | null;
  direction: DocumentDirection;
  confidentiality: ConfidentialLevel;
  ocrStatus: OcrStatus;
  virusScanStatus: ScanStatus;
  thumbnailPath: string | null;
  folder: FolderSummary | null;
  tags: TagSummary[];
  metadata: MetadataEntry[];
  isLocked: boolean;
  lockedBy: UserSummary | null;
  currentVersion: number;
}

export interface MetadataEntry {
  key: string;
  value: string;
}

// Folder types
export interface FolderSummary {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface FolderDetail extends FolderSummary {
  description: string | null;
  children: FolderSummary[];
  documentCount: number;
  createdAt: Date;
}

// Tag types
export interface TagSummary {
  id: string;
  name: string;
  slug: string;
  color: string;
}

// Version types
export interface DocumentVersion {
  id: string;
  version: number;
  fileName: string;
  fileSize: bigint;
  changeNote: string | null;
  createdBy: UserSummary;
  createdAt: Date;
}

// Workflow types
export interface WorkflowSummary {
  id: string;
  name: string;
  status: WorkflowStatus;
  priority: Priority;
  dueDate: Date | null;
  document: DocumentSummary;
  createdBy: UserSummary;
  createdAt: Date;
}

export interface WorkflowDetail extends WorkflowSummary {
  description: string | null;
  steps: WorkflowStepDetail[];
  completedAt: Date | null;
}

export interface WorkflowStepDetail {
  id: string;
  order: number;
  name: string;
  description: string | null;
  assignedTo: UserSummary;
  status: StepStatus;
  action: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  comment: string | null;
}

// Share types
export interface ShareLinkInfo {
  id: string;
  token: string;
  expiresAt: Date | null;
  maxDownloads: number | null;
  downloads: number;
  allowPreview: boolean;
  allowDownload: boolean;
  createdBy: UserSummary;
  createdAt: Date;
}

// Audit types
export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  user: UserSummary | null;
  document: DocumentSummary | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

// Notification types
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

// Search types
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  fileName: string;
  documentType: string;
  status: string;
  owner: string;
  createdAt: Date;
  highlights?: {
    title?: string[];
    description?: string[];
    ocrText?: string[];
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  facets?: {
    documentType: Record<string, number>;
    status: Record<string, number>;
    tags: Record<string, number>;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard types
export interface DashboardStats {
  totalDocuments: number;
  totalUsers: number;
  totalStorage: bigint;
  recentDocuments: DocumentSummary[];
  pendingWorkflows: WorkflowSummary[];
  documentsByType: Record<string, number>;
  documentsByStatus: Record<string, number>;
  uploadsThisMonth: number;
  downloadsThisMonth: number;
}

// Settings types
export interface SystemSettings {
  appName: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  defaultStorageQuota: number;
  enableOcr: boolean;
  enableVirusScan: boolean;
  smtpEnabled: boolean;
  meilisearchEnabled: boolean;
}

// Upload types
export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}
