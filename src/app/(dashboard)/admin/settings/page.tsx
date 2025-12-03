'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  HardDrive,
  Shield,
  Mail,
  Bell,
  Database,
  FileText,
  Clock,
  Loader2,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SystemSettings {
  storage: {
    maxFileSize: number;
    allowedTypes: string[];
    storageQuota: number;
    usedStorage: number;
  };
  security: {
    passwordMinLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  retention: {
    trashRetentionDays: number;
    versionRetentionDays: number;
    auditLogRetentionDays: number;
  };
  notifications: {
    emailEnabled: boolean;
    webhooksEnabled: boolean;
    digestFrequency: string;
  };
  ocr: {
    enabled: boolean;
    languages: string[];
  };
  virusScan: {
    enabled: boolean;
    scanOnUpload: boolean;
  };
}

interface ServiceStatus {
  database: boolean;
  redis: boolean;
  meilisearch: boolean;
  clamav: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
    fetchServiceStatus();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      // Set default settings if fetch fails
      setSettings({
        storage: {
          maxFileSize: 100,
          allowedTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'png'],
          storageQuota: 10240,
          usedStorage: 0,
        },
        security: {
          passwordMinLength: 8,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          sessionTimeout: 30,
          maxLoginAttempts: 5,
        },
        retention: {
          trashRetentionDays: 30,
          versionRetentionDays: 365,
          auditLogRetentionDays: 90,
        },
        notifications: {
          emailEnabled: true,
          webhooksEnabled: false,
          digestFrequency: 'daily',
        },
        ocr: {
          enabled: true,
          languages: ['eng'],
        },
        virusScan: {
          enabled: true,
          scanOnUpload: true,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      if (data.success) {
        setServiceStatus(data.services);
      }
    } catch (error) {
      console.error('Failed to fetch service status:', error);
      setServiceStatus({
        database: false,
        redis: false,
        meilisearch: false,
        clamav: false,
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (section: keyof SystemSettings, key: string, value: unknown) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'retention', label: 'Retention', icon: Clock },
    { id: 'services', label: 'Services', icon: Database },
  ];

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500">Configure system-wide settings and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
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

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-4">OCR Settings</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Enable OCR Processing</label>
                    <p className="text-sm text-gray-500">Automatically extract text from uploaded documents</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.ocr.enabled}
                    onChange={(e) => updateSettings('ocr', 'enabled', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-4">Virus Scanning</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Enable Virus Scanning</label>
                    <p className="text-sm text-gray-500">Scan uploaded files for malware</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.virusScan.enabled}
                    onChange={(e) => updateSettings('virusScan', 'enabled', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Scan on Upload</label>
                    <p className="text-sm text-gray-500">Scan files immediately when uploaded</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.virusScan.scanOnUpload}
                    onChange={(e) => updateSettings('virusScan', 'scanOnUpload', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Settings */}
      {activeTab === 'storage' && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum File Size (MB)
              </label>
              <Input
                type="number"
                value={settings.storage.maxFileSize}
                onChange={(e) => updateSettings('storage', 'maxFileSize', parseInt(e.target.value))}
                className="max-w-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage Quota (MB)
              </label>
              <Input
                type="number"
                value={settings.storage.storageQuota}
                onChange={(e) => updateSettings('storage', 'storageQuota', parseInt(e.target.value))}
                className="max-w-xs"
              />
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Used Storage</span>
                  <span className="font-medium">
                    {formatBytes(settings.storage.usedStorage * 1024 * 1024)} / {settings.storage.storageQuota} MB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((settings.storage.usedStorage / settings.storage.storageQuota) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed File Types
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Comma-separated list of allowed file extensions
              </p>
              <Input
                value={settings.storage.allowedTypes.join(', ')}
                onChange={(e) =>
                  updateSettings(
                    'storage',
                    'allowedTypes',
                    e.target.value.split(',').map((t) => t.trim().toLowerCase())
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-4">Password Policy</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Password Length
                  </label>
                  <Input
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => updateSettings('security', 'passwordMinLength', parseInt(e.target.value))}
                    min={6}
                    max={32}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Login Attempts
                  </label>
                  <Input
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    min={3}
                    max={10}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireUppercase"
                    checked={settings.security.requireUppercase}
                    onChange={(e) => updateSettings('security', 'requireUppercase', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="requireUppercase" className="ml-2 text-sm text-gray-700">
                    Require uppercase letters
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireNumbers"
                    checked={settings.security.requireNumbers}
                    onChange={(e) => updateSettings('security', 'requireNumbers', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="requireNumbers" className="ml-2 text-sm text-gray-700">
                    Require numbers
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireSpecialChars"
                    checked={settings.security.requireSpecialChars}
                    onChange={(e) => updateSettings('security', 'requireSpecialChars', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="requireSpecialChars" className="ml-2 text-sm text-gray-700">
                    Require special characters
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (minutes)
              </label>
              <Input
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
                className="max-w-xs"
                min={5}
                max={480}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">Email Notifications</label>
                <p className="text-sm text-gray-500">Send notification emails to users</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.emailEnabled}
                onChange={(e) => updateSettings('notifications', 'emailEnabled', e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">Webhook Notifications</label>
                <p className="text-sm text-gray-500">Send notifications to webhook endpoints</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.webhooksEnabled}
                onChange={(e) => updateSettings('notifications', 'webhooksEnabled', e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Digest Frequency
              </label>
              <select
                value={settings.notifications.digestFrequency}
                onChange={(e) => updateSettings('notifications', 'digestFrequency', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="immediate">Immediate</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retention Settings */}
      {activeTab === 'retention' && (
        <Card>
          <CardHeader>
            <CardTitle>Data Retention Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trash Retention Period (days)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                How long to keep deleted documents before permanent deletion
              </p>
              <Input
                type="number"
                value={settings.retention.trashRetentionDays}
                onChange={(e) => updateSettings('retention', 'trashRetentionDays', parseInt(e.target.value))}
                className="max-w-xs"
                min={1}
                max={365}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version History Retention (days)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                How long to keep document versions
              </p>
              <Input
                type="number"
                value={settings.retention.versionRetentionDays}
                onChange={(e) => updateSettings('retention', 'versionRetentionDays', parseInt(e.target.value))}
                className="max-w-xs"
                min={30}
                max={3650}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Audit Log Retention (days)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                How long to keep audit log entries
              </p>
              <Input
                type="number"
                value={settings.retention.auditLogRetentionDays}
                onChange={(e) => updateSettings('retention', 'auditLogRetentionDays', parseInt(e.target.value))}
                className="max-w-xs"
                min={30}
                max={3650}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Status */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Service Status</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchServiceStatus}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {serviceStatus && (
                  <>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Database className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium">Database (MySQL)</span>
                        </div>
                        <Badge variant={serviceStatus.database ? 'success' : 'destructive'}>
                          {serviceStatus.database ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Database className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium">Cache (Redis)</span>
                        </div>
                        <Badge variant={serviceStatus.redis ? 'success' : 'destructive'}>
                          {serviceStatus.redis ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium">Search (Meilisearch)</span>
                        </div>
                        <Badge variant={serviceStatus.meilisearch ? 'success' : 'destructive'}>
                          {serviceStatus.meilisearch ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium">Antivirus (ClamAV)</span>
                        </div>
                        <Badge variant={serviceStatus.clamav ? 'success' : 'destructive'}>
                          {serviceStatus.clamav ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="py-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Service Dependencies</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Some features may be unavailable if services are not connected.
                    Check your Docker containers and environment configuration.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
