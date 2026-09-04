import React from 'react';
import {
  getAllCaseOptions,
  getCaseDiagnosticData,
} from '@/lib/queries/diagnostic';
import {
  getBranches,
  getCustomers,
  getUnitAssets,
  getPics,
  getClaimableStatuses,
  getRootCauses,
  getBottleneckReasons,
  getUnitConditions,
  getPartReadinesses,
} from '@/lib/queries/master';
import { CaseSelector } from '@/components/diagnostic/CaseSelector';
import { CaseDiagnosticView } from '@/components/diagnostic/CaseDiagnosticView';
import { EmptyState } from '@/components/common/EmptyState';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ id?: string; caseId?: string }>;
}

export default async function CaseDiagnosticPage({ searchParams }: PageProps) {
  const { id, caseId } = await searchParams;

  const [
    cases,
    branches,
    customers,
    assets,
    pics,
    claimableStatuses,
    rootCauses,
    bottlenecks,
    conditions,
    readinesses,
  ] = await Promise.all([
    getAllCaseOptions(),
    getBranches(),
    getCustomers(),
    getUnitAssets(),
    getPics(),
    getClaimableStatuses(),
    getRootCauses(),
    getBottleneckReasons(),
    getUnitConditions(),
    getPartReadinesses(),
  ]);

  // If no case is selected via URL, default to the first case in the list
  const selectedCaseId = id || caseId || cases[0]?.issue_case_id;

  const diagnosticData = selectedCaseId
    ? await getCaseDiagnosticData(selectedCaseId)
    : null;

  const lookups = {
    branches,
    customers,
    assets,
    pics,
    claimableStatuses,
    rootCauses,
    bottlenecks,
    conditions,
    readinesses,
  };

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
        <CaseDiagnosticView
          diagnosticData={{
            caseDetail: diagnosticData.caseDetail,
            checkpoints: diagnosticData.checkpoints,
            parts: diagnosticData.parts,
            logs: diagnosticData.logs,
          }}
          lookups={lookups}
        />
      ) : (
        <EmptyState message="No case selected or case data not found." />
      )}
    </div>
  );
}
