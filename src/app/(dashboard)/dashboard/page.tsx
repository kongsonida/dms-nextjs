'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  FolderOpen,
  GitBranch,
  Users,
  HardDrive,
  TrendingUp,
  Clock,
  Loader2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalDocuments: number;
  totalFolders: number;
  pendingWorkflows: number;
  storageUsed: string;
  recentDocuments: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    createdAt: string;
  }>;
  pendingTasks: Array<{
    id: string;
    name: string;
    documentTitle: string;
    dueDate: string | null;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        // Set default stats if API fails
        setStats({
          totalDocuments: 0,
          totalFolders: 0,
          pendingWorkflows: 0,
          storageUsed: '0 MB',
          recentDocuments: [],
          pendingTasks: [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setStats({
        totalDocuments: 0,
        totalFolders: 0,
        pendingWorkflows: 0,
        storageUsed: '0 MB',
        recentDocuments: [],
        pendingTasks: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {session?.user?.name || 'User'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Here's what's happening with your documents
          </p>
        </div>
        <Link href="/documents/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Documents
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalDocuments || 0}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full">
                <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Folders
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalFolders || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <FolderOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending Workflows
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.pendingWorkflows || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <GitBranch className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Storage Used
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.storageUsed || '0 MB'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <HardDrive className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Documents</CardTitle>
            <Link href="/documents">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentDocuments && stats.recentDocuments.length > 0 ? (
              <div className="space-y-4">
                {stats.recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {doc.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No documents yet</p>
                <Link href="/documents/upload" className="mt-2 inline-block">
                  <Button variant="outline" size="sm">
                    Upload your first document
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Tasks</CardTitle>
            <Link href="/workflows">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.pendingTasks && stats.pendingTasks.length > 0 ? (
              <div className="space-y-4">
                {stats.pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center space-x-3">
                      <GitBranch className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {task.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {task.documentTitle}
                        </p>
                      </div>
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(task.dueDate)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <GitBranch className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No pending tasks</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Tasks from workflows will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/documents/upload">
              <Button variant="outline" className="w-full h-20 flex-col">
                <Upload className="h-6 w-6 mb-2" />
                Upload Document
              </Button>
            </Link>
            <Link href="/folders">
              <Button variant="outline" className="w-full h-20 flex-col">
                <FolderOpen className="h-6 w-6 mb-2" />
                Browse Folders
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="outline" className="w-full h-20 flex-col">
                <TrendingUp className="h-6 w-6 mb-2" />
                Search Documents
              </Button>
            </Link>
            <Link href="/workflows/new">
              <Button variant="outline" className="w-full h-20 flex-col">
                <GitBranch className="h-6 w-6 mb-2" />
                Create Workflow
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
