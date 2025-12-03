'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { Button } from './button';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      title={`Current: ${theme} (${resolvedTheme})`}
    >
      {theme === 'system' ? (
        <Monitor className="h-5 w-5" />
      ) : resolvedTheme === 'dark' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-lg ${
          theme === 'light'
            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
        title="Light mode"
      >
        <Sun className="h-5 w-5" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-lg ${
          theme === 'dark'
            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
        title="Dark mode"
      >
        <Moon className="h-5 w-5" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-lg ${
          theme === 'system'
            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
        title="System preference"
      >
        <Monitor className="h-5 w-5" />
      </button>
    </div>
  );
}
