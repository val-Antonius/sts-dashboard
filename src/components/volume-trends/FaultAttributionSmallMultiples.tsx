'use client';

import React from 'react';
import { ProductFaultAttributionPanel, FaultGroupType } from '@/types/database';

interface FaultAttributionSmallMultiplesProps {
  panels: ProductFaultAttributionPanel[];
  selectedProduct?: string | null;
  onSelectProduct?: (productCode: string | null) => void;
}

const GROUP_CONFIG: Record<
  FaultGroupType,
  { barColor: string; badgeClass: string; label: string; shortLabel: string }
> = {
  'Product-side': {
    barColor: '#2E7D52', // Forest Green
    badgeClass: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-[#2E7D52] dark:text-[#41A86F] border-emerald-500/30',
    label: 'Product-side (Material / Workmanship / Local Component)',
    shortLabel: 'Product-side',
  },
  'Customer-side': {
    barColor: '#B87A28', // Warm Ochre
    badgeClass: 'bg-amber-500/10 dark:bg-amber-500/20 text-[#B87A28] dark:text-[#D4953C] border-amber-500/30',
    label: 'Customer-side (Operation / Maintenance / Application)',
    shortLabel: 'Customer-side',
  },
  'Process-side': {
    barColor: '#4B5563', // Slate Steel
    badgeClass: 'bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
    label: 'Process-side (Storage / Inventory)',
    shortLabel: 'Process-side',
  },
  'External': {
    barColor: '#B5302E', // Crimson
    badgeClass: 'bg-rose-500/10 dark:bg-rose-500/20 text-[#B5302E] dark:text-[#E05350] border-rose-500/30',
    label: 'External (Accident / Natural Disaster)',
    shortLabel: 'External',
  },
  'Unrecorded': {
    barColor: '#71717A', // Muted Zinc
    badgeClass: 'bg-base text-ink-muted border-border',
    label: 'Unrecorded',
    shortLabel: 'Unrecorded',
  },
};

export function FaultAttributionSmallMultiples({
  panels,
  selectedProduct,
  onSelectProduct,
}: FaultAttributionSmallMultiplesProps) {
  if (!panels || panels.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-ink-muted">
        Tidak ada data atribusi kesalahan produk pada periode ini.
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* 5-Color Unified Legend (Only once above the grid) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-border/60 text-[11px]">
        <div className="flex flex-wrap items-center gap-4">
          {(Object.keys(GROUP_CONFIG) as FaultGroupType[]).map((groupKey) => {
            const conf = GROUP_CONFIG[groupKey];
            return (
              <div key={groupKey} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: conf.barColor }}
                />
                <span className="text-ink-primary font-medium">{conf.shortLabel}</span>
              </div>
            );
          })}
        </div>

        {selectedProduct && (
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-accent font-semibold">
            <span>Fokus: {selectedProduct}</span>
            <button
              onClick={() => onSelectProduct?.(null)}
              className="px-1.5 py-0.5 rounded bg-base hover:bg-surface-hover border border-border text-ink-primary font-sans font-medium transition-colors cursor-pointer"
            >
              Reset &times;
            </button>
          </div>
        )}
      </div>

      {/* Grid of Product Panels (Dynamic count, Pareto-ordered by volume) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {panels.map((panel) => {
          const isSelected = selectedProduct === panel.product_code;
          const isMuted = selectedProduct && !isSelected;
          const dominantConf = GROUP_CONFIG[panel.dominant_group] || GROUP_CONFIG['Unrecorded'];

          return (
            <div
              key={panel.product_code}
              onClick={() => onSelectProduct?.(isSelected ? null : panel.product_code)}
              className={`flex flex-col p-3 rounded-lg border bg-surface transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-accent ring-1 ring-accent/40 shadow-xs'
                  : 'border-border hover:border-border/90 hover:bg-surface-hover/30'
              } ${isMuted ? 'opacity-35 hover:opacity-75' : 'opacity-100'}`}
            >
              {/* Panel Header: Product Code, Total Volume & Dominant Group Chip */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-ink-primary">
                    {panel.product_code}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted tabular-nums">
                    {panel.total_cases} kasus
                  </span>
                </div>

                {/* Dominant Attribution Group Chip */}
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded border tracking-tight ${dominantConf.badgeClass}`}
                  title={`Kelompok dominan: ${panel.dominant_group} (${panel.dominant_group_pct}%)`}
                >
                  {panel.dominant_group} {panel.dominant_group_pct}%
                </span>
              </div>

              {/* Panel Root Causes: Locally Scaled Bars with Attribution Colors */}
              <div className="flex flex-col space-y-2 pt-2.5 flex-1">
                {panel.items.length === 0 ? (
                  <div className="py-4 text-center text-[11px] text-ink-muted italic">
                    Tidak ada kasus
                  </div>
                ) : (
                  panel.items.map((item) => {
                    const groupConf = GROUP_CONFIG[item.attribution_group] || GROUP_CONFIG['Unrecorded'];
                    const barWidthPct = item.pct_of_product;

                    return (
                      <div key={item.root_cause_name} className="flex flex-col space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className="font-medium text-ink-primary truncate max-w-[190px]"
                            title={`${item.root_cause_name} (${item.attribution_group})`}
                          >
                            {item.root_cause_name}
                          </span>
                          <span className="font-mono text-[10px] text-ink-muted font-bold tabular-nums">
                            {item.count}{' '}
                            <span className="font-normal text-[9px]">({item.pct_of_product}%)</span>
                          </span>
                        </div>

                        {/* Local Scaled Bar with Attribution Group Color */}
                        <div className="w-full h-2 rounded-xs bg-base flex overflow-hidden">
                          <div
                            className="h-full rounded-xs transition-all"
                            style={{
                              width: `${barWidthPct}%`,
                              backgroundColor: groupConf.barColor,
                            }}
                            title={`${item.root_cause_name}: ${item.count} kasus (${item.pct_of_product}%) — ${item.attribution_group}`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
