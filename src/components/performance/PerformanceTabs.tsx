'use client';

import React, { useState } from 'react';
import { PerformanceOverviewTab } from './PerformanceOverviewTab';
import { PerformanceMatrixTab } from './PerformanceMatrixTab';
import {
  SlaPerformanceByGolongan,
  ClaimableStatusByRootCause,
  CheckpointDurationRanking,
  AnomalyCheckpointCount,
  AnomalyBottleneckRecorded,
} from '@/types/database';
import { PerformanceVolumeData } from '@/lib/queries/performance';
import { BarChart3, Grid } from 'lucide-react';

interface PerformanceTabsProps {
  slaPerformance: SlaPerformanceByGolongan[];
  claimableByRootCause: ClaimableStatusByRootCause[];
  checkpointRanking: CheckpointDurationRanking[];
  volumeData: PerformanceVolumeData;
  anomalies: {
    checkpointAnomalies: AnomalyCheckpointCount[];
    bottleneckStats: AnomalyBottleneckRecorded[];
  };
}

export function PerformanceTabs({
  slaPerformance,
  claimableByRootCause,
  checkpointRanking,
  volumeData,
  anomalies,
}: PerformanceTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix'>('overview');

  return (
    <div className="space-y-4">
      {/* Tab Navigation Bar */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'overview'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'matrix'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Performance Matrix</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <PerformanceOverviewTab
            slaPerformance={slaPerformance}
            claimableByRootCause={claimableByRootCause}
            checkpointRanking={checkpointRanking}
          />
        )}
        {activeTab === 'matrix' && (
          <PerformanceMatrixTab
            claimableByRootCause={claimableByRootCause}
            initialVolumeData={volumeData}
            anomalies={anomalies}
          />
        )}
      </div>
    </div>
  );
}
