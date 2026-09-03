'use client';

import React from 'react';
import { SingleCaseDetail, CasePartRequirement } from '@/types/database';
import {
  Package,
  Wrench,
  FileText,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

interface CaseProductSpecsTabProps {
  caseDetail: SingleCaseDetail;
  parts: CasePartRequirement[];
}

export function CaseProductSpecsTab({
  caseDetail,
  parts,
}: CaseProductSpecsTabProps) {
  return (
    <div className="space-y-6">
      {/* 1. Spare Parts Requirements Table */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-accent-brass" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
              Spare Part Requirements ({parts.length})
            </h3>
          </div>
          <span className="text-[11px] text-ink-muted">
            Kebutuhan komponen & status kesiapan suku cadang
          </span>
        </div>

        {parts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-base/50 text-ink-muted font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Part Number</th>
                  <th className="py-2.5 px-3">Part Description</th>
                  <th className="py-2.5 px-3">Readiness Status</th>
                  <th className="py-2.5 px-3 font-mono">ETA Date</th>
                  <th className="py-2.5 px-3 text-center">Supply Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-ink-primary">
                      {p.part_number || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-ink-primary">
                      {p.part_name || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-base border border-border text-[11px] font-medium text-ink-primary">
                        {p.readiness_name || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-ink-muted text-[11px]">
                      {p.eta_part_date || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.is_full_supplied ? (
                        <span className="inline-flex items-center text-[#3B7A57] text-[11px] font-bold gap-1 px-2 py-0.5 rounded-full bg-[#3B7A57]/10 border border-[#3B7A57]/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Full Supplied
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[#B8863B] text-[11px] font-bold gap-1 px-2 py-0.5 rounded-full bg-[#B8863B]/10 border border-[#B8863B]/20">
                          <Clock className="w-3.5 h-3.5" /> Pending Supply
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-ink-muted italic bg-base/20 rounded-lg border border-dashed border-border">
            Belum ada kebutuhan spare part yang dicatat untuk kasus ini.
          </div>
        )}
      </div>

      {/* 2. Technical Analysis & Corrective Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Problem & Analysis */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Wrench className="w-4 h-4 text-accent-brass" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
              Investigation & Technical Analysis
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-ink-muted block mb-1">
                Symptom / Problem Statement:
              </span>
              <div className="p-3 rounded-lg bg-base/40 border border-border/70 text-ink-primary leading-relaxed whitespace-pre-wrap min-h-[50px]">
                {caseDetail.symptom_text || <span className="text-ink-muted italic">Tidak ada catatan keluhan spesifik.</span>}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-ink-muted block mb-1">
                Technical Analysis:
              </span>
              <div className="p-3 rounded-lg bg-base/40 border border-border/70 text-ink-primary leading-relaxed whitespace-pre-wrap min-h-[60px]">
                {caseDetail.technical_analysis_text || <span className="text-ink-muted italic">Analisis teknis belum dicatat.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions & SAP Documents */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileText className="w-4 h-4 text-accent-brass" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
              Corrective Action & ERP References
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-ink-muted block mb-1">
                Corrective Action Taken:
              </span>
              <div className="p-3 rounded-lg bg-base/40 border border-border/70 text-ink-primary leading-relaxed whitespace-pre-wrap min-h-[50px]">
                {caseDetail.corrective_action_text || <span className="text-ink-muted italic">Tindakan perbaikan belum dicatat.</span>}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-ink-muted block mb-1">
                Preventive Recommendation:
              </span>
              <div className="p-3 rounded-lg bg-base/40 border border-border/70 text-ink-primary leading-relaxed whitespace-pre-wrap min-h-[50px]">
                {caseDetail.preventive_action_text || <span className="text-ink-muted italic">Rekomendasi pencegahan belum dicatat.</span>}
              </div>
            </div>

            {/* ERP & Reference Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border text-[11px]">
              <div className="p-2 rounded bg-base border border-border">
                <span className="text-ink-muted block text-[10px]">WO Checking</span>
                <span className="font-mono font-semibold text-ink-primary truncate block">
                  {caseDetail.wo_checking_number || '—'}
                </span>
              </div>
              <div className="p-2 rounded bg-base border border-border">
                <span className="text-ink-muted block text-[10px]">WO Repair</span>
                <span className="font-mono font-semibold text-ink-primary truncate block">
                  {caseDetail.wo_warranty_repair_number || '—'}
                </span>
              </div>
              <div className="p-2 rounded bg-base border border-border">
                <span className="text-ink-muted block text-[10px]">TR Ref</span>
                <span className="font-mono font-semibold text-ink-primary truncate block">
                  {caseDetail.tr_document_ref || '—'}
                </span>
              </div>
              <div className="p-2 rounded bg-base border border-border">
                <span className="text-ink-muted block text-[10px]">TSR Ref</span>
                <span className="font-mono font-semibold text-ink-primary truncate block">
                  {caseDetail.tsr_document_ref || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
