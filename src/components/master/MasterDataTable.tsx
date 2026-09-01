'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface MasterDataTableProps<T> {
  title: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  addLabel?: string;
  pageSize?: number;
}

export function MasterDataTable<T extends { [key: string]: any }>({
  title,
  description,
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchFields = [],
  onAdd,
  onEdit,
  onDelete,
  addLabel = 'Add New',
  pageSize = 15,
}: MasterDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredData = data.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchFields.length === 0) {
      return Object.values(item).some(
        (val) => val && String(val).toLowerCase().includes(term)
      );
    }
    return searchFields.some((field) => {
      const val = item[field];
      return val && String(val).toLowerCase().includes(term);
    });
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const paginatedData = filteredData.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="bg-surface border border-border rounded-lg shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-4.5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-base/20">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-ink-primary truncate">{title}</h3>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-base border border-border text-ink-muted shrink-0">
              {filteredData.length} records
            </span>
          </div>
          {description && (
            <p className="text-[11px] text-ink-muted mt-0.5 leading-snug">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-md focus:outline-none focus:border-accent-brass transition-all w-36 sm:w-44 focus:w-48"
            />
          </div>

          {/* Add Button */}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-brass text-white text-xs font-semibold rounded-md hover:bg-accent-brass/90 transition-colors shrink-0 shadow-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-base/50 text-ink-muted font-medium">
              {columns.map((col, idx) => (
                <th key={idx} className={`py-3 px-4 sm:px-5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="py-3 px-4 sm:px-5 text-right pr-5">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="py-8 text-center text-ink-muted text-xs italic"
                >
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-surface-hover/60 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`py-3 px-4 sm:px-5 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row)
                        : col.accessor
                        ? String(row[col.accessor] ?? '—')
                        : '—'}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="py-3 px-4 sm:px-5 text-right whitespace-nowrap pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            title="Edit Record"
                            className="p-1.5 rounded hover:bg-base text-ink-muted hover:text-ink-primary transition-colors border border-transparent hover:border-border"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            title="Delete Record"
                            className="p-1.5 rounded hover:bg-base text-[#A54B3F]/70 hover:text-[#A54B3F] transition-colors border border-transparent hover:border-border"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <Pagination
        currentPage={safePage}
        totalItems={filteredData.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="records"
      />
    </div>
  );
}
