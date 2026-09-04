'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Wrench,
  Layers,
  PackageCheck,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  IssueFormData,
  IssueManagementItem,
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
  { code: 'COMPLAINT_DATE', label: '1. Complaint Received', desc: 'Customer complaint officially recorded (synced from Step 1)', isReadOnly: true },
  { code: 'WO_CHECKING_CREATED', label: '2. WO Checking Created', desc: 'Inspection work order created in SAP' },
  { code: 'WO_CHECKING_CLOSED', label: '3. WO Checking Closed', desc: 'Initial inspection completed' },
  { code: 'PS_APPROVAL', label: '4. PS Approval', desc: 'Parts specialist / technical recommendation approval' },
  { code: 'WO_REPAIR_RELEASED', label: '5. WO Repair Released', desc: 'Repair work order released' },
  { code: 'PART_GI', label: '6. Parts Goods Issued', desc: 'Parts issued to technician' },
  { code: 'UNIT_RFU', label: '7. Unit Ready for Use', desc: 'Unit restored & operational' },
  { code: 'WO_REPAIR_CLOSED', label: '8. WO Repair Closed', desc: 'Repair paperwork & admin closed' },
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

  // Optimistic Concurrency Control state
  const [loadedRowVersion, setLoadedRowVersion] = useState<number | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<IssueFormData>({
    branch_id: '',
    customer_id: '',
    unit_asset_id: '',
    pic_id: '',
    complaint_date: '',
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
      setConcurrencyConflict(null);
      fetch(`/api/issues/${editCaseId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          const c: IssueManagementItem = data.caseData;
          const ver = c.case_row_version ?? 1;
          setLoadedRowVersion(ver);
          setFormData({
            row_version: ver,
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
        .catch((err) => {
          setErrorMsg(err.message || 'Gagal memuat rincian kasus.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!editCaseId && isOpen) {
      setLoadedRowVersion(null);
      setFormData({
        branch_id: '',
        customer_id: '',
        unit_asset_id: '',
        pic_id: '',
        complaint_date: '',
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
  }, [editCaseId, isOpen, lookups.claimableStatuses]);

  // Reload handler when optimistic concurrency conflict occurs
  const handleReloadLatest = async () => {
    if (!editCaseId) return;
    setIsLoading(true);
    setConcurrencyConflict(null);
    setErrorMsg(null);
    try {
      const r = await fetch(`/api/issues/${editCaseId}`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      const c: IssueManagementItem = data.caseData;
      const ver = c.case_row_version ?? 1;
      setLoadedRowVersion(ver);
      setFormData({
        row_version: ver,
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat ulang data terbaru.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- VALIDATION RULES COMPUTATION ---
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Delivery Date vs Complaint Date
  const selectedAsset = useMemo(() => {
    return lookups.assets.find((a) => a.unit_asset_id === formData.unit_asset_id);
  }, [lookups.assets, formData.unit_asset_id]);

  const deliveryDateError = useMemo(() => {
    if (selectedAsset?.delivery_date && formData.complaint_date) {
      if (formData.complaint_date < selectedAsset.delivery_date) {
        return `Complaint Date (${formData.complaint_date}) tidak boleh lebih awal dari Delivery Date unit (${selectedAsset.delivery_date}).`;
      }
    }
    return null;
  }, [selectedAsset?.delivery_date, formData.complaint_date]);

  // 2. Closing Date WO vs Complaint Date
  const closingDateWoError = useMemo(() => {
    if (formData.closing_date_wo && formData.complaint_date) {
      if (formData.closing_date_wo < formData.complaint_date) {
        return `Closing Date WO (${formData.closing_date_wo}) tidak boleh lebih awal dari Complaint Date (${formData.complaint_date}).`;
      }
    }
    return null;
  }, [formData.closing_date_wo, formData.complaint_date]);

  // 3. Closing by RFU Date vs Complaint Date
  const closingByRfuError = useMemo(() => {
    if (formData.closing_by_rfu_date && formData.complaint_date) {
      if (formData.closing_by_rfu_date < formData.complaint_date) {
        return `Closing by RFU Date (${formData.closing_by_rfu_date}) tidak boleh lebih awal dari Complaint Date (${formData.complaint_date}).`;
      }
    }
    return null;
  }, [formData.closing_by_rfu_date, formData.complaint_date]);

  // 4. SRD Publication Date vs Goodwill Statement Date
  const srdDateError = useMemo(() => {
    if (formData.goodwill_statement_date && formData.srd_publication_date) {
      if (formData.srd_publication_date < formData.goodwill_statement_date) {
        return `SRD Publication Date (${formData.srd_publication_date}) tidak boleh lebih awal dari Goodwill Statement Date (${formData.goodwill_statement_date}).`;
      }
    }
    return null;
  }, [formData.goodwill_statement_date, formData.srd_publication_date]);

  // 5. Closed WO Requires Closing Date
  const closedDateMissingError = useMemo(() => {
    if (formData.status_wo === 'Closed') {
      if (!formData.closing_date_wo && !formData.closing_by_rfu_date) {
        return "Status WO diatur 'Closed', harap isi minimal salah satu: Closing Date WO atau Closing by RFU Date.";
      }
    }
    return null;
  }, [formData.status_wo, formData.closing_date_wo, formData.closing_by_rfu_date]);

  // 6. Part Readiness vs ETA Date
  const partEtaErrors = useMemo(() => {
    const errors: string[] = [];
    formData.parts.forEach((p, idx) => {
      const r = lookups.readinesses.find((rd) => rd.part_readiness_id === p.part_readiness_id);
      const isBackOrderOrIndent =
        r &&
        (r.readiness_name === 'Back Order' ||
          r.readiness_name === 'Indent (Besi Baja)' ||
          r.readiness_name === 'Fabrikasi Lokal');
      if (isBackOrderOrIndent && (!p.eta_part_date || !p.eta_part_date.trim())) {
        errors.push(
          `Part #${idx + 1} (${p.part_name || p.part_number || 'Unnamed'}) berstatus '${r.readiness_name}' sehingga ETA Date wajib diisi.`
        );
      }
    });
    return errors;
  }, [formData.parts, lookups.readinesses]);

  // 7. Future Date Validation (Factual fields cannot exceed today)
  const futureDateErrors = useMemo(() => {
    const errors: string[] = [];

    if (formData.complaint_date && formData.complaint_date > today) {
      errors.push(`Complaint Date (${formData.complaint_date}) tidak boleh tanggal masa depan (maksimal hari ini: ${today}).`);
    }
    if (formData.closing_date_wo && formData.closing_date_wo > today) {
      errors.push(`Closing Date WO (${formData.closing_date_wo}) tidak boleh tanggal masa depan.`);
    }
    if (formData.closing_by_rfu_date && formData.closing_by_rfu_date > today) {
      errors.push(`Closing by RFU Date (${formData.closing_by_rfu_date}) tidak boleh tanggal masa depan.`);
    }
    if (formData.goodwill_statement_date && formData.goodwill_statement_date > today) {
      errors.push(`Goodwill Statement Date (${formData.goodwill_statement_date}) tidak boleh tanggal masa depan.`);
    }
    if (formData.srd_publication_date && formData.srd_publication_date > today) {
      errors.push(`SRD Publication Date (${formData.srd_publication_date}) tidak boleh tanggal masa depan.`);
    }

    // Checkpoint dates
    for (const step of CHECKPOINT_STEPS) {
      const dt = step.code === 'COMPLAINT_DATE' ? formData.complaint_date : formData.checkpoints[step.code];
      if (dt && dt > today) {
        errors.push(`Checkpoint '${step.label}' (${dt}) tidak boleh tanggal masa depan.`);
      }
    }

    return errors;
  }, [
    today,
    formData.complaint_date,
    formData.closing_date_wo,
    formData.closing_by_rfu_date,
    formData.goodwill_statement_date,
    formData.srd_publication_date,
    formData.checkpoints,
  ]);

  // 8. Checkpoint Chronology Soft Warning
  const checkpointWarnings = useMemo(() => {
    const warnings: string[] = [];
    let lastDate = '';
    let lastLabel = '';

    for (const step of CHECKPOINT_STEPS) {
      const currentDate = step.code === 'COMPLAINT_DATE'
        ? (formData.complaint_date || '')
        : (formData.checkpoints[step.code] || '');

      if (currentDate && currentDate.trim()) {
        if (lastDate && currentDate < lastDate) {
          warnings.push(
            `"${step.label}" (${currentDate}) tercatat sebelum tahapan sebelumnya "${lastLabel}" (${lastDate}).`
          );
        }
        lastDate = currentDate;
        lastLabel = step.label;
      }
    }
    return warnings;
  }, [formData.checkpoints, formData.complaint_date]);

  const hasHardValidationError = Boolean(
    deliveryDateError ||
    closingDateWoError ||
    closingByRfuError ||
    srdDateError ||
    closedDateMissingError ||
    partEtaErrors.length > 0 ||
    futureDateErrors.length > 0
  );

  if (!isOpen) return null;

  // Calculate completion percentage across 5 stages
  const getStageCompletion = () => {
    let completed = 0;
    if (formData.branch_id && formData.customer_id && formData.unit_asset_id && formData.complaint_date) completed++;
    if (formData.root_cause_id || formData.symptom_text) completed++;
    if (Object.keys(formData.checkpoints).length > 0) completed++;
    if (formData.parts.length > 0) completed++;
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

  const handleRemovePartRow = (index: number) => {
    setFormData({
      ...formData,
      parts: formData.parts.filter((_, i) => i !== index),
    });
  };

  const handlePartChange = (index: number, field: string, value: any) => {
    const updated = [...formData.parts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, parts: updated });
  };

  const handleCheckpointChange = (code: string, dateStr: string) => {
    setFormData({
      ...formData,
      checkpoints: {
        ...formData.checkpoints,
        [code]: dateStr,
      },
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setConcurrencyConflict(null);

    // Basic required check
    if (!formData.complaint_date || !formData.branch_id || !formData.customer_id || !formData.unit_asset_id) {
      setErrorMsg('Harap lengkapi Complaint Date, Branch, Customer, dan Unit Asset.');
      setIsSubmitting(false);
      setCurrentStep(1);
      return;
    }

    // Hard business logic check
    if (hasHardValidationError) {
      if (deliveryDateError || futureDateErrors.some((e) => e.includes('Complaint Date'))) {
        setErrorMsg(deliveryDateError || futureDateErrors.find((e) => e.includes('Complaint Date')) || 'Kesalahan pada Step 1.');
        setCurrentStep(1);
      } else if (futureDateErrors.some((e) => e.includes('Checkpoint'))) {
        setErrorMsg(futureDateErrors.find((e) => e.includes('Checkpoint')) || 'Kesalahan tanggal checkpoint masa depan.');
        setCurrentStep(3);
      } else if (partEtaErrors.length > 0) {
        setErrorMsg(partEtaErrors[0]);
        setCurrentStep(4);
      } else if (closedDateMissingError || closingDateWoError || closingByRfuError || srdDateError || futureDateErrors.length > 0) {
        setErrorMsg(
          closedDateMissingError ||
            closingDateWoError ||
            closingByRfuError ||
            srdDateError ||
            futureDateErrors[0] ||
            'Mohon perbaiki kesalahan tanggal logika sebelum menyimpan.'
        );
        setCurrentStep(5);
      } else {
        setErrorMsg('Mohon perbaiki kesalahan data sebelum menyimpan.');
      }
      setIsSubmitting(false);
      return;
    }

    try {
      const url = editCaseId ? `/api/issues/${editCaseId}` : '/api/issues';
      const method = editCaseId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        row_version: editCaseId ? loadedRowVersion : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Concurrency conflict detected
        setConcurrencyConflict(
          data.error ||
            'Konflik Data (Optimistic Locking): Kasus ini telah diperbarui oleh pengguna lain sejak Anda membuka form.'
        );
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data kasus');

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan.');
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
                {loadedRowVersion && (
                  <span
                    title="Optimistic Locking Version"
                    className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-base border border-border text-ink-muted"
                  >
                    v{loadedRowVersion}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Multi-stage tracking intake. Disertai validasi logika bisnis dan deteksi konflik konkurensi data.
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                    isCurrent
                      ? 'bg-surface border-accent-brass text-accent-brass shadow-xs'
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
              <span>Memuat rincian data kasus...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* CONCURRENCY CONFLICT BANNER */}
              {concurrencyConflict && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block text-xs font-bold text-amber-700 dark:text-amber-300">
                        Peringatan Konflik Data (Optimistic Concurrency Control)
                      </strong>
                      <p className="text-[11px] mt-0.5 leading-relaxed">
                        {concurrencyConflict}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={handleReloadLatest}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Muat Ulang Data Terbaru</span>
                    </button>
                  </div>
                </div>
              )}

              {/* GENERAL ERROR BANNER */}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
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
                        className={`w-full px-3 py-2 bg-surface border rounded-md font-mono focus:outline-none transition-colors ${
                          deliveryDateError || futureDateErrors.some((e) => e.includes('Complaint Date'))
                            ? 'border-red-500 text-red-600'
                            : 'border-border focus:border-accent-brass'
                        }`}
                      />
                      {deliveryDateError && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{deliveryDateError}</span>
                        </p>
                      )}
                      {futureDateErrors
                        .filter((e) => e.includes('Complaint Date'))
                        .map((err, i) => (
                          <p key={i} className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-start gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{err}</span>
                          </p>
                        ))}
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

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Unit Asset & Serial (dim_unit_asset) *
                      </label>
                      <select
                        required
                        value={formData.unit_asset_id}
                        onChange={(e) => setFormData({ ...formData, unit_asset_id: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                      >
                        <option value="">-- Select Unit Asset --</option>
                        {lookups.assets.map((a) => (
                          <option key={a.unit_asset_id} value={a.unit_asset_id}>
                            [{a.product_code}] {a.unit_model_name} - S/N: {a.serial_number || 'No Serial'}
                            {a.delivery_date ? ` (Delivered: ${a.delivery_date})` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedAsset && (
                        <div className="mt-2 p-2.5 rounded-md bg-base/60 border border-border text-[11px] space-y-1 animate-in fade-in">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-ink-primary">
                            <span>
                              Riwayat Kasus Unit: <strong className="font-mono text-accent-brass">{selectedAsset.total_issue_cases ?? 0} kasus</strong> tercatat sebelumnya di sistem
                            </span>
                            <span className="font-mono text-[10px] text-ink-muted px-1.5 py-0.5 rounded bg-surface border border-border">
                              Model: {selectedAsset.unit_model_name} | S/N: {selectedAsset.serial_number || '—'}
                            </span>
                          </div>
                          {selectedAsset.delivery_date && (
                            <p className="text-[10px] text-ink-muted font-mono">
                              Delivery Date Unit: {selectedAsset.delivery_date}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Person In Charge (PIC)
                      </label>
                      <select
                        value={formData.pic_id || ''}
                        onChange={(e) => setFormData({ ...formData, pic_id: e.target.value || null })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                      >
                        <option value="">-- Unassigned / Select PIC --</option>
                        {lookups.pics.map((p) => (
                          <option key={p.pic_id} value={p.pic_id}>
                            {p.pic_name} {p.pic_role_code ? `(${p.pic_role_code})` : ''}
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
                        value={formData.hm_value ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hm_value: e.target.value === '' ? null : parseFloat(e.target.value),
                          })
                        }
                        placeholder="e.g. 1450.5"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Unit Condition (ref_unit_condition)
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
                        Issue Type Classification
                      </label>
                      <select
                        value={formData.old_or_new_issue}
                        onChange={(e) => setFormData({ ...formData, old_or_new_issue: e.target.value as any })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-medium"
                      >
                        <option value="New Issue">New Issue</option>
                        <option value="Old Issue">Old Issue (Recurring)</option>
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
                      Catat tanggal penyelesaian tiap checkpoint proses. Dua atau lebih checkpoint yang selesai pada hari yang sama adalah sah.
                    </p>
                  </div>

                  {/* SOFT WARNING BANNER: Only if chronological regression occurs (date strictly < previous date) */}
                  {checkpointWarnings.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Peringatan Urutan Checkpoint Non-Linear (Informatif)</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                        Terdeteksi tanggal checkpoint yang mendahului tahapan proses standarnya. Peringatan ini bersifat <strong>informatif</strong> untuk mengakomodasi fleksibilitas operasional nyata di lapangan, dan data <strong>tetap dapat disimpan</strong>.
                      </p>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 text-amber-800 dark:text-amber-300/80 pt-0.5">
                        {checkpointWarnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {CHECKPOINT_STEPS.map((step) => {
                      const isComplaintDate = step.code === 'COMPLAINT_DATE';
                      const currentDate = isComplaintDate
                        ? formData.complaint_date || ''
                        : formData.checkpoints[step.code] || '';
                      const isRecorded = Boolean(currentDate);

                      return (
                        <div
                          key={step.code}
                          className={`p-3.5 rounded-lg border transition-all ${
                            isComplaintDate
                              ? 'bg-accent-brass/5 border-accent-brass/30 shadow-xs'
                              : isRecorded
                              ? 'bg-[#3B7A57]/5 border-[#3B7A57]/30 shadow-xs'
                              : 'bg-surface border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isComplaintDate
                                    ? 'bg-accent-brass'
                                    : isRecorded
                                    ? 'bg-[#3B7A57]'
                                    : 'bg-ink-muted/30'
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
                              readOnly={isComplaintDate}
                              onChange={(e) => {
                                if (!isComplaintDate) {
                                  handleCheckpointChange(step.code, e.target.value);
                                }
                              }}
                              className={`w-full px-2.5 py-1.5 border rounded text-xs font-mono transition-colors ${
                                isComplaintDate
                                  ? 'bg-base/60 border-border text-ink-primary cursor-not-allowed opacity-90'
                                  : 'bg-surface border-border focus:border-accent-brass'
                              }`}
                            />
                            {isComplaintDate ? (
                              <span className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded bg-accent-brass/10 border border-accent-brass/30 text-accent-brass">
                                Step 1 Sync
                              </span>
                            ) : (
                              isRecorded && (
                                <button
                                  type="button"
                                  onClick={() => handleCheckpointChange(step.code, '')}
                                  title="Clear date"
                                  className="p-1.5 rounded hover:bg-base text-ink-muted hover:text-red-500 transition-colors shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )
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
                  <div className="border-b border-border pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-ink-primary text-sm">Step 4: Spare Parts Requirements</h4>
                      <p className="text-ink-muted text-[11px]">Catat kebutuhan spare part, status kesiapan part, dan estimasi tiba (ETA)</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPartRow}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent-brass/10 hover:bg-accent-brass/20 text-accent-brass border border-accent-brass/30 rounded-md text-xs font-semibold transition-colors self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Part Item</span>
                    </button>
                  </div>

                  {/* Aggregate Supply Status Callout */}
                  {formData.parts.length > 0 && (
                    <div className="p-3 rounded-lg border bg-base/40 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-primary">Status Agregat Pasokan Part:</span>
                        {formData.parts.every((p) => p.is_full_supplied) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#3B7A57]/15 text-[#3B7A57] border border-[#3B7A57]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Full Supplied (Semua part telah lengkap)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Belum Full Supplied ({formData.parts.filter((p) => !p.is_full_supplied).length} part belum lengkap)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-ink-muted font-mono hidden sm:inline">
                        Total {formData.parts.length} Part Item
                      </span>
                    </div>
                  )}

                  {/* PART ETA ERROR BANNER */}
                  {partEtaErrors.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Validasi Kesiapan Part & ETA</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5">
                        {partEtaErrors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {formData.parts.length === 0 ? (
                    <div className="p-8 border border-dashed border-border rounded-lg text-center space-y-2 text-ink-muted">
                      <p className="text-xs italic">Belum ada kebutuhan spare part yang dicatat untuk kasus ini.</p>
                      <button
                        type="button"
                        onClick={handleAddPartRow}
                        className="text-accent-brass hover:underline text-xs font-semibold"
                      >
                        + Tambahkan part pertama
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.parts.map((part, idx) => {
                        const readiness = lookups.readinesses.find((r) => r.part_readiness_id === part.part_readiness_id);
                        const isBackOrderOrIndent =
                          readiness &&
                          (readiness.readiness_name === 'Back Order' ||
                            readiness.readiness_name === 'Indent (Besi Baja)' ||
                            readiness.readiness_name === 'Fabrikasi Lokal');
                        const isMissingEta = isBackOrderOrIndent && (!part.eta_part_date || !part.eta_part_date.trim());

                        return (
                          <div
                            key={idx}
                            className={`p-3.5 bg-base/30 border rounded-lg transition-all space-y-2.5 ${
                              isMissingEta ? 'border-red-500/50 bg-red-500/5' : 'border-border'
                            }`}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-semibold text-ink-muted mb-0.5">
                                  Part Number
                                </label>
                                <input
                                  type="text"
                                  value={part.part_number || ''}
                                  onChange={(e) => handlePartChange(idx, 'part_number', e.target.value)}
                                  placeholder="e.g. 10000-01234"
                                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded font-mono text-xs focus:border-accent-brass"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-semibold text-ink-muted mb-0.5">
                                  Part Description / Name
                                </label>
                                <input
                                  type="text"
                                  value={part.part_name || ''}
                                  onChange={(e) => handlePartChange(idx, 'part_name', e.target.value)}
                                  placeholder="e.g. GASKET KIT"
                                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded text-xs focus:border-accent-brass"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-semibold text-ink-muted mb-0.5">
                                  Readiness Status
                                </label>
                                <select
                                  value={part.part_readiness_id || ''}
                                  onChange={(e) => handlePartChange(idx, 'part_readiness_id', e.target.value || null)}
                                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded text-xs focus:border-accent-brass"
                                >
                                  {lookups.readinesses.map((r) => (
                                    <option key={r.part_readiness_id} value={r.part_readiness_id}>
                                      {r.readiness_name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-semibold text-ink-muted mb-0.5">
                                  ETA Date {isBackOrderOrIndent && <span className="text-red-500 font-bold">*</span>}
                                </label>
                                <input
                                  type="date"
                                  value={part.eta_part_date || ''}
                                  onChange={(e) => handlePartChange(idx, 'eta_part_date', e.target.value)}
                                  className={`w-full px-2 py-1.5 bg-surface border rounded font-mono text-xs focus:outline-none transition-colors ${
                                    isMissingEta
                                      ? 'border-red-500 text-red-600 focus:border-red-500'
                                      : 'border-border focus:border-accent-brass'
                                  }`}
                                />
                              </div>

                              <div className="sm:col-span-1 flex items-center justify-end pt-3 sm:pt-4">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePartRow(idx)}
                                  className="p-1.5 rounded hover:bg-base text-red-500 hover:text-red-600 transition-colors"
                                  title="Hapus baris part"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-border/50 text-[11px]">
                              <label className="flex items-center gap-2 cursor-pointer select-none text-ink-primary hover:text-accent-brass transition-colors">
                                <input
                                  type="checkbox"
                                  checked={Boolean(part.is_full_supplied)}
                                  onChange={(e) => handlePartChange(idx, 'is_full_supplied', e.target.checked)}
                                  className="rounded border-border text-accent-brass focus:ring-accent-brass/20 w-3.5 h-3.5"
                                />
                                <span className="font-semibold">Part Sudah Diterima Lengkap (Full Supplied)</span>
                              </label>

                              {isMissingEta && (
                                <span className="text-red-500 text-[10px] font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Status {readiness?.readiness_name} mewajibkan pengisian ETA Date.
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
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

                  {/* CLOSED WO DATE REQUIREMENT BANNER */}
                  {closedDateMissingError && (
                    <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-xs font-bold">Validasi Penutupan Kasus (WO Closure)</strong>
                        <p className="text-[11px] mt-0.5 leading-relaxed">
                          {closedDateMissingError}
                        </p>
                      </div>
                    </div>
                  )}

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
                        className={`w-full px-3 py-2 bg-surface border rounded-md focus:border-accent-brass font-bold ${
                          closedDateMissingError ? 'border-red-500 text-red-600' : 'border-border'
                        }`}
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
                        className={`w-full px-3 py-2 bg-surface border rounded-md font-mono focus:outline-none transition-colors ${
                          closingDateWoError || (formData.closing_date_wo && formData.closing_date_wo > today)
                            ? 'border-red-500 text-red-600'
                            : 'border-border focus:border-accent-brass'
                        }`}
                      />
                      {closingDateWoError && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{closingDateWoError}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Closing by RFU Date (PTA/Local Part)
                      </label>
                      <input
                        type="date"
                        value={formData.closing_by_rfu_date || ''}
                        onChange={(e) => setFormData({ ...formData, closing_by_rfu_date: e.target.value })}
                        className={`w-full px-3 py-2 bg-surface border rounded-md font-mono focus:outline-none transition-colors ${
                          closingByRfuError || (formData.closing_by_rfu_date && formData.closing_by_rfu_date > today)
                            ? 'border-red-500 text-red-600'
                            : 'border-border focus:border-accent-brass'
                        }`}
                      />
                      {closingByRfuError && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{closingByRfuError}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-muted mb-1 text-[11px]">
                        Goodwill Statement Date
                      </label>
                      <input
                        type="date"
                        value={formData.goodwill_statement_date || ''}
                        onChange={(e) => setFormData({ ...formData, goodwill_statement_date: e.target.value })}
                        className={`w-full px-3 py-2 bg-surface border rounded-md font-mono focus:outline-none transition-colors ${
                          formData.goodwill_statement_date && formData.goodwill_statement_date > today
                            ? 'border-red-500 text-red-600'
                            : 'border-border focus:border-accent-brass'
                        }`}
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
                        className={`w-full px-3 py-2 bg-surface border rounded-md font-mono focus:outline-none transition-colors ${
                          srdDateError || (formData.srd_publication_date && formData.srd_publication_date > today)
                            ? 'border-red-500 text-red-600'
                            : 'border-border focus:border-accent-brass'
                        }`}
                      />
                      {srdDateError && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{srdDateError}</span>
                        </p>
                      )}
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
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || isLoading || hasHardValidationError}
              title={
                hasHardValidationError
                  ? 'Harap perbaiki kesalahan tanggal logika sebelum menyimpan'
                  : undefined
              }
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
