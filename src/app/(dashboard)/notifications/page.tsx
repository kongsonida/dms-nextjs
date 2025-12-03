'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  FileText,
  GitBranch,
  MessageSquare,
  Share2,
  AlertTriangle,
  Info,
  Loader2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
  data: Record<string, unknown> | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [filter, page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (filter === 'unread') {
        params.append('unread', 'true');
      }

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
        setTotalPages(data.totalPages || 1);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      });
      setNotifications(
        notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      const notification = notifications.find((n) => n.id === id);
      setNotifications(notifications.filter((n) => n.id !== id));
      if (notification && !notification.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const deleteAllRead = async () => {
    if (!confirm('Are you sure you want to delete all read notifications?')) {
      return;
    }

    try {
      await fetch('/api/notifications/delete-read', {
        method: 'DELETE',
      });
      setNotifications(notifications.filter((n) => !n.isRead));
    } catch (error) {
      console.error('Failed to delete read notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT_UPLOADED':
      case 'DOCUMENT_UPDATED':
      case 'DOCUMENT_APPROVED':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'WORKFLOW_ASSIGNED':
      case 'WORKFLOW_COMPLETED':
      case 'WORKFLOW_STEP':
        return <GitBranch className="h-5 w-5 text-purple-500" />;
      case 'COMMENT_ADDED':
      case 'MENTION':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'SHARE_CREATED':
      case 'SHARE_ACCESSED':
        return <Share2 className="h-5 w-5 text-orange-500" />;
      case 'SECURITY_ALERT':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      DOCUMENT_UPLOADED: 'Upload',
      DOCUMENT_UPDATED: 'Update',
      DOCUMENT_APPROVED: 'Approved',
      WORKFLOW_ASSIGNED: 'Workflow',
      WORKFLOW_COMPLETED: 'Completed',
      WORKFLOW_STEP: 'Step',
      COMMENT_ADDED: 'Comment',
      MENTION: 'Mention',
      SHARE_CREATED: 'Share',
      SHARE_ACCESSED: 'Access',
      SECURITY_ALERT: 'Security',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          {notifications.some((n) => n.isRead) && (
            <Button variant="outline" onClick={deleteAllRead}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex rounded-lg border overflow-hidden">
          <button
            onClick={() => { setFilter('all'); setPage(1); }}
            className={`px-4 py-2 text-sm ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => { setFilter('unread'); setPage(1); }}
            className={`px-4 py-2 text-sm ${
              filter === 'unread'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No notifications</h3>
            <p className="text-gray-500 mt-1">
              {filter === 'unread' ? 'No unread notifications' : 'You have no notifications yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 ${!notification.isRead ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {notification.link ? (
                          <Link
                            href={notification.link}
                            className="font-medium text-gray-900 hover:text-indigo-600"
                            onClick={() => !notification.isRead && markAsRead(notification.id)}
                          >
                            {notification.title}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-900">{notification.title}</span>
                        )}
                        {!notification.isRead && (
                          <span className="h-2 w-2 bg-indigo-600 rounded-full" />
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {getTypeBadge(notification.type)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
