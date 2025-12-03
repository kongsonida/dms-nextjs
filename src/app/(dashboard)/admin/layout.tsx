'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Settings,
  Shield,
  Activity,
  Database,
  FileText,
  Bell,
  Webhook,
  HardDrive,
  Clock,
  LayoutDashboard,
} from 'lucide-react';

const adminMenuItems = [
  {
    title: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
  {
    title: 'Security',
    href: '/admin/security',
    icon: Shield,
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit',
    icon: Activity,
  },
  {
    title: 'Storage',
    href: '/admin/storage',
    icon: HardDrive,
  },
  {
    title: 'Retention Policies',
    href: '/admin/retention',
    icon: Clock,
  },
  {
    title: 'Webhooks',
    href: '/admin/webhooks',
    icon: Webhook,
  },
  {
    title: 'Background Jobs',
    href: '/admin/jobs',
    icon: Database,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/documents');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">You need admin privileges to access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-600" />
            Admin Panel
          </h2>
        </div>
        <nav className="p-4 space-y-1">
          {adminMenuItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Right Content */}
      <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-950 overflow-auto">
        {children}
      </main>
    </div>
  );
}
