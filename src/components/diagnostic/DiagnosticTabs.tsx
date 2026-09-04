'use client';

import React, { useState } from 'react';
import { SingleCaseDetail, CasePartRequirement, CaseProgressLog } from '@/types/database';
import { CaseProductSpecsTab } from './CaseProductSpecsTab';
import { CaseProgressLogFeed } from './CaseProgressLogFeed';
import { Package, MessageSquare } from 'lucide-react';

interface DiagnosticTabsProps {
  caseDetail: SingleCaseDetail;
  parts: CasePartRequirement[];
  logs: CaseProgressLog[];
}

export function DiagnosticTabs({
  caseDetail,
  parts,
  logs,
}: DiagnosticTabsProps) {
  const [activeTab, setActiveTab] = useState<'specs' | 'logs'>('specs');

  return (
    <div className="space-y-4">
      {/* Tab Header Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
            activeTab === 'specs'
              ? 'bg-surface border-border text-accent-brass shadow-xs'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:bg-base/40'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Specs & Spare Parts</span>
          {parts.length > 0 && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-base border border-border text-ink-muted">
              {parts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
            activeTab === 'logs'
              ? 'bg-surface border-border text-accent-brass shadow-xs'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:bg-base/40'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Log Proses & Timeline</span>
          {logs.length > 0 && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-accent-brass/10 border border-accent-brass/30 text-accent-brass font-bold">
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Body */}
      <div className="animate-in fade-in">
        {activeTab === 'specs' && (
          <CaseProductSpecsTab key={caseDetail.issue_case_id} caseDetail={caseDetail} parts={parts} />
        )}

        {activeTab === 'logs' && (
          <CaseProgressLogFeed
            key={caseDetail.issue_case_id}
            caseDetail={caseDetail}
            initialLogs={logs}
          />
        )}
      </div>
    </div>
  );
}
