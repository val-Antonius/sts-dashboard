'use client';

import React, { useState } from 'react';
import { PrincipalClaimableData } from '@/types/database';
import { TimeRangeFilter, TimeRangeOption } from '@/components/common/TimeRangeFilter';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import { Loader2 } from 'lucide-react';

interface PrincipalClaimableTabProps {
  initialData: PrincipalClaimableData;
}

// Disciplined, low-noise palette for root causes (Dominant dark + Terracotta + Neutral tones)
const ROOT_CAUSE_COLORS: Record<string, string> = {
  'Workmanship/Factory Defect': '#18181B',
  'Material Defect': '#A3462F',
  'Miss Operation': '#B87A28',
  'Miss Maintenance': '#2E7D52',
  'Miss Application': '#4B5563',
  'Attachment/Modification/Local Component': '#6B7280',
  'Inventory Process/Storage': '#9CA3AF',
  'Accident': '#B5302E',
  'Natural Disaster': '#71717A',
  'Not Recorded': '#A1A1AA',
};

const DEFAULT_PALETTE = [
  '#18181B',
  '#A3462F',
  '#B87A28',
  '#2E7D52',
  '#4B5563',
  '#6B7280',
  '#9CA3AF',
  '#B5302E',
  '#71717A',
  '#A1A1AA',
];

// Consistent palette for claimable statuses
const STATUS_COLORS: Record<string, string> = {
  'Claimable Principal': '#2E7D52',
  'Claimable Vendor (Attachment)': '#4B5563',
  'Claimable Vendor (Genset Maker)': '#3F3F46',
  'Goodwill': '#B87A28',
  'Unclaimable': '#B5302E',
  'Progress Checking Unit': '#71717A',
  'Waiting Created WO Checking': '#A1A1AA',
};

export function PrincipalClaimableTab({ initialData }: PrincipalClaimableTabProps) {
  const [range, setRange] = useState<TimeRangeOption>('last_1_year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<PrincipalClaimableData>(initialData);
  const [loading, setLoading] = useState(false);

  const fetchData = async (
    selectedRange: TimeRangeOption,
    start?: string,
    end?: string
  ) => {
    setLoading(true);
    try {
      let url = `/api/performance/principal-claimable?range=${selectedRange}`;
      if (selectedRange === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch principal and claimable analytics:', err);
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
    fetchData(newRange, start, end);
  };

  const customTooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border-subtle)',
    color: 'var(--ink-primary)',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  // Single disciplined terracotta ramp for heatmap density
  const getHeatmapColor = (count: number, max: number) => {
    if (!count || count === 0) return 'bg-base/30 text-ink-muted/30 border border-transparent';
    const ratio = max > 0 ? count / max : 0;
    if (ratio < 0.25) return 'bg-[#A3462F]/10 dark:bg-[#D96B4F]/10 text-ink-primary font-medium';
    if (ratio < 0.55) return 'bg-[#A3462F]/30 dark:bg-[#D96B4F]/30 text-ink-primary font-semibold';
    if (ratio < 0.80) return 'bg-[#A3462F]/65 dark:bg-[#D96B4F]/65 text-white font-bold';
    return 'bg-[#A3462F] dark:bg-[#D96B4F] text-white font-bold shadow-xs ring-1 ring-[#A3462F]/40';
  };

  return (
    <div className="space-y-6">
      {/* Global Time Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Principal & Claimable Status Analytics
          </h3>
          <p className="text-xs text-ink-muted">
            Cross-dimensional analysis across Product Codes, Root Causes, Claim Types, and Branch territories
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

      {/* Row 1: Chart 1 & Chart 2 (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Total Case vs Product Code by Root Cause (Stacked Horizontal Bar) */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                1. Total Case vs Product Code by Root Cause
              </h4>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              Stacked horizontal distribution ordered descending by total case volume per product code
            </p>

            {data.productRootCauses?.data?.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.productRootCauses.data}
                    layout="vertical"
                    margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                  >
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                    />
                    <YAxis
                      dataKey="product_code"
                      type="category"
                      tick={{ fontSize: 11, fill: 'var(--ink-primary)', fontWeight: 600 }}
                      width={45}
                    />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }}
                    />
                    {data.productRootCauses.rootCauseKeys.map((key, idx) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="a"
                        fill={ROOT_CAUSE_COLORS[key] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]}
                        name={key}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState className="h-80" />
            )}
          </div>
        </div>

        {/* Chart 2: Total Case vs Product Code by Claimable Status (100% Stacked Bar) */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                2. Total Case vs Product Code by Claimable Status (100% Ratio)
              </h4>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              Proportion of Claimable vs Non-Claimable cases per product code with claimable percentage label
            </p>

            {data.productClaimable?.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.productClaimable}
                    layout="vertical"
                    margin={{ top: 20, right: 35, left: 10, bottom: 5 }}
                  >
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                    />
                    <YAxis
                      dataKey="product_code"
                      type="category"
                      tick={{ fontSize: 11, fill: 'var(--ink-primary)', fontWeight: 600 }}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={customTooltipStyle}
                      formatter={(val: any, name: any, item: any) => {
                        const payload = item.payload;
                        if (name === 'Claimable') {
                          return [`${payload.claimable_count} cases (${payload.claimable_pct}%)`, name];
                        }
                        return [`${payload.non_claimable_count} cases (${payload.non_claimable_pct}%)`, name];
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }}
                    />
                    <Bar
                      dataKey="claimable_pct"
                      stackId="claimRatio"
                      fill="#3B7A57"
                      name="Claimable"
                    >
                      <LabelList
                        dataKey="claimable_pct"
                        position="insideRight"
                        formatter={(val: any) => (val > 10 ? `${val}%` : '')}
                        style={{ fill: '#FFFFFF', fontSize: '10px', fontWeight: 600 }}
                      />
                    </Bar>
                    <Bar
                      dataKey="non_claimable_pct"
                      stackId="claimRatio"
                      fill="#A54B3F"
                      name="Non-Claimable"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState className="h-80" />
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Chart 3 (Heatmap Matrix) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              3. Total Case vs Product Code by Branch (Heatmap Matrix)
            </h4>
            <p className="text-xs text-ink-muted">
              Territorial matrix showing case density per Product Code × Branch intersection (Single Terracotta Density Ramp)
            </p>
          </div>

          {/* Heatmap Legend - Single Ramp */}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-ink-muted font-mono">
            <span>0</span>
            <span className="w-3 h-3 rounded bg-base/50 border border-border" />
            <span className="w-3 h-3 rounded bg-[#A3462F]/15 dark:bg-[#D96B4F]/15" />
            <span className="w-3 h-3 rounded bg-[#A3462F]/35 dark:bg-[#D96B4F]/35" />
            <span className="w-3 h-3 rounded bg-[#A3462F]/70 dark:bg-[#D96B4F]/70" />
            <span className="w-3 h-3 rounded bg-[#A3462F] dark:bg-[#D96B4F]" />
            <span>Peak</span>
          </div>
        </div>

        {data.productBranchHeatmap?.products?.length > 0 &&
        data.productBranchHeatmap?.branches?.length > 0 ? (
          <div className="overflow-x-auto border border-border rounded-lg bg-surface">
            <table className="w-full text-center text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-border bg-base/60 text-ink-muted font-medium">
                  <th className="py-2.5 px-3 text-left font-semibold sticky left-0 bg-base/90 z-10">
                    Product Code
                  </th>
                  {data.productBranchHeatmap.branches.map((b) => (
                    <th key={b} className="py-2.5 px-2 font-mono text-[11px]">
                      {b}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 font-semibold text-ink-primary bg-base/80">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.productBranchHeatmap.products.map((p) => {
                  let rowTotal = 0;
                  return (
                    <tr key={p} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="py-2 px-3 text-left font-bold text-ink-primary font-mono text-xs sticky left-0 bg-surface z-10 border-r border-border">
                        {p}
                      </td>
                      {data.productBranchHeatmap.branches.map((b) => {
                        const count = data.productBranchHeatmap.matrix[p]?.[b] || 0;
                        rowTotal += count;
                        const cellColor = getHeatmapColor(
                          count,
                          data.productBranchHeatmap.maxCount
                        );

                        return (
                          <td
                            key={`${p}-${b}`}
                            title={`Product: ${p} | Branch: ${b} | Cases: ${count}`}
                            className="p-1"
                          >
                            <div
                              className={`w-full py-1.5 rounded text-[11px] transition-transform hover:scale-105 cursor-default ${cellColor}`}
                            >
                              {count > 0 ? count : '—'}
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 font-bold text-ink-primary bg-base/40 text-xs border-l border-border">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState className="h-48" />
        )}
      </div>

      {/* Row 3: Chart 4 (Grouped Column Chart by Branch) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            4. Total Case vs Claimable Status by Branch
          </h4>
        </div>
        <p className="text-xs text-ink-muted mb-4">
          Grouped bar chart showing claimable status composition across branches with values displayed
        </p>

        {data.branchClaimable?.data?.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.branchClaimable.data}
                margin={{ top: 25, right: 15, left: -15, bottom: 25 }}
              >
                <XAxis
                  dataKey="branch_code"
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend
                  verticalAlign="top"
                  wrapperStyle={{ fontSize: '10px', paddingBottom: '12px' }}
                />
                {data.branchClaimable.statusKeys.map((status, idx) => (
                  <Bar
                    key={status}
                    dataKey={status}
                    fill={STATUS_COLORS[status] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]}
                    name={status}
                    radius={[3, 3, 0, 0]}
                  >
                    <LabelList
                      dataKey={status}
                      position="top"
                      formatter={(val: any) => (val > 0 ? val : '')}
                      style={{ fill: 'var(--ink-muted)', fontSize: '9px', fontWeight: 600 }}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState className="h-80" />
        )}
      </div>
    </div>
  );
}
