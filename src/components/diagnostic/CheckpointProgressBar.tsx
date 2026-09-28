'use client';

import React, { useState, useMemo } from 'react';
import { CheckpointDuration } from '@/types/database';
import { formatDisplayDate } from '@/lib/dateUtils';
import { CheckCircle2, AlertTriangle, Layers, ArrowRight, Edit3 } from 'lucide-react';

export interface PhaseClickInfo {
  phaseId: number;
  phaseName: string;
  startCheckpoint: string;
  endCheckpoint: string;
  startDate: string;
  endDate: string;
}

interface CheckpointProgressBarProps {
  checkpoints: CheckpointDuration[];
  totalDays?: number;
  onEditClick?: () => void;
  selectedPhaseId?: number | null;
  onPhaseClick?: (phase: PhaseClickInfo) => void;
}

interface PhaseDefinition {
  id: number;
  name: string;
  shortName: string;
  startCheckpoint: string;
  endCheckpoint: string;
}

const OFFICIAL_PHASES: PhaseDefinition[] = [
  {
    id: 1,
    name: 'Complaint Customer',
    shortName: '1. Complaint Customer',
    startCheckpoint: 'COMPLAINT_DATE',
    endCheckpoint: 'WO_CHECKING_CREATED',
  },
  {
    id: 2,
    name: 'Warranty Checking',
    shortName: '2. Warranty Checking',
    startCheckpoint: 'WO_CHECKING_CREATED',
    endCheckpoint: 'WO_CHECKING_CLOSED',
  },
  {
    id: 3,
    name: 'PS Approval',
    shortName: '3. PS Approval',
    startCheckpoint: 'WO_CHECKING_CLOSED',
    endCheckpoint: 'PS_APPROVAL',
  },
  {
    id: 4,
    name: 'WO Repair Preparation',
    shortName: '4. WO Repair Preparation',
    startCheckpoint: 'PS_APPROVAL',
    endCheckpoint: 'WO_REPAIR_RELEASED',
  },
  {
    id: 5,
    name: 'Part Supply',
    shortName: '5. Part Supply',
    startCheckpoint: 'WO_REPAIR_RELEASED',
    endCheckpoint: 'PART_GI',
  },
  {
    id: 6,
    name: 'Warranty Repair',
    shortName: '6. Warranty Repair',
    startCheckpoint: 'PART_GI',
    endCheckpoint: 'UNIT_RFU',
  },
  {
    id: 7,
    name: 'Repair Closing',
    shortName: '7. Repair Closing',
    startCheckpoint: 'UNIT_RFU',
    endCheckpoint: 'WO_REPAIR_CLOSED',
  },
];

interface CheckpointDefinition {
  order: number;
  code: string;
  label: string;
  desc: string;
}

const OFFICIAL_CHECKPOINTS: CheckpointDefinition[] = [
  { order: 1, code: 'COMPLAINT_DATE', label: 'Complaint Received', desc: 'Customer complaint logged' },
  { order: 2, code: 'WO_CHECKING_CREATED', label: 'WO Checking Created', desc: 'Inspection WO opened' },
  { order: 3, code: 'WO_CHECKING_CLOSED', label: 'WO Checking Closed', desc: 'Inspection completed' },
  { order: 4, code: 'PS_APPROVAL', label: 'PS Approval', desc: 'Technical recommendation' },
  { order: 5, code: 'WO_REPAIR_RELEASED', label: 'WO Repair Released', desc: 'Repair WO released' },
  { order: 6, code: 'PART_GI', label: 'Parts Goods Issued', desc: 'Parts issued to technician' },
  { order: 7, code: 'UNIT_RFU', label: 'Unit Ready for Use', desc: 'Unit restored & operational' },
  { order: 8, code: 'WO_REPAIR_CLOSED', label: 'WO Repair Closed', desc: 'Paperwork & admin closed' },
];

export function CheckpointProgressBar({
  checkpoints,
  onEditClick,
  selectedPhaseId,
  onPhaseClick,
}: CheckpointProgressBarProps) {
  const [hoveredPhaseId, setHoveredPhaseId] = useState<number | null>(null);
  const [hoveredCheckpointCode, setHoveredCheckpointCode] = useState<string | null>(null);

  // Map recorded checkpoint dates
  const cpMap = useMemo(() => {
    const map: Record<string, { date: string; days_since_prev?: number | null }> = {};
    if (checkpoints && Array.isArray(checkpoints)) {
      checkpoints.forEach((cp) => {
        if (cp.checkpoint_code && cp.checkpoint_date) {
          map[cp.checkpoint_code] = {
            date: cp.checkpoint_date,
            days_since_prev: cp.days_since_prev_checkpoint,
          };
        }
      });
    }
    return map;
  }, [checkpoints]);

  // Compute 7 Phase details
  const phaseData = useMemo(() => {
    return OFFICIAL_PHASES.map((phase) => {
      const startInfo = cpMap[phase.startCheckpoint];
      const endInfo = cpMap[phase.endCheckpoint];

      const hasStart = Boolean(startInfo?.date);
      const hasEnd = Boolean(endInfo?.date);
      const isCompleted = hasStart && hasEnd;

      let days: number | null = null;
      if (isCompleted) {
        if (endInfo.days_since_prev !== undefined && endInfo.days_since_prev !== null) {
          days = endInfo.days_since_prev;
        } else {
          const d1 = new Date(startInfo.date).getTime();
          const d2 = new Date(endInfo.date).getTime();
          days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        }
      }

      const isNegative = days !== null && days < 0;

      return {
        ...phase,
        startDate: startInfo?.date || null,
        endDate: endInfo?.date || null,
        isCompleted,
        hasStart,
        hasEnd,
        days,
        isNegative,
      };
    });
  }, [cpMap]);

  // Active hover phase info
  const activeHoveredPhase = useMemo(() => {
    if (hoveredPhaseId === null) return null;
    return phaseData.find((p) => p.id === hoveredPhaseId) || null;
  }, [hoveredPhaseId, phaseData]);

  // Determine sum of positive days for bar width distribution
  const sumPositiveDays = useMemo(() => {
    const total = phaseData.reduce((acc, p) => {
      if (p.isCompleted && p.days !== null && p.days > 0) {
        return acc + p.days;
      }
      return acc;
    }, 0);
    return total || 1;
  }, [phaseData]);

  const hasAnyNegative = useMemo(() => {
    return phaseData.some((p) => p.isNegative);
  }, [phaseData]);

  return (
    <div className="bg-surface border border-border rounded-lg p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
            Process Phase & Checkpoint Timeline
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {hasAnyNegative && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-status-warn bg-status-warn/10 border border-status-warn/30 px-2.5 py-1 rounded">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Anomali Urutan Tanggal Terdeteksi</span>
            </div>
          )}
          {onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-inverted hover:opacity-90 text-ink-inverted text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Edit rincian data kasus ini"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Case Details</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 1: 7 PROCESS PHASES (STACKED BARS ENCODING STATE)                     */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-ink-muted flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-ink-muted" />
            <span>Process Phases</span>
          </span>
        </div>

        <div className="h-10 w-full bg-base rounded-md flex overflow-hidden border border-border p-1 gap-1 relative">
          {phaseData.map((p) => {
            const isHovered =
              hoveredPhaseId === p.id ||
              hoveredCheckpointCode === p.startCheckpoint ||
              hoveredCheckpointCode === p.endCheckpoint;
            const isSelected = selectedPhaseId === p.id;

            // Proportional flex calculation
            let flexBasis = 1;
            if (p.isCompleted && p.days !== null && p.days > 0) {
              flexBasis = Math.max((p.days / sumPositiveDays) * 100, 10);
            } else {
              flexBasis = 8;
            }

            // State-driven bar classes per Rule 8
            let stateClass = 'bg-base border border-dashed border-border text-ink-muted';
            if (p.isNegative) {
              stateClass = 'border border-dashed border-status-warn bg-status-warn/15 text-status-warn';
            } else if (p.isCompleted) {
              stateClass = 'bg-ink-primary text-surface font-semibold shadow-xs';
            } else if (p.hasStart) {
              stateClass = 'bg-surface-inverted text-ink-inverted font-bold shadow-xs pulse-dot';
            }

            return (
              <div
                key={`phase-bar-${p.id}`}
                style={{ flex: `${flexBasis} 0 0` }}
                onMouseEnter={() => setHoveredPhaseId(p.id)}
                onMouseLeave={() => setHoveredPhaseId(null)}
                onClick={() => {
                  if (p.startDate && p.endDate && onPhaseClick) {
                    onPhaseClick({
                      phaseId: p.id,
                      phaseName: p.name,
                      startCheckpoint: p.startCheckpoint,
                      endCheckpoint: p.endCheckpoint,
                      startDate: p.startDate,
                      endDate: p.endDate,
                    });
                  }
                }}
                className={`relative h-full rounded-sm cursor-pointer transition-all duration-150 flex items-center justify-center text-[10px] font-bold px-1.5 select-none ${stateClass} ${
                  isSelected
                    ? 'ring-2 ring-ink-primary scale-y-110 z-30 shadow-lg'
                    : isHovered
                    ? 'ring-2 ring-ink-primary scale-y-105 z-20 shadow-md'
                    : ''
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  {p.isNegative && <AlertTriangle className="w-3 h-3 shrink-0 text-status-warn" />}
                  <span className="truncate hidden md:inline">{p.shortName}:</span>
                  <span className="font-mono tabular-nums">
                    {p.isCompleted
                      ? `${p.days}d`
                      : p.hasStart
                      ? 'In Progress'
                      : 'Pending'}
                  </span>
                </div>

                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface text-ink-primary text-xs rounded-lg p-3 shadow-xl z-30 whitespace-nowrap pointer-events-none min-w-[220px] max-w-sm border border-border">
                    <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-1.5 mb-1.5">
                      <span className="font-bold text-ink-primary text-xs">
                        Phase {p.id}: {p.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          p.isNegative
                            ? 'bg-status-warn/20 text-status-warn border border-status-warn/30'
                            : p.isCompleted
                            ? 'bg-ink-primary text-surface font-medium'
                            : p.hasStart
                            ? 'bg-base text-ink-primary border border-border-strong'
                            : 'bg-base text-ink-muted border border-border'
                        }`}
                      >
                        {p.isCompleted ? `${p.days} Days` : p.hasStart ? 'In Progress' : 'Pending'}
                      </span>
                    </div>

                    <div className="text-[11px] text-ink-muted space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-ink-muted font-medium">{p.startCheckpoint}</span>
                        <ArrowRight className="w-3 h-3 text-ink-muted shrink-0" />
                        <span className="text-ink-muted font-medium">{p.endCheckpoint}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                        <span className="text-ink-muted">Rentang Tanggal:</span>
                        <span className="font-mono text-ink-primary font-bold text-[10px]">
                          {formatDisplayDate(p.startDate)} ➔ {formatDisplayDate(p.endDate)}
                        </span>
                      </div>

                      {p.isNegative && (
                        <div className="p-1.5 rounded bg-status-warn/10 border border-status-warn/30 text-[10px] text-status-warn mt-1 leading-tight flex items-start gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-status-warn shrink-0 mt-0.5" />
                          <span>
                            <strong>Data Quality Anomaly:</strong> Tanggal akhir ({formatDisplayDate(p.endDate)}) tercatat lebih awal dari tanggal awal ({formatDisplayDate(p.startDate)}).
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: 8 CHECKPOINT MILESTONE BOXES                                       */}
      {/* ========================================================================= */}
      <div className="space-y-2 pt-1 border-t border-border/60">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-ink-muted">
            Official Process Checkpoints
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {OFFICIAL_CHECKPOINTS.map((cp) => {
            const dateStr = cpMap[cp.code]?.date || null;
            const isRecorded = Boolean(dateStr);

            // Highlighted if hovered directly, or if it is the start or end of the hovered phase
            const isDirectHover = hoveredCheckpointCode === cp.code;
            const isPhaseBounded =
              activeHoveredPhase !== null &&
              (activeHoveredPhase.startCheckpoint === cp.code ||
                activeHoveredPhase.endCheckpoint === cp.code);

            const isHighlighted = isDirectHover || isPhaseBounded;

            return (
              <div
                key={`cp-box-${cp.code}`}
                onMouseEnter={() => setHoveredCheckpointCode(cp.code)}
                onMouseLeave={() => setHoveredCheckpointCode(null)}
                className={`p-2 rounded-lg border transition-all cursor-pointer text-left relative flex flex-col justify-between min-h-[82px] ${
                  isHighlighted
                    ? 'bg-surface border-ink-primary ring-2 ring-border-strong shadow-md scale-[1.02] z-10'
                    : isRecorded
                    ? 'bg-surface border-border hover:border-ink-primary hover:bg-surface-hover'
                    : 'bg-base/30 border-border/50 text-ink-muted/70 hover:bg-base/60'
                }`}
              >
                {/* Header item: order badge + indicator */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        isRecorded
                          ? 'bg-ink-primary text-surface'
                          : 'bg-base border border-border text-ink-muted'
                      }`}
                    >
                      {isRecorded ? <CheckCircle2 className="w-3 h-3" /> : cp.order}
                    </span>
                    <span className="text-[9px] font-mono text-ink-muted uppercase">
                      Checkpoint {cp.order}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h4
                    title={cp.label}
                    className={`font-bold text-[11px] leading-tight line-clamp-2 ${
                      isRecorded ? 'text-ink-primary' : 'text-ink-muted'
                    }`}
                  >
                    {cp.label}
                  </h4>
                </div>

                {/* Date */}
                <div className="pt-1.5 mt-1 border-t border-border/40 flex items-center justify-between text-[10px]">
                  <span className="text-[9px] text-ink-muted">Date:</span>
                  <span
                    className={`font-mono font-semibold ${
                      isRecorded ? 'text-ink-primary' : 'text-ink-muted/50'
                    }`}
                  >
                    {formatDisplayDate(dateStr)}
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
