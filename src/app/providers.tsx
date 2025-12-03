'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/providers/theme-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider defaultTheme="system" storageKey="dms-theme">
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
