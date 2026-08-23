'use client';

import React, { useState } from 'react';
import {
  ClaimableStatusByRootCause,
  PrincipalClaimableData,
} from '@/types/database';
import { PerformanceVolumeData } from '@/lib/queries/performance';
import { TimeRangeFilter, TimeRangeOption } from '@/components/common/TimeRangeFilter';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  Cell,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import { BarChart3, Tag, Layers, Loader2 } from 'lucide-react';
import { PrincipalClaimableTab } from './PrincipalClaimableTab';

interface VolumeTrendsTabsProps {
  claimableByRootCause: ClaimableStatusByRootCause[];
  initialVolumeData: PerformanceVolumeData;
  initialPrincipalData: PrincipalClaimableData;
}

export function VolumeTrendsTabs({
  claimableByRootCause,
  initialVolumeData,
  initialPrincipalData,
}: VolumeTrendsTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'principal' | 'root_cause'>('overview');
  const [range, setRange] = useState<TimeRangeOption>('last_1_year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [volumeData, setVolumeData] = useState<PerformanceVolumeData>(initialVolumeData);
  const [loading, setLoading] = useState(false);

  const fetchVolumeData = async (
    selectedRange: TimeRangeOption,
    start?: string,
    end?: string
  ) => {
    setLoading(true);
    try {
      let url = `/api/performance/volume?range=${selectedRange}`;
      if (selectedRange === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setVolumeData(json);
      }
    } catch (err) {
      console.error('Failed to fetch volume data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (
    newRange: TimeRangeOption,
    start?: string,
    end?: string
  ) => {
    setRange(newRange);
    if (start) setCustomStart(start);
    if (end) setCustomEnd(end);
    fetchVolumeData(newRange, start, end);
  };

  const customTooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border-subtle)',
    color: 'var(--ink-primary)',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  // Pareto calculation for Tab 3 (Root Cause Analysis)
  const totalParetoCases = claimableByRootCause.reduce((sum, r) => sum + r.jumlah_kasus, 0) || 1;
  let runningSum = 0;
  const paretoData = claimableByRootCause.slice(0, 10).map((r) => {
    runningSum += r.jumlah_kasus;
    const cumPct = Math.round((runningSum / totalParetoCases) * 100);
    return {
      pairLabel: `${r.claimable_status} - ${r.root_cause_name || 'Not Recorded'}`,
      jumlah_kasus: r.jumlah_kasus,
      cumulative_pct: cumPct,
      avg_days: r.avg_solution_time_days,
    };
  });

  return (
    <div className="space-y-4">
      {/* 3 Tabs Navigation Header */}
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
          onClick={() => setActiveTab('principal')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'principal'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Principal and Claimable Status</span>
        </button>

        <button
          onClick={() => setActiveTab('root_cause')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'root_cause'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Root Cause Analysis</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Total Case Volume Dynamics
              </h3>
              <p className="text-xs text-ink-muted">
                Historical case volume trends across branches, claim types, and intake vs closure
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TimeRangeFilter
                selectedRange={range}
                onChange={handleRangeChange}
                customStart={customStart}
                customEnd={customEnd}
              />
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-brass" />}
            </div>
          </div>

          {/* Top 3 Volume Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top 10 Branches */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Top Branches (Total Cases)
              </h4>
              {volumeData.topBranches.length > 0 ? (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData.topBranches} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                      <XAxis dataKey="branch_code" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Bar dataKey="count" fill="#A6763C" radius={[4, 4, 0, 0]} name="Cases" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState className="h-52" />
              )}
            </div>

            {/* Top 10 Claimable Statuses */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Claimable Status Breakdown
              </h4>
              {volumeData.topStatuses.length > 0 ? (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={volumeData.topStatuses}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} />
                      <YAxis
                        dataKey="claimable_status_name"
                        type="category"
                        tick={{ fontSize: 9, fill: 'var(--ink-muted)' }}
                        width={90}
                      />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Bar dataKey="count" fill="#3B7A57" radius={[0, 4, 4, 0]} name="Cases" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState className="h-52" />
              )}
            </div>

            {/* Customer Segment */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Customer Segment Distribution
              </h4>
              {volumeData.customerSegments.length > 0 ? (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData.customerSegments} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                      <XAxis dataKey="golongan_customer" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Cases">
                        {volumeData.customerSegments.map((entry, idx) => (
                          <Cell
                            key={`seg-${idx}`}
                            fill={entry.golongan_customer === 'KA Nasional' ? '#A6763C' : '#8B897F'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState className="h-52" />
              )}
            </div>
          </div>

          {/* Full-width Dual-Line Chart: Cases Opened vs Closed per Month */}
          <div className="p-5 bg-surface border border-border rounded-lg shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Monthly Case Flow: Cases Opened vs. Cases Closed
              </h4>
            </div>
            <p className="text-xs text-ink-muted mb-4">
              Comparison of case intake (solid line) vs closed cases (dashed line) over the selected timeline
            </p>

            {volumeData.monthlyTrends.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeData.monthlyTrends} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="cases_opened"
                      stroke="#A6763C"
                      strokeWidth={2.5}
                      name="Cases Opened (Intake)"
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cases_closed"
                      stroke="#3B7A57"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      name="Cases Closed"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState className="h-64" />
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Principal & Claimable Status (NEW CHARTS) */}
      {activeTab === 'principal' && (
        <PrincipalClaimableTab initialData={initialPrincipalData} />
      )}

      {/* Tab 3: Root Cause Analysis (Pareto) */}
      {activeTab === 'root_cause' && (
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Root Cause & Claimable Status Analysis (Pareto)
            </h3>
            <span className="text-[11px] font-mono text-ink-muted bg-base px-2 py-0.5 rounded border border-border">
              Total n = {totalParetoCases}
            </span>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            Pareto distribution of case frequency and cumulative percentage across claimable status and root causes
          </p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 10, right: 20, left: -10, bottom: 45 }}>
                <XAxis
                  dataKey="pairLabel"
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  name="Cases"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(value: any, name: any) => {
                    if (name === 'Cumulative %') return [`${value}%`, name];
                    return [`${value} cases`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="jumlah_kasus"
                  fill="#A6763C"
                  name="Case Volume"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative_pct"
                  stroke="#A54B3F"
                  strokeWidth={2.5}
                  name="Cumulative %"
                  dot={{ r: 3, fill: '#A54B3F' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
