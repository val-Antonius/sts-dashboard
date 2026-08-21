import React from 'react';
import {
  getAllCaseOptions,
  getCaseDiagnosticData,
} from '@/lib/queries/diagnostic';
import { CaseSelector } from '@/components/diagnostic/CaseSelector';
import { CheckpointProgressBar } from '@/components/diagnostic/CheckpointProgressBar';
import { DiagnosticDetails } from '@/components/diagnostic/DiagnosticDetails';
import { EmptyState } from '@/components/common/EmptyState';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function CaseDiagnosticPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  const cases = await getAllCaseOptions();

  // If no case is selected via URL, default to the first case in the list
  const selectedCaseId = id || cases[0]?.issue_case_id;

  const diagnosticData = selectedCaseId
    ? await getCaseDiagnosticData(selectedCaseId)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Bar: Title & Searchable Case Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink-primary tracking-tight">Case Diagnostic</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Single-case deep dive: checkpoint timeline breakdown, spare parts, and progress log
          </p>
        </div>

        {cases.length > 0 && (
          <CaseSelector cases={cases} selectedCaseId={selectedCaseId} />
        )}
      </div>

      {diagnosticData && diagnosticData.caseDetail ? (
        <div className="space-y-6">
          {/* Signature Interactive Checkpoint Progress Bar */}
          <CheckpointProgressBar
            checkpoints={diagnosticData.checkpoints}
            totalDays={diagnosticData.caseDetail.solution_time_days}
          />

          {/* Header Specs & 2-Column Section (Spare Parts & Progress Log) */}
          <DiagnosticDetails
            caseDetail={diagnosticData.caseDetail}
            parts={diagnosticData.parts}
            logs={diagnosticData.logs}
          />
        </div>
      ) : (
        <EmptyState message="No case selected or case data not found." />
      )}
    </div>
  );
}
