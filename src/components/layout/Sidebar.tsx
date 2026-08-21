'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Stethoscope,
  TrendingUp,
  Boxes,
  Database,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const isOverview = pathname === '/case-overview' || pathname === '/';
  const isDiagnostic = pathname.startsWith('/case-solution-process/diagnostic');
  const isPerformance = pathname.startsWith('/case-solution-process/performance');

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

        {/* Navigation Structure per v2 specification */}
        <nav className="p-3 space-y-6">
          {/* Top-level Task 1: Case Overview */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
              Operations
            </div>
            <Link
              href="/case-overview"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isOverview
                  ? 'bg-accent-brass/10 text-accent-brass font-semibold border-l-2 border-accent-brass'
                  : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Case Overview</span>
            </Link>
          </div>

          {/* Top-level Task 2: Case Solution Process */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
              Case Solution Process
            </div>
            <div className="space-y-1">
              <Link
                href="/case-solution-process/diagnostic"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isDiagnostic
                    ? 'bg-accent-brass/10 text-accent-brass font-semibold border-l-2 border-accent-brass'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
                }`}
              >
                <Stethoscope className="w-4 h-4 shrink-0" />
                <span>Case Diagnostic</span>
              </Link>

              <Link
                href="/case-solution-process/performance"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isPerformance
                    ? 'bg-accent-brass/10 text-accent-brass font-semibold border-l-2 border-accent-brass'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Case Solution Performance</span>
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
