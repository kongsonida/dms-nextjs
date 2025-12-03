'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  FileText,
  HardDrive,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  documents: {
    total: number;
    thisMonth: number;
    pendingReview: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  activity: {
    todayActions: number;
    weekActions: number;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  entityType: string;
  userName: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/audit?limit=10'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        if (activityData.success) {
          setRecentActivity(activityData.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
      CREATE: 'success',
      UPDATE: 'default',
      DELETE: 'destructive',
      UPLOAD: 'success',
      DOWNLOAD: 'secondary',
      LOGIN: 'default',
      APPROVE: 'success',
      REJECT: 'destructive',
    };
    return <Badge variant={colors[action] || 'secondary'}>{action}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Default stats if API not available
  const displayStats = stats || {
    users: { total: 0, active: 0, newThisMonth: 0 },
    documents: { total: 0, thisMonth: 0, pendingReview: 0 },
    storage: { used: 0, total: 10737418240, percentage: 0 },
    activity: { todayActions: 0, weekActions: 0 },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">System overview and statistics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{displayStats.users.total}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +{displayStats.users.newThisMonth} this month
                </p>
              </div>
              <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900">{displayStats.documents.total}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {displayStats.documents.pendingReview} pending review
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Storage Used</p>
                <p className="text-3xl font-bold text-gray-900">
                  {displayStats.storage.percentage.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatBytes(displayStats.storage.used)} / {formatBytes(displayStats.storage.total)}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Activity</p>
                <p className="text-3xl font-bold text-gray-900">{displayStats.activity.todayActions}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {displayStats.activity.weekActions} this week
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/admin/users"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="h-8 w-8 text-indigo-600 mb-2" />
                <h4 className="font-medium">Manage Users</h4>
                <p className="text-sm text-gray-500">Add, edit, or remove users</p>
              </Link>
              <Link
                href="/admin/settings"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                <h4 className="font-medium">System Settings</h4>
                <p className="text-sm text-gray-500">Configure system options</p>
              </Link>
              <Link
                href="/admin/audit"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Activity className="h-8 w-8 text-purple-600 mb-2" />
                <h4 className="font-medium">View Audit Logs</h4>
                <p className="text-sm text-gray-500">Monitor system activity</p>
              </Link>
              <Link
                href="/admin/storage"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <HardDrive className="h-8 w-8 text-yellow-600 mb-2" />
                <h4 className="font-medium">Storage Manager</h4>
                <p className="text-sm text-gray-500">Manage storage quotas</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/admin/audit" className="text-sm text-indigo-600 hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getActionBadge(activity.action)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.userName || 'System'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.entityType}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Database</p>
                <p className="text-sm text-green-600">Connected</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Cache (Redis)</p>
                <p className="text-sm text-green-600">Connected</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900">Search</p>
                <p className="text-sm text-yellow-600">Check Status</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900">Antivirus</p>
                <p className="text-sm text-yellow-600">Check Status</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
