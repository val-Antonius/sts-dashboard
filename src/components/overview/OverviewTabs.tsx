'use client';

import React, { useState } from 'react';
import { ActiveCasesTable } from './ActiveCasesTable';
import { BranchWorkloadTable } from './BranchWorkloadTable';
import { TimeFilteredCharts } from './TimeFilteredCharts';
import {
  ActiveCaseCurrentMonth,
  PicBranchWorkloadCurrentMonth,
} from '@/types/database';
import { OverviewChartData } from '@/lib/queries/overview';
import { ListChecks, Users, BarChart3 } from 'lucide-react';

interface OverviewTabsProps {
  activeCases: ActiveCaseCurrentMonth[];
  workloads: PicBranchWorkloadCurrentMonth[];
  chartsData: OverviewChartData;
}

export function OverviewTabs({
  activeCases,
  workloads,
  chartsData,
}: OverviewTabsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'workload' | 'charts'>('active');

  const tabs = [
    {
      id: 'active',
      label: 'Active Cases This Month',
      count: activeCases.length,
      icon: ListChecks,
    },
    {
      id: 'workload',
      label: 'Branch Workload This Month',
      count: workloads.length,
      icon: Users,
    },
    {
      id: 'charts',
      label: 'Time-Filtered Analytics',
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-border gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-accent-brass text-accent-brass font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-base border border-border text-ink-muted">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'active' && <ActiveCasesTable cases={activeCases} />}
        {activeTab === 'workload' && <BranchWorkloadTable workloads={workloads} />}
        {activeTab === 'charts' && <TimeFilteredCharts initialData={chartsData} />}
      </div>
    </div>
  );
}
