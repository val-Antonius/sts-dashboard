import React from 'react';
import { CaseKpiRealtime } from '@/types/database';
import { AlertTriangle, Clock, Layers } from 'lucide-react';

interface KpiCardsProps {
  kpis: CaseKpiRealtime;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 1. Active Cases (Real-time live monitoring) */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex items-start justify-between card-interactive">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full pulse-dot" style={{ backgroundColor: 'var(--status-ok)' }} />
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
      <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex items-start justify-between card-interactive">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {kpis.overdue_all_customer > 0 && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--status-danger)' }} />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Overdue — All Customer (&gt;20d)
            </span>
          </div>
          <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
            {kpis.overdue_all_customer}
          </div>
        </div>
        <div className="p-2.5 rounded-md bg-base text-ink-muted border border-border">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Overdue — KA Nasional (>15d Priority SLA Breach) */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex items-start justify-between card-interactive">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {kpis.overdue_ka_nasional > 0 && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--status-danger)' }} />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Overdue — KA Nasional (&gt;15d)
            </span>
          </div>
          <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
            {kpis.overdue_ka_nasional}
          </div>
        </div>
        <div className="p-2.5 rounded-md bg-base text-ink-muted border border-border">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
