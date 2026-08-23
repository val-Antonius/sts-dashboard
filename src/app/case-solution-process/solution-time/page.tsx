import React from 'react';
import {
  getSlaPerformanceByGolongan,
  getClaimableStatusByRootCause,
  getCheckpointDurationRanking,
} from '@/lib/queries/performance';
import { PerformanceOverviewTab } from '@/components/performance/PerformanceOverviewTab';

export const revalidate = 0;

export default async function SolutionTimePerformancePage() {
  const [
    slaPerformance,
    claimableByRootCause,
    checkpointRanking,
  ] = await Promise.all([
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
          Comprehensive SLA metrics, resolution duration by customer segment, root causes, and checkpoint rankings
        </p>
      </div>

      {/* 3 SLA Performance Charts */}
      <PerformanceOverviewTab
        slaPerformance={slaPerformance}
        claimableByRootCause={claimableByRootCause}
        checkpointRanking={checkpointRanking}
      />
    </div>
  );
}
