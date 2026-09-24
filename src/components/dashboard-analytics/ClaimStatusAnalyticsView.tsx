'use client';

import React, { useState, useMemo } from 'react';
import { PerformanceVolumeData } from '@/lib/queries/performance';
import { AnalyticsFilterHeader } from './AnalyticsFilterHeader';
import { TimeRangeOption } from '@/components/common/TimeRangeFilter';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import {
  ShieldCheck,
  ShieldAlert,
  Repeat,
  ArrowUpDown,
  BarChart3,
  HeartHandshake,
  Package,
  FileSpreadsheet,
} from 'lucide-react';

interface ClaimStatusAnalyticsViewProps {
  initialVolumeData: PerformanceVolumeData;
}

export function ClaimStatusAnalyticsView({ initialVolumeData }: ClaimStatusAnalyticsViewProps) {
  const [volumeData, setVolumeData] = useState<PerformanceVolumeData>(initialVolumeData);
  const [range, setRange] = useState<TimeRangeOption>('last_1_year');
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'All Customer' | 'KA Nasional'>('all');
  const [warrantyViewMode, setWarrantyViewMode] = useState<'volume' | 'rate'>('volume');
  const [nonWarrantyViewMode, setNonWarrantyViewMode] = useState<'volume' | 'rate'>('volume');
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
        setVolumeData(json);
      }
    } catch (err) {
      console.error('Failed to fetch claim status analytics data:', err);
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

  const kpiStats = volumeData.kpiStats;
  const claimableHealth = volumeData.claimableHealth || {
    claimable_count: 0,
    claimable_pct: 0,
    unclaimable_count: 0,
    unclaimable_pct: 0,
    other_count: 0,
    other_pct: 0,
    tailBreakdown: [],
  };
  const productPortfolio = volumeData.productPortfolio || {
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

  // Goodwill count from tail breakdown
  const goodwillItem = claimableHealth.tailBreakdown.find((t) => t.status_name === 'Goodwill');
  const goodwillCount = goodwillItem ? goodwillItem.count : 0;
  const goodwillPct = goodwillItem ? goodwillItem.pct : 0;

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <AnalyticsFilterHeader
        title="Claim Status & Warranty Scope"
        subtitle="Analisis hasil klaim (outcome), proporsi cakupan garansi vs non-garansi, dan tabel rincian status audit."
        range={range}
        selectedSegment={selectedSegment}
        customStart={customStart}
        customEnd={customEnd}
        loading={loading}
        onRangeChange={handleRangeChange}
        onSegmentChange={handleSegmentChange}
      />

      {/* TOP 4 EXECUTIVE SUMMARY STAT CARDS (WITH FLIP INTERACTION) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Case Volume */}
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
            <div className="p-2 rounded-md bg-accent-brass/10 text-accent-brass border border-accent-brass/20">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2">
            Kasus tercatat dalam periode &amp; segmen terpilih
          </div>
        </div>

        {/* Card 2: Warranty Scope (Flip Card) */}
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
                  <ArrowUpDown className="w-2.5 h-2.5" /> Lihat %
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

        {/* Card 3: Non-Warranty Exposure (Flip Card) */}
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
                  <ArrowUpDown className="w-2.5 h-2.5" /> Lihat %
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

        {/* Card 4: Goodwill Concession */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Goodwill Concession
              </div>
              <div className="text-3xl font-mono font-bold text-[#B87A28] tabular-nums tracking-tight">
                {goodwillCount}
              </div>
            </div>
            <div className="p-2 rounded-md bg-[#B87A28]/10 text-[#B87A28] border border-[#B87A28]/20">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            {goodwillPct}% dari total populasi klaim
          </div>
        </div>
      </div>

      {/* ROW 1: DUAL DONUT BREAKDOWN (CLAIMABLE HEALTH VS PRODUCT PORTFOLIO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Claimable vs Unclaimable Breakdown */}
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
                      <th className="py-1.5 px-2 text-center">Kasus</th>
                      <th className="py-1.5 px-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {claimableHealth.tailBreakdown.map((item, idx) => (
                      <tr key={`tail-${idx}`} className="hover:bg-surface-hover transition-colors font-mono">
                        <td className="py-1.5 px-2 font-medium text-ink-primary font-sans truncate max-w-[140px]" title={item.status_name}>
                          {item.status_name}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold text-ink-primary">
                          {item.count}
                        </td>
                        <td className="py-1.5 px-2 text-right text-ink-muted">
                          {item.pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#2E7D52] font-semibold">
              Claimable: {claimableHealth.claimable_count} ({claimableHealth.claimable_pct}%)
            </span>
            <span className="text-accent-brass font-semibold">
              Unclaimable: {claimableHealth.unclaimable_count} ({claimableHealth.unclaimable_pct}%)
            </span>
          </div>
        </div>

        {/* Card 2: Product Portfolio Breakdown */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-accent-brass" />
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
                      <span className="text-lg font-mono font-bold text-accent-brass tabular-nums leading-tight">
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
                          Tidak ada data model unit.
                        </td>
                      </tr>
                    ) : (
                      productPortfolio.topModels.map((item, idx) => (
                        <tr key={`model-${idx}`} className="hover:bg-surface-hover transition-colors font-mono">
                          <td className="py-1.5 px-2 font-medium text-ink-primary font-sans truncate max-w-[120px]" title={item.unit_model_name}>
                            {item.unit_model_name}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-base border border-border text-ink-muted font-semibold">
                              {item.product_code}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center font-bold text-ink-primary">
                            {item.count}
                          </td>
                          <td className="py-1.5 px-2 text-right text-ink-muted">
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

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
            <span className="text-ink-muted">
              Total Lini: <strong className="text-ink-primary">{productPortfolio.productBreakdown.length} Produk</strong>
            </span>
            {productPortfolio.dominant_product && (
              <span className="text-accent-brass font-semibold truncate max-w-[220px]" title={productPortfolio.dominant_product.product_name}>
                Dominan: {productPortfolio.dominant_product.product_code} ({productPortfolio.dominant_product.count} kasus)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: COMPREHENSIVE 8-STATUS AUDIT TABLE */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent-brass" />
              <span>Detail Verifikasi &amp; Audit 8 Status Klaim Resmi (ref_claimable_status)</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Rincian angka eksak dan porsi persentase seluruh status klaim untuk kebutuhan rekonsiliasi dan verifikasi audit.
            </p>
          </div>
          <span className="text-xs font-mono text-ink-muted">
            {claimableHealth.tailBreakdown.length} Status Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-base/60 text-ink-muted text-[10px] uppercase font-mono font-semibold border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Nama Status Klaim</th>
                <th className="py-2.5 px-3 text-center">Klasifikasi Cakupan</th>
                <th className="py-2.5 px-3 text-center">Jumlah Kasus</th>
                <th className="py-2.5 px-3 text-center">Share terhadap Total</th>
                <th className="py-2.5 px-3 text-right">Keterangan Penanganan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {claimableHealth.tailBreakdown.map((item, idx) => {
                const isWarranty = [
                  'Claimable Principal',
                  'Goodwill',
                  'Claimable Vendor (Attachment)',
                  'Claimable Vendor (Genset Maker)',
                  'Progress Checking Unit',
                ].includes(item.status_name);

                return (
                  <tr key={`status-audit-${idx}`} className="hover:bg-surface-hover transition-colors font-mono">
                    <td className="py-2.5 px-3 font-sans font-medium text-ink-primary">
                      {item.status_name}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-sans ${
                        isWarranty
                          ? 'bg-[#2E7D52]/10 text-[#2E7D52] border border-[#2E7D52]/20'
                          : 'bg-[#A3462F]/10 text-[#A3462F] border border-[#A3462F]/20'
                      }`}>
                        {isWarranty ? 'Warranty Scope (Claimable)' : 'Non-Warranty (Unclaimable)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-ink-primary">
                      {item.count}
                    </td>
                    <td className="py-2.5 px-3 text-center text-ink-muted">
                      {item.pct}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans text-ink-muted text-[11px]">
                      {item.status_name === 'Claimable Principal' && 'Klaim garansi standar disetujui principal'}
                      {item.status_name === 'Unclaimable' && 'Kerusakan di luar jaminan / ditolak garansi'}
                      {item.status_name === 'Goodwill' && 'Konsesi komersial khusus disetujui STS'}
                      {item.status_name === 'Claimable GOEM' && 'Klaim OEM komersial di luar principal'}
                      {item.status_name.includes('Vendor') && 'Klaim ditagihkan ke sub-vendor'}
                      {item.status_name.includes('Checking') && 'Proses investigasi / pembuatan WO inspeksi'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
