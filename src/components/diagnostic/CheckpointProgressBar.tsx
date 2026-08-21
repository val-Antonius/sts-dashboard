'use client';

import React, { useState } from 'react';
import { CheckpointDuration } from '@/types/database';
import { CheckCircle2, Clock } from 'lucide-react';

interface CheckpointProgressBarProps {
  checkpoints: CheckpointDuration[];
  totalDays: number;
}

const CHECKPOINT_LABELS: Record<string, string> = {
  COMPLAINT_DATE: 'Complaint Received',
  WO_CHECKING_CREATED: 'WO Checking Created',
  WO_CHECKING_CLOSED: 'WO Checking Closed',
  PS_APPROVAL: 'PS Approval',
  WO_REPAIR_RELEASED: 'WO Repair Released',
  PART_GI: 'Part GI (Goods Issue)',
  UNIT_RFU: 'Unit RFU (Ready for Use)',
  WO_REPAIR_CLOSED: 'WO Repair Closed',
  WO_CLOSED: 'WO Closed',
  CLOSING_BY_RFU: 'Closed by RFU',
};

const STAGE_COLORS = [
  'bg-[#A6763C]',
  'bg-[#8B897F]',
  'bg-[#3B7A57]',
  'bg-[#B8863B]',
  'bg-[#5C7080]',
  'bg-[#738A9C]',
  'bg-[#489369]',
  'bg-[#8F5B34]',
];

export function CheckpointProgressBar({
  checkpoints,
  totalDays,
}: CheckpointProgressBarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!checkpoints || checkpoints.length === 0) {
    return (
      <div className="p-6 bg-surface border border-border rounded-lg text-center text-xs text-ink-muted">
        No recorded checkpoint timeline for this case
      </div>
    );
  }

  // Calculate sum of days for proportions (avoid divide by zero)
  const nonNullDurations = checkpoints.map((c) => Math.max(c.days_since_prev_checkpoint || 0, 0));
  const sumDays = nonNullDurations.reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="bg-surface border border-border rounded-lg p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Checkpoint Progress Timeline
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Interactive duration breakdown across process checkpoints
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-primary bg-base px-2.5 py-1 rounded border border-border tabular-nums">
          <Clock className="w-3.5 h-3.5 text-accent-brass" />
          <span>Total Lead Time: <strong>{totalDays} days</strong></span>
        </div>
      </div>

      {/* Interactive Stacked Progress Bar */}
      <div className="space-y-2">
        <div className="h-9 w-full bg-base rounded-md flex overflow-hidden border border-border p-0.5 gap-0.5">
          {checkpoints.map((cp, idx) => {
            const days = cp.days_since_prev_checkpoint || 0;
            // Minimum flex basis ensures 0-day checkpoints are still clearly visible & hoverable
            const flexBasisPct = Math.max((days / sumDays) * 100, 8);
            const colorClass = STAGE_COLORS[idx % STAGE_COLORS.length];
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={cp.checkpoint_code + idx}
                style={{ flex: `${flexBasisPct} 0 0` }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`relative h-full ${colorClass} rounded-sm cursor-pointer transition-all duration-150 flex items-center justify-center text-[10px] font-semibold text-white truncate px-1 select-none ${
                  isHovered ? 'ring-2 ring-ink-primary scale-y-105 z-10 brightness-110' : 'opacity-90 hover:opacity-100'
                }`}
              >
                <span className="truncate">{days}d</span>

                {/* Hover Popover Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ink-primary text-base text-xs rounded-md py-2 px-3 shadow-xl z-20 whitespace-nowrap pointer-events-none min-w-[180px]">
                    <div className="font-semibold text-white">
                      {CHECKPOINT_LABELS[cp.checkpoint_code] || cp.checkpoint_code}
                    </div>
                    <div className="text-[11px] text-gray-300 mt-0.5 flex items-center justify-between gap-4">
                      <span>Date: <span className="font-mono text-white">{cp.checkpoint_date}</span></span>
                      <span>Duration: <strong className="text-white font-mono">{days} days</strong></span>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend / Stage Flow */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60">
          {checkpoints.map((cp, idx) => {
            const isHovered = hoveredIndex === idx;
            const colorClass = STAGE_COLORS[idx % STAGE_COLORS.length];

            return (
              <div
                key={`legend-${cp.checkpoint_code}-${idx}`}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-2 rounded border transition-colors cursor-pointer text-xs ${
                  isHovered
                    ? 'bg-surface-hover border-accent-brass'
                    : 'bg-base/40 border-border/50 hover:bg-base'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${colorClass}`} />
                  <span className="font-medium text-ink-primary text-[11px] truncate">
                    {CHECKPOINT_LABELS[cp.checkpoint_code] || cp.checkpoint_code}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-ink-muted tabular-nums">
                  <span className="font-mono">{cp.checkpoint_date}</span>
                  <span className="font-semibold text-ink-primary">
                    {cp.days_since_prev_checkpoint !== null ? `+${cp.days_since_prev_checkpoint}d` : 'Start'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
