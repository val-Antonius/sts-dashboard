'use client';

import React, { useState, useMemo } from 'react';
import {
  MainKpiDataPackage,
  MainKpiAchievementItem,
  MainKpiQuantityItem,
  MainKpiAgingItem,
} from '@/types/database';
import { TimeRangeFilter, TimeRangeOption } from '@/components/common/TimeRangeFilter';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Target,
  BarChart3,
  Clock,
  Layers,
  Building2,
  Package,
  Users,
  Loader2,
  Info,
} from 'lucide-react';

interface MainKpisTabProps {
  initialData: MainKpiDataPackage;
}

type DimensionType = 'branch' | 'product' | 'segment';

export function MainKpisTab({ initialData }: MainKpisTabProps) {
  const [data, setData] = useState<MainKpiDataPackage>(initialData);
  const [dimension, setDimension] = useState<DimensionType>('branch');
  const [range, setRange] = useState<TimeRangeOption>('last_1_year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch updated data on time filter change
  const fetchKpiData = async (
    selectedRange: TimeRangeOption,
    start?: string,
    end?: string
  ) => {
    setLoading(true);
    try {
      let url = `/api/performance/main-kpis?range=${selectedRange}`;
      if (selectedRange === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch main KPI data:', err);
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
    fetchKpiData(newRange, start, end);
  };

  // Active Dimension Data
  const currentDataset = useMemo(() => {
    if (dimension === 'branch') return data.byBranch;
    if (dimension === 'product') return data.byProduct;
    return data.bySegment;
  }, [dimension, data]);

  // Aggregate by dimension_key for Chart 1 & Chart 2 & Chart 3 (Combined summaries)
  const dimensionAggregates = useMemo(() => {
    const map: Record<
      string,
      {
        key: string;
        achieve_count: number;
        total_count: number;
        achieve_pct: number;
        case_volume: number;
        weighted_days_sum: number;
        n_cases: number;
        avg_solution_time_days: number;
      }
    > = {};

    // 1. Achievement
    currentDataset.achievement.forEach((item) => {
      if (!map[item.dimension_key]) {
        map[item.dimension_key] = {
          key: item.dimension_key,
          achieve_count: 0,
          total_count: 0,
          achieve_pct: 0,
          case_volume: 0,
          weighted_days_sum: 0,
          n_cases: 0,
          avg_solution_time_days: 0,
        };
      }
      map[item.dimension_key].achieve_count += item.achieve_count;
      map[item.dimension_key].total_count += item.total_count;
    });

    // 2. Quantity
    currentDataset.quantity.forEach((item) => {
      if (!map[item.dimension_key]) {
        map[item.dimension_key] = {
          key: item.dimension_key,
          achieve_count: 0,
          total_count: 0,
          achieve_pct: 0,
          case_volume: 0,
          weighted_days_sum: 0,
          n_cases: 0,
          avg_solution_time_days: 0,
        };
      }
      map[item.dimension_key].case_volume += item.case_count;
    });

    // 3. Aging
    currentDataset.aging.forEach((item) => {
      if (!map[item.dimension_key]) {
        map[item.dimension_key] = {
          key: item.dimension_key,
          achieve_count: 0,
          total_count: 0,
          achieve_pct: 0,
          case_volume: 0,
          weighted_days_sum: 0,
          n_cases: 0,
          avg_solution_time_days: 0,
        };
      }
      map[item.dimension_key].weighted_days_sum +=
        item.avg_solution_time_days * item.n_cases;
      map[item.dimension_key].n_cases += item.n_cases;
    });

    // Compute derived rates
    return Object.values(map)
      .map((item) => ({
        ...item,
        achieve_pct:
          item.total_count > 0
            ? Math.round((item.achieve_count / item.total_count) * 1000) / 10
            : 0,
        avg_solution_time_days:
          item.n_cases > 0
            ? Math.round((item.weighted_days_sum / item.n_cases) * 10) / 10
            : 0,
      }))
      .sort((a, b) => b.total_count - a.total_count);
  }, [currentDataset]);

  // Filtered Table Rows
  const filteredTableData = useMemo(() => {
    if (!searchQuery.trim()) return dimensionAggregates;
    return dimensionAggregates.filter((item) =>
      item.key.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [dimensionAggregates, searchQuery]);

  const customTooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--ink-primary)',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  const getDimensionLabel = () => {
    if (dimension === 'branch') return 'Branch Code';
    if (dimension === 'product') return 'Product Model';
    return 'Customer Segment';
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP CONTROL BAR (Time Filter & Dimension Selector) */}
      <div className="bg-surface border border-border rounded-lg p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Dimension Switcher Buttons */}
        <div className="inline-flex items-center gap-1 p-0.5 bg-base/50 border border-border rounded-lg self-start md:self-auto">
          <button
            type="button"
            onClick={() => setDimension('branch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              dimension === 'branch'
                ? 'bg-surface text-accent-brass shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>By Branch</span>
          </button>
          <button
            type="button"
            onClick={() => setDimension('product')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              dimension === 'product'
                ? 'bg-surface text-accent-brass shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>By Product</span>
          </button>
          <button
            type="button"
            onClick={() => setDimension('segment')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              dimension === 'segment'
                ? 'bg-surface text-accent-brass shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>By Customer Segment</span>
          </button>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-1 text-xs text-accent-brass animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}
          <TimeRangeFilter
            selectedRange={range}
            onChange={handleRangeChange}
            customStart={customStart}
            customEnd={customEnd}
          />
        </div>
      </div>

      {/* FILTER CONTEXT BANNER */}
      <div className="p-3 bg-accent-brass/5 border border-accent-brass/20 rounded-lg text-xs text-ink-muted flex items-start gap-2">
        <Info className="w-4 h-4 text-accent-brass shrink-0 mt-0.5" />
        <div>
          Hanya mencakup kasus dengan 4 status klaim warranty: <em>Claimable Principal</em>, <em>Claimable Vendor (Attachment)</em>, <em>Claimable Vendor (Genset Maker)</em>, dan <em>Goodwill</em>.
        </div>
      </div>

      {/* 2. 3 SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Overall Achievement Rate */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Achievement Rate (Solution Time)
              </div>
              <div className="text-3xl font-bold text-ink-primary tabular-nums tracking-tight">
                {data.summary.overall_achieve_pct}%
              </div>
            </div>
            <div
              className={`p-2.5 rounded-md border ${
                data.summary.overall_achieve_pct >= 85
                  ? 'bg-[#3B7A57]/10 text-[#3B7A57] border-[#3B7A57]/20'
                  : data.summary.overall_achieve_pct >= 70
                  ? 'bg-[#B8863B]/10 text-[#B8863B] border-[#B8863B]/20'
                  : 'bg-[#A54B3F]/10 text-[#A54B3F] border-[#A54B3F]/20'
              }`}
            >
              <Target className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="w-full bg-base rounded-full h-1.5 overflow-hidden border border-border/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  data.summary.overall_achieve_pct >= 85
                    ? 'bg-[#3B7A57]'
                    : data.summary.overall_achieve_pct >= 70
                    ? 'bg-[#B8863B]'
                    : 'bg-[#A54B3F]'
                }`}
                style={{ width: `${Math.min(data.summary.overall_achieve_pct, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-muted mt-1.5 font-mono">
              <span>{data.summary.overall_achieve_count} of {data.summary.overall_total_count} cases</span>
              <span className="font-semibold">Target: 85.0%</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Case Volume */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Case Volume
              </div>
              <div className="text-3xl font-bold text-accent-brass tabular-nums tracking-tight">
                {data.summary.overall_case_volume}
              </div>
            </div>
            <div className="p-2.5 rounded-md bg-accent-brass/10 text-accent-brass border border-accent-brass/20">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          <div className="text-[11px] text-ink-muted mt-3">
            Monthly case count across 4 claimable statuses
          </div>
        </div>

        {/* KPI 3: Aging Duration */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Aging Duration (Average)
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-ink-primary tabular-nums tracking-tight">
                  {data.summary.overall_avg_solution_days}
                </span>
                <span className="text-xs font-semibold text-ink-muted">days</span>
              </div>
            </div>
            <div className="p-2.5 rounded-md bg-[#8B897F]/10 text-[#8B897F] border border-[#8B897F]/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-ink-muted mt-3">
            <span>Mean resolution lead time</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-base border border-border text-ink-muted font-bold">
              n = {data.summary.overall_n_cases} cases
            </span>
          </div>
        </div>
      </div>

      {/* 3. VISUAL CHARTS (3 Core Categories) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Achievement Rate (Solution Time) */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-accent-brass" />
                <span>Achievement Rate (Solution Time) — {getDimensionLabel()}</span>
              </h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Perbandingan jumlah kasus Achieved vs Total serta persentase achievement terhadap garis target 85%.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#3B7A57]">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#3B7A57]" /> Achieved
              </span>
              <span className="flex items-center gap-1.5 text-ink-muted">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#8B897F]" /> Total
              </span>
              <span className="flex items-center gap-1.5 text-accent-brass">
                <span className="w-3 h-0.5 bg-[#A6763C]" /> % Rate
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {dimensionAggregates.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted italic">
                Tidak ada data kasus pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dimensionAggregates} margin={{ top: 10, right: 20, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    dataKey="key"
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                    label={{ value: 'Cases', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--ink-muted)' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value: any, name: any) => {
                      if (name === 'Achievement %') return [`${value}%`, name];
                      return [`${value} cases`, name];
                    }}
                  />
                  <ReferenceLine
                    yAxisId="right"
                    y={85}
                    stroke="#A54B3F"
                    strokeDasharray="4 4"
                    label={{ value: 'Target 85%', fill: '#A54B3F', fontSize: 10, position: 'insideTopRight' }}
                  />
                  <Bar yAxisId="left" dataKey="total_count" name="Total Cases" fill="#8B897F" radius={[4, 4, 0, 0]} opacity={0.4} maxBarSize={32} />
                  <Bar yAxisId="left" dataKey="achieve_count" name="Achieved Cases" fill="#3B7A57" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line yAxisId="right" type="monotone" dataKey="achieve_pct" name="Achievement %" stroke="#A6763C" strokeWidth={2.5} dot={{ r: 4, fill: '#A6763C' }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 2: Case Volume (Monthly Count) */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-accent-brass" />
                <span>Case Volume (Monthly Count)</span>
              </h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Distribusi total volume kasus murni count per {getDimensionLabel().toLowerCase()}.
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {dimensionAggregates.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted italic">
                Tidak ada data volume kasus.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionAggregates} margin={{ top: 10, right: 10, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    dataKey="key"
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={customTooltipStyle} formatter={(val: any) => [`${val} cases`, 'Case Volume']} />
                  <Bar dataKey="case_volume" fill="#A6763C" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {dimensionAggregates.map((entry, index) => (
                      <Cell key={`cell-qty-${index}`} fill={index % 2 === 0 ? '#A6763C' : '#B8863B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 3: Aging Duration (Average Days with Sample Size) */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#8B897F]" />
                <span>Aging Duration (Average Days & Sample n)</span>
              </h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Rata-rata hari solusi sesungguhnya lengkap dengan indikator sampel $n$-kasus.
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {dimensionAggregates.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted italic">
                Tidak ada data durasi.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionAggregates} margin={{ top: 10, right: 10, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    dataKey="key"
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                    unit="d"
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(val: any, name: any, item: any) => [
                      `${val} Days (Sample: ${item.payload.n_cases} cases)`,
                      'Avg Solution Time',
                    ]}
                  />
                  <ReferenceLine y={20} stroke="#A54B3F" strokeDasharray="3 3" label={{ value: 'SLA 20d', fill: '#A54B3F', fontSize: 10 }} />
                  <ReferenceLine y={15} stroke="#3B7A57" strokeDasharray="3 3" label={{ value: 'KA 15d', fill: '#3B7A57', fontSize: 10 }} />
                  <Bar dataKey="avg_solution_time_days" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {dimensionAggregates.map((entry, idx) => {
                      const color =
                        entry.avg_solution_time_days <= 15
                          ? '#3B7A57'
                          : entry.avg_solution_time_days <= 20
                          ? '#B8863B'
                          : '#A54B3F';
                      return <Cell key={`cell-aging-${idx}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 4. DETAILED DATA MATRIX TABLE */}
      <div className="bg-surface border border-border rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 bg-base/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
              Detailed Dimension Matrix & Sample Verification
            </h4>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Tabel rekapitulasi data 3 kategori KPI per {getDimensionLabel().toLowerCase()}
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${getDimensionLabel().toLowerCase()}...`}
              className="w-full px-3 py-1.5 bg-surface border border-border rounded-md text-xs focus:outline-none focus:border-accent-brass transition-colors shadow-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-base/60 text-ink-muted text-[10px] uppercase tracking-wider border-b border-border font-mono font-semibold">
              <tr>
                <th className="py-2.5 px-4">{getDimensionLabel()}</th>
                <th className="py-2.5 px-4 text-center">Case Volume</th>
                <th className="py-2.5 px-4 text-center">Achieved Cases</th>
                <th className="py-2.5 px-4 text-center">Achievement %</th>
                <th className="py-2.5 px-4 text-center">Avg Solution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTableData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-ink-muted italic">
                    Tidak ada baris data yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredTableData.map((row) => (
                  <tr key={row.key} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-ink-primary">
                      {row.key}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium">
                      {row.case_volume}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-[#3B7A57] font-semibold">
                      {row.achieve_count}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          row.achieve_pct >= 85
                            ? 'bg-[#3B7A57]/10 text-[#3B7A57] border-[#3B7A57]/20'
                            : row.achieve_pct >= 70
                            ? 'bg-[#B8863B]/10 text-[#B8863B] border-[#B8863B]/20'
                            : 'bg-[#A54B3F]/10 text-[#A54B3F] border-[#A54B3F]/20'
                        }`}
                      >
                        {row.achieve_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-semibold text-ink-primary">
                      {row.avg_solution_time_days} days
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
