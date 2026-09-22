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
  ShieldAlert,
  Building2,
  Users,
  Info,
  SlidersHorizontal,
  Package,
  Repeat,
  ArrowUpDown,
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
  const [selectedExpStatus, setSelectedExpStatus] = useState<string>('Unclaimable');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [volumeData, setVolumeData] = useState<PerformanceVolumeData>(initialVolumeData);
  const [loading, setLoading] = useState(false);
  const [warrantyViewMode, setWarrantyViewMode] = useState<'volume' | 'rate'>('volume');
  const [nonWarrantyViewMode, setNonWarrantyViewMode] = useState<'volume' | 'rate'>('volume');

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
    total_cases: branchRiskData.reduce((s, b) => s + (b.total_cases || 0), 0),
    warranty_cases: branchRiskData.reduce((s, b) => s + (b.warranty_scope_cases || 0), 0),
    warranty_pct: 0,
    non_warranty_cases: branchRiskData.reduce((s, b) => s + (b.non_warranty_cases || 0), 0),
    non_warranty_pct: 0,
    sla_target_days: selectedSegment === 'KA Nasional' ? 15 : 20,
    unclaimable_pct: claimableHealth.unclaimable_pct,
    overdue_count: branchRiskData.reduce((s, b) => s + (b.overdue_cases || 0), 0),
  };

  const productPortfolio = volumeData?.productPortfolio || {
    productBreakdown: [],
    topModels: [],
    dominant_product: null,
  };

  // Pie chart dataset for Claimable Health
  const donutData = [
    { name: 'Claimable', value: claimableHealth.claimable_count, color: '#2E7D52' },
    { name: 'Unclaimable', value: claimableHealth.unclaimable_count, color: '#A3462F' },
    { name: 'In-Progress / Other', value: claimableHealth.other_count, color: '#71717A' },
  ].filter((d) => d.value > 0);

  // Pie chart dataset for Product Portfolio
  const productDonutData = useMemo(() => {
    return (productPortfolio.productBreakdown || []).map((p) => ({
      name: p.product_code,
      fullName: p.product_name,
      value: p.count,
      pct: p.pct,
      color: p.color,
    }));
  }, [productPortfolio.productBreakdown]);

  const maxTotalCases = useMemo(() => {
    return Math.max(...branchRiskData.map((d) => d.total_cases), 1);
  }, [branchRiskData]);

  // --- EXPERIMENTAL: 8 Official Claimable Statuses (ref_claimable_status) ---
  const OFFICIAL_CLAIM_STATUSES = useMemo(() => [
    { key: 'Claimable Principal', label: 'Claimable Principal', color: '#2E7D52', isPrimary: true },
    { key: 'Unclaimable', label: 'Unclaimable', color: '#A3462F', isPrimary: true },
    { key: 'Goodwill', label: 'Goodwill', color: '#B87A28', isPrimary: true },
    { key: 'Claimable GOEM', label: 'Claimable GOEM', color: '#6366F1', isPrimary: true },
    { key: 'Claimable Vendor (Attachment)', label: 'Claimable Vendor (Attachment)', color: '#0284C7', isPrimary: false },
    { key: 'Claimable Vendor (Genset Maker)', label: 'Claimable Vendor (Genset Maker)', color: '#0D9488', isPrimary: false },
    { key: 'Progress Checking Unit', label: 'Progress Checking Unit', color: '#8B5CF6', isPrimary: false },
    { key: 'Waiting Created WO Checking', label: 'Waiting Created WO Checking', color: '#71717A', isPrimary: false },
  ], []);

  const activeExpMetricObj = useMemo(() => {
    return OFFICIAL_CLAIM_STATUSES.find((o) => o.key === selectedExpStatus) || OFFICIAL_CLAIM_STATUSES[0];
  }, [OFFICIAL_CLAIM_STATUSES, selectedExpStatus]);

  const maxExpMetricCount = useMemo(() => {
    let max = 0;
    branchRiskData.forEach((b) => {
      const count = b.status_counts?.[selectedExpStatus] ?? 0;
      if (count > max) max = count;
    });
    return Math.max(max, 1);
  }, [branchRiskData, selectedExpStatus]);

  const expXDomainMax = useMemo(() => {
    if (maxExpMetricCount <= 5) return 5;
    if (maxExpMetricCount <= 10) return 10;
    if (maxExpMetricCount <= 20) return 20;
    if (maxExpMetricCount <= 30) return 30;
    return Math.ceil(maxExpMetricCount / 5) * 5;
  }, [maxExpMetricCount]);

  const expXTicks = useMemo(() => {
    const step = expXDomainMax <= 5 ? 1 : expXDomainMax <= 10 ? 2 : expXDomainMax <= 20 ? 5 : 5;
    return Array.from({ length: Math.floor(expXDomainMax / step) + 1 }, (_, i) => i * step);
  }, [expXDomainMax]);

  const expScatterData = useMemo(() => {
    const coordMap: { [key: string]: Array<any> } = {};
    branchRiskData.forEach((b) => {
      const count = b.status_counts?.[selectedExpStatus] ?? 0;
      const pct = b.total_cases > 0 ? Math.round((count / b.total_cases) * 1000) / 10 : 0;
      const key = `${count}_${pct}`;
      if (!coordMap[key]) coordMap[key] = [];
      coordMap[key].push({
        branch_code: b.branch_code,
        branch_city: b.branch_city,
        total_cases: b.total_cases,
        metric_count: count,
        metric_pct: pct,
        overdue_cases: b.overdue_cases,
        overdue_pct: b.overdue_pct,
        avg_solution_days: b.avg_solution_days,
      });
    });

    return Object.values(coordMap).map((branches) => {
      const first = branches[0];
      const isMulti = branches.length > 1;
      const displayCode = branches.map((b) => b.branch_code).join('/');
      return {
        x: first.metric_count,
        y: first.metric_pct,
        z: Math.max(first.metric_count, 5),
        displayCode,
        is_multi: isMulti,
        branches,
        branch_code: displayCode,
        branch_city: first.branch_city,
        total_cases: first.total_cases,
        metric_count: first.metric_count,
        metric_pct: first.metric_pct,
        avg_solution_days: first.avg_solution_days,
      };
    });
  }, [branchRiskData, selectedExpStatus]);

  const totalSelectedStatusCases = useMemo(() => {
    return branchRiskData.reduce((sum, b) => sum + (b.status_counts?.[selectedExpStatus] || 0), 0);
  }, [branchRiskData, selectedExpStatus]);

  const nationalStatusPct = useMemo(() => {
    const totalAll = kpiStats.total_cases || 1;
    return Math.round((totalSelectedStatusCases / totalAll) * 1000) / 10;
  }, [kpiStats.total_cases, totalSelectedStatusCases]);

  const renderExpBubble = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const count = payload.metric_count ?? 0;
    const isZero = count === 0;

    // Sizing: Radius directly scales with real status case volume (Area Proportional)
    // 0 cases -> 5px clean dot marker; >0 cases -> 11px to 32px
    const minRadius = 11;
    const maxRadius = 32;
    const r = isZero
      ? 5
      : minRadius + Math.sqrt(count / maxExpMetricCount) * (maxRadius - minRadius);

    const activeColor = activeExpMetricObj?.color || '#A3462F';
    const fillColor = isZero ? '#71717A' : activeColor;
    const strokeColor = isZero ? '#3F3F46' : activeColor;

    const isMulti = payload.is_multi && payload.branches && payload.branches.length > 1;

    return (
      <g className="cursor-pointer group">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={fillColor}
          fillOpacity={isZero ? 0.6 : 0.45}
          stroke={strokeColor}
          strokeWidth={isMulti ? 2 : 1.5}
          strokeDasharray={isMulti ? '3 2' : undefined}
        />
        <circle
          cx={cx}
          cy={cy}
          r={isZero ? 1.5 : 2}
          fill={strokeColor}
        />
        {!isZero && (
          isMulti ? (
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-mono font-bold select-none pointer-events-none"
              style={{
                fontSize: r >= 22 ? '9.5px' : '8px',
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
                fontSize: r >= 24 ? '11px' : r >= 16 ? '9.5px' : '8px',
                fill: 'var(--ink-primary)',
                paintOrder: 'stroke',
                stroke: 'var(--surface)',
                strokeWidth: '2.5px',
                strokeLinejoin: 'round',
              }}
            >
              {payload.displayCode}
            </text>
          )
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

          {/* 3 TOP KPI STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stat 1: Total Case Volume */}
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
                Kasus tercatat dalam periode &amp; segmen terpilih
              </div>
            </div>

            {/* Stat 2: Warranty Scope (Interactive Flip Card) */}
            <div
              onClick={() => setWarrantyViewMode((prev) => (prev === 'volume' ? 'rate' : 'volume'))}
              className="p-4 bg-surface border border-border hover:border-[#2E7D52]/40 rounded-lg shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 group relative overflow-hidden"
              title="Klik untuk beralih antara Absolute Volume dan Rate (%)"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Warranty Scope
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#2E7D52]/10 text-[#2E7D52] border border-[#2E7D52]/20">
                      <Repeat className="w-2.5 h-2.5" />
                      {warrantyViewMode === 'volume' ? 'Vol' : 'Rate'}
                    </span>
                  </div>

                  {warrantyViewMode === 'volume' ? (
                    <div className="flex items-baseline gap-1.5 animate-in fade-in duration-200">
                      <span className="text-3xl font-mono font-bold text-[#2E7D52] tabular-nums tracking-tight">
                        {kpiStats.warranty_cases}
                      </span>
                      <span className="text-xs font-semibold text-ink-muted font-mono">Kasus</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 animate-in fade-in duration-200">
                      <span className="text-3xl font-mono font-bold text-[#2E7D52] tabular-nums tracking-tight">
                        {kpiStats.warranty_pct}%
                      </span>
                      <span className="text-xs font-semibold text-ink-muted font-mono">Coverage</span>
                    </div>
                  )}
                </div>

                <div className="p-2 rounded-md bg-[#2E7D52]/10 text-[#2E7D52] border border-[#2E7D52]/20 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="text-[11px] text-ink-muted mt-2 flex items-center justify-between font-mono">
                {warrantyViewMode === 'volume' ? (
                  <>
                    <span>Share: <strong className="text-[#2E7D52] font-semibold">{kpiStats.warranty_pct}%</strong> dari total</span>
                    <span className="text-[10px] text-ink-muted/80 flex items-center gap-0.5 group-hover:text-[#2E7D52]">
                      <ArrowUpDown className="w-2.5 h-2.5" /> Lihat Rate
                    </span>
                  </>
                ) : (
                  <>
                    <span>Vol: <strong className="text-[#2E7D52] font-semibold">{kpiStats.warranty_cases}</strong> / {kpiStats.total_cases} kasus</span>
                    <span className="text-[10px] text-ink-muted/80 flex items-center gap-0.5 group-hover:text-[#2E7D52]">
                      <ArrowUpDown className="w-2.5 h-2.5" /> Lihat Vol
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Stat 3: Non-Warranty Exposure (Interactive Flip Card) */}
            <div
              onClick={() => setNonWarrantyViewMode((prev) => (prev === 'volume' ? 'rate' : 'volume'))}
              className="p-4 bg-surface border border-border hover:border-[#A3462F]/40 rounded-lg shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 group relative overflow-hidden"
              title="Klik untuk beralih antara Absolute Volume dan Rate (%)"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Non-Warranty Exposure
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#A3462F]/10 text-[#A3462F] border border-[#A3462F]/20">
                      <Repeat className="w-2.5 h-2.5" />
                      {nonWarrantyViewMode === 'volume' ? 'Vol' : 'Rate'}
                    </span>
                  </div>

                  {nonWarrantyViewMode === 'volume' ? (
                    <div className="flex items-baseline gap-1.5 animate-in fade-in duration-200">
                      <span className="text-3xl font-mono font-bold text-[#A3462F] tabular-nums tracking-tight">
                        {kpiStats.non_warranty_cases}
                      </span>
                      <span className="text-xs font-semibold text-ink-muted font-mono">Kasus</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 animate-in fade-in duration-200">
                      <span className="text-3xl font-mono font-bold text-[#A3462F] tabular-nums tracking-tight">
                        {kpiStats.non_warranty_pct}%
                      </span>
                      <span className="text-xs font-semibold text-ink-muted font-mono">Unclaimable</span>
                    </div>
                  )}
                </div>

                <div className="p-2 rounded-md bg-[#A3462F]/10 text-[#A3462F] border border-[#A3462F]/20 group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>

              <div className="text-[11px] text-ink-muted mt-2 flex items-center justify-between font-mono">
                {nonWarrantyViewMode === 'volume' ? (
                  <>
                    <span>Share: <strong className="text-[#A3462F] font-semibold">{kpiStats.non_warranty_pct}%</strong> dari total</span>
                    <span className="text-[10px] text-ink-muted/80 flex items-center gap-0.5 group-hover:text-[#A3462F]">
                      <ArrowUpDown className="w-2.5 h-2.5" /> Lihat Rate
                    </span>
                  </>
                ) : (
                  <>
                    <span>Vol: <strong className="text-[#A3462F] font-semibold">{kpiStats.non_warranty_cases}</strong> / {kpiStats.total_cases} kasus</span>
                    <span className="text-[10px] text-ink-muted/80 flex items-center gap-0.5 group-hover:text-[#A3462F]">
                      <ArrowUpDown className="w-2.5 h-2.5" /> Lihat Vol
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ROW 1: 2-COLUMN GRID (Claimable Breakdown vs Product Portfolio Breakdown) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Claimable vs Unclaimable Breakdown + Audit Tail Table */}
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

            {/* 2. Product Portfolio & Equipment Category Breakdown */}
            <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-accent" />
                      <span>Product Portfolio &amp; Equipment Category</span>
                    </h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      Distribusi kasus per lini produk &amp; model unit alat berat terbanyak.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Donut Chart with Center Metric */}
                  <div className="sm:col-span-5 h-56 relative flex items-center justify-center">
                    {productDonutData.length === 0 ? (
                      <EmptyState className="h-56" />
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={productDonutData}
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {productDonutData.map((entry, index) => (
                                <Cell key={`product-donut-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={customTooltipStyle}
                              formatter={(val: any, name: any, item: any) => [
                                `${val} kasus (${item?.payload?.pct}%)`,
                                item?.payload?.fullName ? `${name} - ${item.payload.fullName}` : name,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center px-1">
                          <span className="text-lg font-mono font-bold text-accent tabular-nums leading-tight">
                            {productPortfolio.dominant_product?.product_code || '-'}
                          </span>
                          <span className="text-[9px] uppercase font-semibold text-ink-muted tracking-wider">
                            {productPortfolio.dominant_product?.pct || 0}% Top Share
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Top Equipment Models Table */}
                  <div className="sm:col-span-7 overflow-x-auto max-h-56">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-base/60 text-ink-muted text-[10px] uppercase font-mono font-semibold border-b border-border">
                        <tr>
                          <th className="py-1.5 px-2">Model Unit</th>
                          <th className="py-1.5 px-2 text-center">Lini</th>
                          <th className="py-1.5 px-2 text-center">Kasus</th>
                          <th className="py-1.5 px-2 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {productPortfolio.topModels.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-ink-muted text-xs">
                              Tidak ada data model unit
                            </td>
                          </tr>
                        ) : (
                          productPortfolio.topModels.map((item, idx) => (
                            <tr key={`model-${idx}`} className="hover:bg-surface-hover transition-colors">
                              <td className="py-1.5 px-2 font-medium text-ink-primary truncate max-w-[120px]" title={item.unit_model_name}>
                                {item.unit_model_name}
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-base border border-border text-ink-muted font-semibold">
                                  {item.product_code}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono text-ink-primary font-semibold">
                                {item.count}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono text-ink-muted">
                                {item.pct}%
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Health Bar */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
                <span className="text-ink-muted">
                  Total Lini: <strong className="text-ink-primary">{productPortfolio.productBreakdown.length} Produk</strong>
                </span>
                {productPortfolio.dominant_product && (
                  <span className="text-accent font-semibold truncate max-w-[220px]" title={productPortfolio.dominant_product.product_name}>
                    Dominan: {productPortfolio.dominant_product.product_code} ({productPortfolio.dominant_product.count} kasus)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ROW 2: FULL-WIDTH MATRIX WITH DYNAMIC MULTI-STATUS RATE */}
          <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3 w-full">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-accent" />
                  <span>Branch Volume & Claim Distribution Matrix</span>
                </h3>
              </div>

              {/* Space-Efficient Filter: 4 Primary Pills + 1 Dropdown with High-Visibility Active States */}
              <div className="flex items-center gap-1 p-0.5 bg-base/70 border border-border rounded-lg self-start lg:self-auto">
                {OFFICIAL_CLAIM_STATUSES.filter((s) => s.isPrimary).map((opt) => {
                  const isActive = selectedExpStatus === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedExpStatus(opt.key)}
                      style={
                        isActive
                          ? {
                            backgroundColor: `${opt.color}20`,
                            borderColor: opt.color,
                            color: 'var(--ink-primary)',
                            boxShadow: `0 0 0 1px ${opt.color}40, 0 1px 2px 0 rgba(0, 0, 0, 0.05)`,
                          }
                          : undefined
                      }
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${isActive
                          ? 'border-solid font-bold'
                          : 'border-transparent text-ink-muted hover:text-ink-primary hover:bg-surface/60'
                        }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: opt.color }}
                      />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}

                {/* Compact Dropdown for Remaining 4 Minor Statuses with Prominent Active State */}
                <select
                  value={!OFFICIAL_CLAIM_STATUSES.find((s) => s.key === selectedExpStatus)?.isPrimary ? selectedExpStatus : ''}
                  onChange={(e) => {
                    if (e.target.value) setSelectedExpStatus(e.target.value);
                  }}
                  style={
                    !OFFICIAL_CLAIM_STATUSES.find((s) => s.key === selectedExpStatus)?.isPrimary
                      ? {
                        backgroundColor: `${activeExpMetricObj.color}20`,
                        borderColor: activeExpMetricObj.color,
                        color: 'var(--ink-primary)',
                        boxShadow: `0 0 0 1px ${activeExpMetricObj.color}40`,
                      }
                      : undefined
                  }
                  className={`h-7 px-2.5 text-[11px] font-medium rounded-md border transition-all cursor-pointer outline-none ${!OFFICIAL_CLAIM_STATUSES.find((s) => s.key === selectedExpStatus)?.isPrimary
                      ? 'font-bold border-solid'
                      : 'bg-transparent text-ink-muted border-transparent hover:text-ink-primary'
                    }`}
                >
                  <option value="" disabled>
                    {!OFFICIAL_CLAIM_STATUSES.find((s) => s.key === selectedExpStatus)?.isPrimary
                      ? selectedExpStatus
                      : 'Status Lainnya (4) ▾'}
                  </option>
                  {OFFICIAL_CLAIM_STATUSES.filter((s) => !s.isPrimary).map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-80 w-full">
              {expScatterData.length === 0 ? (
                <EmptyState className="h-80" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 15, right: 30, bottom: 20, left: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={`Kasus ${activeExpMetricObj.label}`}
                      domain={[0, expXDomainMax]}
                      ticks={expXTicks}
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                      label={{ value: `Jumlah Kasus ${activeExpMetricObj.label} (Volume Cabang)`, position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--ink-muted)' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={`${activeExpMetricObj.label} %`}
                      unit="%"
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                      label={{
                        value: `% Kasus ${activeExpMetricObj.label}`,
                        angle: -90,
                        position: 'insideLeft',
                        offset: 0,
                        style: { textAnchor: 'middle', fontSize: 11, fontWeight: 600, fill: activeExpMetricObj.color },
                      }}
                    />
                    <Tooltip
                      contentStyle={customTooltipStyle}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const branches = data.branches || [data];
                          const isSingle = branches.length === 1;

                          if (isSingle) {
                            const b = branches[0];
                            return (
                              <div className="p-2.5 bg-surface border border-border rounded-lg shadow-xl text-xs space-y-2 font-mono min-w-[190px]">
                                {/* Header: Branch Code & City */}
                                <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-sans">
                                  <span className="font-bold text-sm text-ink-primary">{b.branch_code}</span>
                                  <span className="text-[11px] text-ink-muted">{b.branch_city}</span>
                                </div>

                                {/* Status Focus: Count/Total & Rate */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-bold text-sm" style={{ color: activeExpMetricObj.color }}>
                                    {b.metric_count}/{b.total_cases} kasus
                                  </span>
                                  <span className="font-mono font-bold text-xs text-ink-primary px-1.5 py-0.5 rounded bg-base border border-border">
                                    {b.metric_pct}%
                                  </span>
                                </div>

                                {/* Operational Lead Time */}
                                <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono pt-1 border-t border-border/40">
                                  <span className="font-sans">Avg Lead Time:</span>
                                  <span className="text-ink-primary font-medium">{b.avg_solution_days} hari</span>
                                </div>
                              </div>
                            );
                          }

                          // Multi-branch on same coordinate
                          return (
                            <div className="p-2.5 bg-surface border border-border rounded-lg shadow-xl text-xs space-y-2 font-mono min-w-[210px]">
                              <div className="space-y-2 divide-y divide-border/40">
                                {branches.map((b: any, idx: number) => (
                                  <div key={idx} className={idx > 0 ? "pt-2 space-y-1.5" : "space-y-1.5"}>
                                    <div className="flex items-center justify-between font-sans">
                                      <span className="font-bold text-sm text-ink-primary">{b.branch_code}</span>
                                      <span className="text-[11px] text-ink-muted">{b.branch_city}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-mono font-bold text-sm" style={{ color: activeExpMetricObj.color }}>
                                        {b.metric_count}/{b.total_cases} kasus
                                      </span>
                                      <span className="font-mono font-bold text-xs text-ink-primary px-1.5 py-0.5 rounded bg-base border border-border">
                                        {b.metric_pct}%
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono pt-1 border-t border-border/30">
                                      <span className="font-sans">Avg Lead Time:</span>
                                      <span className="text-ink-primary font-medium">{b.avg_solution_days} hari</span>
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
                    <Scatter
                      name="Branches"
                      data={expScatterData}
                      shape={renderExpBubble}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Summary Footer */}
            <div className="pt-2 border-t border-border flex items-center justify-end text-[10px] font-mono text-ink-muted">
              <span>
                {branchRiskData.length} Cabang Terdata · Populasi Nasional: <strong className="text-ink-primary font-mono">{totalSelectedStatusCases} kasus ({nationalStatusPct}%)</strong>
              </span>
            </div>
          </div>

          {/* ROW 3: FULL-WIDTH BACKLOG FLOW CHART (COMBO DIVERGING INTAKE/CLOSED BARS + NET BACKLOG DELTA LINE) */}
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
