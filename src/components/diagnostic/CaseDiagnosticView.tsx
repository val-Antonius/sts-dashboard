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
import { CheckpointProgressBar } from './CheckpointProgressBar';
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

  const handleSaved = () => {
    setIsEditModalOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* SECTION 1 (TOP): Customer Details & Issue Metadata (Compact, Vertical Space Optimized) */}
      <CaseHeaderCard caseDetail={diagnosticData.caseDetail} />

      {/* SECTION 2 (MIDDLE): Interactive Checkpoint Timeline Progress Bar (Center Focus) with Edit Action */}
      <CheckpointProgressBar
        checkpoints={diagnosticData.checkpoints}
        totalDays={diagnosticData.caseDetail.solution_time_days}
        onEditClick={() => setIsEditModalOpen(true)}
      />

      {/* SECTION 3 (BOTTOM): Diagnostic Tabs (Product Specs/Spare Parts & Progress Log CRUD Feed) */}
      <DiagnosticTabs
        caseDetail={diagnosticData.caseDetail}
        parts={diagnosticData.parts}
        logs={diagnosticData.logs}
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
