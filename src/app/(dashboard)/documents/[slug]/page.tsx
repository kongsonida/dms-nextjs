'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Share2,
  Edit,
  Trash2,
  Lock,
  Unlock,
  GitBranch,
  Clock,
  User,
  Tag,
  FileText,
  Eye,
  MessageSquare,
  History,
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBytes, formatDate } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: string;
  documentNumber: string | null;
  documentType: string;
  direction: string;
  confidentiality: string;
  status: string;
  thumbnailPath: string | null;
  ocrStatus: string;
  virusScanStatus: string;
  virusScanResult: string | null;
  isDeleted: boolean;
  owner: { id: string; name: string | null; email: string };
  folder: { id: string; name: string; slug: string } | null;
  tags: Array<{ id: string; name: string; color: string }>;
  metadata: Record<string, string>;
  versions: Array<{
    id: string;
    version: number;
    fileName: string;
    fileSize: string;
    changeNote: string | null;
    createdBy: { id: string; name: string | null; email: string };
    createdAt: string;
  }>;
  currentVersion: number;
  isLocked: boolean;
  lockedBy: { id: string; name: string | null; email: string } | null;
  lockReason: string | null;
  versionsCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDocument();
  }, [params.slug]);

  const fetchDocument = async () => {
    try {
      // First get document by slug to get its ID
      const listResponse = await fetch(`/api/documents?search=${params.slug}`);
      const listData = await listResponse.json();

      if (!listData.success || listData.data.length === 0) {
        setError('Document not found');
        return;
      }

      const doc = listData.data.find((d: any) => d.slug === params.slug);
      if (!doc) {
        setError('Document not found');
        return;
      }

      const response = await fetch(`/api/documents/${doc.id}`);
      const data = await response.json();

      if (data.success) {
        setDocument(data.data);
      } else {
        setError(data.error || 'Failed to load document');
      }
    } catch (err) {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    if (!document) return;
    setActionLoading('lock');
    try {
      const response = await fetch(`/api/documents/${document.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 3600 }),
      });
      if (response.ok) {
        fetchDocument();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlock = async () => {
    if (!document) return;
    setActionLoading('unlock');
    try {
      const response = await fetch(`/api/documents/${document.id}/lock`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchDocument();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!document || !confirm('Are you sure you want to delete this document?')) return;
    setActionLoading('delete');
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/documents');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
      DRAFT: 'secondary',
      PENDING_REVIEW: 'warning',
      APPROVED: 'success',
      PUBLISHED: 'success',
      ARCHIVED: 'secondary',
      REJECTED: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const getScanBadge = (status: string, result?: string | null) => {
    if (status === 'CLEAN') return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Clean</Badge>;
    if (status === 'INFECTED') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{result || 'Infected'}</Badge>;
    if (status === 'PENDING' || status === 'SCANNING') return <Badge variant="warning"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Scanning</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium">{error || 'Document not found'}</h3>
          <Link href="/documents">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusBadge(document.status)}
              <span className="text-gray-500">•</span>
              <span className="text-sm text-gray-500">{document.documentType}</span>
              {document.isLocked && (
                <>
                  <span className="text-gray-500">•</span>
                  <Badge variant="warning">
                    <Lock className="w-3 h-3 mr-1" />
                    Locked by {document.lockedBy?.name || document.lockedBy?.email}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <a href={`/api/documents/${document.id}/download`}>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </a>
          <Link href={`/documents/${document.slug}/share`}>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </Link>
          {document.isLocked ? (
            <Button variant="outline" onClick={handleUnlock} disabled={actionLoading === 'unlock'}>
              {actionLoading === 'unlock' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4 mr-2" />}
              Unlock
            </Button>
          ) : (
            <Button variant="outline" onClick={handleLock} disabled={actionLoading === 'lock'}>
              {actionLoading === 'lock' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Lock
            </Button>
          )}
          <Link href={`/workflows/new?documentId=${document.id}`}>
            <Button variant="outline">
              <GitBranch className="h-4 w-4 mr-2" />
              Start Workflow
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete} disabled={actionLoading === 'delete'}>
            {actionLoading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'details', label: 'Details', icon: FileText },
            { id: 'versions', label: 'Versions', icon: History, count: document.versionsCount },
            { id: 'comments', label: 'Comments', icon: MessageSquare, count: document.commentsCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {document.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 text-gray-900">{document.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">File Name</label>
                    <p className="mt-1 text-gray-900">{document.originalName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">File Size</label>
                    <p className="mt-1 text-gray-900">{formatBytes(BigInt(document.fileSize))}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Document Type</label>
                    <p className="mt-1 text-gray-900">{document.documentType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Direction</label>
                    <p className="mt-1 text-gray-900">{document.direction}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Confidentiality</label>
                    <p className="mt-1 text-gray-900">{document.confidentiality}</p>
                  </div>
                  {document.documentNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Document Number</label>
                      <p className="mt-1 text-gray-900">{document.documentNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            {Object.keys(document.metadata).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(document.metadata).map(([key, value]) => (
                      <div key={key}>
                        <label className="text-sm font-medium text-gray-500">{key}</label>
                        <p className="mt-1 text-gray-900">{value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Virus Scan</span>
                  {getScanBadge(document.virusScanStatus, document.virusScanResult)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">OCR Status</span>
                  <Badge variant={document.ocrStatus === 'COMPLETED' ? 'success' : 'secondary'}>
                    {document.ocrStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium">{document.owner.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{document.owner.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {document.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag) => (
                      <Badge key={tag.id} style={{ backgroundColor: tag.color, color: 'white' }}>
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Timestamps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Created</span>
                  <span>{formatDate(document.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Updated</span>
                  <span>{formatDate(document.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Version</span>
                  <span>v{document.currentVersion}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <Card>
          <CardContent className="p-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change Note</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {document.versions.map((version) => (
                  <tr key={version.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={version.version === document.currentVersion ? 'default' : 'secondary'}>
                        v{version.version}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{version.fileName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBytes(BigInt(version.fileSize))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{version.changeNote || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {version.createdBy.name || version.createdBy.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(version.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <a href={`/api/documents/${document.id}/download?version=${version.version}`}>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'comments' && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Comments coming soon</h3>
            <p className="text-gray-500 mt-1">This feature is under development</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
