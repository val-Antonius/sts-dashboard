import React from 'react';
import Link from 'next/link';
import { ActiveCaseCurrentMonth } from '@/types/database';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { Stethoscope, CornerDownRight } from 'lucide-react';

interface ActiveCasesTableProps {
  cases: ActiveCaseCurrentMonth[];
}

export function ActiveCasesTable({ cases }: ActiveCasesTableProps) {
  if (!cases || cases.length === 0) {
    return <EmptyState message="No active cases recorded for the current month" />;
  }

  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-surface shadow-xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-base/60 text-ink-muted font-medium">
            <th className="py-3 px-4">Customer / Branch / PIC</th>
            <th className="py-3 px-4">Unit Model & Serial</th>
            <th className="py-3 px-4">Solution Time / SLA</th>
            <th className="py-3 px-4">Claim Status</th>
            <th className="py-3 px-4">Root Cause</th>
            <th className="py-3 px-4 text-center">Carry-Over</th>
            <th className="py-3 px-4 text-center">Diagnostic</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cases.map((c) => {
            const isOverdue = c.solution_time_days > c.achievement_threshold_days;
            const slaColor = isOverdue
              ? 'text-[#A54B3F] dark:text-[#BD584B] font-semibold'
              : 'text-[#3B7A57] dark:text-[#489369]';

            return (
              <tr
                key={c.issue_case_id}
                className="hover:bg-surface-hover/60 transition-colors"
              >
                {/* Compound Cell: Customer / Branch / PIC */}
                <td className="py-3 px-4">
                  <div className="font-semibold text-ink-primary text-[13px]">
                    {c.customer_name}
                  </div>
                  <div className="text-ink-muted text-[11px] flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono px-1 py-0.2 bg-base rounded border border-border">
                      {c.branch_code}
                    </span>
                    <span>•</span>
                    <span>{c.pic_name || 'Unassigned'}</span>
                  </div>
                </td>

                {/* Unit Model & Serial (Monospace) */}
                <td className="py-3 px-4">
                  <div className="font-medium text-ink-primary">{c.unit_model_name}</div>
                  <div className="font-mono text-ink-muted text-[11px]">
                    {c.serial_number || '—'}
                  </div>
                </td>

                {/* Solution Time / SLA */}
                <td className="py-3 px-4 tabular-nums">
                  <div className={`text-xs ${slaColor}`}>
                    {c.solution_time_days} / {c.achievement_threshold_days} days
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    {isOverdue ? 'Overdue' : 'Within SLA'}
                  </div>
                </td>

                {/* Claim Status */}
                <td className="py-3 px-4">
                  <StatusBadge status={c.claimable_status_name} />
                </td>

                {/* Root Cause */}
                <td className="py-3 px-4 text-ink-primary">
                  {c.root_cause_name ? (
                    <span>{c.root_cause_name}</span>
                  ) : (
                    <span className="text-ink-muted italic">Not Recorded</span>
                  )}
                </td>

                {/* Carry-Over Badge/Dot */}
                <td className="py-3 px-4 text-center">
                  {c.is_carried_over ? (
                    <span
                      title="Carried over from previous month"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#B8863B]/15 text-[#B8863B] border border-[#B8863B]/30"
                    >
                      <CornerDownRight className="w-2.5 h-2.5" />
                      Carried-Over
                    </span>
                  ) : (
                    <span className="text-ink-muted/50 text-[11px]">—</span>
                  )}
                </td>

                {/* Action: Pure Icon Button navigating to Case Diagnostic */}
                <td className="py-3 px-4 text-center">
                  <Link
                    href={`/case-solution-process/diagnostic?id=${c.issue_case_id}`}
                    aria-label={`View Diagnostic for case ${c.customer_name}`}
                    className="inline-flex items-center justify-center p-1.5 rounded-md text-accent-brass hover:bg-accent-brass/10 transition-colors border border-accent-brass/30"
                  >
                    <Stethoscope className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
