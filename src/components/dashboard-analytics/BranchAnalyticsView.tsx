'use client';

import React, { useState } from 'react';
import { BranchAnalyticsData, BranchAnalyticsItem } from '@/lib/queries/performance';
import { AnalyticsFilterHeader } from './AnalyticsFilterHeader';
import { TimeRangeOption } from '@/components/common/TimeRangeFilter';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Building2,
  CheckCircle2,
  Clock,
  Zap,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface BranchAnalyticsViewProps {
  initialData: BranchAnalyticsData;
}

export function BranchAnalyticsView({ initialData }: BranchAnalyticsViewProps) {
  const [data, setData] = useState<BranchAnalyticsData>(initialData);
  const [range, setRange] = useState<TimeRangeOption>('last_1_year');
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'All Customer' | 'KA Nasional'>('all');
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
      let url = `/api/performance/branch?range=${newRange}&segment=${encodeURIComponent(segment)}`;
      if (newRange === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch branch analytics data:', err);
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

  const summary = data.summary;
  const branchList = data.branchList || [];
  const outcomeProfile = data.branchOutcomeProfile || [];

  // Data for aging ranking sorted by longest to fastest
  const agingRankingData = [...branchList].sort((a, b) => b.avg_solution_days - a.avg_solution_days);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <AnalyticsFilterHeader
        title="Branch Performance & Outcomes"
        subtitle="Analisis terpadu performa operasional, kepatuhan SLA, dan profil klaim per cabang."
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
        {/* Card 1: Total Volume */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Total Volume Kasus
              </div>
              <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                {summary.total_cases}
              </div>
            </div>
            <div className="p-2 rounded-md bg-accent-brass/10 text-accent-brass border border-accent-brass/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            {summary.total_branches} cabang aktif terdaftar
          </div>
        </div>

        {/* Card 2: Overall SLA Achievement */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                SLA Achievement Rate
              </div>
              <div className="text-3xl font-mono font-bold text-[#2E7D52] tabular-nums tracking-tight">
                {summary.overall_achievement_pct}%
              </div>
            </div>
            <div className="p-2 rounded-md bg-[#2E7D52]/10 text-[#2E7D52] border border-[#2E7D52]/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 flex items-center justify-between">
            <span>Target Benchmark: 85.0%</span>
            <span className={`font-mono font-semibold text-[10px] ${summary.overall_achievement_pct >= 85 ? 'text-[#2E7D52]' : 'text-accent-brass'}`}>
              {summary.overall_achievement_pct >= 85 ? 'On Target' : 'Under Target'}
            </span>
          </div>
        </div>

        {/* Card 3: Overall Average Aging */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Rata-rata Aging Lead Time
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                  {summary.overall_avg_solution_days}
                </span>
                <span className="text-xs font-semibold text-ink-muted font-mono">Hari</span>
              </div>
            </div>
            <div className="p-2 rounded-md bg-base text-ink-muted border border-border">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2">
            Acuan: 15 hari (KA) vs 20 hari (All)
          </div>
        </div>

        {/* Card 4: Speed Contrast (Fastest vs Slowest) */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Branch Speed Contrast
              </div>
              <div className="space-y-1 mt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#2E7D52]" />
                  <span className="text-ink-muted">Tercepat:</span>
                  <strong className="font-mono text-ink-primary">{summary.fastest_branch ? `${summary.fastest_branch.branch_code} (${summary.fastest_branch.days}h)` : '-'}</strong>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#A3462F]" />
                  <span className="text-ink-muted">Terlama:</span>
                  <strong className="font-mono text-ink-primary">{summary.slowest_branch ? `${summary.slowest_branch.branch_code} (${summary.slowest_branch.days}h)` : '-'}</strong>
                </div>
              </div>
            </div>
            <div className="p-2 rounded-md bg-accent-brass/10 text-accent-brass border border-accent-brass/20">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[10px] text-ink-muted mt-2 font-mono">
            {summary.fastest_branch && summary.slowest_branch ? `Delta: ${(summary.slowest_branch.days - summary.fastest_branch.days).toFixed(1)} hari rentang penyelesaian` : '-'}
          </div>
        </div>
      </div>

      {/* ROW 1: 2-COLUMN GRID (Branch Comparison vs Branch Aging Ranking) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Volume vs SLA Achievement Comparison */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-accent-brass" />
                  <span>Volume vs SLA Achievement Rate per Cabang</span>
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Identifikasi cabang dengan volume tinggi namun achievement rate di bawah target 85%.
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {branchList.length === 0 ? (
                <EmptyState className="h-72" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={branchList} margin={{ top: 10, right: 15, bottom: 20, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      dataKey="branch_code"
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                      label={{ value: 'Total Kasus', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--ink-muted)' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                      label={{ value: 'Achievement %', angle: 90, position: 'insideRight', fontSize: 10, fill: 'var(--ink-muted)' }}
                    />
                    <Tooltip
                      contentStyle={customTooltipStyle}
                      formatter={(val: any, name: any) => [
                        name === 'Achievement %' ? `${val}%` : `${val} kasus`,
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine yAxisId="right" y={85} stroke="#2E7D52" strokeDasharray="3 3" label={{ value: 'Target 85%', fill: '#2E7D52', fontSize: 9, position: 'insideTopRight' }} />
                    <Bar
                      yAxisId="left"
                      dataKey="total_cases"
                      name="Volume Kasus"
                      fill="#71717A"
                      radius={[3, 3, 0, 0]}
                    >
                      {branchList.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.achievement_pct < 85 && entry.total_cases >= 5 ? '#A3462F' : '#3F3F46'}
                        />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="achievement_pct"
                      name="Achievement %"
                      stroke="#2E7D52"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#2E7D52' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#A3462F]" /> Volume &ge;5 Kasus &amp; Ach &lt;85% (Perlu Perhatian)
            </span>
            <span>{branchList.length} Cabang Dievaluasi</span>
          </div>
        </div>

        {/* Chart 2: Branch Aging Lead Time Ranking */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-accent-brass" />
                  <span>Peringkat Durasi Aging Lead Time (Hari)</span>
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Diurutkan dari cabang dengan rata-rata penyelesaian terlama ke tercepat.
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {agingRankingData.length === 0 ? (
                <EmptyState className="h-72" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={agingRankingData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, bottom: 5, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} horizontal={false} />
                    <XAxis
                      type="number"
                      unit=" hari"
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                    />
                    <YAxis
                      dataKey="branch_code"
                      type="category"
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={customTooltipStyle}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} hari (${item?.payload?.total_cases} kasus)`,
                        'Rata-rata Aging',
                      ]}
                    />
                    <ReferenceLine x={20} stroke="#B87A28" strokeDasharray="3 3" label={{ value: 'Batas 20 Hari', fill: '#B87A28', fontSize: 9, position: 'insideTopRight' }} />
                    <Bar
                      dataKey="avg_solution_days"
                      name="Rata-rata Hari"
                      radius={[0, 4, 4, 0]}
                    >
                      {agingRankingData.map((entry, index) => (
                        <Cell
                          key={`aging-${index}`}
                          fill={entry.avg_solution_days > 20 ? '#A3462F' : entry.avg_solution_days <= 15 ? '#2E7D52' : '#B87A28'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-ink-muted">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#2E7D52]" /> &le;15 Hari
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#B87A28]" /> 16–20 Hari
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#A3462F]" /> &gt;20 Hari
              </span>
            </div>
            <span>Benchmark Max: 20 Hari</span>
          </div>
        </div>
      </div>

      {/* ROW 2: CLAIM OUTCOME PROFILE (100% STACKED BAR) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-brass" />
              <span>Branch Claim Outcome Profile (Komposisi Hasil Klaim)</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Proporsi hasil klaim: Covered (Garansi Disetujui), Goodwill (Konsesi Komersial), dan Unclaimable (Di luar Garansi/GOEM).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#2E7D52]" /> Covered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#B87A28]" /> Goodwill
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#A3462F]" /> Unclaimable
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {outcomeProfile.length === 0 ? (
            <EmptyState className="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={outcomeProfile}
                layout="vertical"
                margin={{ top: 5, right: 25, bottom: 5, left: 15 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                />
                <YAxis
                  dataKey="branch_code"
                  type="category"
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                  width={40}
                />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, name: any, item: any) => {
                    const p = item.payload;
                    if (name === 'Covered %') return [`${val}% (${p.covered_count} kasus)`, 'Covered (Warranty)'];
                    if (name === 'Goodwill %') return [`${val}% (${p.goodwill_count} kasus)`, 'Goodwill (Concession)'];
                    if (name === 'Unclaimable %') return [`${val}% (${p.unclaimable_count} kasus)`, 'Unclaimable / Non-Warranty'];
                    return [val, name];
                  }}
                />
                <Bar dataKey="covered_pct" name="Covered %" stackId="a" fill="#2E7D52" />
                <Bar dataKey="goodwill_pct" name="Goodwill %" stackId="a" fill="#B87A28" />
                <Bar dataKey="unclaimable_pct" name="Unclaimable %" stackId="a" fill="#A3462F" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ROW 3: DETAILED AUDIT TABLE */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent-brass" />
              <span>Detail Kinerja Operasional &amp; Audit per Cabang</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Rincian angka absolut dan rasio untuk keperluan verifikasi, cross-check, dan audit kepatuhan.
            </p>
          </div>
          <span className="text-xs font-mono text-ink-muted">
            {branchList.length} Cabang
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-base/60 text-ink-muted text-[10px] uppercase font-mono font-semibold border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Cabang</th>
                <th className="py-2.5 px-3 text-center">Total Kasus</th>
                <th className="py-2.5 px-3 text-center">Achieve SLA</th>
                <th className="py-2.5 px-3 text-center">Achievement %</th>
                <th className="py-2.5 px-3 text-center">Avg Aging</th>
                <th className="py-2.5 px-3 text-center">Overdue</th>
                <th className="py-2.5 px-3 text-center">Covered (Garansi)</th>
                <th className="py-2.5 px-3 text-center">Goodwill</th>
                <th className="py-2.5 px-3 text-right">Unclaimable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {branchList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-ink-muted text-xs">
                    Tidak ada data cabang untuk periode &amp; segmen terpilih.
                  </td>
                </tr>
              ) : (
                branchList.map((b, idx) => (
                  <tr key={`branch-${idx}`} className="hover:bg-surface-hover transition-colors font-mono">
                    <td className="py-2.5 px-3 font-sans font-medium text-ink-primary">
                      <div className="font-bold text-xs">{b.branch_code}</div>
                      <div className="text-[10px] text-ink-muted">{b.branch_city}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-ink-primary">
                      {b.total_cases}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#2E7D52] font-semibold">
                      {b.achieved_cases}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        b.achievement_pct >= 85
                          ? 'bg-[#2E7D52]/10 text-[#2E7D52] border border-[#2E7D52]/20'
                          : 'bg-[#A3462F]/10 text-[#A3462F] border border-[#A3462F]/20'
                      }`}>
                        {b.achievement_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-ink-primary">
                      {b.avg_solution_days} hari
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {b.overdue_cases > 0 ? (
                        <span className="text-[#A3462F] font-bold">{b.overdue_cases}</span>
                      ) : (
                        <span className="text-ink-muted">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#2E7D52]">
                      {b.covered_cases} <span className="text-[10px] text-ink-muted">({b.covered_pct}%)</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#B87A28]">
                      {b.goodwill_cases} <span className="text-[10px] text-ink-muted">({b.goodwill_pct}%)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-accent-brass font-semibold">
                      {b.unclaimable_cases} <span className="text-[10px] text-ink-muted">({b.unclaimable_pct}%)</span>
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
