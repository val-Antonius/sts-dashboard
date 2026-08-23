'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Stethoscope,
  Clock,
  BarChart3,
  AlertCircle,
  Database,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-accent-brass/15 border border-accent-brass/30 flex items-center justify-center text-accent-brass font-bold text-sm">
              STS
            </div>
            <div>
              <h1 className="text-sm font-semibold text-ink-primary leading-tight">Product Issue</h1>
              <p className="text-[11px] text-ink-muted leading-tight">Technical Service Dept</p>
            </div>
          </div>
        </div>

        {/* Navigation Structure */}
        <nav className="p-3 space-y-6">
          {/* Top-level Group 1: Operations */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
              Operations
            </div>
            <div className="space-y-1">
              <Link
                href="/operations/active-case"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  pathname === '/operations/active-case' || pathname === '/case-overview' || pathname === '/'
                    ? 'bg-accent-brass/10 text-accent-brass font-semibold border-l-2 border-accent-brass'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Active Case</span>
              </Link>

              <Link
                href="/operations/diagnostic"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive('/operations/diagnostic') || isActive('/case-solution-process/diagnostic')
                    ? 'bg-accent-brass/10 text-accent-brass font-semibold border-l-2 border-accent-brass'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
                }`}
              >
                <Stethoscope className="w-4 h-4 shrink-0" />
                <span>Case Diagnostic</span>
              </Link>
            </div>
          </div>

          {/* Top-level Group 2: Case Solution Process (3 Focused Pages) */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
              Case Solution Process
            </div>
            <div className="space-y-1">
              <Link
                href="/case-solution-process/solution-time"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive('/case-solution-process/solution-time') || pathname === '/case-solution-process/performance'
                    ? 'bg-accent-brass/10 text-accent-brass font-semibold border-l-2 border-accent-brass'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Solution Time Performance</span>
              </Link>

              <Link
                href="/case-solution-process/volume-trends"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive('/case-solution-process/volume-trends')
                    ? 'bg-accent-brass/10 text-accent-brass font-semibold border-l-2 border-accent-brass'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Case Volume Trends</span>
              </Link>

              <Link
                href="/case-solution-process/data-quality"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive('/case-solution-process/data-quality')
                    ? 'bg-accent-brass/10 text-accent-brass font-semibold border-l-2 border-accent-brass'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Data Quality & Anomaly</span>
              </Link>
            </div>
          </div>
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-base/40 text-[11px] text-ink-muted">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#3B7A57]" />
          <span className="font-medium text-ink-primary">PostgreSQL / Supabase</span>
        </div>
        <p className="text-[10px] text-ink-muted">Database: <code className="font-mono text-ink-primary">sts_db</code></p>
      </div>
    </aside>
  );
}
