'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  FolderOpen,
  Search,
  Users,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  GitBranch,
  Trash2,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navigation = [
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Folders', href: '/folders', icon: FolderOpen },
  { name: 'Workflows', href: '/workflows', icon: GitBranch },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Trash', href: '/trash', icon: Trash2 },
];

const adminNavigation = [
  { name: 'Admin', href: '/admin', icon: Shield },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/documents" className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">DMS</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {item.name}
                  </Link>
                );
              })}
              {isAdmin &&
                adminNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                        isActive
                          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 mr-1.5" />
                      {item.name}
                    </Link>
                  );
                })}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            <ThemeToggle />
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white">{session?.user?.name || session?.user?.email}</p>
                <Badge variant="outline" className="text-xs">
                  {session?.user?.role}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/login' })}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center sm:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-2 text-base font-medium',
                    isActive
                      ? 'bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
            {isAdmin &&
              adminNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-4 py-2 text-base font-medium',
                      isActive
                        ? 'bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div>
                <p className="text-base font-medium text-gray-800">{session?.user?.name}</p>
                <p className="text-sm text-gray-500">{session?.user?.email}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center w-full px-4 py-2 text-base font-medium text-gray-600 hover:bg-gray-50"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
