'use client';

import React, { useMemo } from 'react';
import { BranchOutcomeProfileItem } from '@/types/database';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

interface BranchOutcomeProfileChartProps {
  data: BranchOutcomeProfileItem[];
  selectedProduct?: string | null;
  onResetProduct?: () => void;
}

const OUTCOME_COLORS = {
  Covered: '#2E7D52',
  Goodwill: '#B87A28',
  Unclaimable: '#B5302E',
};

export function BranchOutcomeProfileChart({
  data,
  selectedProduct,
  onResetProduct,
}: BranchOutcomeProfileChartProps) {
  // Posisi dan urutan cabang SELALU tetap stabil (default total cases descending).
  // Tidak ada perubahan urutan maupun filter cabang saat produk dipilih.
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return [...data]
      .sort((a, b) => b.total - a.total)
      .map((b) => {
        const prodData = selectedProduct && b.product_breakdown?.[selectedProduct]
          ? b.product_breakdown[selectedProduct]
          : null;
        const prodCases = prodData?.total || 0;

        return {
          branch_code: b.branch_code,
          total: b.total,
          covered_count: b.covered_count,
          covered_pct: b.covered_pct,
          goodwill_count: b.goodwill_count,
          goodwill_pct: b.goodwill_pct,
          unclaimable_count: b.unclaimable_count,
          unclaimable_pct: b.unclaimable_pct,
          selectedProductCases: prodCases,
          selectedProductData: prodData,
          // Visual highlight flag: jika ada produk aktif, hanya cabang dengan kasus produk tsb yang ber-opacity penuh
          isHighlighted: !selectedProduct || prodCases > 0,
        };
      });
  }, [data, selectedProduct]);

  if (chartData.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-ink-muted">
        Tidak ada data klaim cabang pada rentang waktu ini.
      </div>
    );
  }

  // Tinggi tetap stabil berdasarkan jumlah cabang tetap (~25px per baris)
  const chartHeight = Math.max(280, chartData.length * 25 + 40);

  const customTooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--ink-primary)',
    borderRadius: '6px',
    fontSize: '11px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  return (
    <div className="w-full space-y-2">
      {/* Banner Indikator Highlight (Tanpa Mengubah Struktur Data) */}
      {selectedProduct && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-accent/10 border border-accent/20 text-xs text-accent">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Highlight Produk:</span>
            <span className="px-1.5 py-0.5 rounded bg-accent text-white font-mono font-bold text-[11px]">
              {selectedProduct}
            </span>
            <span className="text-ink-muted text-[11px]">
              (Menyorot cabang penangan {selectedProduct}; cabang tanpa kasus diredupkan)
            </span>
          </div>
          <button
            onClick={onResetProduct}
            className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border text-ink-primary font-medium text-[11px] transition-colors cursor-pointer"
          >
            Hapus Highlight &times;
          </button>
        </div>
      )}

      {/* Horizontal 100% Stacked Bar Chart dengan Posisi Bar Statis & Opacity Highlight */}
      <div style={{ height: `${chartHeight}px` }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 25, left: 0, bottom: 5 }}
            barSize={14}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              type="category"
              dataKey="branch_code"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              width={50}
              tick={({ x, y, payload }) => {
                const branchCode = payload.value;
                const item = chartData.find((b) => b.branch_code === branchCode);
                const isHighlight = item?.isHighlighted;

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={-6}
                      y={4}
                      textAnchor="end"
                      fontSize={11}
                      fontFamily="var(--font-mono)"
                      fontWeight={isHighlight ? 600 : 400}
                      fill={isHighlight ? 'var(--ink-primary)' : 'var(--ink-muted)'}
                      opacity={isHighlight ? 1 : 0.3}
                      className="transition-opacity transition-colors"
                    >
                      {branchCode}
                    </text>
                  </g>
                );
              }}
            />
            <Tooltip
              contentStyle={customTooltipStyle}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0].payload;
                return (
                  <div className="p-2.5 rounded-md bg-surface border border-border shadow-lg text-xs space-y-2 min-w-[220px] font-mono">
                    <div className="flex items-center justify-between font-bold text-ink-primary font-sans border-b border-border/60 pb-1">
                      <span>Cabang {d.branch_code}</span>
                      <span className="text-ink-muted font-mono text-[11px]">{d.total} total kasus</span>
                    </div>

                    {/* Informasi Produk Terhighlight jika ada */}
                    {selectedProduct && d.selectedProductCases > 0 && d.selectedProductData && (
                      <div className="p-1.5 rounded bg-accent/5 border border-accent/20 text-[11px] font-sans space-y-1">
                        <div className="font-semibold text-accent flex justify-between">
                          <span>Kontribusi {selectedProduct}:</span>
                          <span className="font-mono">{d.selectedProductCases} kasus ({Math.round((d.selectedProductCases / d.total) * 100)}%)</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[10px] font-mono">
                          <span className="text-[#2E7D52]">Cov: {d.selectedProductData.covered}</span>
                          <span className="text-[#B87A28]">GW: {d.selectedProductData.goodwill}</span>
                          <span className="text-[#B5302E]">Uncl: {d.selectedProductData.unclaimable}</span>
                        </div>
                      </div>
                    )}

                    {selectedProduct && d.selectedProductCases === 0 && (
                      <div className="text-[11px] text-ink-muted font-sans italic">
                        Tidak ada kasus {selectedProduct} di cabang ini.
                      </div>
                    )}

                    {/* Profil Hasil Klaim Keseluruhan Cabang */}
                    <div className="text-[11px] space-y-1 pt-0.5">
                      <div className="text-[10px] font-sans font-semibold text-ink-muted uppercase tracking-wider">
                        Profil Keseluruhan Cabang:
                      </div>
                      <div className="flex items-center justify-between text-[#2E7D52]">
                        <span className="flex items-center gap-1.5 font-sans">
                          <span className="w-2 h-2 rounded-xs bg-[#2E7D52]" />
                          Covered:
                        </span>
                        <span className="tabular-nums font-semibold">
                          {d.covered_count} ({d.covered_pct}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#B87A28]">
                        <span className="flex items-center gap-1.5 font-sans">
                          <span className="w-2 h-2 rounded-xs bg-[#B87A28]" />
                          Goodwill:
                        </span>
                        <span className="tabular-nums font-semibold">
                          {d.goodwill_count} ({d.goodwill_pct}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#B5302E]">
                        <span className="flex items-center gap-1.5 font-sans">
                          <span className="w-2 h-2 rounded-xs bg-[#B5302E]" />
                          Unclaimable:
                        </span>
                        <span className="tabular-nums font-semibold">
                          {d.unclaimable_count} ({d.unclaimable_pct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, paddingBottom: 6 }}
            />
            <Bar
              dataKey="covered_pct"
              name="Covered %"
              stackId="outcome"
              fill={OUTCOME_COLORS.Covered}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-cov-${index}`}
                  fill={OUTCOME_COLORS.Covered}
                  opacity={entry.isHighlighted ? 1 : 0.2}
                />
              ))}
            </Bar>
            <Bar
              dataKey="goodwill_pct"
              name="Goodwill %"
              stackId="outcome"
              fill={OUTCOME_COLORS.Goodwill}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-gw-${index}`}
                  fill={OUTCOME_COLORS.Goodwill}
                  opacity={entry.isHighlighted ? 1 : 0.2}
                />
              ))}
            </Bar>
            <Bar
              dataKey="unclaimable_pct"
              name="Unclaimable %"
              stackId="outcome"
              fill={OUTCOME_COLORS.Unclaimable}
              radius={[0, 2, 2, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-uncl-${index}`}
                  fill={OUTCOME_COLORS.Unclaimable}
                  opacity={entry.isHighlighted ? 1 : 0.2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
