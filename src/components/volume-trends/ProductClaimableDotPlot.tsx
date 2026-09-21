'use client';

import React, { useState } from 'react';
import { ProductClaimableDotPlotItem } from '@/types/database';

interface ProductClaimableDotPlotProps {
  data: ProductClaimableDotPlotItem[];
  selectedProduct?: string | null;
  onSelectProduct?: (productCode: string | null) => void;
}

export function ProductClaimableDotPlot({
  data,
  selectedProduct,
  onSelectProduct,
}: ProductClaimableDotPlotProps) {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-ink-muted">
        Tidak ada data rasio klaim produk pada periode ini.
      </div>
    );
  }

  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="w-full space-y-2">
      {/* Top Legend & Active Filter Bar (Ultra Compact) */}
      <div className="flex items-center justify-between text-[11px] pb-2 border-b border-border/60">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D52] inline-block" />
            <span className="text-ink-primary font-medium">Claimable %</span>
            <span className="text-ink-muted text-[10px]">(Warranty/Vendor)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B5302E] inline-block" />
            <span className="text-ink-primary font-medium">Unclaimable %</span>
            <span className="text-ink-muted text-[10px]">(Non-Warranty/GOEM)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-ink-muted">
          <span>Radius &prop; &radic;n kasus</span>
          {selectedProduct && (
            <button
              onClick={() => onSelectProduct?.(null)}
              className="px-1.5 py-0.5 rounded bg-base hover:bg-surface-hover border border-border text-ink-primary font-sans font-medium transition-colors cursor-pointer"
            >
              Reset ({selectedProduct}) &times;
            </button>
          )}
        </div>
      </div>

      {/* Axis Scale Header */}
      <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-center gap-3 pt-0.5">
        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider font-mono">
          Produk (Pareto)
        </div>
        <div className="relative w-full h-3">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute top-0 transform -translate-x-1/2 text-[9px] font-mono text-ink-muted tabular-nums"
              style={{ left: `${tick}%` }}
            >
              {tick}%
            </div>
          ))}
        </div>
      </div>

      {/* Compact Dot Plot Rows */}
      <div className="divide-y divide-border/40">
        {data.map((item) => {
          const isSelected = selectedProduct === item.product_code;
          const isHovered = hoveredProduct === item.product_code;
          const isMuted = selectedProduct && !isSelected;

          // Scale dot radius between 3.5px and 8.5px for vertical compactness
          const r = Math.max(3.5, Math.min(8.5, Math.sqrt(item.total_cases) * 1.0 + 2.5));

          return (
            <div
              key={item.product_code}
              onClick={() => onSelectProduct?.(isSelected ? null : item.product_code)}
              onMouseEnter={() => setHoveredProduct(item.product_code)}
              onMouseLeave={() => setHoveredProduct(null)}
              className={`grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-center gap-3 py-1.5 px-1.5 rounded transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-accent/10 ring-1 ring-accent/40 font-semibold'
                  : isHovered
                  ? 'bg-surface-hover'
                  : ''
              } ${isMuted ? 'opacity-35 hover:opacity-75' : 'opacity-100'}`}
            >
              {/* Product Label & Count */}
              <div className="flex items-baseline justify-between pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-ink-primary">
                    {item.product_code}
                  </span>
                  {isSelected && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-accent text-white font-mono">
                      Active
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-ink-muted tabular-nums">
                  {item.total_cases} <span className="text-[9px]">({item.volume_share_pct}%)</span>
                </span>
              </div>

              {/* Horizontal Dot Track (0 - 100%) */}
              <div className="relative w-full h-5 flex items-center">
                {/* Background Baseline */}
                <div className="absolute left-0 right-0 h-[1px] bg-border" />

                {/* Vertical Grid Marks */}
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    className="absolute top-1 bottom-1 w-[1px] bg-border/50 pointer-events-none"
                    style={{ left: `${tick}%` }}
                  />
                ))}

                {/* Dumbbell Link */}
                <div
                  className="absolute h-[2px] bg-border-inverted/20 dark:bg-border/60 rounded"
                  style={{
                    left: `${Math.min(item.claimable_pct, item.unclaimable_pct)}%`,
                    width: `${Math.abs(item.claimable_pct - item.unclaimable_pct)}%`,
                  }}
                />

                {/* Unclaimable Dot (Red) */}
                <div
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{
                    left: `${item.unclaimable_pct}%`,
                    top: '50%',
                  }}
                  title={`${item.product_code} Unclaimable: ${item.unclaimable_cases} kasus (${item.unclaimable_pct}%)`}
                >
                  <div
                    className="rounded-full bg-[#B5302E] border border-surface shadow-xs transition-transform hover:scale-125"
                    style={{
                      width: `${r * 2}px`,
                      height: `${r * 2}px`,
                    }}
                  />
                  {(isHovered || isSelected) && (
                    <span className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 text-[9px] font-mono font-bold text-[#B5302E] tabular-nums whitespace-nowrap bg-surface/90 px-0.5 rounded">
                      {item.unclaimable_pct}%
                    </span>
                  )}
                </div>

                {/* Claimable Dot (Green) */}
                <div
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                  style={{
                    left: `${item.claimable_pct}%`,
                    top: '50%',
                  }}
                  title={`${item.product_code} Claimable: ${item.claimable_cases} kasus (${item.claimable_pct}%)`}
                >
                  <div
                    className="rounded-full bg-[#2E7D52] border border-surface shadow-xs transition-transform hover:scale-125"
                    style={{
                      width: `${r * 2}px`,
                      height: `${r * 2}px`,
                    }}
                  />
                  {(isHovered || isSelected) && (
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] font-mono font-bold text-[#2E7D52] tabular-nums whitespace-nowrap bg-surface/90 px-0.5 rounded">
                      {item.claimable_pct}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
