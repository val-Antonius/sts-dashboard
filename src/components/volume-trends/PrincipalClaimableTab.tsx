'use client';

import React, { useState } from 'react';
import { PrincipalClaimableData } from '@/types/database';
import { TimeRangeFilter, TimeRangeOption } from '@/components/common/TimeRangeFilter';
import { EmptyState } from '@/components/common/EmptyState';
import {
  BarChart3,
  Layers,
  Building2,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { ProductClaimableDotPlot } from './ProductClaimableDotPlot';
import { FaultAttributionSmallMultiples } from './FaultAttributionSmallMultiples';
import { BranchOutcomeProfileChart } from './BranchOutcomeProfileChart';

import { getHeatmapColor } from '@/lib/chartColors';

interface PrincipalClaimableTabProps {
  initialData: PrincipalClaimableData;
}

export function PrincipalClaimableTab({ initialData }: PrincipalClaimableTabProps) {
  const [range, setRange] = useState<TimeRangeOption>('last_1_year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<PrincipalClaimableData>(initialData);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const fetchData = async (
    selectedRange: TimeRangeOption,
    start?: string,
    end?: string
  ) => {
    setLoading(true);
    try {
      let url = `/api/performance/principal-claimable?range=${selectedRange}`;
      if (selectedRange === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch principal and claimable analytics:', err);
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
    fetchData(newRange, start, end);
  };

  return (
    <div className="space-y-5">
      {/* Global Time Filter Bar (Identical to Overview tab) */}
      <div className="bg-surface border border-border rounded-lg p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
            Principal &amp; Claim Status Analytics
          </h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Analisis multi-dimensi klaim: rasio garansi produk (Pareto), atribusi kesalahan, sebaran wilayah, dan profil cabang
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-muted" />}
          <TimeRangeFilter
            selectedRange={range}
            onChange={handleRangeChange}
            customStart={customStart}
            customEnd={customEnd}
          />
        </div>
      </div>

      {/* CHART 1: Total Case vs Product Code by Claimable Status (Horizontal Dot Plot 0-100%, Pareto Order) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-ink-muted" />
                <span>1. Product Code Claimable Ratio (Pareto Ordered Dot Plot)</span>
              </h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Rasio Claimable vs Unclaimable diurutkan menurun berdasarkan volume kasus Pareto. Ukuran titik proporsional terhadap &radic;n kasus.
              </p>
            </div>
          </div>

          {data.dotPlotData && data.dotPlotData.length > 0 ? (
            <ProductClaimableDotPlot
              data={data.dotPlotData}
              selectedProduct={selectedProduct}
              onSelectProduct={setSelectedProduct}
            />
          ) : (
            <EmptyState className="h-48" />
          )}
        </div>
      </div>

      {/* CHART 2: Fault Attribution — Root Cause × Claim Outcome (Small Multiples) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-ink-muted" />
                <span>2. Fault Attribution — Root Cause by Product Code</span>
              </h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Panel per lini produk (Pareto ordered) merinci distribusi akar masalah lokal dengan warna kelompok atribusi dan chip atribusi dominan.
              </p>
            </div>
          </div>

          {data.productFaultPanels && data.productFaultPanels.length > 0 ? (
            <FaultAttributionSmallMultiples
              panels={data.productFaultPanels}
              selectedProduct={selectedProduct}
              onSelectProduct={setSelectedProduct}
            />
          ) : (
            <EmptyState className="h-48" />
          )}
        </div>
      </div>

      {/* CHART 3: Total Case vs Product Code by Branch (Heatmap Matrix) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-ink-muted" />
                <span>3. Total Case vs Product Code by Branch (Heatmap Matrix)</span>
              </h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Matriks teritorial densitas kasus Product Code &times; Cabang.
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-ink-muted font-mono">
              <span>0</span>
              <span className="w-3 h-3 rounded bg-base/50 border border-border" />
              <span className="w-3 h-3 rounded" style={{ backgroundColor: getHeatmapColor(0.2) }} />
              <span className="w-3 h-3 rounded" style={{ backgroundColor: getHeatmapColor(0.5) }} />
              <span className="w-3 h-3 rounded" style={{ backgroundColor: getHeatmapColor(0.75) }} />
              <span className="w-3 h-3 rounded" style={{ backgroundColor: getHeatmapColor(1.0) }} />
              <span>Puncak</span>
            </div>
          </div>

          {data.productBranchHeatmap?.products?.length > 0 &&
          data.productBranchHeatmap?.branches?.length > 0 ? (
            <div className="overflow-x-auto border border-border rounded-lg bg-surface">
              <table className="w-full text-center text-xs border-collapse tabular-nums font-mono">
                <thead>
                  <tr className="border-b border-border bg-base/60 text-ink-muted font-medium font-sans">
                    <th className="py-2 px-3 text-left font-semibold sticky left-0 bg-base/90 z-10">
                      Product Code
                    </th>
                    {data.productBranchHeatmap.branches.map((b) => (
                      <th key={b} className="py-2 px-1.5 font-mono text-[11px]">
                        {b}
                      </th>
                    ))}
                    <th className="py-2 px-3 font-semibold text-ink-primary bg-base/80">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.productBranchHeatmap.products.map((p) => {
                    let rowTotal = 0;
                    const isSelected = selectedProduct === p;
                    const isMuted = selectedProduct && !isSelected;

                    return (
                      <tr
                        key={p}
                        onClick={() => setSelectedProduct(isSelected ? null : p)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-base border border-border-strong font-semibold shadow-xs'
                            : 'hover:bg-surface-hover'
                        } ${isMuted ? 'opacity-35 hover:opacity-75' : 'opacity-100'}`}
                      >
                        <td className="py-1.5 px-3 text-left font-bold text-ink-primary font-mono text-xs sticky left-0 bg-surface z-10 border-r border-border">
                          <div className="flex items-center gap-1.5">
                            <span>{p}</span>
                            {isSelected && (
                              <span className="text-[9px] px-1 rounded bg-surface-inverted text-ink-inverted font-mono font-bold">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        {data.productBranchHeatmap.branches.map((b) => {
                          const count = data.productBranchHeatmap.matrix[p]?.[b] || 0;
                          rowTotal += count;
                          const ratio = data.productBranchHeatmap.maxCount > 0 ? count / data.productBranchHeatmap.maxCount : 0;
                          const cellBg = count > 0 ? getHeatmapColor(ratio) : undefined;

                          return (
                            <td
                              key={`${p}-${b}`}
                              title={`Product: ${p} | Branch: ${b} | Cases: ${count}`}
                              className="p-0.5"
                            >
                              <div
                                style={cellBg ? { backgroundColor: cellBg, color: ratio > 0.6 ? '#ffffff' : 'inherit' } : undefined}
                                className={`w-full py-1 rounded text-[11px] transition-transform hover:scale-105 cursor-default ${
                                  count === 0 ? 'bg-base/30 text-ink-muted/30 border border-transparent' : 'font-medium'
                                }`}
                              >
                                {count > 0 ? count : '—'}
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-3 font-bold text-ink-primary bg-base/40 text-xs border-l border-border">
                          {rowTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState className="h-44" />
          )}
        </div>
      </div>

      {/* CHART 4: Branch Claim Outcome Profile (Horizontal 100% Stacked Bar) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-ink-muted" />
                <span>4. Branch Claim Outcome Profile (100% Stacked Bar)</span>
              </h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Profil distribusi hasil klaim per cabang (Covered Warranty, Goodwill Concession, Unclaimable/Non-Warranty).
              </p>
            </div>
          </div>

          {data.branchOutcomeProfile && data.branchOutcomeProfile.length > 0 ? (
            <BranchOutcomeProfileChart
              data={data.branchOutcomeProfile}
              selectedProduct={selectedProduct}
              onResetProduct={() => setSelectedProduct(null)}
            />
          ) : (
            <EmptyState className="h-64" />
          )}
        </div>
      </div>
    </div>
  );
}
