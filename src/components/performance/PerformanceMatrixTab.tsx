'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClaimableStatusByRootCause,
  AnomalyCheckpointCount,
  AnomalyBottleneckRecorded,
} from '@/types/database';
import { PerformanceVolumeData } from '@/lib/queries/performance';
import { TimeRangeFilter, TimeRangeOption } from '@/components/common/TimeRangeFilter';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import { AlertCircle, CheckCircle, Loader2, Stethoscope } from 'lucide-react';

interface PerformanceMatrixTabProps {
  claimableByRootCause: ClaimableStatusByRootCause[];
  initialVolumeData: PerformanceVolumeData;
  anomalies: {
    checkpointAnomalies: AnomalyCheckpointCount[];
    bottleneckStats: AnomalyBottleneckRecorded[];
  };
}

export function PerformanceMatrixTab({
  claimableByRootCause,
  initialVolumeData,
  anomalies,
}: PerformanceMatrixTabProps) {
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

  // Section 1: Calculate Pareto Data (Bars + Cumulative %)
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

  // Section 3: Anomaly Distribution (Count per checkpoint count bucket: 0 to 8)
  const checkpointBuckets = [1, 2, 3, 4, 5, 6, 7, 8].map((count) => {
    const matchingCases = anomalies.checkpointAnomalies.filter(
      (a) => a.recorded_checkpoint_count === count
    );
    return {
      checkpoint_count: `${count} Checkpoints`,
      cases_count: matchingCases.length,
      is_anomaly: count < 8,
    };
  });

  const anomalousCases = anomalies.checkpointAnomalies.filter((a) => a.is_anomaly);

  // Section 3: Bottleneck Recorded Donut Data
  const bottleneckDonutData = anomalies.bottleneckStats.map((s) => ({
    name: s.has_bottleneck_recorded ? 'Recorded Bottleneck' : 'No Bottleneck Recorded (NULL)',
    value: s.jumlah_kasus,
    pct: s.pct_of_total,
  }));

  const DONUT_COLORS = ['#3B7A57', '#A54B3F'];

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* SECTION 1: Root Cause Analysis (Pareto) */}
      {/* ========================================================================= */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            1. Root Cause & Claimable Status Analysis (Pareto)
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

      {/* ========================================================================= */}
      {/* SECTION 2: Volume Charts (Time-Filtered) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              2. Total Case Volume Dynamics
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
                  {/* Per styleguide: distinct line styles solid vs dashed */}
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

      {/* ========================================================================= */}
      {/* SECTION 3: Anomaly Detection */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            3. Data Quality & Anomaly Detection
          </h3>
          <p className="text-xs text-ink-muted">
            Whole-dataset structural audit for closed case completeness and bottleneck recording rate
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Anomaly 1: Checkpoint Count (< 8 Checkpoints on Closed Cases) */}
          <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-semibold text-ink-primary flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#A54B3F]" />
                  <span>Closed Cases Checkpoint Count Distribution</span>
                </h4>
                <span className="text-[11px] font-mono bg-[#A54B3F]/10 text-[#A54B3F] px-2 py-0.5 rounded">
                  {anomalousCases.length} anomalous cases (&lt;8)
                </span>
              </div>
              <p className="text-xs text-ink-muted mb-3">
                Closed cases with fewer than 8 standard checkpoints recorded are flagged as anomalies.
              </p>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={checkpointBuckets} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                    <XAxis dataKey="checkpoint_count" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Bar dataKey="cases_count" name="Closed Cases" radius={[4, 4, 0, 0]}>
                      {checkpointBuckets.map((b, idx) => (
                        <Cell
                          key={`bucket-${idx}`}
                          fill={b.is_anomaly ? '#A54B3F' : '#3B7A57'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sample Anomalous Cases List */}
              {anomalousCases.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-[11px] font-medium text-ink-muted block mb-2">
                    Quick Diagnostic for Anomalous Cases:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {anomalousCases.slice(0, 8).map((ac) => (
                      <Link
                        key={ac.issue_case_id}
                        href={`/case-solution-process/diagnostic?id=${ac.issue_case_id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-base border border-border hover:border-accent-brass hover:text-accent-brass transition-colors"
                      >
                        <Stethoscope className="w-3 h-3" />
                        <span>{ac.customer_name} ({ac.recorded_checkpoint_count}/8)</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Anomaly 2: Bottleneck Recorded vs Not Recorded */}
          <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-semibold text-ink-primary">
                  Bottleneck Reason Recording Rate
                </h4>
              </div>
              <p className="text-xs text-ink-muted mb-3">
                Proportion of cases with recorded bottleneck reason vs unrecorded (NULL)
              </p>

              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bottleneckDonutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {bottleneckDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} formatter={(val: any, name: any, item: any) => [`${val} cases (${item.payload.pct}%)`, name]} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border text-center text-xs">
                {bottleneckDonutData.map((d, i) => (
                  <div key={i} className="p-2 rounded bg-base/50 border border-border">
                    <span className="text-[11px] text-ink-muted block truncate">{d.name}</span>
                    <span className="text-sm font-bold text-ink-primary tabular-nums">{d.value} cases ({d.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
