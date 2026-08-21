import React from 'react';
import {
  SingleCaseDetail,
  CasePartRequirement,
  CaseProgressLog,
} from '@/types/database';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Package, MessageSquare, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface DiagnosticDetailsProps {
  caseDetail: SingleCaseDetail;
  parts: CasePartRequirement[];
  logs: CaseProgressLog[];
}

export function DiagnosticDetails({
  caseDetail,
  parts,
  logs,
}: DiagnosticDetailsProps) {
  const isOverdue =
    caseDetail.solution_time_days > caseDetail.achievement_threshold_days;

  return (
    <div className="space-y-6">
      {/* Case Header Card */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-ink-primary">
                {caseDetail.customer_name}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-base border border-border font-semibold text-ink-primary">
                {caseDetail.branch_code}
              </span>
              <StatusBadge status={caseDetail.status_wo} />
            </div>
            <div className="text-xs text-ink-muted flex flex-wrap items-center gap-3">
              <span>Segment: <strong>{caseDetail.golongan_customer}</strong></span>
              <span>•</span>
              <span>Model: <strong className="text-ink-primary">{caseDetail.unit_model_name}</strong></span>
              <span>•</span>
              <span>Serial: <code className="font-mono text-ink-primary">{caseDetail.serial_number || '—'}</code></span>
              <span>•</span>
              <span>PIC: <strong className="text-ink-primary">{caseDetail.pic_name || 'Unassigned'}</strong></span>
            </div>
          </div>

          {/* Solution Time & SLA KPI Pill */}
          <div className="bg-base border border-border rounded-lg p-3 text-right tabular-nums">
            <div className="text-[11px] text-ink-muted uppercase tracking-wider font-semibold">
              Solution Time / SLA
            </div>
            <div className="text-xl font-bold mt-0.5 text-ink-primary">
              <span
                className={
                  isOverdue
                    ? 'text-[#A54B3F] dark:text-[#BD584B]'
                    : 'text-[#3B7A57] dark:text-[#489369]'
                }
              >
                {caseDetail.solution_time_days}
              </span>
              <span className="text-ink-muted text-sm font-normal"> / {caseDetail.achievement_threshold_days} days</span>
            </div>
            <div className="text-[11px] mt-0.5">
              <StatusBadge
                status={caseDetail.achievement}
                variant={caseDetail.achievement === 'Achieved' ? 'ok' : 'danger'}
              />
            </div>
          </div>
        </div>

        {/* Technical Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-ink-muted block text-[11px]">Complaint Date</span>
            <span className="font-mono font-medium text-ink-primary">{caseDetail.complaint_date}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[11px]">Claimable Status</span>
            <span className="font-medium text-ink-primary">{caseDetail.claimable_status_name}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[11px]">Root Cause</span>
            <span className="font-medium text-ink-primary">{caseDetail.root_cause_name || 'Not Recorded'}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[11px]">Hour Meter (HM)</span>
            <span className="font-mono font-medium text-ink-primary tabular-nums">
              {caseDetail.hm_value !== null ? `${caseDetail.hm_value} hrs` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Cross-Reference Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Spare Part Requirements */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <Package className="w-4 h-4 text-accent-brass" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Spare Part Requirements
              </h3>
            </div>

            {parts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-base/40 text-ink-muted font-medium">
                      <th className="py-2 px-2.5">Part No & Name</th>
                      <th className="py-2 px-2.5">Readiness</th>
                      <th className="py-2 px-2.5">ETA</th>
                      <th className="py-2 px-2.5 text-center">Supplied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/40">
                        <td className="py-2.5 px-2.5">
                          <div className="font-mono font-medium text-ink-primary">
                            {p.part_number || '—'}
                          </div>
                          <div className="text-[11px] text-ink-muted">
                            {p.part_name || '—'}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className="text-xs font-medium text-ink-primary">
                            {p.readiness_name || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-ink-muted text-[11px]">
                          {p.eta_part_date || '—'}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          {p.is_full_supplied ? (
                            <span className="inline-flex items-center text-[#3B7A57] text-[11px] font-medium gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Full
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[#B8863B] text-[11px] font-medium gap-1">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-ink-muted">
                No spare part requirements recorded for this case
              </div>
            )}
          </div>
        </div>

        {/* Right: Progress Log */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <MessageSquare className="w-4 h-4 text-accent-brass" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Progress Log
              </h3>
            </div>

            {logs.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {logs.map((l, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-base/50 border border-border/70 rounded-md text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span className="font-mono font-medium text-ink-primary">{l.log_date}</span>
                      <span>By: <strong className="text-ink-primary">{l.pic_name || 'System / PIC'}</strong></span>
                    </div>
                    <p className="text-ink-primary leading-relaxed whitespace-pre-wrap text-xs">
                      {l.log_text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-ink-muted">
                No progress log entries recorded for this case
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
