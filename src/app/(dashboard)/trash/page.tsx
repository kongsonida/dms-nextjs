'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trash2,
  RotateCcw,
  XCircle,
  FileText,
  Calendar,
  User,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface DeletedDocument {
  id: string;
  title: string;
  fileName: string;
  documentType: string;
  deletedAt: string;
  deletedBy: { id: string; name: string | null; email: string };
  retentionDate: string | null;
  size: number;
}

export default function TrashPage() {
  const [documents, setDocuments] = useState<DeletedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    fetchDeletedDocuments();
  }, []);

  const fetchDeletedDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents?deleted=true&limit=100');
      const data = await response.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch deleted documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const restoreDocument = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/documents/${id}/restore`, {
        method: 'POST',
      });
      if (response.ok) {
        setDocuments(documents.filter((d) => d.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to restore document:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const permanentlyDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this document? This action cannot be undone.')) {
      return;
    }

    setActionLoading(id);
    try {
      const response = await fetch(`/api/documents/${id}?permanent=true`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDocuments(documents.filter((d) => d.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  };

  const bulkRestore = async () => {
    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/documents/${id}/restore`, { method: 'POST' })
        )
      );
      setDocuments(documents.filter((d) => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to restore documents:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.size} document(s)? This action cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/documents/${id}?permanent=true`, { method: 'DELETE' })
        )
      );
      setDocuments(documents.filter((d) => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to delete documents:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const emptyTrash = async () => {
    if (!confirm('Are you sure you want to permanently delete ALL documents in trash? This action cannot be undone.')) {
      return;
    }

    setBulkActionLoading(true);
    try {
      await Promise.all(
        documents.map((d) =>
          fetch(`/api/documents/${d.id}?permanent=true`, { method: 'DELETE' })
        )
      );
      setDocuments([]);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to empty trash:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDaysUntilPermanentDeletion = (retentionDate: string | null) => {
    if (!retentionDate) return null;
    const days = Math.ceil((new Date(retentionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
          <p className="text-gray-500">
            Deleted documents are kept for 30 days before permanent deletion
          </p>
        </div>
        {documents.length > 0 && (
          <Button
            variant="destructive"
            onClick={emptyTrash}
            disabled={bulkActionLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Empty Trash
          </Button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-900">
                {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={bulkRestore}
                  disabled={bulkActionLoading}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={bulkDelete}
                  disabled={bulkActionLoading}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Delete Permanently
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Trash is empty</h3>
            <p className="text-gray-500 mt-1">
              Deleted documents will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center">
              <button
                onClick={toggleSelectAll}
                className="mr-3 text-gray-400 hover:text-gray-600"
              >
                {selectedIds.size === documents.length ? (
                  <CheckSquare className="h-5 w-5 text-indigo-600" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
              <CardTitle className="text-base">
                {documents.length} deleted document{documents.length !== 1 ? 's' : ''}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {documents.map((doc) => {
                const daysRemaining = getDaysUntilPermanentDeletion(doc.retentionDate);
                return (
                  <div
                    key={doc.id}
                    className="p-4 hover:bg-gray-50 flex items-center"
                  >
                    <button
                      onClick={() => toggleSelect(doc.id)}
                      className="mr-3 text-gray-400 hover:text-gray-600"
                    >
                      {selectedIds.has(doc.id) ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="font-medium text-gray-900">{doc.title}</span>
                        <Badge variant="secondary">{doc.documentType}</Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{doc.fileName}</span>
                        <span>{formatFileSize(doc.size)}</span>
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          Deleted by {doc.deletedBy.name || doc.deletedBy.email}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(doc.deletedAt)}
                        </span>
                      </div>
                      {daysRemaining !== null && (
                        <div className="mt-1">
                          {daysRemaining <= 7 ? (
                            <span className="text-xs text-red-600 flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Will be permanently deleted in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {daysRemaining} days until permanent deletion
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreDocument(doc.id)}
                        disabled={actionLoading === doc.id}
                      >
                        {actionLoading === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => permanentlyDelete(doc.id)}
                        disabled={actionLoading === doc.id}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retention Policy Info */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="py-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Retention Policy</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Documents in trash are automatically and permanently deleted after 30 days.
                Restored documents will return to their original location.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
