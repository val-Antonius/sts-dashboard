'use client';

import React, { useMemo } from 'react';
import { BranchOutcomeProfileItem } from '@/types/database';
import { CLAIM_COLORS } from '@/lib/chartColors';
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
  Covered: CLAIM_COLORS.covered,
  Goodwill: CLAIM_COLORS.goodwill,
  Unclaimable: CLAIM_COLORS.unclaimable,
};

export function BranchOutcomeProfileChart({
  data,
  selectedProduct,
  onResetProduct,
}: BranchOutcomeProfileChartProps) {
  // Posisi dan urutan cabang SELALU tetap stabil (default total cases descending).
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

  return (
    <div className="w-full space-y-2">
      {/* Top Legend & Active Focus Status Header */}
      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs inline-block shrink-0"
              style={{ backgroundColor: OUTCOME_COLORS.Covered }}
            />
            <span className="text-ink-primary font-medium">Covered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs inline-block shrink-0"
              style={{ backgroundColor: OUTCOME_COLORS.Goodwill }}
            />
            <span className="text-ink-primary font-medium">Goodwill</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs inline-block shrink-0"
              style={{ backgroundColor: OUTCOME_COLORS.Unclaimable }}
            />
            <span className="text-ink-primary font-medium">Unclaimable</span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-ink-muted">
          <span>Total {data.length} Cabang</span>
          {selectedProduct && (
            <button
              type="button"
              onClick={onResetProduct}
              className="px-1.5 py-0.5 rounded bg-base hover:bg-surface-hover border border-border text-ink-primary font-sans font-medium transition-colors cursor-pointer"
            >
              Reset ({selectedProduct}) &times;
            </button>
          )}
        </div>
      </div>

      {/* 100% Horizontal Stacked Bar Chart */}
      <div className="w-full" style={{ height: `${Math.max(260, chartData.length * 24 + 40)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            barCategoryGap={3}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              type="category"
              dataKey="branch_code"
              interval={0}
              tick={(props: any) => {
                const { x, y, payload } = props;
                const item = chartData.find((d) => d.branch_code === payload.value);
                const isItemHighlighted = item?.isHighlighted ?? true;
                const hasProduct = selectedProduct && item && item.selectedProductCases > 0;

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={-6}
                      y={3}
                      textAnchor="end"
                      fontSize={10}
                      fontWeight={hasProduct ? 700 : 500}
                      fill={isItemHighlighted ? 'var(--ink-primary)' : 'var(--ink-muted)'}
                      opacity={isItemHighlighted ? 1 : 0.35}
                      className="font-mono"
                    >
                      {payload.value}
                    </text>
                    {hasProduct && (
                      <circle cx={-2} cy={0} r={2} fill="var(--accent)" />
                    )}
                  </g>
                );
              }}
              width={42}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;

                return (
                  <div className="p-3 bg-surface border border-border rounded-lg shadow-xl text-xs space-y-2 font-mono min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-sans">
                      <span className="font-bold text-sm text-ink-primary">{d.branch_code}</span>
                      <span className="text-[11px] text-ink-muted">Total: {d.total} kasus</span>
                    </div>

                    {/* Breakdown Produk Terpilih */}
                    {selectedProduct && d.selectedProductCases > 0 && d.selectedProductData && (
                      <div className="p-2 rounded bg-base/80 border border-border space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-sans font-bold text-ink-primary">
                          <span>Kontribusi {selectedProduct}:</span>
                          <span className="font-mono">
                            {d.selectedProductCases} kasus ({Math.round((d.selectedProductCases / d.total) * 100)}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[10px] font-mono">
                          <span style={{ color: OUTCOME_COLORS.Covered }}>
                            Cov: {d.selectedProductData.covered}
                          </span>
                          <span style={{ color: OUTCOME_COLORS.Goodwill }}>
                            GW: {d.selectedProductData.goodwill}
                          </span>
                          <span style={{ color: OUTCOME_COLORS.Unclaimable }}>
                            Uncl: {d.selectedProductData.unclaimable}
                          </span>
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
                      <div className="flex items-center justify-between" style={{ color: OUTCOME_COLORS.Covered }}>
                        <span className="flex items-center gap-1.5 font-sans">
                          <span
                            className="w-2 h-2 rounded-xs"
                            style={{ backgroundColor: OUTCOME_COLORS.Covered }}
                          />
                          Covered:
                        </span>
                        <span className="tabular-nums font-semibold">
                          {d.covered_count} ({d.covered_pct}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between" style={{ color: OUTCOME_COLORS.Goodwill }}>
                        <span className="flex items-center gap-1.5 font-sans">
                          <span
                            className="w-2 h-2 rounded-xs"
                            style={{ backgroundColor: OUTCOME_COLORS.Goodwill }}
                          />
                          Goodwill:
                        </span>
                        <span className="tabular-nums font-semibold">
                          {d.goodwill_count} ({d.goodwill_pct}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between" style={{ color: OUTCOME_COLORS.Unclaimable }}>
                        <span className="flex items-center gap-1.5 font-sans">
                          <span
                            className="w-2 h-2 rounded-xs"
                            style={{ backgroundColor: OUTCOME_COLORS.Unclaimable }}
                          />
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
