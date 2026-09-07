'use client';

import React, { useState } from 'react';
import {
  SlaPerformanceByGolongan,
  ClaimableStatusByRootCause,
  CheckpointDurationRanking,
  MainKpiDataPackage,
} from '@/types/database';
import { MainKpisTab } from './MainKpisTab';
import { PerformanceOverviewTab } from './PerformanceOverviewTab';
import { Target, Layers } from 'lucide-react';

interface SolutionTimePerformanceTabsProps {
  initialMainKpis: MainKpiDataPackage;
  slaPerformance: SlaPerformanceByGolongan[];
  claimableByRootCause: ClaimableStatusByRootCause[];
  checkpointRanking: CheckpointDurationRanking[];
}

export function SolutionTimePerformanceTabs({
  initialMainKpis,
  slaPerformance,
  claimableByRootCause,
  checkpointRanking,
}: SolutionTimePerformanceTabsProps) {
  const [activeTab, setActiveTab] = useState<'main_kpis' | 'additional'>('main_kpis');

  return (
    <div className="space-y-6">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('main_kpis')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'main_kpis'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Main KPI&apos;s</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('additional')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'additional'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Additional Analytics</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'main_kpis' ? (
        <MainKpisTab initialData={initialMainKpis} />
      ) : (
        <PerformanceOverviewTab
          slaPerformance={slaPerformance}
          claimableByRootCause={claimableByRootCause}
          checkpointRanking={checkpointRanking}
        />
      )}
    </div>
  );
}
