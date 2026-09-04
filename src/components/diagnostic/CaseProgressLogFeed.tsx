'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CaseProgressLog, SingleCaseDetail } from '@/types/database';
import {
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  Clock,
  User,
  AlertCircle,
  Check,
  Info,
} from 'lucide-react';

interface CaseProgressLogFeedProps {
  caseDetail: SingleCaseDetail;
  initialLogs: CaseProgressLog[];
}

export function CaseProgressLogFeed({
  caseDetail,
  initialLogs,
}: CaseProgressLogFeedProps) {
  const [logs, setLogs] = useState<CaseProgressLog[]>(initialLogs);
  const issueCaseId = caseDetail.issue_case_id;
  const complaintDate = caseDetail.complaint_date;
  const isClosed = caseDetail.status_wo === 'Closed';
  const today = new Date().toISOString().split('T')[0];

  // Max allowed date: If closed, max is closing_date_wo; if open, max is today
  const maxAllowedDate = useMemo(() => {
    if (isClosed && caseDetail.closing_date_wo) {
      return caseDetail.closing_date_wo;
    }
    return today;
  }, [isClosed, caseDetail.closing_date_wo, today]);

  // Default initial date: If closed and complaintDate > today (or if closing is before today), clamp to maxAllowedDate
  const defaultDate = useMemo(() => {
    if (isClosed && maxAllowedDate && today > maxAllowedDate) {
      return maxAllowedDate;
    }
    return today;
  }, [isClosed, maxAllowedDate, today]);

  // New Log State
  const [newDate, setNewDate] = useState<string>(defaultDate);
  const [newText, setNewText] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Inline Edit State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editText, setEditText] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Inline Delete State
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Sync state whenever caseDetail or initialLogs change
  useEffect(() => {
    setLogs(initialLogs);
    setEditingLogId(null);
    setEditDate('');
    setEditText('');
    setEditError(null);
    setAddError(null);
    setNewText('');
    setNewDate(defaultDate);
  }, [caseDetail.issue_case_id, initialLogs, defaultDate]);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Validation function
  const validateLogInput = (date: string, text: string): string | null => {
    if (!text.trim()) {
      return 'Catatan perkembangan tidak boleh kosong.';
    }
    if (text.trim().length > 2000) {
      return 'Panjang catatan perkembangan maksimal 2000 karakter.';
    }
    if (complaintDate && date < complaintDate) {
      return `Tanggal log (${date}) tidak boleh lebih awal dari Complaint Date kasus (${complaintDate}).`;
    }
    if (isClosed && maxAllowedDate && date > maxAllowedDate) {
      return `Kasus ini sudah Closed. Tanggal log (${date}) tidak boleh melebihi Closing Date WO (${maxAllowedDate}).`;
    }
    return null;
  };

  // --- 1. HANDLE ADD NEW LOG ---
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateLogInput(newDate, newText);
    if (validationError) {
      setAddError(validationError);
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const res = await fetch(`/api/diagnostic/${issueCaseId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_date: newDate,
          log_text: newText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan log');

      setLogs((prev) => [data, ...prev]);
      setNewText('');
      setNewDate(defaultDate);
    } catch (err: any) {
      setAddError(err.message || 'Terjadi kesalahan saat menambah log.');
    } finally {
      setIsAdding(false);
    }
  };

  // --- 2. HANDLE INLINE EDIT ---
  const handleStartEdit = (log: CaseProgressLog) => {
    if (!log.log_id) return;
    setEditingLogId(log.log_id);
    setEditDate(log.log_date);
    setEditText(log.log_text);
    setEditError(null);
    setDeletingLogId(null);
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditDate('');
    setEditText('');
    setEditError(null);
  };

  const handleSaveEdit = async (logId: string) => {
    const validationError = validateLogInput(editDate, editText);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/diagnostic/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_date: editDate,
          log_text: editText.trim(),
        }),
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Gagal memperbarui log');

      setLogs((prev) =>
        prev.map((l) =>
          l.log_id === logId
            ? { ...l, log_date: editDate, log_text: editText.trim() }
            : l
        )
      );
      handleCancelEdit();
    } catch (err: any) {
      setEditError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // --- 3. HANDLE DELETE LOG ---
  const handleDeleteLog = async (logId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/diagnostic/logs/${logId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus log');
      }

      setLogs((prev) => prev.filter((l) => l.log_id !== logId));
      setDeletingLogId(null);
    } catch (err: any) {
      alert('Gagal menghapus log: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* 1. COMPACT INLINE QUICK-CREATE BAR (Horizontal Single Row) */}
      <div className="p-3 sm:p-3.5 bg-base/40 border-b border-border">
        <form onSubmit={handleAddLog} className="space-y-2">
          {addError && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Date Input with Dynamic Min/Max Bounds */}
            <div className="w-full sm:w-36 shrink-0">
              <input
                type="date"
                required
                min={complaintDate || undefined}
                max={maxAllowedDate || undefined}
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setAddError(null);
                }}
                className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono focus:outline-none focus:border-accent-brass transition-colors shadow-xs"
                title={`Rentang tanggal valid: ${complaintDate} s/d ${maxAllowedDate}`}
              />
            </div>

            {/* Narrative Input (Single Row Auto-Grow) */}
            <div className="flex-1 w-full">
              <input
                type="text"
                required
                value={newText}
                onChange={(e) => {
                  setNewText(e.target.value);
                  setAddError(null);
                }}
                placeholder="Tulis catatan aktivitas / perkembangan harian kasus (Enter atau klik Tambah)..."
                className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:border-accent-brass transition-colors shadow-xs"
              />
            </div>

            {/* Quick Add Button */}
            <button
              type="submit"
              disabled={isAdding || !newText.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-1 px-3.5 py-1.5 bg-accent-brass hover:bg-accent-brass/90 text-white rounded-lg text-xs font-bold transition-colors shadow-xs shrink-0 disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Tambah Log</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. LOG FEED HEADER & SUMMARY */}
      <div className="px-4 py-2.5 bg-base/20 border-b border-border flex items-center justify-between text-[11px] text-ink-muted">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-accent-brass" />
          <span className="font-bold text-ink-primary uppercase tracking-wider text-[11px]">
            Riwayat Aktivitas ({logs.length})
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span>Rentang Valid: <strong className="font-mono text-ink-primary">{complaintDate || '—'}</strong> s/d <strong className="font-mono text-ink-primary">{maxAllowedDate || 'Hari ini'}</strong></span>
        </div>
      </div>

      {/* 3. HIGH-DENSITY TIMELINE / ACTIVITY ROWS */}
      {logs.length === 0 ? (
        <div className="py-10 text-center text-xs text-ink-muted italic">
          Belum ada catatan aktivitas harian yang tercatat untuk kasus ini.
        </div>
      ) : (
        <div className="divide-y divide-border/60 max-h-[520px] overflow-y-auto">
          {logs.map((log, idx) => {
            const isEditingThis = editingLogId === log.log_id;
            const isDeletingThis = deletingLogId === log.log_id;

            return (
              <div
                key={log.log_id || idx}
                className={`group relative px-4 py-2.5 transition-colors ${
                  isEditingThis
                    ? 'bg-accent-brass/5'
                    : 'hover:bg-surface-hover/50'
                }`}
              >
                {/* INLINE EDIT MODE (Compact Single Row) */}
                {isEditingThis ? (
                  <div className="space-y-2 py-1">
                    {editError && (
                      <div className="p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-1 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="date"
                        min={complaintDate || undefined}
                        max={maxAllowedDate || undefined}
                        value={editDate}
                        onChange={(e) => {
                          setEditDate(e.target.value);
                          setEditError(null);
                        }}
                        className="w-full sm:w-36 px-2.5 py-1 bg-surface border border-border rounded text-xs font-mono focus:border-accent-brass"
                      />
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => {
                          setEditText(e.target.value);
                          setEditError(null);
                        }}
                        className="w-full flex-1 px-3 py-1 bg-surface border border-border rounded text-xs focus:border-accent-brass"
                      />
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSavingEdit}
                          className="px-2.5 py-1 text-xs border border-border rounded text-ink-muted hover:bg-base"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => log.log_id && handleSaveEdit(log.log_id)}
                          disabled={isSavingEdit || !editText.trim()}
                          className="flex items-center gap-1 px-3 py-1 bg-accent-brass text-white text-xs font-bold rounded hover:bg-accent-brass/90"
                        >
                          {isSavingEdit ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>Simpan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* NORMAL DENSE ROW (High Horizontal Utilization) */
                  <div className="flex items-start justify-between gap-3 text-xs">
                    {/* Left: Date Badge + Author */}
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-base border border-border text-ink-primary whitespace-nowrap">
                        {log.log_date}
                      </span>
                      {log.pic_name && (
                        <span className="text-[10px] text-ink-muted hidden md:inline-block max-w-[120px] truncate font-medium">
                          {log.pic_name}
                        </span>
                      )}
                    </div>

                    {/* Middle: Narrative Text */}
                    <div className="flex-1 text-ink-primary leading-relaxed whitespace-pre-wrap pt-0.5">
                      {log.log_text}
                    </div>

                    {/* Right: Hover Actions (Compact) */}
                    {log.log_id && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(log)}
                          title="Edit catatan ini"
                          className="p-1 rounded text-ink-muted hover:text-accent-brass hover:bg-base transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingLogId(log.log_id || null)}
                          title="Hapus catatan ini"
                          className="p-1 rounded text-ink-muted hover:text-red-500 hover:bg-base transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* INLINE DELETE CONFIRMATION */}
                {isDeletingThis && (
                  <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                    <span className="text-red-700 dark:text-red-300 text-[11px] font-medium">
                      Hapus log tanggal <strong>{log.log_date}</strong>?
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeletingLogId(null)}
                        disabled={isDeleting}
                        className="px-2 py-0.5 text-[10px] rounded border border-border text-ink-muted hover:bg-base"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => log.log_id && handleDeleteLog(log.log_id)}
                        disabled={isDeleting}
                        className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                      >
                        {isDeleting && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
