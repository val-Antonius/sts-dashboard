'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SingleCaseDetail,
  CheckpointDuration,
  CasePartRequirement,
  CaseProgressLog,
  DimBranch,
  DimCustomer,
  DimUnitAsset,
  DimPic,
  RefClaimableStatus,
  RefRootCause,
  RefBottleneckReason,
  RefUnitCondition,
  RefPartReadiness,
} from '@/types/database';
import { CaseHeaderCard } from './CaseHeaderCard';
import { CheckpointProgressBar, PhaseClickInfo } from './CheckpointProgressBar';
import { DiagnosticTabs } from './DiagnosticTabs';
import { IssueEditorModal } from '@/components/issues/IssueEditorModal';

interface CaseDiagnosticViewProps {
  diagnosticData: {
    caseDetail: SingleCaseDetail;
    checkpoints: CheckpointDuration[];
    parts: CasePartRequirement[];
    logs: CaseProgressLog[];
  };
  lookups: {
    branches: DimBranch[];
    customers: DimCustomer[];
    assets: DimUnitAsset[];
    pics: DimPic[];
    claimableStatuses: RefClaimableStatus[];
    rootCauses: RefRootCause[];
    bottlenecks: RefBottleneckReason[];
    conditions: RefUnitCondition[];
    readinesses: RefPartReadiness[];
  };
}

export function CaseDiagnosticView({
  diagnosticData,
  lookups,
}: CaseDiagnosticViewProps) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'specs' | 'logs'>('specs');
  const [highlightedPhase, setHighlightedPhase] = useState<{
    phaseId: number;
    phaseName: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  // Reset highlight if case changes
  React.useEffect(() => {
    setHighlightedPhase(null);
  }, [diagnosticData.caseDetail.issue_case_id]);

  const handlePhaseClick = (phase: PhaseClickInfo) => {
    // If clicking the already highlighted phase, toggle off
    if (highlightedPhase?.phaseId === phase.phaseId) {
      setHighlightedPhase(null);
      return;
    }

    if (!phase.startDate || !phase.endDate) return;

    const minDate = phase.startDate < phase.endDate ? phase.startDate : phase.endDate;
    const maxDate = phase.startDate < phase.endDate ? phase.endDate : phase.startDate;

    // Check if any log falls in this date range
    const matchingLogs = diagnosticData.logs.filter(
      (l) => l.log_date >= minDate && l.log_date <= maxDate
    );

    // If NO matching logs -> do nothing! Keep silent, do not switch tab or show message
    if (matchingLogs.length === 0) {
      setHighlightedPhase(null);
      return;
    }

    // If matching logs exist -> apply highlight and auto-switch to logs tab
    setHighlightedPhase({
      phaseId: phase.phaseId,
      phaseName: phase.phaseName,
      startDate: minDate,
      endDate: maxDate,
    });
    setActiveTab('logs');
  };

  const handleSaved = () => {
    setIsEditModalOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* SECTION 1 (TOP): Customer Details & Issue Metadata (Compact, Vertical Space Optimized) */}
      <CaseHeaderCard caseDetail={diagnosticData.caseDetail} />

      {/* SECTION 2 (MIDDLE): Interactive Checkpoint Timeline Progress Bar (Center Focus) with Edit Action & Phase Click */}
      <CheckpointProgressBar
        checkpoints={diagnosticData.checkpoints}
        totalDays={diagnosticData.caseDetail.solution_time_days}
        onEditClick={() => setIsEditModalOpen(true)}
        selectedPhaseId={highlightedPhase?.phaseId}
        onPhaseClick={handlePhaseClick}
      />

      {/* SECTION 3 (BOTTOM): Diagnostic Tabs (Product Specs/Spare Parts & Progress Log CRUD Feed) */}
      <DiagnosticTabs
        caseDetail={diagnosticData.caseDetail}
        parts={diagnosticData.parts}
        logs={diagnosticData.logs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        highlightedPhase={highlightedPhase}
        onClearHighlight={() => setHighlightedPhase(null)}
      />

      {/* Edit Issue Modal directly inside Case Diagnostic */}
      {isEditModalOpen && (
        <IssueEditorModal
          isOpen={isEditModalOpen}
          editCaseId={diagnosticData.caseDetail.issue_case_id}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={handleSaved}
          lookups={lookups}
        />
      )}
    </div>
  );
}
