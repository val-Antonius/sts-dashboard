import React from 'react';
import {
  getCaseKpiRealtime,
  getActiveCasesCurrentMonth,
  getPicBranchWorkloadCurrentMonth,
  getOverviewChartsData,
} from '@/lib/queries/overview';
import { KpiCards } from '@/components/overview/KpiCards';
import { OverviewTabs } from '@/components/overview/OverviewTabs';

export const revalidate = 0; // Always fresh real-time operational data

export default async function ActiveCasePage() {
  const [kpis, activeCases, workloads, chartsData] = await Promise.all([
    getCaseKpiRealtime(),
    getActiveCasesCurrentMonth(),
    getPicBranchWorkloadCurrentMonth(),
    getOverviewChartsData('this_month'),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-ink-primary tracking-tight">Active Case</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Real-time operational snapshot of active product issues and SLA status
        </p>
      </div>

      {/* 3 Realtime KPI Cards */}
      <KpiCards kpis={kpis} />

      {/* 3 Main Tabs: Active Cases, Branch Workload, Analytics */}
      <OverviewTabs
        activeCases={activeCases}
        workloads={workloads}
        chartsData={chartsData}
      />
    </div>
  );
}
