'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Database } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const pathname = usePathname();

  useEffect(() => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  let pageTitle = 'Active Case';
  let parentTitle = 'Operations';

  if (pathname.includes('/diagnostic')) {
    pageTitle = 'Case Diagnostic';
    parentTitle = 'Operations';
  } else if (pathname.includes('/solution-time') || pathname.includes('/performance')) {
    pageTitle = 'Solution Time Performance';
    parentTitle = 'Case Solution Process';
  } else if (pathname.includes('/volume-trends')) {
    pageTitle = 'Case Volume Trends';
    parentTitle = 'Case Solution Process';
  } else if (pathname.includes('/data-quality')) {
    pageTitle = 'Data Quality & Anomaly Detection';
    parentTitle = 'Case Solution Process';
  }

  return (
    <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-ink-muted">{parentTitle}</span>
        <span className="text-ink-muted">/</span>
        <span className="font-semibold text-ink-primary">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-base border border-border text-[11px] font-mono text-ink-muted">
          <Database className="w-3.5 h-3.5 text-accent-brass" />
          <span>schema: product_issue</span>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors border border-border"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-accent-brass" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
