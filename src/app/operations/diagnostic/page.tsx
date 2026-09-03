import React from 'react';
import {
  getAllCaseOptions,
  getCaseDiagnosticData,
} from '@/lib/queries/diagnostic';
import { CaseSelector } from '@/components/diagnostic/CaseSelector';
import { CaseHeaderCard } from '@/components/diagnostic/CaseHeaderCard';
import { CheckpointProgressBar } from '@/components/diagnostic/CheckpointProgressBar';
import { DiagnosticTabs } from '@/components/diagnostic/DiagnosticTabs';
import { EmptyState } from '@/components/common/EmptyState';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ id?: string; caseId?: string }>;
}

export default async function CaseDiagnosticPage({ searchParams }: PageProps) {
  const { id, caseId } = await searchParams;
  const cases = await getAllCaseOptions();

  // If no case is selected via URL, default to the first case in the list
  const selectedCaseId = id || caseId || cases[0]?.issue_case_id;

  const diagnosticData = selectedCaseId
    ? await getCaseDiagnosticData(selectedCaseId)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Bar: Title & Searchable Case Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink-primary tracking-tight">Case Diagnostic</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Single-case deep dive: rincian kasus, timeline checkpoint, spare part, dan log proses harian
          </p>
        </div>

        {cases.length > 0 && (
          <CaseSelector cases={cases} selectedCaseId={selectedCaseId} />
        )}
      </div>

      {diagnosticData && diagnosticData.caseDetail ? (
        <div className="space-y-6 animate-in fade-in">
          {/* SECTION 1 (TOP): Customer Details & Issue Metadata (Compact, Vertical Space Optimized) */}
          <CaseHeaderCard caseDetail={diagnosticData.caseDetail} />

          {/* SECTION 2 (MIDDLE): Interactive Checkpoint Timeline Progress Bar (Center Focus) */}
          <CheckpointProgressBar
            checkpoints={diagnosticData.checkpoints}
            totalDays={diagnosticData.caseDetail.solution_time_days}
          />

          {/* SECTION 3 (BOTTOM): Diagnostic Tabs (Product Specs/Spare Parts & Progress Log CRUD Feed) */}
          <DiagnosticTabs
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
