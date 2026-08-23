import React from 'react';
import {
  getClaimableStatusByRootCause,
  getPerformanceVolumeData,
} from '@/lib/queries/performance';
import { VolumeTrendsTabs } from '@/components/volume-trends/VolumeTrendsTabs';

export const revalidate = 0;

export default async function CaseVolumeTrendsPage() {
  const [
    claimableByRootCause,
    volumeData,
  ] = await Promise.all([
    getClaimableStatusByRootCause(),
    getPerformanceVolumeData('last_1_year'),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-ink-primary tracking-tight">
          Case Volume Trends
        </h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Longitudinal volume distribution across branches, claim types, monthly intake flows, and Pareto root-cause analysis
        </p>
      </div>

      {/* 3 Tabs: Overview, Principal & Claimable Status, Root Cause Analysis */}
      <VolumeTrendsTabs
        claimableByRootCause={claimableByRootCause}
        initialVolumeData={volumeData}
      />
    </div>
  );
}
