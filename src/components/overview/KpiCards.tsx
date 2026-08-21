import React from 'react';
import { CaseKpiRealtime } from '@/types/database';
import { AlertTriangle, Clock, Layers } from 'lucide-react';

interface KpiCardsProps {
  kpis: CaseKpiRealtime;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 1. Active Cases */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
            Active Cases
          </div>
          <div className="text-3xl font-bold text-ink-primary tabular-nums tracking-tight">
            {kpis.total_active_cases}
          </div>
        </div>
        <div className="p-2.5 rounded-md bg-[#8B897F]/10 text-[#8B897F] border border-[#8B897F]/20">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Overdue — All Customer */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
            Overdue — All Customer
          </div>
          <div className="text-3xl font-bold text-[#A54B3F] dark:text-[#BD584B] tabular-nums tracking-tight">
            {kpis.overdue_all_customer}
          </div>
        </div>
        <div className="p-2.5 rounded-md bg-[#A54B3F]/10 text-[#A54B3F] dark:text-[#BD584B] border border-[#A54B3F]/20">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Overdue — KA Nasional */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
            Overdue — KA Nasional
          </div>
          <div className="text-3xl font-bold text-[#B8863B] dark:text-[#C99645] tabular-nums tracking-tight">
            {kpis.overdue_ka_nasional}
          </div>
        </div>
        <div className="p-2.5 rounded-md bg-[#B8863B]/10 text-[#B8863B] dark:text-[#C99645] border border-[#B8863B]/20">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
