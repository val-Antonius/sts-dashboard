'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  IssueManagementItem,
} from '@/types/database';
import { IssueEditorModal } from './IssueEditorModal';
import { Pagination } from '@/components/common/Pagination';
import {
  Search,
  Plus,
  Filter,
  Layers,
  Edit2,
  Trash2,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export interface IssueManagementViewProps {
  initialItems: IssueManagementItem[];
  initialTotal: number;
  initialKpis?: {
    total: number;
    open_count: number;
    closed_count: number;
    overdue_count: number;
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

export function IssueManagementView({
  initialItems,
  initialTotal,
  initialKpis,
  lookups,
}: IssueManagementViewProps) {
  const [items, setItems] = useState<IssueManagementItem[]>(initialItems);
  const [totalCount, setTotalCount] = useState<number>(initialTotal);
  const [kpiMetrics, setKpiMetrics] = useState(
    initialKpis || {
      total: initialTotal,
      open_count: initialItems.filter((i) => i.status_wo === 'Belum Closed').length,
      closed_count: initialItems.filter((i) => i.status_wo === 'Closed').length,
      overdue_count: initialItems.filter((i) => i.status_wo === 'Belum Closed' && i.achievement === 'Not Achieved').length,
    }
  );
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusWo, setStatusWo] = useState('ALL');
  const [branchId, setBranchId] = useState('ALL');
  const [claimableStatusId, setClaimableStatusId] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch filtered data
  const refetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusWo !== 'ALL') params.set('status_wo', statusWo);
      if (branchId !== 'ALL') params.set('branch_id', branchId);
      if (claimableStatusId !== 'ALL') params.set('claimable_status_id', claimableStatusId);
      params.set('limit', '100');

      const res = await fetch(`/api/issues?${params.toString()}`);
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
        setTotalCount(data.total);
        if (data.kpis) {
          setKpiMetrics(data.kpis);
        }
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    refetchData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusWo('ALL');
    setBranchId('ALL');
    setClaimableStatusId('ALL');
    setCurrentPage(1);
    setIsLoading(true);
    fetch('/api/issues?limit=100')
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setItems(data.items);
          setTotalCount(data.total);
          if (data.kpis) {
            setKpiMetrics(data.kpis);
          }
        }
      })
      .finally(() => setIsLoading(false));
  };

  const openCreateModal = () => {
    setEditingCaseId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (caseId: string) => {
    setEditingCaseId(caseId);
    setIsModalOpen(true);
  };

  const handleDeleteExecute = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/issues/${deleteConfirm.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete issue');

      setDeleteConfirm(null);
      refetchData();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Pagination (15 rows standard)
  const pageSize = 15;
  const totalPages = Math.ceil(items.length / pageSize);
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const paginatedItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink-primary tracking-tight">Issue Management & Process Tracking</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Operational daily workflow: create issues, log diagnostic checkpoints, manage parts, and track warranty claims
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent-brass text-white text-xs font-bold rounded-lg hover:bg-accent-brass/90 transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Issue</span>
        </button>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Issues Filtered</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-ink-primary font-mono">{kpiMetrics.total}</div>
          <span className="text-[11px] text-ink-muted">Recorded cases in view</span>
        </div>

        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active In-Progress</span>
            <Clock className="w-3.5 h-3.5 text-accent-brass" />
          </div>
          <div className="text-2xl font-bold text-accent-brass font-mono">{kpiMetrics.open_count}</div>
          <span className="text-[11px] text-ink-muted">Work order status: Belum Closed</span>
        </div>

        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Closed Cases</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#3B7A57]" />
          </div>
          <div className="text-2xl font-bold text-[#3B7A57] font-mono">{kpiMetrics.closed_count}</div>
          <span className="text-[11px] text-ink-muted">Resolved & RFU complete</span>
        </div>

        <div className="p-4 bg-surface border border-border rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Overdue Active Cases</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#A54B3F]" />
          </div>
          <div className="text-2xl font-bold text-[#A54B3F] font-mono">{kpiMetrics.overdue_count}</div>
          <span className="text-[11px] text-ink-muted">Exceeding SLA benchmark</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-surface border border-border rounded-lg shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Customer, Serial, Model, PIC, WO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-base/50 border border-border rounded-md focus:outline-none focus:border-accent-brass transition-colors"
            />
          </div>

          {/* WO Status Filter */}
          <div>
            <select
              value={statusWo}
              onChange={(e) => setStatusWo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-base/50 border border-border rounded-md focus:outline-none focus:border-accent-brass transition-colors"
            >
              <option value="ALL">All WO Status</option>
              <option value="Belum Closed">Belum Closed (Active)</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-base/50 border border-border rounded-md focus:outline-none focus:border-accent-brass transition-colors"
            >
              <option value="ALL">All Branches</option>
              {lookups.branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_code} - {b.branch_name || b.city_name || 'Branch'}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-accent-brass text-white text-xs font-semibold rounded-md hover:bg-accent-brass/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
              <span>Filter</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset Filters"
              className="p-2 rounded-md border border-border text-ink-muted hover:text-ink-primary hover:bg-base transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Main Issues Table */}
      <div className="bg-surface border border-border rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-base/50 text-ink-muted font-medium">
                <th className="py-3 px-4">Complaint Date</th>
                <th className="py-3 px-4">Customer & Classification</th>
                <th className="py-3 px-4">Branch & PIC</th>
                <th className="py-3 px-4">Unit Model & Serial</th>
                <th className="py-3 px-4">Technical Root Cause</th>
                <th className="py-3 px-4">SLA / Aging</th>
                <th className="py-3 px-4">WO Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent-brass mb-2" />
                    <span>Loading issues...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted italic">
                    No issue cases match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((row) => {
                  const isOpen = row.status_wo === 'Belum Closed';
                  const isOverdue = row.achievement === 'Not Achieved';

                  return (
                    <tr key={row.issue_case_id} className="hover:bg-surface-hover/60 transition-colors">
                      {/* 1. Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums">
                        <div className="font-semibold text-ink-primary">{row.complaint_date}</div>
                        <div className="text-[10px] text-ink-muted">
                          {row.old_or_new_issue}
                        </div>
                      </td>

                      {/* 2. Customer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-ink-primary">{row.customer_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                              row.golongan_customer === 'KA Nasional'
                                ? 'bg-accent-brass/15 text-accent-brass border border-accent-brass/30'
                                : 'bg-base text-ink-muted border border-border'
                            }`}
                          >
                            {row.golongan_customer}
                          </span>
                        </div>
                      </td>

                      {/* 3. Branch & PIC */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-base border border-border text-[10px]">
                            {row.branch_code}
                          </span>
                          <span className="font-medium text-ink-primary">{row.pic_name || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* 4. Unit Model & Serial */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink-primary">
                          [{row.product_code}] {row.unit_model_name}
                        </div>
                        <div className="font-mono text-[10px] text-ink-muted">
                          S/N: {row.serial_number || '—'}
                        </div>
                      </td>

                      {/* 5. Root Cause */}
                      <td className="py-3 px-4">
                        <div className="text-ink-primary font-medium">
                          {row.root_cause_name || (
                            <span className="text-ink-muted italic">Not Recorded</span>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          {row.claimable_status_name || 'Claim status pending'}
                        </div>
                      </td>

                      {/* 6. SLA Aging */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div
                          className={`font-bold ${
                            isOverdue ? 'text-[#A54B3F]' : 'text-[#3B7A57]'
                          }`}
                        >
                          {row.solution_time_days} days
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          Target: ≤{row.achievement_threshold_days}d
                        </div>
                      </td>

                      {/* 7. WO Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit ${
                            isOpen
                              ? 'bg-accent-brass/15 text-accent-brass border border-accent-brass/30'
                              : 'bg-[#3B7A57]/15 text-[#3B7A57] border border-[#3B7A57]/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOpen ? 'bg-accent-brass' : 'bg-[#3B7A57]'
                            }`}
                          />
                          <span>{row.status_wo}</span>
                        </span>
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(row.issue_case_id)}
                            title="Edit & Process Checkpoints"
                            className="p-1.5 rounded hover:bg-base text-ink-muted hover:text-accent-brass transition-colors border border-border"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            href={`/operations/diagnostic?id=${row.issue_case_id}`}
                            title="View Case Diagnostic"
                            className="p-1.5 rounded hover:bg-base text-ink-muted hover:text-ink-primary transition-colors border border-border"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => setDeleteConfirm({ id: row.issue_case_id, name: `${row.customer_name} (${row.unit_model_name})` })}
                            title="Delete Issue Case"
                            className="p-1.5 rounded hover:bg-base text-red-500/70 hover:text-red-600 transition-colors border border-border"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={safePage}
          totalItems={items.length}
          pageSize={15}
          onPageChange={setCurrentPage}
          itemLabel="issue cases"
        />
      </div>

      {/* ISSUE EDITOR / CREATOR MODAL */}
      <IssueEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={refetchData}
        editCaseId={editingCaseId}
        lookups={lookups}
      />

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink-primary">Delete Issue Case</h3>
                <p className="text-ink-muted text-xs mt-1">
                  Are you sure you want to delete issue case for <strong>{deleteConfirm.name}</strong>? This will remove all associated timelines, spare parts, and claim records.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-md border border-border text-ink-muted hover:text-ink-primary hover:bg-base"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExecute}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
