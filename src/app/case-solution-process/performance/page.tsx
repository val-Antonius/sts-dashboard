import React from 'react';
import {
  getSlaPerformanceByGolongan,
  getClaimableStatusByRootCause,
  getCheckpointDurationRanking,
  getPerformanceVolumeData,
  getAnomalyData,
} from '@/lib/queries/performance';
import { PerformanceTabs } from '@/components/performance/PerformanceTabs';

export const revalidate = 0;

export default async function CaseSolutionPerformancePage() {
  const [
    slaPerformance,
    claimableByRootCause,
    checkpointRanking,
    volumeData,
    anomalies,
  ] = await Promise.all([
    getSlaPerformanceByGolongan(),
    getClaimableStatusByRootCause(),
    getCheckpointDurationRanking(),
    getPerformanceVolumeData('last_1_year'),
    getAnomalyData(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-ink-primary tracking-tight">
          Case Solution Performance
        </h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Longitudinal SLA performance, Pareto root-cause analysis, volume trends, and anomaly detection
        </p>
      </div>

      {/* Tabs */}
      <PerformanceTabs
        slaPerformance={slaPerformance}
        claimableByRootCause={claimableByRootCause}
        checkpointRanking={checkpointRanking}
        volumeData={volumeData}
        anomalies={anomalies}
      />
    </div>
  );
}
