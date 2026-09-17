'use client';

import React, { useState, useMemo } from 'react';
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
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  CartesianGrid,
  Cell,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import {
  BarChart3,
  Tag,
  Layers,
  Loader2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  Users,
  Info,
} from 'lucide-react';
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
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'All Customer' | 'KA Nasional'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [volumeData, setVolumeData] = useState<PerformanceVolumeData>(initialVolumeData);
  const [loading, setLoading] = useState(false);

  const fetchVolumeData = async (
    selectedRange: TimeRangeOption,
    start?: string,
    end?: string,
    segment: string = selectedSegment
  ) => {
    setLoading(true);
    try {
      let url = `/api/performance/volume?range=${selectedRange}&segment=${encodeURIComponent(segment)}`;
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
    fetchVolumeData(newRange, start, end, selectedSegment);
  };

  const handleSegmentChange = (newSegment: 'all' | 'All Customer' | 'KA Nasional') => {
    setSelectedSegment(newSegment);
    fetchVolumeData(range, customStart, customEnd, newSegment);
  };

  const customTooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--ink-primary)',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  // Safe fallback aggregations
  const branchRiskData = volumeData?.branchRiskMatrix || [];
  const claimableHealth = volumeData?.claimableHealth || {
    claimable_count: 0,
    claimable_pct: 0,
    unclaimable_count: 0,
    unclaimable_pct: 0,
    other_count: 0,
    other_pct: 0,
    tailBreakdown: [],
  };
  const backlogFlowData = volumeData?.monthlyBacklogFlow || [];
  const kpiStats = volumeData?.kpiStats || {
    total_cases: branchRiskData.reduce((s, b) => s + b.total_cases, 0),
    sla_target_days: selectedSegment === 'KA Nasional' ? 15 : 20,
    unclaimable_pct: claimableHealth.unclaimable_pct,
    overdue_count: branchRiskData.reduce((s, b) => s + b.overdue_cases, 0),
  };

  // Pie chart dataset
  const donutData = [
    { name: 'Claimable', value: claimableHealth.claimable_count, color: '#2E7D52' },
    { name: 'Unclaimable', value: claimableHealth.unclaimable_count, color: '#A3462F' },
    { name: 'In-Progress / Other', value: claimableHealth.other_count, color: '#71717A' },
  ].filter((d) => d.value > 0);

  // Scatter plot data for Branch Risk Matrix (Grouped by exact x, y coordinate to prevent SVG text clashing)
  const scatterData = useMemo(() => {
    const coordMap: { [key: string]: typeof branchRiskData } = {};
    branchRiskData.forEach((b) => {
      const key = `${b.total_cases}_${b.unclaimable_pct}`;
      if (!coordMap[key]) coordMap[key] = [];
      coordMap[key].push(b);
    });

    return Object.values(coordMap).map((branches) => {
      const first = branches[0];
      const isMulti = branches.length > 1;
      const displayCode = branches.map((b) => b.branch_code).join('/');
      return {
        x: first.total_cases,
        y: first.unclaimable_pct,
        z: Math.max(first.total_cases, 10),
        displayCode,
        is_multi: isMulti,
        branches,
        branch_code: displayCode,
        branch_city: first.branch_city,
        total_cases: first.total_cases,
        unclaimable_cases: first.unclaimable_cases,
        unclaimable_pct: first.unclaimable_pct,
        overdue_cases: first.overdue_cases,
        overdue_pct: first.overdue_pct,
        avg_solution_days: first.avg_solution_days,
      };
    });
  }, [branchRiskData]);

  // Compute readable X-axis domain and ticks (multiples of 5 or 10)
  const maxVolumeVal = useMemo(() => {
    return Math.max(...scatterData.map((d) => d.total_cases), 5);
  }, [scatterData]);

  const xDomainMax = useMemo(() => {
    if (maxVolumeVal <= 5) return 5;
    if (maxVolumeVal <= 25) return Math.ceil(maxVolumeVal / 5) * 5;
    if (maxVolumeVal <= 50) return Math.ceil(maxVolumeVal / 10) * 10;
    return Math.ceil(maxVolumeVal / 25) * 25;
  }, [maxVolumeVal]);

  const xTicks = useMemo(() => {
    const step = xDomainMax <= 5 ? 1 : xDomainMax <= 25 ? 5 : xDomainMax <= 50 ? 10 : 25;
    return Array.from({ length: Math.floor(xDomainMax / step) + 1 }, (_, i) => i * step);
  }, [xDomainMax]);

  const maxTotalCases = useMemo(() => {
    return Math.max(...scatterData.map((d) => d.total_cases), 1);
  }, [scatterData]);

  // Custom Bubble renderer with translucent alpha-blend, dynamic radius, and collision-free stacked labels
  const renderCustomBubble = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    // Sizing: Distinct radius spread from 12px (low volume) to 30px (high volume)
    const minRadius = 13;
    const maxRadius = 30;
    const r = minRadius + (payload.total_cases / maxTotalCases) * (maxRadius - minRadius);

    const isHighRisk = payload.unclaimable_pct >= 25;
    const fillColor = isHighRisk ? '#A3462F' : '#71717A';
    const strokeColor = isHighRisk ? '#8B3B26' : '#3F3F46';

    const isMulti = payload.is_multi && payload.branches && payload.branches.length > 1;

    return (
      <g className="cursor-pointer group">
        {/* Outer translucent bubble for alpha-blend overlap */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={fillColor}
          fillOpacity={0.45}
          stroke={strokeColor}
          strokeWidth={isMulti ? 2 : 1.5}
          strokeDasharray={isMulti ? '3 2' : undefined}
        />
        {/* Center coordinate marker */}
        <circle
          cx={cx}
          cy={cy}
          r={1.5}
          fill={strokeColor}
        />
        {/* Branch label: Stacked tspan if multiple branches share coordinate, otherwise single centered text */}
        {isMulti ? (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-mono font-bold select-none pointer-events-none"
            style={{
              fontSize: r >= 20 ? '9.5px' : '8px',
              fill: 'var(--ink-primary)',
              paintOrder: 'stroke',
              stroke: 'var(--surface)',
              strokeWidth: '2.5px',
              strokeLinejoin: 'round',
            }}
          >
            <tspan x={cx} dy="-0.5em">{payload.branches[0].branch_code}</tspan>
            <tspan x={cx} dy="1.15em">{payload.branches[1].branch_code}</tspan>
          </text>
        ) : (
          <text
            x={cx}
            y={cy + 0.5}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-mono font-bold select-none pointer-events-none"
            style={{
              fontSize: r >= 20 ? '11px' : '9px',
              fill: 'var(--ink-primary)',
              paintOrder: 'stroke',
              stroke: 'var(--surface)',
              strokeWidth: '2.5px',
              strokeLinejoin: 'round',
            }}
          >
            {payload.displayCode}
          </text>
        )}
      </g>
    );
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
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${activeTab === 'overview'
            ? 'border-accent text-accent font-semibold'
            : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('principal')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${activeTab === 'principal'
            ? 'border-accent text-accent font-semibold'
            : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
            }`}
        >
          <Tag className="w-4 h-4" />
          <span>Principal and Claimable Status</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('root_cause')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${activeTab === 'root_cause'
            ? 'border-accent text-accent font-semibold'
            : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
            }`}
        >
          <Layers className="w-4 h-4" />
          <span>Root Cause Analysis (Pareto)</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* TOP CONTROLS: Segmented Customer Filter + Time Range Filter */}
          <div className="bg-surface border border-border rounded-lg p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Customer Segment Toggle */}
            <div className="inline-flex items-center gap-1 p-0.5 bg-base/60 border border-border rounded-lg self-start md:self-auto">
              <button
                type="button"
                onClick={() => handleSegmentChange('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedSegment === 'all'
                  ? 'bg-surface text-accent shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink-primary'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Segments</span>
              </button>
              <button
                type="button"
                onClick={() => handleSegmentChange('All Customer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedSegment === 'All Customer'
                  ? 'bg-surface text-accent shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink-primary'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Customer (General)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSegmentChange('KA Nasional')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedSegment === 'KA Nasional'
                  ? 'bg-surface text-accent shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink-primary'
                  }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>KA Nasional (Priority)</span>
              </button>
            </div>

            {/* Time Filter & Spinner */}
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />}
              <TimeRangeFilter
                selectedRange={range}
                onChange={handleRangeChange}
                customStart={customStart}
                customEnd={customEnd}
              />
            </div>
          </div>

          {/* CONTEXT REMINDER ALERT BANNER */}
          <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-ink-muted flex items-start gap-2">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {selectedSegment === 'KA Nasional' ? (
                <span>
                  Ambang batas SLA diperketat: <strong className="text-ink-primary font-semibold font-mono">15 Hari Kalender</strong> khusus segmen <em>Key Account Nasional</em> (Target Achievement 85.0%).
                </span>
              ) : selectedSegment === 'All Customer' ? (
                <span>
                  Ambang batas SLA standar: <strong className="text-ink-primary font-semibold font-mono">20 Hari Kalender</strong> untuk segmen <em>All Customer / General</em> (Target Achievement 85.0%).
                </span>
              ) : (
                <span>
                  Menampilkan seluruh populasi kasus. Ambang batas acuan SLA: <strong className="text-ink-primary font-semibold font-mono">15 Hari</strong> (KA Nasional) vs <strong className="text-ink-primary font-semibold font-mono">20 Hari</strong> (All Customer).
                </span>
              )}
            </div>
          </div>

          {/* 3 QUICK STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stat 1: Total Cases */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                    Total Case Volume
                  </div>
                  <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                    {kpiStats.total_cases}
                  </div>
                </div>
                <div className="p-2 rounded-md bg-accent/10 text-accent border border-accent/20">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-ink-muted mt-2">
                Kasus tercatat dalam periode & segmen terpilih
              </div>
            </div>

            {/* Stat 2: Active SLA Target */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                    SLA Lead Time Acuan
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                      {kpiStats.sla_target_days}
                    </span>
                    <span className="text-xs font-semibold text-ink-muted">Hari Kalender</span>
                  </div>
                </div>
                <div className="p-2 rounded-md bg-base text-ink-muted border border-border">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-ink-muted mt-2 flex items-center justify-between">
                <span>Target Pencapaian: 85.0%</span>
                <span className="font-mono text-[10px] text-[#B5302E] font-semibold">
                  {kpiStats.overdue_count} overdue
                </span>
              </div>
            </div>

            {/* Stat 3: Unclaimable Rate */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                    Unclaimable Rate
                  </div>
                  <div className="text-3xl font-mono font-bold text-accent tabular-nums tracking-tight">
                    {kpiStats.unclaimable_pct}%
                  </div>
                </div>
                <div className="p-2 rounded-md bg-[#B87A28]/10 text-[#B87A28] border border-[#B87A28]/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-ink-muted mt-2 font-mono">
                {claimableHealth.unclaimable_count} dari {kpiStats.total_cases} kasus berstatus Unclaimable
              </div>
            </div>
          </div>

          {/* ROW 1: 2-COLUMN GRID (Branch Risk Matrix vs Claimable Ratio Split) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Branch Risk Matrix (Scatter/Quadrant Plot) */}
            <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-accent" />
                      <span>Branch Risk Matrix (Volume × % Unclaimable)</span>
                    </h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      Cabang di kuadran kanan-atas memiliki volume tinggi dan rasio unclaimable tinggi.
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full">
                  {scatterData.length === 0 ? (
                    <EmptyState className="h-72" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 15, right: 25, bottom: 20, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Total Cases"
                          domain={[0, xDomainMax]}
                          ticks={xTicks}
                          tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                          label={{ value: 'Total Cases (Volume)', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--ink-muted)' }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Unclaimable %"
                          unit="%"
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                          tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                          label={{ value: '% Unclaimable', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--ink-muted)' }}
                        />
                        <Tooltip
                          contentStyle={customTooltipStyle}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const branches = data.branches || [data];
                              const isMulti = branches.length > 1;
                              return (
                                <div className="p-3 bg-surface border border-border rounded-lg shadow-xl text-xs space-y-2.5 font-mono min-w-[270px]">
                                  <div className="border-b border-border/60 pb-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="font-sans font-bold text-sm text-ink-primary tracking-tight truncate">
                                        {branches.map((b: any) => b.branch_code).join(', ')}
                                      </span>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-base border border-border text-ink-muted shrink-0 whitespace-nowrap">
                                        {data.x} Kasus · {data.y}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    {branches.map((b: any, idx: number) => (
                                      <div key={idx} className={idx > 0 ? "pt-1.5 border-t border-border/40" : ""}>
                                        <div className="font-bold text-ink-primary font-sans flex items-center gap-1.5">
                                          <span>{b.branch_code}</span>
                                          <span className="text-[11px] text-ink-muted font-normal">({b.branch_city})</span>
                                        </div>
                                        <div className="text-ink-muted pt-0.5 space-y-0.5 text-[11px]">
                                          <div>Total Volume: <strong className="text-ink-primary">{b.total_cases} kasus</strong></div>
                                          <div>Unclaimable: <strong className="text-accent">{b.unclaimable_cases} ({b.unclaimable_pct}%)</strong></div>
                                          <div>Overdue SLA: <strong className="text-[#B5302E]">{b.overdue_cases} ({b.overdue_pct}%)</strong></div>
                                          <div>Avg Lead Time: <strong className="text-ink-primary">{b.avg_solution_days} hari</strong></div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine y={25} stroke="#B87A28" strokeDasharray="3 3" label={{ value: 'Threshold 25%', fill: '#B87A28', fontSize: 9, position: 'insideTopRight' }} />
                        <Scatter
                          name="Branches"
                          data={scatterData}
                          shape={renderCustomBubble}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Legend Summary */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-ink-muted">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A3462F]" /> Unclaimable ≥25%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#71717A]" /> Unclaimable &lt;25%
                  </span>
                </div>
                <span className="text-ink-muted">
                  {branchRiskData.length} Cabang Terdata
                </span>
              </div>
            </div>

            {/* 2. Claimable vs Unclaimable Breakdown + Audit Tail Table */}
            <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D52]" />
                      <span>Claimable vs Unclaimable Breakdown</span>
                    </h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      Distribusi status klaim dan tabel rincian status untuk audit lengkap.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Donut Chart with Center Metric */}
                  <div className="sm:col-span-5 h-56 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`donut-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={customTooltipStyle} formatter={(val: any, name: any) => [`${val} kasus`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-xl font-mono font-bold text-[#2E7D52] tabular-nums">
                        {claimableHealth.claimable_pct}%
                      </span>
                      <span className="text-[9px] uppercase font-semibold text-ink-muted tracking-wider">
                        Claimable
                      </span>
                    </div>
                  </div>

                  {/* Compact Tail Audit Table */}
                  <div className="sm:col-span-7 overflow-x-auto max-h-56">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-base/60 text-ink-muted text-[10px] uppercase font-mono font-semibold border-b border-border">
                        <tr>
                          <th className="py-1.5 px-2">Status</th>
                          <th className="py-1.5 px-2 text-center">Cases</th>
                          <th className="py-1.5 px-2 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {claimableHealth.tailBreakdown.map((item, idx) => (
                          <tr key={`tail-${idx}`} className="hover:bg-surface-hover transition-colors">
                            <td className="py-1.5 px-2 font-medium text-ink-primary truncate max-w-[140px]" title={item.status_name}>
                              {item.status_name}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-ink-primary font-semibold">
                              {item.count}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-ink-muted">
                              {item.pct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Health Bar */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#2E7D52] font-semibold">
                  Claimable: {claimableHealth.claimable_count} ({claimableHealth.claimable_pct}%)
                </span>
                <span className="text-accent font-semibold">
                  Unclaimable: {claimableHealth.unclaimable_count} ({claimableHealth.unclaimable_pct}%)
                </span>
              </div>
            </div>
          </div>

          {/* ROW 2: FULL-WIDTH BACKLOG FLOW CHART (COMBO DIVERGING INTAKE/CLOSED BARS + NET BACKLOG DELTA LINE) */}
          <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-accent" />
                  <span>Monthly Backlog Flow: Intake vs Closure & Net Dynamics</span>
                </h4>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Dinamika kasus masuk (Intake) vs selesai (Closed). Garis Net Backlog Delta (&gt;0 berarti penumpukan backlog, &lt;0 berarti pengurangan backlog).
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-accent">
                  <span className="w-2.5 h-2.5 rounded-xs bg-accent" /> Intake (Opened)
                </span>
                <span className="flex items-center gap-1.5 text-[#2E7D52]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#2E7D52]" /> Closed
                </span>
                <span className="flex items-center gap-1.5 text-ink-primary font-bold">
                  <span className="w-3 h-0.5 bg-ink-primary" /> Net Backlog Delta
                </span>
              </div>
            </div>

            {backlogFlowData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={backlogFlowData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                    <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                    <Tooltip
                      contentStyle={customTooltipStyle}
                      formatter={(val: any, name: any) => [
                        `${val} cases`,
                        name === 'net_backlog' ? 'Net Backlog Delta' : name,
                      ]}
                    />
                    <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                    <Bar dataKey="cases_opened" fill="#A3462F" name="Intake (Opened)" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      <LabelList
                        dataKey="cases_opened"
                        position="top"
                        formatter={(val: any) => (val ? `${val}` : '')}
                        style={{ fontSize: '10px', fontWeight: 600, fill: '#A3462F' }}
                      />
                    </Bar>
                    <Bar dataKey="cases_closed" fill="#2E7D52" name="Closed" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      <LabelList
                        dataKey="cases_closed"
                        position="top"
                        formatter={(val: any) => (val ? `${val}` : '')}
                        style={{ fontSize: '10px', fontWeight: 600, fill: '#2E7D52' }}
                      />
                    </Bar>
                    <Line
                      type="linear"
                      dataKey="net_backlog"
                      stroke="var(--ink-primary)"
                      strokeWidth={2.5}
                      name="Net Backlog (Intake - Closed)"
                      dot={{ r: 4, fill: 'var(--ink-primary)' }}
                    >
                      <LabelList
                        dataKey="net_backlog"
                        position="top"
                        offset={8}
                        formatter={(val: any) => (val !== undefined ? `${val > 0 ? `+${val}` : val}` : '')}
                        style={{ fontSize: '10px', fontWeight: 700, fill: 'var(--ink-primary)' }}
                      />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState className="h-72" />
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Principal & Claimable Status */}
      {activeTab === 'principal' && (
        <PrincipalClaimableTab initialData={initialPrincipalData} />
      )}

      {/* Tab 3: Root Cause Analysis (Pareto) */}
      {activeTab === 'root_cause' && (
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
              Root Cause & Claimable Status Analysis (Pareto Principle 80/20)
            </h3>
            <span className="text-[11px] font-mono font-semibold text-ink-primary bg-base px-2 py-0.5 rounded border border-border">
              Total n = {totalParetoCases} cases
            </span>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            Pareto distribution identifying the vital few root causes accounting for up to 80% of total product warranty issues
          </p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 15, right: 20, left: -10, bottom: 45 }}>
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
                <ReferenceLine
                  yAxisId="right"
                  y={80}
                  stroke="var(--ink-muted)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                  label={{ value: '80% Pareto Line', fill: 'var(--ink-muted)', fontSize: 9, position: 'insideTopRight' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="jumlah_kasus"
                  fill="#A3462F"
                  name="Case Volume"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                >
                  <LabelList
                    dataKey="jumlah_kasus"
                    position="top"
                    formatter={(val: any) => (val ? `${val}` : '')}
                    style={{ fontSize: '10px', fontWeight: 600, fill: 'var(--ink-primary)' }}
                  />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative_pct"
                  stroke="#D4953C"
                  strokeWidth={2.5}
                  name="Cumulative %"
                  dot={{ r: 3.5, fill: '#D4953C', stroke: 'var(--surface)', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#D4953C' }}
                >
                  <LabelList
                    dataKey="cumulative_pct"
                    position="top"
                    offset={6}
                    formatter={(val: any) => (val !== undefined ? `${val}%` : '')}
                    style={{ fontSize: '9px', fontWeight: 700, fill: '#D4953C' }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
