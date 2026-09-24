'use client';

import React, { useState, useMemo } from 'react';
import { PerformanceVolumeData } from '@/lib/queries/performance';
import { AnalyticsFilterHeader } from './AnalyticsFilterHeader';
import { TimeRangeOption } from '@/components/common/TimeRangeFilter';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
  ScatterChart,
  Scatter,
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import {
  TrendingUp,
  TrendingDown,
  Inbox,
  CheckCircle2,
  Layers,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface VolumeTrendsAnalyticsViewProps {
  initialData: PerformanceVolumeData;
}

export function VolumeTrendsAnalyticsView({ initialData }: VolumeTrendsAnalyticsViewProps) {
  const [data, setData] = useState<PerformanceVolumeData>(initialData);
  const [range, setRange] = useState<TimeRangeOption>('last_1_year');
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'All Customer' | 'KA Nasional'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('Claimable Principal');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async (
    newRange: TimeRangeOption,
    start?: string,
    end?: string,
    segment: string = selectedSegment
  ) => {
    setLoading(true);
    try {
      let url = `/api/performance/volume?range=${newRange}&segment=${encodeURIComponent(segment)}`;
      if (newRange === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch volume trends data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (newRange: TimeRangeOption, start?: string, end?: string) => {
    setRange(newRange);
    if (start) setCustomStart(start);
    if (end) setCustomEnd(end);
    fetchData(newRange, start, end, selectedSegment);
  };

  const handleSegmentChange = (newSegment: 'all' | 'All Customer' | 'KA Nasional') => {
    setSelectedSegment(newSegment);
    fetchData(range, customStart, customEnd, newSegment);
  };

  const customTooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--ink-primary)',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  const backlogFlowData = data?.monthlyBacklogFlow || [];
  const branchRiskData = data?.branchRiskMatrix || [];

  // Aggregated KPIs
  const totalOpened = useMemo(() => {
    return backlogFlowData.reduce((sum, item) => sum + (item.cases_opened || 0), 0);
  }, [backlogFlowData]);

  const totalClosed = useMemo(() => {
    return backlogFlowData.reduce((sum, item) => sum + (item.cases_closed || 0), 0);
  }, [backlogFlowData]);

  const netBacklogTotal = totalOpened - totalClosed;

  const peakIntakeMonth = useMemo(() => {
    if (backlogFlowData.length === 0) return null;
    return [...backlogFlowData].sort((a, b) => b.cases_opened - a.cases_opened)[0];
  }, [backlogFlowData]);

  // OFFICIAL 8 CLAIM STATUSES for distribution matrix
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

  const activeStatusObj = useMemo(() => {
    return OFFICIAL_CLAIM_STATUSES.find((s) => s.key === selectedStatus) || OFFICIAL_CLAIM_STATUSES[0];
  }, [OFFICIAL_CLAIM_STATUSES, selectedStatus]);

  const maxStatusCount = useMemo(() => {
    let max = 0;
    branchRiskData.forEach((b) => {
      const count = b.status_counts?.[selectedStatus] ?? 0;
      if (count > max) max = count;
    });
    return Math.max(max, 1);
  }, [branchRiskData, selectedStatus]);

  const statusXDomainMax = useMemo(() => {
    if (maxStatusCount <= 5) return 5;
    if (maxStatusCount <= 10) return 10;
    if (maxStatusCount <= 20) return 20;
    if (maxStatusCount <= 30) return 30;
    return Math.ceil(maxStatusCount / 5) * 5;
  }, [maxStatusCount]);

  const statusXTicks = useMemo(() => {
    const step = statusXDomainMax <= 5 ? 1 : statusXDomainMax <= 10 ? 2 : statusXDomainMax <= 20 ? 5 : 5;
    return Array.from({ length: Math.floor(statusXDomainMax / step) + 1 }, (_, i) => i * step);
  }, [statusXDomainMax]);

  const scatterData = useMemo(() => {
    const coordMap: { [key: string]: Array<any> } = {};
    branchRiskData.forEach((b) => {
      const count = b.status_counts?.[selectedStatus] ?? 0;
      const pct = b.total_cases > 0 ? Math.round((count / b.total_cases) * 1000) / 10 : 0;
      const key = `${count}_${pct}`;
      if (!coordMap[key]) coordMap[key] = [];
      coordMap[key].push({
        branch_code: b.branch_code,
        branch_city: b.branch_city,
        total_cases: b.total_cases,
        metric_count: count,
        metric_pct: pct,
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
  }, [branchRiskData, selectedStatus]);

  const totalSelectedStatusCases = useMemo(() => {
    return branchRiskData.reduce((sum, b) => sum + (b.status_counts?.[selectedStatus] || 0), 0);
  }, [branchRiskData, selectedStatus]);

  const nationalStatusPct = useMemo(() => {
    const total = data?.kpiStats?.total_cases || 1;
    return Math.round((totalSelectedStatusCases / total) * 1000) / 10;
  }, [data?.kpiStats?.total_cases, totalSelectedStatusCases]);

  const renderBubble = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const count = payload.metric_count ?? 0;
    const isZero = count === 0;

    const minRadius = 11;
    const maxRadius = 32;
    const r = isZero
      ? 5
      : minRadius + Math.sqrt(count / maxStatusCount) * (maxRadius - minRadius);

    const activeColor = activeStatusObj?.color || '#A3462F';
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
            <g>
              <rect
                x={cx - 18}
                y={cy - 8}
                width={36}
                height={16}
                rx={3}
                fill="var(--surface)"
                stroke={activeColor}
                strokeWidth={1}
                className="shadow-xs"
              />
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
                fill="var(--ink-primary)"
                className="font-mono select-none"
              >
                {payload.displayCode}
              </text>
            </g>
          ) : (
            <text
              x={cx}
              y={cy - r - 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="var(--ink-primary)"
              className="font-mono select-none"
            >
              {payload.displayCode} ({payload.metric_count}/{payload.total_cases})
            </text>
          )
        )}
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <AnalyticsFilterHeader
        title="Volume Trends & Backlog Flow"
        subtitle="Analisis dinamika kasus masuk vs selesai, laju penumpukan backlog, dan distribusi spasial status klaim."
        range={range}
        selectedSegment={selectedSegment}
        customStart={customStart}
        customEnd={customEnd}
        loading={loading}
        onRangeChange={handleRangeChange}
        onSegmentChange={handleSegmentChange}
      />

      {/* TOP 4 EXECUTIVE SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Intake (Opened) */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Total Case Intake (Opened)
              </div>
              <div className="text-3xl font-mono font-bold text-[#A3462F] tabular-nums tracking-tight">
                {totalOpened}
              </div>
            </div>
            <div className="p-2 rounded-md bg-[#A3462F]/10 text-[#A3462F] border border-[#A3462F]/20">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2">
            Kasus baru masuk dalam periode terpilih
          </div>
        </div>

        {/* Card 2: Total Closed */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Total Cases Closed
              </div>
              <div className="text-3xl font-mono font-bold text-[#2E7D52] tabular-nums tracking-tight">
                {totalClosed}
              </div>
            </div>
            <div className="p-2 rounded-md bg-[#2E7D52]/10 text-[#2E7D52] border border-[#2E7D52]/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            Tingkat penyelesaian: <strong className="text-[#2E7D52]">{totalOpened > 0 ? Math.round((totalClosed / totalOpened) * 100) : 0}%</strong> dari intake
          </div>
        </div>

        {/* Card 3: Net Backlog Delta */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Net Backlog Delta
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-mono font-bold tabular-nums tracking-tight ${netBacklogTotal > 0 ? 'text-[#A3462F]' : 'text-[#2E7D52]'}`}>
                  {netBacklogTotal > 0 ? `+${netBacklogTotal}` : `${netBacklogTotal}`}
                </span>
                <span className="text-xs font-mono text-ink-muted">kasus</span>
              </div>
            </div>
            <div className={`p-2 rounded-md border ${netBacklogTotal > 0 ? 'bg-[#A3462F]/10 text-[#A3462F] border-[#A3462F]/20' : 'bg-[#2E7D52]/10 text-[#2E7D52] border-[#2E7D52]/20'}`}>
              {netBacklogTotal > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2">
            {netBacklogTotal > 0 ? (
              <span className="text-[#A3462F] font-semibold">Akumulasi Backlog (Intake &gt; Closed)</span>
            ) : netBacklogTotal === 0 ? (
              <span className="text-ink-muted font-semibold">Keseimbangan Sempurna (1:1)</span>
            ) : (
              <span className="text-[#2E7D52] font-semibold">Pengurangan Backlog Bersih</span>
            )}
          </div>
        </div>

        {/* Card 4: Peak Intake Month */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Bulan Beban Puncak
              </div>
              <div className="text-2xl font-mono font-bold text-ink-primary tabular-nums tracking-tight truncate">
                {peakIntakeMonth ? peakIntakeMonth.bulan : '-'}
              </div>
            </div>
            <div className="p-2 rounded-md bg-accent/10 text-accent border border-accent/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            {peakIntakeMonth ? (
              <span>Puncak: <strong className="text-ink-primary">{peakIntakeMonth.cases_opened} intake</strong> / {peakIntakeMonth.cases_closed} closed</span>
            ) : (
              <span>Tidak ada data periode</span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: MONTHLY BACKLOG FLOW COMBO CHART */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent" />
              <span>Monthly Backlog Flow: Intake vs Closure Dynamics</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Perbandingan kasus masuk (Intake) vs diselesaikan (Closed). Garis Net Delta (&gt;0 penumpukan backlog, &lt;0 resolusi backlog).
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#A3462F]">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#A3462F]" /> Intake (Opened)
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
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={backlogFlowData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, name: any) => [
                    `${val} kasus`,
                    name === 'net_backlog' ? 'Net Backlog Delta' : name,
                  ]}
                />
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                <Bar dataKey="cases_opened" fill="#A3462F" name="Intake (Opened)" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  <LabelList
                    dataKey="cases_opened"
                    position="top"
                    formatter={(val: any) => (val ? `${val}` : '')}
                    style={{ fontSize: '10px', fontWeight: 600, fill: '#A3462F' }}
                  />
                </Bar>
                <Bar dataKey="cases_closed" fill="#2E7D52" name="Closed" radius={[4, 4, 0, 0]} maxBarSize={36}>
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
                  dot={{ r: 4, fill: 'var(--ink-primary)', stroke: 'var(--surface)', strokeWidth: 1.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState />
        )}

        {/* Monthly Flow Audit Table */}
        <div className="pt-3 border-t border-border overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-base/60 text-ink-muted text-[10px] uppercase font-mono font-semibold border-b border-border">
              <tr>
                <th className="py-2 px-3">Bulan</th>
                <th className="py-2 px-3 text-center">Intake (Opened)</th>
                <th className="py-2 px-3 text-center">Closed</th>
                <th className="py-2 px-3 text-center">Net Delta</th>
                <th className="py-2 px-3 text-right">Status Dinamika</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {backlogFlowData.map((row, idx) => {
                const delta = row.net_backlog;
                return (
                  <tr key={idx} className="hover:bg-surface-hover transition-colors font-mono">
                    <td className="py-2 px-3 font-semibold text-ink-primary font-sans">{row.bulan}</td>
                    <td className="py-2 px-3 text-center font-bold text-[#A3462F]">{row.cases_opened}</td>
                    <td className="py-2 px-3 text-center font-bold text-[#2E7D52]">{row.cases_closed}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold ${delta > 0 ? 'bg-[#A3462F]/10 text-[#A3462F]' : delta < 0 ? 'bg-[#2E7D52]/10 text-[#2E7D52]' : 'bg-base text-ink-muted'}`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-sans">
                      {delta > 0 ? (
                        <span className="text-[11px] text-[#A3462F] font-semibold">Penumpukan Backlog</span>
                      ) : delta < 0 ? (
                        <span className="text-[11px] text-[#2E7D52] font-semibold">Resolusi Backlog</span>
                      ) : (
                        <span className="text-[11px] text-ink-muted">Netral (100% Selesai)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: BRANCH VOLUME & CLAIM STATUS DISTRIBUTION MATRIX */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-accent" />
              <span>Branch Volume & Claim Status Matrix</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Pola distribusi volume kasus per cabang terhadap status klaim terpilih. Ukuran lingkaran proporsional terhadap volume absolut.
            </p>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 p-0.5 bg-base/70 border border-border rounded-lg self-start lg:self-auto flex-wrap">
            {OFFICIAL_CLAIM_STATUSES.filter((s) => s.isPrimary).map((opt) => {
              const isActive = selectedStatus === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedStatus(opt.key)}
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
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isActive
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

            {/* Compact Dropdown for Other Statuses */}
            <select
              value={!OFFICIAL_CLAIM_STATUSES.find((s) => s.key === selectedStatus)?.isPrimary ? selectedStatus : ''}
              onChange={(e) => {
                if (e.target.value) setSelectedStatus(e.target.value);
              }}
              style={
                !OFFICIAL_CLAIM_STATUSES.find((s) => s.key === selectedStatus)?.isPrimary
                  ? {
                    backgroundColor: `${activeStatusObj.color}20`,
                    borderColor: activeStatusObj.color,
                    color: 'var(--ink-primary)',
                    boxShadow: `0 0 0 1px ${activeStatusObj.color}40`,
                  }
                  : undefined
              }
              className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-border bg-base text-ink-primary cursor-pointer hover:bg-surface transition-colors"
            >
              <option value="" disabled>Status Lainnya...</option>
              {OFFICIAL_CLAIM_STATUSES.filter((s) => !s.isPrimary).map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scatter Chart Container */}
        <div className="h-80 w-full">
          {branchRiskData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 25, right: 35, left: 15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Kasus Status Terpilih"
                  domain={[0, statusXDomainMax]}
                  ticks={statusXTicks}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  label={{
                    value: `Jumlah Kasus: ${selectedStatus}`,
                    position: 'insideBottom',
                    offset: -12,
                    style: { textAnchor: 'middle', fontSize: 11, fontWeight: 600, fill: activeStatusObj.color },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="% Share Kasus"
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  label={{
                    value: `% Proporsi Kasus Cabang`,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 0,
                    style: { textAnchor: 'middle', fontSize: 11, fontWeight: 600, fill: activeStatusObj.color },
                  }}
                />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const branches = item.branches || [item];
                      return (
                        <div className="p-3 bg-surface border border-border rounded-lg shadow-xl text-xs space-y-2 font-mono min-w-[200px]">
                          {branches.map((b: any, idx: number) => (
                            <div key={idx} className={idx > 0 ? 'pt-2 border-t border-border/40 space-y-1' : 'space-y-1'}>
                              <div className="flex items-center justify-between font-sans">
                                <span className="font-bold text-sm text-ink-primary">{b.branch_code}</span>
                                <span className="text-[11px] text-ink-muted">{b.branch_city}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold" style={{ color: activeStatusObj.color }}>
                                  {b.metric_count}/{b.total_cases} kasus
                                </span>
                                <span className="font-bold text-ink-primary px-1.5 py-0.5 rounded bg-base border border-border">
                                  {b.metric_pct}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-ink-muted pt-1 border-t border-border/30">
                                <span>Avg Lead Time:</span>
                                <span className="text-ink-primary font-medium">{b.avg_solution_days} hari</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  name="Branches"
                  data={scatterData}
                  shape={renderBubble}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-ink-muted">
          <span>
            {branchRiskData.length} Cabang Terdata
          </span>
          <span>
            Populasi Nasional: <strong className="text-ink-primary">{totalSelectedStatusCases} kasus ({nationalStatusPct}%)</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
