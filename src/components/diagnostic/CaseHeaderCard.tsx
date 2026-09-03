'use client';

import React from 'react';
import { SingleCaseDetail } from '@/types/database';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertOctagon,
  Gauge,
  Truck,
  FileSpreadsheet,
} from 'lucide-react';

interface CaseHeaderCardProps {
  caseDetail: SingleCaseDetail;
}

export function CaseHeaderCard({ caseDetail }: CaseHeaderCardProps) {
  const isOverdue =
    caseDetail.solution_time_days > caseDetail.achievement_threshold_days;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-5 shadow-xs transition-all">
      {/* Top Row: Customer Identity, Statuses & Compact KPI Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-ink-primary tracking-tight">
            {caseDetail.customer_name}
          </h2>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-base border border-border font-semibold text-ink-primary">
            {caseDetail.branch_code}
            {caseDetail.branch_city ? ` • ${caseDetail.branch_city}` : ''}
          </span>
          <StatusBadge status={caseDetail.status_wo} />
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-brass/10 border border-accent-brass/30 text-accent-brass font-medium">
            {caseDetail.golongan_customer}
          </span>
        </div>

        {/* Compact Solution Time & SLA KPI Box */}
        <div className="flex items-center gap-3 bg-base/60 border border-border rounded-lg px-3 py-1.5 shrink-0 self-start sm:self-auto">
          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
              Solution Time / SLA
            </div>
            <div className="text-sm font-bold tabular-nums text-ink-primary flex items-center justify-end gap-1">
              <span
                className={
                  isOverdue
                    ? 'text-[#A54B3F] dark:text-[#BD584B]'
                    : 'text-[#3B7A57] dark:text-[#489369]'
                }
              >
                {caseDetail.solution_time_days}d
              </span>
              <span className="text-ink-muted font-normal text-xs">
                / {caseDetail.achievement_threshold_days}d
              </span>
            </div>
          </div>
          <StatusBadge
            status={caseDetail.achievement}
            variant={caseDetail.achievement === 'Achieved' ? 'ok' : 'danger'}
          />
        </div>
      </div>

      {/* Compact Secondary Specs Grid (High Density, Minimal Vertical Space) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3.5 text-xs">
        <div>
          <span className="text-ink-muted text-[10px] uppercase tracking-wider block font-semibold">
            Product & Model
          </span>
          <div className="font-medium text-ink-primary truncate mt-0.5">
            <span className="font-mono font-bold text-accent-brass">[{caseDetail.product_code || '—'}]</span>{' '}
            {caseDetail.unit_model_name}
          </div>
        </div>

        <div>
          <span className="text-ink-muted text-[10px] uppercase tracking-wider block font-semibold">
            Serial Number
          </span>
          <div className="font-mono font-medium text-ink-primary truncate mt-0.5">
            {caseDetail.serial_number || '—'}
          </div>
        </div>

        <div>
          <span className="text-ink-muted text-[10px] uppercase tracking-wider block font-semibold">
            Complaint Date
          </span>
          <div className="font-mono font-medium text-ink-primary mt-0.5">
            {caseDetail.complaint_date}
          </div>
        </div>

        <div>
          <span className="text-ink-muted text-[10px] uppercase tracking-wider block font-semibold">
            Claimable Status
          </span>
          <div className="font-medium text-ink-primary truncate mt-0.5">
            {caseDetail.claimable_status_name}
          </div>
        </div>

        <div>
          <span className="text-ink-muted text-[10px] uppercase tracking-wider block font-semibold">
            Root Cause
          </span>
          <div className="font-medium text-ink-primary truncate mt-0.5">
            {caseDetail.root_cause_name || 'Not Recorded'}
          </div>
        </div>

        <div>
          <span className="text-ink-muted text-[10px] uppercase tracking-wider block font-semibold">
            PIC Assigned
          </span>
          <div className="font-medium text-ink-primary truncate mt-0.5">
            {caseDetail.pic_name || 'Unassigned'}
          </div>
        </div>
      </div>
    </div>
  );
}
