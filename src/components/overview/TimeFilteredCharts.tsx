'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { TimeRangeFilter, TimeRangeOption } from '@/components/common/TimeRangeFilter';
import { OverviewChartData } from '@/lib/queries/overview';
import { EmptyState } from '@/components/common/EmptyState';
import { Loader2 } from 'lucide-react';

interface TimeFilteredChartsProps {
  initialData: OverviewChartData;
}

export function TimeFilteredCharts({ initialData }: TimeFilteredChartsProps) {
  const [range, setRange] = useState<TimeRangeOption>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<OverviewChartData>(initialData);
  const [loading, setLoading] = useState(false);

  const fetchChartData = async (
    selectedRange: TimeRangeOption,
    start?: string,
    end?: string
  ) => {
    setLoading(true);
    try {
      let url = `/api/overview/charts?range=${selectedRange}`;
      if (selectedRange === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch overview charts:', err);
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
    fetchChartData(newRange, start, end);
  };

  const customTooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border-subtle)',
    color: 'var(--ink-primary)',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  return (
    <div className="space-y-4">
      {/* Time Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2">
        <TimeRangeFilter
          selectedRange={range}
          onChange={handleRangeChange}
          customStart={customStart}
          customEnd={customEnd}
        />
        {loading && (
          <div className="flex items-center gap-1 text-xs text-ink-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-brass" />
            <span>Updating charts...</span>
          </div>
        )}
      </div>

      {/* 2x2 Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Top 5 Active Cases by Branch */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Top 5 Active Cases by Branch
            </h3>
          </div>
          {data.topBranches && data.topBranches.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topBranches} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="branch_code" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" fill="#A6763C" radius={[4, 4, 0, 0]} name="Active Cases" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState className="h-60" />
          )}
        </div>

        {/* Chart 2: Top 5 Active Cases by Claimable Status */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Top 5 Active Cases by Claimable Status
            </h3>
          </div>
          {data.topStatuses && data.topStatuses.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topStatuses}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                >
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <YAxis
                    dataKey="claimable_status_name"
                    type="category"
                    tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                    width={100}
                  />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" fill="#3B7A57" radius={[0, 4, 4, 0]} name="Active Cases" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState className="h-60" />
          )}
        </div>

        {/* Chart 3: Active Case Volume by Customer Segment */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Active Case Volume by Customer Segment
            </h3>
          </div>
          {data.customerSegments && data.customerSegments.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.customerSegments} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                  <XAxis dataKey="golongan_customer" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" fill="#B8863B" radius={[4, 4, 0, 0]} name="Cases">
                    {data.customerSegments.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.golongan_customer === 'KA Nasional' ? '#A6763C' : '#8B897F'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState className="h-60" />
          )}
        </div>

        {/* Chart 4: Carried-Over Backlog by Branch */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Carried-Over Backlog by Branch
            </h3>
          </div>
          {data.carriedOverByBranch && data.carriedOverByBranch.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.carriedOverByBranch} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="branch_code" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" fill="#A54B3F" radius={[4, 4, 0, 0]} name="Carried-Over Backlog" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No carried-over backlog in this timeframe" className="h-60" />
          )}
        </div>
      </div>
    </div>
  );
}
