import React from 'react';
import { CaseKpiRealtime } from '@/types/database';
import { AlertTriangle, Clock, Layers } from 'lucide-react';

interface KpiCardsProps {
  kpis: CaseKpiRealtime;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const hasCriticalBreach = kpis.overdue_all_customer > 0 || kpis.overdue_ka_nasional > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 1. Active Cases (Real-time live monitoring) */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex items-start justify-between card-interactive">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#2E7D52] dark:bg-[#41A86F] pulse-dot" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Active Cases
            </span>
          </div>
          <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
            {kpis.total_active_cases}
          </div>
        </div>
        <div className="p-2.5 rounded-md bg-base text-ink-muted border border-border">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Overdue — All Customer (>20d SLA Breach) */}
      <div
        className={`rounded-lg p-5 shadow-xs flex items-start justify-between card-interactive border ${
          kpis.overdue_all_customer > 0
            ? 'card-inverted'
            : 'bg-surface border-border'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            {kpis.overdue_all_customer > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#E05350]" />
            )}
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                kpis.overdue_all_customer > 0 ? 'text-ink-inverted/80' : 'text-ink-muted'
              }`}
            >
              Overdue — All Customer (&gt;20d)
            </span>
          </div>
          <div
            className={`text-3xl font-mono font-bold tabular-nums tracking-tight ${
              kpis.overdue_all_customer > 0
                ? 'text-ink-inverted'
                : 'text-ink-muted'
            }`}
          >
            {kpis.overdue_all_customer}
          </div>
        </div>
        <div
          className={`p-2.5 rounded-md border ${
            kpis.overdue_all_customer > 0
              ? 'bg-[#B5302E]/25 text-[#F3817F] border-[#B5302E]/40'
              : 'bg-base text-ink-muted border-border'
          }`}
        >
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Overdue — KA Nasional (>15d Priority SLA Breach) */}
      <div
        className={`rounded-lg p-5 shadow-xs flex items-start justify-between card-interactive border ${
          kpis.overdue_ka_nasional > 0
            ? 'bg-surface border-[#B87A28]/40 ring-1 ring-[#B87A28]/20'
            : 'bg-surface border-border'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            {kpis.overdue_ka_nasional > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#B87A28] dark:bg-[#D4953C]" />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Overdue — KA Nasional (&gt;15d)
            </span>
          </div>
          <div
            className={`text-3xl font-mono font-bold tabular-nums tracking-tight ${
              kpis.overdue_ka_nasional > 0
                ? 'text-[#B87A28] dark:text-[#D4953C]'
                : 'text-ink-muted'
            }`}
          >
            {kpis.overdue_ka_nasional}
          </div>
        </div>
        <div
          className={`p-2.5 rounded-md border ${
            kpis.overdue_ka_nasional > 0
              ? 'bg-[#B87A28]/15 text-[#B87A28] dark:text-[#D4953C] border-[#B87A28]/30'
              : 'bg-base text-ink-muted border-border'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
