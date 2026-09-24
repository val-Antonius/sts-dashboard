'use client';

import React, { useState } from 'react';
import { SolutionTimeAnalyticsData } from '@/lib/queries/performance';
import { AnalyticsFilterHeader } from './AnalyticsFilterHeader';
import { TimeRangeOption } from '@/components/common/TimeRangeFilter';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Timer,
  Users,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface SolutionTimeAnalyticsViewProps {
  initialData: SolutionTimeAnalyticsData;
}

export function SolutionTimeAnalyticsView({ initialData }: SolutionTimeAnalyticsViewProps) {
  const [data, setData] = useState<SolutionTimeAnalyticsData>(initialData);
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
      let url = `/api/performance/solution-time?range=${newRange}&segment=${encodeURIComponent(segment)}`;
      if (newRange === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch solution time analytics data:', err);
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
  const branchRanking = data.branchRanking || [];
  const checkpointRanking = data.checkpointRanking || [];
  const segmentPerformance = data.segmentPerformance || [];

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <AnalyticsFilterHeader
        title="Solution Time & SLA Bottlenecks"
        subtitle="Analisis durasi penyelesaian kasus, kepatuhan SLA 85%, dan identifikasi bottleneck 8 checkpoint proses."
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
        {/* Card 1: SLA Achievement Rate */}
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
            <span>Target: 85.0%</span>
            <span className={`font-mono font-semibold text-[10px] ${summary.overall_achievement_pct >= 85 ? 'text-[#2E7D52]' : 'text-accent-brass'}`}>
              {summary.overall_achievement_pct >= 85 ? 'Memenuhi Standar' : 'Di Bawah Standar'}
            </span>
          </div>
        </div>

        {/* Card 2: Overall Average Duration */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Rata-rata Durasi Solusi
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                  {summary.overall_avg_solution_days}
                </span>
                <span className="text-xs font-semibold text-ink-muted font-mono">Hari Kerja</span>
              </div>
            </div>
            <div className="p-2 rounded-md bg-base text-ink-muted border border-border">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2">
            Target: &le;15h (KA) vs &le;20h (All)
          </div>
        </div>

        {/* Card 3: Total Closed Cases */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Total Kasus Dievaluasi
              </div>
              <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                {summary.total_cases_evaluated}
              </div>
            </div>
            <div className="p-2 rounded-md bg-accent-brass/10 text-accent-brass border border-accent-brass/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            Kasus dengan status Closed / RFU
          </div>
        </div>

        {/* Card 4: Overdue Cases */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Kasus Melewati SLA
              </div>
              <div className="text-3xl font-mono font-bold text-[#A3462F] tabular-nums tracking-tight">
                {summary.overdue_count}
              </div>
            </div>
            <div className="p-2 rounded-md bg-[#A3462F]/10 text-[#A3462F] border border-[#A3462F]/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            {summary.total_cases_evaluated > 0 ? `${Math.round((summary.overdue_count / summary.total_cases_evaluated) * 1000) / 10}% dari total kasus` : '0%'}
          </div>
        </div>
      </div>

      {/* ROW 1: 2-COLUMN GRID (Branch SLA Ranking vs Checkpoint Bottleneck Ranking) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Branch SLA Achievement Ranking */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D52]" />
                  <span>Peringkat Kepatuhan SLA per Cabang (%)</span>
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Cabang paling konsisten (hijau) vs cabang yang paling jauh dari target 85% (merah).
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {branchRanking.length === 0 ? (
                <EmptyState className="h-72" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={branchRanking}
                    layout="vertical"
                    margin={{ top: 5, right: 30, bottom: 5, left: 20 }}
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
                      formatter={(val: any, name: any, item: any) => [
                        `${val}% (${item?.payload?.achieved_cases}/${item?.payload?.total_cases} kasus · avg ${item?.payload?.avg_solution_days}h)`,
                        'SLA Achievement %',
                      ]}
                    />
                    <ReferenceLine x={85} stroke="#2E7D52" strokeDasharray="3 3" label={{ value: 'Target 85%', fill: '#2E7D52', fontSize: 9, position: 'insideTopRight' }} />
                    <Bar
                      dataKey="achievement_pct"
                      name="Achievement %"
                      radius={[0, 4, 4, 0]}
                    >
                      {branchRanking.map((entry, index) => (
                        <Cell
                          key={`ach-${index}`}
                          fill={entry.achievement_pct >= 85 ? '#2E7D52' : '#A3462F'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-ink-muted">
            <span className="text-[#2E7D52]">Target Benchmark: 85.0%</span>
            <span>{branchRanking.length} Cabang Terdata</span>
          </div>
        </div>

        {/* Chart 2: Checkpoint Duration Ranking (Bottlenecks) */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                  <Timer className="w-3.5 h-3.5 text-accent-brass" />
                  <span>Analisis Bottleneck 8 Checkpoint Proses</span>
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Rata-rata durasi per tahapan milestone untuk mengidentifikasi fase paling lambat.
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {checkpointRanking.length === 0 ? (
                <EmptyState className="h-72" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={checkpointRanking}
                    layout="vertical"
                    margin={{ top: 5, right: 30, bottom: 5, left: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} horizontal={false} />
                    <XAxis
                      type="number"
                      unit=" hari"
                      tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                    />
                    <YAxis
                      dataKey="checkpoint_code"
                      type="category"
                      tick={{ fontSize: 9, fill: 'var(--ink-muted)' }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={customTooltipStyle}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} hari (median ${item?.payload?.median_durasi}h · ${item?.payload?.n_kejadian} kejadian)`,
                        'Rata-rata Durasi',
                      ]}
                    />
                    <Bar
                      dataKey="avg_durasi"
                      name="Rata-rata Hari"
                      fill="#A3462F"
                      radius={[0, 4, 4, 0]}
                    >
                      {checkpointRanking.map((entry, index) => (
                        <Cell
                          key={`cp-${index}`}
                          fill={entry.avg_durasi >= 5 ? '#A3462F' : entry.avg_durasi >= 2 ? '#B87A28' : '#71717A'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-ink-muted">
            <span className="text-[#A3462F] font-semibold">&ge;5 Hari = Bottleneck Utama</span>
            <span>{checkpointRanking.length} Checkpoint Teranalisis</span>
          </div>
        </div>
      </div>

      {/* ROW 2: SLA PERFORMANCE BY CUSTOMER SEGMENT */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-accent-brass" />
              <span>Perbandingan Kinerja SLA Antar Segmen Pelanggan</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Evaluasi kepatuhan SLA untuk segmen Key Account Nasional (target 15 hari) vs All Customer (target 20 hari).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-base/60 text-ink-muted text-[10px] uppercase font-mono font-semibold border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Segmen Pelanggan</th>
                <th className="py-2.5 px-3 text-center">Status Pencapaian</th>
                <th className="py-2.5 px-3 text-center">Target Ambang Batas SLA</th>
                <th className="py-2.5 px-3 text-center">Jumlah Kasus</th>
                <th className="py-2.5 px-3 text-right">Rata-rata Durasi Solusi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {segmentPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-muted text-xs">
                    Tidak ada data segmen pelanggan.
                  </td>
                </tr>
              ) : (
                segmentPerformance.map((seg, idx) => (
                  <tr key={`seg-${idx}`} className="hover:bg-surface-hover transition-colors font-mono">
                    <td className="py-2.5 px-3 font-sans font-bold text-ink-primary">
                      {seg.golongan_customer}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-sans ${
                        seg.achievement === 'Achieved'
                          ? 'bg-[#2E7D52]/10 text-[#2E7D52] border border-[#2E7D52]/20'
                          : 'bg-[#A3462F]/10 text-[#A3462F] border border-[#A3462F]/20'
                      }`}>
                        {seg.achievement}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-ink-muted">
                      {seg.golongan_customer === 'KA Nasional' ? '15 Hari Kalender' : '20 Hari Kalender'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-ink-primary">
                      {seg.jumlah_kasus} kasus
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-ink-primary">
                      {seg.avg_solution_time_days} hari
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
