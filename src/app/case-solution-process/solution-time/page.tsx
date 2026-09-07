import React from 'react';
import {
  getSlaPerformanceByGolongan,
  getClaimableStatusByRootCause,
  getCheckpointDurationRanking,
} from '@/lib/queries/performance';
import { getMainKpiDataPackage } from '@/lib/queries/main-kpis';
import { SolutionTimePerformanceTabs } from '@/components/performance/SolutionTimePerformanceTabs';

export const revalidate = 0;

export default async function SolutionTimePerformancePage() {
  const [
    mainKpiData,
    slaPerformance,
    claimableByRootCause,
    checkpointRanking,
  ] = await Promise.all([
    getMainKpiDataPackage('last_1_year'),
    getSlaPerformanceByGolongan(),
    getClaimableStatusByRootCause(),
    getCheckpointDurationRanking(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-ink-primary tracking-tight">
          Solution Time Performance
        </h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Standardized Excel-mirror KPI metrics, resolution duration by dimension, root causes, and checkpoint rankings
        </p>
      </div>

      {/* Tabbed Performance: Tab 1 (Main KPIs) & Tab 2 (Additional Analytics) */}
      <SolutionTimePerformanceTabs
        initialMainKpis={mainKpiData}
        slaPerformance={slaPerformance}
        claimableByRootCause={claimableByRootCause}
        checkpointRanking={checkpointRanking}
      />
    </div>
  );
}

