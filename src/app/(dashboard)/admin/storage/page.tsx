'use client';

import { useState, useEffect } from 'react';
import {
  HardDrive,
  User,
  Search,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Edit,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UserStorage {
  id: string;
  name: string | null;
  email: string;
  role: string;
  storageUsed: number;
  storageQuota: number;
  documentsCount: number;
}

interface StorageOverview {
  totalUsed: number;
  totalQuota: number;
  usersCount: number;
  documentsCount: number;
}

export default function StorageManagementPage() {
  const [users, setUsers] = useState<UserStorage[]>([]);
  const [overview, setOverview] = useState<StorageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newQuota, setNewQuota] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStorageData();
  }, [search]);

  const fetchStorageData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/storage?${params}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users || []);
        setOverview(data.data.overview || null);
      }
    } catch (error) {
      console.error('Failed to fetch storage data:', error);
      // Set mock data for demo
      setOverview({
        totalUsed: 1024 * 1024 * 500, // 500MB
        totalQuota: 1024 * 1024 * 1024 * 10, // 10GB
        usersCount: 5,
        documentsCount: 25,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuota = async (userId: string) => {
    setSaving(true);
    try {
      const quotaBytes = parseFloat(newQuota) * 1024 * 1024 * 1024; // Convert GB to bytes
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageQuota: quotaBytes }),
      });

      if (response.ok) {
        fetchStorageData();
        setEditingUser(null);
        setNewQuota('');
      }
    } catch (error) {
      console.error('Failed to update quota:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = (used: number, quota: number) => {
    return quota > 0 ? (used / quota) * 100 : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Storage Management</h1>
        <p className="text-gray-500">Monitor and manage user storage quotas</p>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Storage Used</p>
                  <p className="text-2xl font-bold">{formatBytes(overview.totalUsed)}</p>
                </div>
                <HardDrive className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{getUsagePercentage(overview.totalUsed, overview.totalQuota).toFixed(1)}% used</span>
                  <span>{formatBytes(overview.totalQuota)} total</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(overview.totalUsed, overview.totalQuota))}`}
                    style={{ width: `${Math.min(getUsagePercentage(overview.totalUsed, overview.totalQuota), 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold">{overview.usersCount}</p>
                </div>
                <User className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Documents</p>
                  <p className="text-2xl font-bold">{overview.documentsCount}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Available Space</p>
                  <p className="text-2xl font-bold">{formatBytes(overview.totalQuota - overview.totalUsed)}</p>
                </div>
                <HardDrive className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Storage Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HardDrive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No users found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>User Storage Quotas</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Storage Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => {
                  const usagePercent = getUsagePercentage(user.storageUsed, user.storageQuota);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name || 'No name'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary">{user.role}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.documentsCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatBytes(user.storageUsed)}
                      </td>
                      <td className="px-6 py-4">
                        {editingUser === user.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="GB"
                              value={newQuota}
                              onChange={(e) => setNewQuota(e.target.value)}
                              className="w-20 h-8"
                            />
                            <span className="text-sm text-gray-500">GB</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-900">
                            {formatBytes(user.storageQuota)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{usagePercent.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getUsageColor(usagePercent)}`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                          {usagePercent >= 90 && (
                            <div className="flex items-center mt-1 text-xs text-red-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Near limit
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {editingUser === user.id ? (
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => updateQuota(user.id)}
                              disabled={saving || !newQuota}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setEditingUser(null); setNewQuota(''); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(user.id);
                              setNewQuota((user.storageQuota / (1024 * 1024 * 1024)).toFixed(1));
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Quota
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
