'use client';

import React, { useState } from 'react';
import { PicBranchWorkloadCurrentMonth } from '@/types/database';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';

interface BranchWorkloadTableProps {
  workloads: PicBranchWorkloadCurrentMonth[];
  pageSize?: number;
}

export function BranchWorkloadTable({ workloads, pageSize = 15 }: BranchWorkloadTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (!workloads || workloads.length === 0) {
    return <EmptyState message="No PIC/Branch workload data available for the current month" />;
  }

  const totalPages = Math.ceil(workloads.length / pageSize);
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const paginatedWorkloads = workloads.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="border border-border rounded-lg bg-surface shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-base/60 text-ink-muted font-medium">
              <th className="py-3 px-4">PIC & Branch</th>
              <th className="py-3 px-4 text-right">Active Cases</th>
              <th className="py-3 px-4 text-right">Overdue Cases</th>
              <th className="py-3 px-4 text-right">Carried-Over Cases</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedWorkloads.map((w, idx) => {
              const rowKey = `${w.pic_id || 'unassigned'}-${w.branch_code}-${idx}`;
              const hasOverdue = w.total_overdue_cases > 0;

              return (
                <tr
                  key={rowKey}
                  className="hover:bg-surface-hover/60 transition-colors"
                >
                  {/* PIC & Branch Compound Cell */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink-primary text-[13px]">
                      {w.pic_name || 'Unassigned'}
                    </div>
                    <div className="text-ink-muted text-[11px] mt-0.5">
                      Branch: <span className="font-mono font-medium text-ink-primary px-1 py-0.2 bg-base rounded border border-border">{w.branch_code}</span>
                    </div>
                  </td>

                  {/* Active Cases */}
                  <td className="py-3 px-4 text-right font-medium text-ink-primary tabular-nums">
                    {w.total_active_cases}
                  </td>

                  {/* Overdue Cases */}
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span
                      className={
                        hasOverdue
                          ? 'text-[#A54B3F] dark:text-[#BD584B] font-semibold bg-[#A54B3F]/10 px-2 py-0.5 rounded'
                          : 'text-ink-muted'
                      }
                    >
                      {w.total_overdue_cases}
                    </span>
                  </td>

                  {/* Carried-Over Cases */}
                  <td className="py-3 px-4 text-right tabular-nums text-ink-primary">
                    {w.total_carried_over_cases > 0 ? (
                      <span className="text-[#B8863B] dark:text-[#C99645] font-medium bg-[#B8863B]/10 px-2 py-0.5 rounded">
                        {w.total_carried_over_cases}
                      </span>
                    ) : (
                      <span className="text-ink-muted">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <Pagination
        currentPage={safePage}
        totalItems={workloads.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="branch workloads"
      />
    </div>
  );
}
