'use client';

import React, { useState } from 'react';
import { RootCauseAnalyticsData } from '@/lib/queries/performance';
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
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import { FaultAttributionSmallMultiples } from '@/components/volume-trends/FaultAttributionSmallMultiples';
import {
  Wrench,
  AlertTriangle,
  PieChart as PieIcon,
  Layers,
  FileSpreadsheet,
  Cpu,
} from 'lucide-react';

interface RootCauseAnalyticsViewProps {
  initialData: RootCauseAnalyticsData;
}

export function RootCauseAnalyticsView({ initialData }: RootCauseAnalyticsViewProps) {
  const [data, setData] = useState<RootCauseAnalyticsData>(initialData);
  const [range, setRange] = useState<TimeRangeOption>('last_1_year');
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'All Customer' | 'KA Nasional'>('all');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
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
      let url = `/api/performance/root-cause?range=${newRange}&segment=${encodeURIComponent(segment)}`;
      if (newRange === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch root cause analytics data:', err);
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
  const paretoData = data.paretoData || [];
  const faultPanels = data.faultPanels || [];

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <AnalyticsFilterHeader
        title="Root Cause & Failure Attribution"
        subtitle="Analisis akar masalah kerusakan produk berbasis prinsip Pareto 80/20 dan 5 taksonomi tanggung jawab kesalahan."
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
        {/* Card 1: Dominant Root Cause */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Akar Masalah Dominan
              </div>
              <div className="text-2xl font-mono font-bold text-accent-brass tabular-nums tracking-tight truncate max-w-[200px]" title={summary.dominant_cause?.name}>
                {summary.dominant_cause?.name || '-'}
              </div>
            </div>
            <div className="p-2 rounded-md bg-accent-brass/10 text-accent-brass border border-accent-brass/20 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono flex items-center justify-between">
            <span>{summary.dominant_cause?.count || 0} kasus</span>
            <strong className="text-ink-primary">{summary.dominant_cause?.pct || 0}% share</strong>
          </div>
        </div>

        {/* Card 2: 80/20 Concentration */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Top 3 Causes Share (80/20)
              </div>
              <div className="text-3xl font-mono font-bold text-[#2E7D52] tabular-nums tracking-tight">
                {summary.top3_share_pct}%
              </div>
            </div>
            <div className="p-2 rounded-md bg-[#2E7D52]/10 text-[#2E7D52] border border-[#2E7D52]/20">
              <PieIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            3 penyebab teratas menjelaskan {summary.top3_share_pct}% kasus
          </div>
        </div>

        {/* Card 3: Total Root Causes Variety */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Ragam Akar Masalah
              </div>
              <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                {summary.total_causes_count}
              </div>
            </div>
            <div className="p-2 rounded-md bg-base text-ink-muted border border-border">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2">
            Kategori kegagalan teridentifikasi
          </div>
        </div>

        {/* Card 4: Total Analyzed Cases */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Total Kasus Dianalisis
              </div>
              <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                {summary.total_cases}
              </div>
            </div>
            <div className="p-2 rounded-md bg-accent-brass/10 text-accent-brass border border-accent-brass/20">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            Populasi kasus pada periode &amp; segmen aktif
          </div>
        </div>
      </div>

      {/* ROW 1: PARETO 80/20 CHART */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-accent-brass" />
              <span>Pareto Root Cause Analysis (Prinsip 80/20)</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Distribusi frekuensi akar masalah (bar) dan garis persentase kumulatif untuk menemukan akar masalah paling signifikan.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3F3F46]" /> Kasus
            </span>
            <span className="flex items-center gap-1.5 text-[#2E7D52]">
              <span className="w-3 h-0.5 bg-[#2E7D52]" /> Kumulatif %
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {paretoData.length === 0 ? (
            <EmptyState className="h-72" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 10, right: 20, bottom: 25, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="root_cause_name"
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                  label={{ value: 'Jumlah Kasus', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--ink-muted)' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                  label={{ value: 'Kumulatif %', angle: 90, position: 'insideRight', fontSize: 10, fill: 'var(--ink-muted)' }}
                />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, name: any) => [
                    name === 'Kumulatif %' ? `${val}%` : `${val} kasus`,
                    name,
                  ]}
                />
                <ReferenceLine yAxisId="right" y={80} stroke="#A3462F" strokeDasharray="3 3" label={{ value: 'Threshold 80%', fill: '#A3462F', fontSize: 9, position: 'insideTopRight' }} />
                <Bar
                  yAxisId="left"
                  dataKey="jumlah_kasus"
                  name="Jumlah Kasus"
                  fill="#3F3F46"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative_pct"
                  name="Kumulatif %"
                  stroke="#2E7D52"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#2E7D52' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ROW 2: FAULT BY UNIT (5 ATTRIBUTION TAXONOMIES) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-accent-brass" />
              <span>Fault Attribution by Unit (5 Taksonomi Pertanggungjawaban Kesalahan)</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Perbandingan pola kegagalan tiap unit produk: Product-side (defect pabrik/material), Customer-side (miss maintenance/operation), Process-side, External, dan Unrecorded.
            </p>
          </div>
        </div>

        <FaultAttributionSmallMultiples
          panels={faultPanels}
          selectedProduct={selectedProduct}
          onSelectProduct={setSelectedProduct}
        />
      </div>

      {/* ROW 3: ROOT CAUSE DETAIL TABLE */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent-brass" />
              <span>Detail Data &amp; Aging per Akar Masalah</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Daftar lengkap seluruh akar masalah, frekuensi kejadian, persentase kumulatif, dan rata-rata durasi penyelesaian.
            </p>
          </div>
          <span className="text-xs font-mono text-ink-muted">
            {paretoData.length} Kategori
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-base/60 text-ink-muted text-[10px] uppercase font-mono font-semibold border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Akar Masalah (Root Cause)</th>
                <th className="py-2.5 px-3 text-center">Jumlah Kasus</th>
                <th className="py-2.5 px-3 text-center">Share %</th>
                <th className="py-2.5 px-3 text-center">Kumulatif %</th>
                <th className="py-2.5 px-3 text-right">Rata-rata Aging</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paretoData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-muted text-xs">
                    Tidak ada data akar masalah pada filter ini.
                  </td>
                </tr>
              ) : (
                paretoData.map((r, idx) => (
                  <tr key={`rc-${idx}`} className="hover:bg-surface-hover transition-colors font-mono">
                    <td className="py-2.5 px-3 font-sans font-medium text-ink-primary">
                      {r.root_cause_name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-ink-primary">
                      {r.jumlah_kasus}
                    </td>
                    <td className="py-2.5 px-3 text-center text-ink-muted">
                      {r.pct}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        r.cumulative_pct <= 80
                          ? 'bg-[#2E7D52]/10 text-[#2E7D52] border border-[#2E7D52]/20'
                          : 'bg-base text-ink-muted border border-border'
                      }`}>
                        {r.cumulative_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-ink-primary">
                      {r.avg_solution_time_days} hari
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
