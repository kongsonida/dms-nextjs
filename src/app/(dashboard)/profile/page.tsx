'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Mail, Shield, HardDrive, Calendar, Loader2, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  storageUsed: string;
  storageQuota: string;
  createdAt: string;
  lastLogin: string | null;
  documentsCount: number;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/me');
      const data = await response.json();
      if (data.success) {
        setProfile(data.data);
        setName(data.data.name || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const updateData: Record<string, string> = { name };

      // Validate password change if provided
      if (newPassword || confirmPassword || currentPassword) {
        if (!currentPassword) {
          setError('Current password is required to change password');
          setSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('New passwords do not match');
          setSaving(false);
          return;
        }
        if (newPassword.length < 8) {
          setError('New password must be at least 8 characters');
          setSaving(false);
          return;
        }
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      // Update session with new name
      if (name !== session?.user?.name) {
        await updateSession({ name });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Refresh profile
      fetchProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
      ADMIN: 'destructive',
      MANAGER: 'warning',
      EDITOR: 'default',
      VIEWER: 'secondary',
    };
    return <Badge variant={variants[role] || 'secondary'}>{role}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your account settings</p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {(profile?.name || profile?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {profile?.name || 'No name set'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">{profile?.email}</p>
              <div className="mt-1">{profile?.role && getRoleBadge(profile.role)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                <HardDrive className="h-4 w-4 mr-1" />
                Storage Used
              </div>
              <p className="font-medium text-gray-900 dark:text-white">
                {profile?.storageUsed || '0 MB'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                <HardDrive className="h-4 w-4 mr-1" />
                Storage Quota
              </div>
              <p className="font-medium text-gray-900 dark:text-white">
                {profile?.storageQuota || '10 GB'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Calendar className="h-4 w-4 mr-1" />
                Member Since
              </div>
              <p className="font-medium text-gray-900 dark:text-white">
                {profile?.createdAt ? formatDate(profile.createdAt) : '-'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Calendar className="h-4 w-4 mr-1" />
                Last Login
              </div>
              <p className="font-medium text-gray-900 dark:text-white">
                {profile?.lastLogin ? formatDate(profile.lastLogin) : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <Input
                value={profile?.email || ''}
                disabled
                className="bg-gray-100 dark:bg-gray-800"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Email cannot be changed. Contact an administrator if needed.
              </p>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Change Password
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saved ? 'Saved!' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
