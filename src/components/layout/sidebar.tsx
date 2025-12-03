'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  FolderOpen,
  Search,
  Bell,
  LogOut,
  GitBranch,
  Trash2,
  Shield,
  Settings,
  Users,
  Activity,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  Home,
  Upload,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Folders', href: '/folders', icon: FolderOpen },
  { name: 'Upload', href: '/documents/upload', icon: Upload },
  { name: 'Workflows', href: '/workflows', icon: GitBranch },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Trash', href: '/trash', icon: Trash2 },
];

const adminNavigation = [
  { name: 'Overview', href: '/admin', icon: Shield },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
  { name: 'Audit Logs', href: '/admin/audit', icon: Activity },
  { name: 'Storage', href: '/admin/storage', icon: HardDrive },
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">DMS</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <FileText className="h-8 w-8 text-indigo-600" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
        <nav className="flex-1 p-4 space-y-1">
          {/* Main Navigation */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Main Menu
              </p>
            )}
            {mainNavigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/documents' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400',
                      !collapsed && 'mr-3'
                    )}
                  />
                  {!collapsed && item.name}
                </Link>
              );
            })}
          </div>

          {/* Admin Navigation */}
          {isAdmin && (
            <div className="pt-6 space-y-1">
              {!collapsed && (
                <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Administration
                </p>
              )}
              {collapsed && <hr className="border-gray-200 dark:border-gray-800 my-2" />}
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                      collapsed && 'justify-center px-2'
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400',
                        !collapsed && 'mr-3'
                      )}
                    />
                    {!collapsed && item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bell className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <Link href="/profile">
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      {(session?.user?.name || session?.user?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {session?.user?.name || session?.user?.email}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {session?.user?.role}
                    </Badge>
                  </div>
                </div>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowLogoutDialog(true)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <ThemeToggle />
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="w-full h-8">
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-8"
                onClick={() => setShowLogoutDialog(true)}
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Sign Out</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLogoutDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to sign out?
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowLogoutDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </aside>
  );
}
