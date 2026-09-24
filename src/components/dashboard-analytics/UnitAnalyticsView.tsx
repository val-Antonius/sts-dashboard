'use client';

import React, { useState, useMemo } from 'react';
import { PerformanceVolumeData } from '@/lib/queries/performance';
import { PrincipalClaimableData } from '@/types/database';
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
import { ProductClaimableDotPlot } from '@/components/volume-trends/ProductClaimableDotPlot';
import {
  Package,
  Layers,
  PieChart as PieIcon,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Cpu,
} from 'lucide-react';

interface UnitAnalyticsViewProps {
  initialVolumeData: PerformanceVolumeData;
  initialPrincipalData: PrincipalClaimableData;
}

export function UnitAnalyticsView({
  initialVolumeData,
  initialPrincipalData,
}: UnitAnalyticsViewProps) {
  const [volumeData, setVolumeData] = useState<PerformanceVolumeData>(initialVolumeData);
  const [principalData, setPrincipalData] = useState<PrincipalClaimableData>(initialPrincipalData);
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
      let volUrl = `/api/performance/volume?range=${newRange}&segment=${encodeURIComponent(segment)}`;
      let princUrl = `/api/performance/principal-claimable?range=${newRange}&segment=${encodeURIComponent(segment)}`;
      if (newRange === 'custom' && start && end) {
        volUrl += `&start=${start}&end=${end}`;
        princUrl += `&start=${start}&end=${end}`;
      }
      const [resVol, resPrinc] = await Promise.all([fetch(volUrl), fetch(princUrl)]);
      if (resVol.ok && resPrinc.ok) {
        const [volJson, princJson] = await Promise.all([resVol.json(), resPrinc.json()]);
        setVolumeData(volJson);
        setPrincipalData(princJson);
      }
    } catch (err) {
      console.error('Failed to fetch unit analytics data:', err);
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

  const productPortfolio = volumeData.productPortfolio || { productBreakdown: [], topModels: [], dominant_product: null };
  const dotPlotData = principalData.dotPlotData || [];
  const heatmapData = principalData.productBranchHeatmap || { products: [], branches: [], matrix: {}, maxCount: 1 };

  const totalCases = volumeData.kpiStats.total_cases || 0;
  const distinctProductsCount = productPortfolio.productBreakdown.length || 0;

  // Top 3 product concentration %
  const top3ConcentrationPct = useMemo(() => {
    if (totalCases === 0 || productPortfolio.productBreakdown.length === 0) return 0;
    const top3Sum = productPortfolio.productBreakdown.slice(0, 3).reduce((s, p) => s + p.count, 0);
    return Math.round((top3Sum / totalCases) * 1000) / 10;
  }, [productPortfolio.productBreakdown, totalCases]);

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

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <AnalyticsFilterHeader
        title="Unit Portfolio & Risk Profile"
        subtitle="Analisis terpusat sebaran volume lini produk, rasio garansi vs non-garansi, dan sebaran teritorial cabang."
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
        {/* Card 1: Dominant Product */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Lini Produk Dominan
              </div>
              <div className="text-3xl font-mono font-bold text-accent-brass tabular-nums tracking-tight">
                {productPortfolio.dominant_product?.product_code || '-'}
              </div>
            </div>
            <div className="p-2 rounded-md bg-accent-brass/10 text-accent-brass border border-accent-brass/20">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono flex items-center justify-between">
            <span>{productPortfolio.dominant_product?.product_name || 'Tidak ada'}</span>
            <strong className="text-ink-primary">{productPortfolio.dominant_product?.pct || 0}% share</strong>
          </div>
        </div>

        {/* Card 2: Distinct Products Variety */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Ragam Lini Produk Aktif
              </div>
              <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                {distinctProductsCount}
              </div>
            </div>
            <div className="p-2 rounded-md bg-base text-ink-muted border border-border">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2">
            MFT, PER, CNC, KBT, HSC, FGW, JLG
          </div>
        </div>

        {/* Card 3: Top 3 Concentration Ratio */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Top 3 Concentration Ratio
              </div>
              <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                {top3ConcentrationPct}%
              </div>
            </div>
            <div className="p-2 rounded-md bg-accent-brass/10 text-accent-brass border border-accent-brass/20">
              <PieIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            Porsi kasus terpusat pada 3 lini teratas
          </div>
        </div>

        {/* Card 4: Total Volume Kasus */}
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between card-interactive">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Total Kasus Tercatat
              </div>
              <div className="text-3xl font-mono font-bold text-ink-primary tabular-nums tracking-tight">
                {totalCases}
              </div>
            </div>
            <div className="p-2 rounded-md bg-base text-ink-muted border border-border">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-ink-muted mt-2 font-mono">
            {volumeData.kpiStats.warranty_cases} garansi · {volumeData.kpiStats.non_warranty_cases} unclaimable
          </div>
        </div>
      </div>

      {/* ROW 1: PRODUCT PORTFOLIO DONUT & TOP MODELS TABLE */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-accent-brass" />
              <span>Product Portfolio &amp; Equipment Category Breakdown</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Komposisi lini produk utama dan daftar model unit alat berat teratas yang mencatat kasus.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Chart */}
          <div className="md:col-span-5 h-64 relative flex items-center justify-center">
            {productDonutData.length === 0 ? (
              <EmptyState className="h-64" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productDonutData}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {productDonutData.map((entry, index) => (
                        <Cell key={`donut-${index}`} fill={entry.color} />
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
                  <span className="text-xl font-mono font-bold text-accent-brass tabular-nums leading-tight">
                    {productPortfolio.dominant_product?.product_code || '-'}
                  </span>
                  <span className="text-[9px] uppercase font-semibold text-ink-muted tracking-wider">
                    {productPortfolio.dominant_product?.pct || 0}% Top Share
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Top Models Table */}
          <div className="md:col-span-7 overflow-x-auto max-h-64">
            <table className="w-full text-xs text-left">
              <thead className="bg-base/60 text-ink-muted text-[10px] uppercase font-mono font-semibold border-b border-border">
                <tr>
                  <th className="py-2 px-3">Model Unit Asset</th>
                  <th className="py-2 px-3 text-center">Lini Produk</th>
                  <th className="py-2 px-3 text-center">Jumlah Kasus</th>
                  <th className="py-2 px-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {productPortfolio.topModels.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-ink-muted text-xs">
                      Tidak ada data model unit.
                    </td>
                  </tr>
                ) : (
                  productPortfolio.topModels.map((item, idx) => (
                    <tr key={`model-${idx}`} className="hover:bg-surface-hover transition-colors font-mono">
                      <td className="py-2 px-3 font-medium text-ink-primary font-sans truncate max-w-[180px]" title={item.unit_model_name}>
                        {item.unit_model_name}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-base border border-border text-ink-muted font-semibold">
                          {item.product_code}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-ink-primary">
                        {item.count}
                      </td>
                      <td className="py-2 px-3 text-right text-ink-muted">
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

      {/* ROW 2: CLAIMABLE PROFILE (DOT PLOT PARETO) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-brass" />
              <span>Product Claimable Profile (Dot Plot Pareto)</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Rasio Claimable (Garansi) vs Unclaimable (Non-Garansi) per unit produk dengan radius titik terkalibrasi &prop; &radic;n kasus.
            </p>
          </div>
        </div>

        <ProductClaimableDotPlot
          data={dotPlotData}
          selectedProduct={selectedProduct}
          onSelectProduct={setSelectedProduct}
        />
      </div>

      {/* ROW 3: TERRITORIAL HEATMAP (UNIT x BRANCH) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-accent-brass" />
              <span>Unit &times; Branch Territorial Heatmap (Konsentrasi Kasus Cabang)</span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Deteksi apakah masalah pada suatu unit tersebar merata di seluruh cabang atau terpusat di 1–2 cabang tertentu.
            </p>
          </div>
          {selectedProduct && (
            <button
              onClick={() => setSelectedProduct(null)}
              className="text-xs font-mono text-accent-brass hover:underline cursor-pointer"
            >
              Reset Highlight ({selectedProduct})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-base/60 text-ink-muted text-[10px] uppercase font-mono font-semibold border-b border-border">
              <tr>
                <th className="py-2 px-3 sticky left-0 bg-base z-10">Lini Produk</th>
                {heatmapData.branches.map((b: string) => (
                  <th key={b} className="py-2 px-2 text-center min-w-[42px]">{b}</th>
                ))}
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {heatmapData.products.length === 0 ? (
                <tr>
                  <td colSpan={heatmapData.branches.length + 2} className="py-6 text-center text-ink-muted text-xs">
                    Tidak ada data matriks cabang.
                  </td>
                </tr>
              ) : (
                heatmapData.products.map((p: string) => {
                  const isHighlighted = selectedProduct === p;
                  const isMuted = selectedProduct && !isHighlighted;
                  const rowTotal = heatmapData.branches.reduce((sum: number, b: string) => sum + (heatmapData.matrix[p]?.[b] || 0), 0);

                  return (
                    <tr
                      key={p}
                      onClick={() => setSelectedProduct(isHighlighted ? null : p)}
                      className={`hover:bg-surface-hover transition-all cursor-pointer font-mono ${
                        isHighlighted ? 'bg-accent-brass/10 ring-1 ring-accent-brass/40 font-bold' : ''
                      } ${isMuted ? 'opacity-35' : 'opacity-100'}`}
                    >
                      <td className="py-2 px-3 font-bold text-ink-primary font-sans sticky left-0 bg-surface z-10 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-accent-brass" />
                        <span>{p}</span>
                      </td>
                      {heatmapData.branches.map((b: string) => {
                        const count = heatmapData.matrix[p]?.[b] || 0;
                        const intensity = count > 0 ? Math.min(1, count / (heatmapData.maxCount || 1)) : 0;
                        return (
                          <td
                            key={`${p}-${b}`}
                            className="py-2 px-1 text-center font-bold"
                            style={{
                              backgroundColor: count > 0 ? `rgba(163, 70, 47, ${0.15 + intensity * 0.7})` : undefined,
                              color: count > 0 && intensity > 0.4 ? '#FFFFFF' : 'var(--ink-primary)',
                            }}
                          >
                            {count > 0 ? count : '-'}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-bold text-ink-primary">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
