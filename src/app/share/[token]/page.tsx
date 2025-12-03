'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  Lock,
  Calendar,
  User,
  Eye,
  AlertTriangle,
  Loader2,
  Shield,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ShareData {
  document: {
    id: string;
    title: string;
    description: string | null;
    fileName: string;
    fileSize: number;
    mimeType: string;
    documentType: string;
    owner: {
      name: string | null;
      email: string;
    };
  };
  share: {
    expiresAt: string | null;
    allowDownload: boolean;
    accessCount: number;
    maxAccessCount: number | null;
  };
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchShareData();
  }, [token]);

  const fetchShareData = async (pwd?: string) => {
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (pwd) {
        headers['X-Share-Password'] = pwd;
      }

      const response = await fetch(`/api/share/${token}`, { headers });
      const data = await response.json();

      if (response.status === 401 && data.requiresPassword) {
        setNeedsPassword(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Failed to access shared document');
        setLoading(false);
        return;
      }

      if (data.success) {
        setShareData(data.data);
        setNeedsPassword(false);
      }
    } catch (err) {
      setError('Failed to load shared document');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShareData(password);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const headers: Record<string, string> = {};
      if (password) {
        headers['X-Share-Password'] = password;
      }

      const response = await fetch(`/api/share/${token}/download`, { headers });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = shareData?.document.fileName || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType === 'application/pdf') {
      return '📄';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return '📝';
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return '📊';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return '📽️';
    }
    return '📁';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <CardTitle>Password Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              This shared document is protected with a password.
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">
                Access Document
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareData) {
    return null;
  }

  const { document, share } = shareData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            <span className="font-semibold text-gray-900 dark:text-white">Secure Document Sharing</span>
          </div>
          <Badge variant="secondary">
            <Eye className="h-3 w-3 mr-1" />
            {share.accessCount} view{share.accessCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            {/* Document Info */}
            <div className="flex items-start space-x-6">
              <div className="text-5xl">{getFileIcon(document.mimeType)}</div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{document.title}</h1>
                {document.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{document.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {document.fileName}
                  </span>
                  <span>{formatFileSize(document.fileSize)}</span>
                  <Badge variant="outline">{document.documentType}</Badge>
                </div>

                <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    Shared by {document.owner.name || document.owner.email}
                  </span>
                </div>

                {/* Share Details */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                  {share.expiresAt && (
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Expires: {formatDate(share.expiresAt)}
                      </span>
                    </div>
                  )}
                  {share.maxAccessCount && (
                    <div className="flex items-center text-sm">
                      <Eye className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {share.maxAccessCount - share.accessCount} views remaining
                      </span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Download className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Download: {share.allowDownload ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center space-x-4">
                  {share.allowDownload && (
                    <Button onClick={handleDownload} disabled={downloading}>
                      {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download Document
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Area (for supported file types) */}
            {document.mimeType === 'application/pdf' && (
              <div className="mt-8">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Preview</h3>
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 h-[600px]">
                  <iframe
                    src={`/api/share/${token}/preview`}
                    className="w-full h-full"
                    title="Document Preview"
                  />
                </div>
              </div>
            )}

            {document.mimeType.startsWith('image/') && (
              <div className="mt-8">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Preview</h3>
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={`/api/share/${token}/preview`}
                    alt={document.title}
                    className="max-w-full h-auto mx-auto"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            This document was shared securely. Do not share this link with unauthorized individuals.
          </p>
        </div>
      </div>
    </div>
  );
}
