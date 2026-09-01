'use client';

import React, { useState, useEffect } from 'react';
import {
  DimBranch,
  DimCustomer,
  DimUnitAsset,
  DimPic,
  RefClaimableStatus,
  RefRootCause,
  RefBottleneckReason,
  RefUnitCondition,
  RefPartReadiness,
  IssueFormData,
  IssueManagementItem,
  IssuePartInput,
} from '@/types/database';
import {
  X,
  CheckCircle2,
  Calendar,
  Layers,
  Wrench,
  PackageCheck,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Save,
} from 'lucide-react';

interface IssueEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editCaseId?: string | null;
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

const CHECKPOINT_STEPS = [
  { code: 'WO_CHECKING_CREATED', label: '1. WO Checking Created', desc: 'Work order checking issued' },
  { code: 'WO_CHECKING_CLOSED', label: '2. WO Checking Closed', desc: 'Inspection finished' },
  { code: 'PS_APPROVAL', label: '3. PS Approval', desc: 'Product Support approval' },
  { code: 'WO_REPAIR_RELEASED', label: '4. WO Repair Released', desc: 'Repair work order released' },
  { code: 'PART_GI', label: '5. Part Goods Issue (GI)', desc: 'Spare parts supplied' },
  { code: 'UNIT_RFU', label: '6. Unit Ready for Use (RFU)', desc: 'Machine repaired & ready' },
  { code: 'WO_REPAIR_CLOSED', label: '7. WO Repair Closed', desc: 'Repair paperwork closed' },
  { code: 'WO_CLOSED', label: '8. Final WO Closed', desc: 'Overall case closed' },
];

export function IssueEditorModal({
  isOpen,
  onClose,
  onSaved,
  editCaseId,
  lookups,
}: IssueEditorModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<IssueFormData>({
    branch_id: '',
    customer_id: '',
    unit_asset_id: '',
    pic_id: '',
    complaint_date: new Date().toISOString().split('T')[0],
    hm_value: null,
    unit_condition_id: '',
    old_or_new_issue: 'New Issue',
    root_cause_id: '',
    symptom_text: '',
    technical_analysis_text: '',
    corrective_action_text: '',
    preventive_action_text: '',
    wo_checking_number: '',
    wo_warranty_repair_number: '',
    tr_document_ref: '',
    tsr_document_ref: '',
    checkpoints: {},
    parts: [],
    claimable_status_id: lookups.claimableStatuses[0]?.claimable_status_id || '',
    status_wo: 'Belum Closed',
    closing_date_wo: '',
    closing_by_rfu_date: '',
    bottleneck_id: '',
    goodwill_statement_date: '',
    srd_publication_date: '',
  });

  // Load existing case data if editing
  useEffect(() => {
    if (editCaseId && isOpen) {
      setIsLoading(true);
      setErrorMsg(null);
      fetch(`/api/issues/${editCaseId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          const c: IssueManagementItem = data.caseData;
          setFormData({
            branch_id: c.branch_id || '',
            customer_id: c.customer_id || '',
            unit_asset_id: c.unit_asset_id || '',
            pic_id: c.pic_id || '',
            complaint_date: c.complaint_date || '',
            hm_value: c.hm_value || null,
            unit_condition_id: c.unit_condition_id || '',
            old_or_new_issue: (c.old_or_new_issue as any) || 'New Issue',
            root_cause_id: c.root_cause_id || '',
            symptom_text: c.symptom_text || '',
            technical_analysis_text: c.technical_analysis_text || '',
            corrective_action_text: c.corrective_action_text || '',
            preventive_action_text: c.preventive_action_text || '',
            wo_checking_number: c.wo_checking_number || '',
            wo_warranty_repair_number: c.wo_warranty_repair_number || '',
            tr_document_ref: c.tr_document_ref || '',
            tsr_document_ref: c.tsr_document_ref || '',
            checkpoints: data.checkpoints || {},
            parts: data.parts?.map((p: any) => ({
              part_number: p.part_number,
              part_name: p.part_name,
              part_readiness_id: p.part_readiness_id,
              eta_part_date: p.eta_part_date,
              is_full_supplied: p.is_full_supplied,
            })) || [],
            claimable_status_id: c.claimable_status_id || '',
            status_wo: (c.status_wo as any) || 'Belum Closed',
            closing_date_wo: c.closing_date_wo || '',
            closing_by_rfu_date: c.closing_by_rfu_date || '',
            bottleneck_id: c.bottleneck_id || '',
            goodwill_statement_date: c.goodwill_statement_date || '',
            srd_publication_date: c.srd_publication_date || '',
          });
        })
        .catch((err) => setErrorMsg(err.message))
        .finally(() => setIsLoading(false));
    } else if (isOpen) {
      // Reset for new creation
      setFormData({
        branch_id: lookups.branches[0]?.branch_id || '',
        customer_id: lookups.customers[0]?.customer_id || '',
        unit_asset_id: lookups.assets[0]?.unit_asset_id || '',
        pic_id: lookups.pics[0]?.pic_id || '',
        complaint_date: new Date().toISOString().split('T')[0],
        hm_value: null,
        unit_condition_id: '',
        old_or_new_issue: 'New Issue',
        root_cause_id: '',
        symptom_text: '',
        technical_analysis_text: '',
        corrective_action_text: '',
        preventive_action_text: '',
        wo_checking_number: '',
        wo_warranty_repair_number: '',
        tr_document_ref: '',
        tsr_document_ref: '',
        checkpoints: {},
        parts: [],
        claimable_status_id: lookups.claimableStatuses[0]?.claimable_status_id || '',
        status_wo: 'Belum Closed',
        closing_date_wo: '',
        closing_by_rfu_date: '',
        bottleneck_id: '',
        goodwill_statement_date: '',
        srd_publication_date: '',
      });
      setCurrentStep(1);
    }
  }, [editCaseId, isOpen]);

  if (!isOpen) return null;

  // Calculate completion percentage across 5 stages
  const getStageCompletion = () => {
    let completed = 0;
    // Step 1: Unit & Intake
    if (formData.branch_id && formData.customer_id && formData.unit_asset_id && formData.complaint_date) completed++;
    // Step 2: Diagnosis
    if (formData.root_cause_id || formData.symptom_text) completed++;
    // Step 3: Checkpoints
    if (Object.keys(formData.checkpoints).length > 0) completed++;
    // Step 4: Parts
    if (formData.parts.length > 0) completed++;
    // Step 5: Claim
    if (formData.claimable_status_id) completed++;

    return Math.round((completed / 5) * 100);
  };

  const handleAddPartRow = () => {
    setFormData({
      ...formData,
      parts: [
        ...formData.parts,
        {
          part_number: '',
          part_name: '',
          part_readiness_id: lookups.readinesses[0]?.part_readiness_id || null,
          eta_part_date: '',
          is_full_supplied: false,
        },
      ],
    });
  };

  const handleRemovePartRow = (idx: number) => {
    const updated = [...formData.parts];
    updated.splice(idx, 1);
    setFormData({ ...formData, parts: updated });
  };

  const handlePartChange = (idx: number, field: keyof IssuePartInput, value: any) => {
    const updated = [...formData.parts];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData({ ...formData, parts: updated });
  };

  const handleCheckpointChange = (code: string, date: string) => {
    setFormData({
      ...formData,
      checkpoints: {
        ...formData.checkpoints,
        [code]: date,
      },
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Basic validation
    if (!formData.complaint_date || !formData.branch_id || !formData.customer_id || !formData.unit_asset_id) {
      setErrorMsg('Please ensure Complaint Date, Branch, Customer, and Unit Asset are filled.');
      setIsSubmitting(false);
      setCurrentStep(1);
      return;
    }

    try {
      const url = editCaseId ? `/api/issues/${editCaseId}` : '/api/issues';
      const method = editCaseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save issue case');

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Intake & Unit Info', icon: Calendar },
    { num: 2, title: 'Technical Diagnosis', icon: Wrench },
    { num: 3, title: 'Process Checkpoints', icon: Layers },
    { num: 4, title: 'Spare Parts', icon: PackageCheck },
    { num: 5, title: 'Claim & Closure', icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Modal Header with Progress Meter */}
        <div className="p-4 sm:p-5 border-b border-border bg-base/30 shrink-0">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-accent-brass/10 border border-accent-brass/30 text-accent-brass uppercase">
                  {editCaseId ? 'Update Process' : 'New Issue Case'}
                </span>
                <h3 className="text-base font-bold text-ink-primary">
                  {editCaseId ? 'Issue Case & Process Tracking' : 'Create Operational Issue Case'}
                </h3>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Multi-stage tracking intake. Fields can be saved partially and completed anytime as manufacturing events unfold.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-base transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Navigation Bar */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 pt-2">
            {steps.map((s) => {
              const Icon = s.icon;
              const isCurrent = currentStep === s.num;
              const isPast = currentStep > s.num;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setCurrentStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                    isCurrent
                      ? 'bg-surface border-accent-brass text-accent-brass shadow-xs font-semibold'
                      : isPast
                      ? 'bg-base/60 border-border text-ink-primary hover:border-accent-brass/40'
                      : 'border-transparent text-ink-muted hover:text-ink-primary hover:bg-base/40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-accent-brass text-white'
                        : isPast
                        ? 'bg-[#3B7A57] text-white'
                        : 'bg-base border border-border text-ink-muted'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              );
            })}
          </div>

          {/* Completion Progress Bar */}
          <div className="w-full bg-base rounded-full h-1.5 mt-3 overflow-hidden border border-border">
            <div
              className="bg-accent-brass h-full transition-all duration-300 rounded-full"
              style={{ width: `${getStageCompletion()}%` }}
            />
          </div>
        </div>

        {/* Modal Body / Multi-Step Form */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-ink-muted">
              <Loader2 className="w-6 h-6 animate-spin text-accent-brass" />
              <span>Loading issue case details...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* ----------------- STEP 1: INTAKE & UNIT INFO ----------------- */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="border-b border-border pb-2">
                    <h4 className="font-bold text-ink-primary text-sm">Step 1: Intake & Unit Asset Info</h4>
                    <p className="text-ink-muted text-[11px]">Primary incident registration & unit identification</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Complaint Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.complaint_date}
                        onChange={(e) => setFormData({ ...formData, complaint_date: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Operating Branch *
                      </label>
                      <select
                        required
                        value={formData.branch_id}
                        onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="">-- Select Branch --</option>
                        {lookups.branches.map((b) => (
                          <option key={b.branch_id} value={b.branch_id}>
                            {b.branch_code} - {b.branch_name || b.city_name || 'Branch'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Customer Account *
                      </label>
                      <select
                        required
                        value={formData.customer_id}
                        onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="">-- Select Customer --</option>
                        {lookups.customers.map((c) => (
                          <option key={c.customer_id} value={c.customer_id}>
                            {c.customer_name} ({c.golongan_customer || 'Standard'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Unit Asset & Serial *
                      </label>
                      <select
                        required
                        value={formData.unit_asset_id}
                        onChange={(e) => setFormData({ ...formData, unit_asset_id: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="">-- Select Unit Asset --</option>
                        {lookups.assets.map((a) => (
                          <option key={a.unit_asset_id} value={a.unit_asset_id}>
                            [{a.product_code}] {a.unit_model_name} • S/N: {a.serial_number || 'N/A'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Assigned PIC (Lead Engineer)
                      </label>
                      <select
                        value={formData.pic_id || ''}
                        onChange={(e) => setFormData({ ...formData, pic_id: e.target.value || null })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="">-- Select PIC --</option>
                        {lookups.pics.map((p) => (
                          <option key={p.pic_id} value={p.pic_id}>
                            {p.pic_name} ({p.pic_role_code || 'SDH'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Hour Meter (HM)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 1250.5"
                        value={formData.hm_value ?? ''}
                        onChange={(e) => setFormData({ ...formData, hm_value: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Unit Operating Condition
                      </label>
                      <select
                        value={formData.unit_condition_id || ''}
                        onChange={(e) => setFormData({ ...formData, unit_condition_id: e.target.value || null })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="">-- Select Condition --</option>
                        {lookups.conditions.map((uc) => (
                          <option key={uc.unit_condition_id} value={uc.unit_condition_id}>
                            {uc.condition_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Issue Classification
                      </label>
                      <select
                        value={formData.old_or_new_issue}
                        onChange={(e) => setFormData({ ...formData, old_or_new_issue: e.target.value as any })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="New Issue">New Issue (Baru)</option>
                        <option value="Old Issue">Old Issue (Kasus Berulang / Lama)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- STEP 2: TECHNICAL DIAGNOSIS & SAP DOCS ----------------- */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="border-b border-border pb-2">
                    <h4 className="font-bold text-ink-primary text-sm">Step 2: Technical Diagnosis & SAP References</h4>
                    <p className="text-ink-muted text-[11px]">Root cause analysis, actions taken, and ERP document numbers</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Technical Root Cause (ref_root_cause)
                      </label>
                      <select
                        value={formData.root_cause_id || ''}
                        onChange={(e) => setFormData({ ...formData, root_cause_id: e.target.value || null })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="">-- Select Root Cause (or Not Recorded yet) --</option>
                        {lookups.rootCauses.map((rc) => (
                          <option key={rc.root_cause_id} value={rc.root_cause_id}>
                            {rc.root_cause_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Symptom / Problem Statement
                      </label>
                      <textarea
                        rows={2}
                        value={formData.symptom_text || ''}
                        onChange={(e) => setFormData({ ...formData, symptom_text: e.target.value })}
                        placeholder="Deskripsi kendala unit yang dilaporkan oleh customer..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Technical Analysis Text
                      </label>
                      <textarea
                        rows={3}
                        value={formData.technical_analysis_text || ''}
                        onChange={(e) => setFormData({ ...formData, technical_analysis_text: e.target.value })}
                        placeholder="Hasil pemeriksaan dan investigasi teknis..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Corrective Action Taken
                      </label>
                      <textarea
                        rows={3}
                        value={formData.corrective_action_text || ''}
                        onChange={(e) => setFormData({ ...formData, corrective_action_text: e.target.value })}
                        placeholder="Tindakan perbaikan yang dilakukan..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Preventive Action / Recommendations
                      </label>
                      <textarea
                        rows={2}
                        value={formData.preventive_action_text || ''}
                        onChange={(e) => setFormData({ ...formData, preventive_action_text: e.target.value })}
                        placeholder="Rekomendasi pencegahan agar kendala tidak berulang..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                            WO Checking No (SAP)
                          </label>
                          <input
                            type="text"
                            value={formData.wo_checking_number || ''}
                            onChange={(e) => setFormData({ ...formData, wo_checking_number: e.target.value })}
                            placeholder="e.g. 50800123"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                            WO Repair No (SAP)
                          </label>
                          <input
                            type="text"
                            value={formData.wo_warranty_repair_number || ''}
                            onChange={(e) => setFormData({ ...formData, wo_warranty_repair_number: e.target.value })}
                            placeholder="e.g. 50700456"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                            TR Document Link/Ref
                          </label>
                          <input
                            type="text"
                            value={formData.tr_document_ref || ''}
                            onChange={(e) => setFormData({ ...formData, tr_document_ref: e.target.value })}
                            placeholder="TR-2024-..."
                            className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                            TSR Document Link/Ref
                          </label>
                          <input
                            type="text"
                            value={formData.tsr_document_ref || ''}
                            onChange={(e) => setFormData({ ...formData, tsr_document_ref: e.target.value })}
                            placeholder="TSR-2024-..."
                            className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- STEP 3: PROCESS CHECKPOINT TIMELINE ----------------- */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="border-b border-border pb-2">
                    <h4 className="font-bold text-ink-primary text-sm">Step 3: 8 Standard Process Checkpoints</h4>
                    <p className="text-ink-muted text-[11px]">
                      Record event completion dates. All checkpoints are flexible—fill completed milestones and update later as events conclude.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {CHECKPOINT_STEPS.map((step) => {
                      const currentDate = formData.checkpoints[step.code] || '';
                      const isRecorded = Boolean(currentDate);

                      return (
                        <div
                          key={step.code}
                          className={`p-3.5 rounded-lg border transition-all ${
                            isRecorded
                              ? 'bg-[#3B7A57]/5 border-[#3B7A57]/30 shadow-xs'
                              : 'bg-surface border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isRecorded ? 'bg-[#3B7A57]' : 'bg-ink-muted/30'
                                }`}
                              />
                              <label className="font-semibold text-ink-primary text-xs">
                                {step.label}
                              </label>
                            </div>
                            <span className="text-[10px] text-ink-muted font-mono">
                              {step.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-muted mb-2">{step.desc}</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={currentDate}
                              onChange={(e) => handleCheckpointChange(step.code, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded text-xs font-mono focus:border-accent-brass"
                            />
                            {isRecorded && (
                              <button
                                type="button"
                                onClick={() => handleCheckpointChange(step.code, '')}
                                title="Clear date"
                                className="p-1.5 rounded hover:bg-base text-ink-muted hover:text-red-500 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ----------------- STEP 4: SPARE PARTS REQUIREMENTS ----------------- */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="border-b border-border pb-2 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-ink-primary text-sm">Step 4: Spare Parts Requirements</h4>
                      <p className="text-ink-muted text-[11px]">List spare parts, delivery readiness, and ETA tracking</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPartRow}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent-brass text-white text-xs font-semibold hover:bg-accent-brass/90 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Part</span>
                    </button>
                  </div>

                  {formData.parts.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border rounded-lg bg-base/20">
                      <PackageCheck className="w-8 h-8 text-ink-muted mx-auto mb-2 opacity-50" />
                      <p className="text-ink-muted text-xs">No spare parts recorded for this issue case yet.</p>
                      <button
                        type="button"
                        onClick={handleAddPartRow}
                        className="mt-3 text-accent-brass text-xs font-semibold hover:underline"
                      >
                        + Add First Spare Part Requirement
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.parts.map((part, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg border border-border bg-base/20 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                        >
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold text-ink-muted mb-0.5">
                              Part Number
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 2645K012"
                              value={part.part_number || ''}
                              onChange={(e) => handlePartChange(idx, 'part_number', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded font-mono text-xs focus:border-accent-brass"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-semibold text-ink-muted mb-0.5">
                              Part Description / Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Fuel Injector Nozzle"
                              value={part.part_name || ''}
                              onChange={(e) => handlePartChange(idx, 'part_name', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded text-xs focus:border-accent-brass"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-ink-muted mb-0.5">
                              Readiness Status
                            </label>
                            <select
                              value={part.part_readiness_id || ''}
                              onChange={(e) => handlePartChange(idx, 'part_readiness_id', e.target.value || null)}
                              className="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs focus:border-accent-brass"
                            >
                              <option value="">-- Status --</option>
                              {lookups.readinesses.map((r) => (
                                <option key={r.part_readiness_id} value={r.part_readiness_id}>
                                  {r.readiness_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-ink-muted mb-0.5">
                              ETA Date
                            </label>
                            <input
                              type="date"
                              value={part.eta_part_date || ''}
                              onChange={(e) => handlePartChange(idx, 'eta_part_date', e.target.value)}
                              className="w-full px-2 py-1.5 bg-surface border border-border rounded font-mono text-xs focus:border-accent-brass"
                            />
                          </div>

                          <div className="sm:col-span-1 flex items-center justify-end pt-3 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => handleRemovePartRow(idx)}
                              className="p-1.5 rounded hover:bg-base text-red-500 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ----------------- STEP 5: CLAIM & RESOLUTION CLOSURE ----------------- */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="border-b border-border pb-2">
                    <h4 className="font-bold text-ink-primary text-sm">Step 5: Claim & Resolution Closure</h4>
                    <p className="text-ink-muted text-[11px]">Warranty claim categorization, bottleneck reasons, and final closing dates</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Claimable Status (ref_claimable_status) *
                      </label>
                      <select
                        required
                        value={formData.claimable_status_id || ''}
                        onChange={(e) => setFormData({ ...formData, claimable_status_id: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="">-- Select Claim Status --</option>
                        {lookups.claimableStatuses.map((cs) => (
                          <option key={cs.claimable_status_id} value={cs.claimable_status_id}>
                            {cs.status_name} ({cs.is_warranty_scope ? 'Warranty Scope' : 'Non-Warranty'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Overall Work Order Status *
                      </label>
                      <select
                        value={formData.status_wo}
                        onChange={(e) => setFormData({ ...formData, status_wo: e.target.value as any })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-bold"
                      >
                        <option value="Belum Closed">Belum Closed (Active In-Progress)</option>
                        <option value="Closed">Closed (Resolved)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Bottleneck Reason (if any delay)
                      </label>
                      <select
                        value={formData.bottleneck_id || ''}
                        onChange={(e) => setFormData({ ...formData, bottleneck_id: e.target.value || null })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="">-- No Bottleneck Recorded --</option>
                        {lookups.bottlenecks.map((btn) => (
                          <option key={btn.bottleneck_id} value={btn.bottleneck_id}>
                            {btn.bottleneck_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Closing Date WO (Standard)
                      </label>
                      <input
                        type="date"
                        value={formData.closing_date_wo || ''}
                        onChange={(e) => setFormData({ ...formData, closing_date_wo: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Closing by RFU Date (PTA/Local Part)
                      </label>
                      <input
                        type="date"
                        value={formData.closing_by_rfu_date || ''}
                        onChange={(e) => setFormData({ ...formData, closing_by_rfu_date: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Goodwill Statement Date
                      </label>
                      <input
                        type="date"
                        value={formData.goodwill_statement_date || ''}
                        onChange={(e) => setFormData({ ...formData, goodwill_statement_date: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        SRD Publication Date
                      </label>
                      <input
                        type="date"
                        value={formData.srd_publication_date || ''}
                        onChange={(e) => setFormData({ ...formData, srd_publication_date: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                      />
                    </div>
                  </div>

                  {/* Goodwill Solution Time Guidance Callout */}
                  <div className="p-3.5 rounded-lg bg-base/40 border border-border text-[11px] text-ink-muted space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-ink-primary">
                      <span className="w-2 h-2 rounded-full bg-accent-brass" />
                      <span>Formula Solution Time & Aturan Goodwill (v_claim_metrics)</span>
                    </div>
                    <p className="leading-relaxed">
                      Sesuai formula revisi <code className="font-mono text-ink-primary">v_claim_metrics</code>: Perhitungan durasi menggunakan hari kerja <code className="font-mono text-ink-primary">NETWORKDAYS(Senin-Jumat)</code>. Untuk klaim <strong>Goodwill</strong>, periode jeda antara <em>Goodwill Statement Date</em> hingga <em>SRD Publication Date</em> secara otomatis tidak dihitung dalam aging hari solusi.
                    </p>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer with Stepper and Quick Save Controls */}
        <div className="p-4 sm:p-5 border-t border-border bg-base/30 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs font-semibold text-ink-muted hover:text-ink-primary hover:bg-base transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            )}
            {currentStep < 5 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs font-semibold text-ink-primary hover:bg-base transition-colors"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md border border-border text-xs text-ink-muted hover:text-ink-primary hover:bg-base transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent-brass text-white text-xs font-bold hover:bg-accent-brass/90 transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{editCaseId ? 'Update Issue Case' : 'Save Issue Case'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
