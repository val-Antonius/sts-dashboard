'use client';

import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';

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
}: MasterDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

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

  return (
    <div className="bg-surface border border-border rounded-lg shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-base/20">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink-primary">{title}</h3>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.2 rounded-full bg-base border border-border text-ink-muted">
              {filteredData.length} records
            </span>
          </div>
          {description && (
            <p className="text-xs text-ink-muted mt-0.5">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-md focus:outline-none focus:border-accent-brass transition-colors w-48 sm:w-60"
            />
          </div>

          {/* Add Button */}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-brass text-white text-xs font-semibold rounded-md hover:bg-accent-brass/90 transition-colors shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
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
                <th key={idx} className={`py-2.5 px-4 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="py-2.5 px-4 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="py-8 text-center text-ink-muted text-xs italic"
                >
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-surface-hover/60 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`py-2.5 px-4 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row)
                        : col.accessor
                        ? String(row[col.accessor] ?? '—')
                        : '—'}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            title="Edit Record"
                            className="p-1 rounded hover:bg-base text-ink-muted hover:text-ink-primary transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            title="Delete Record"
                            className="p-1 rounded hover:bg-base text-[#A54B3F]/70 hover:text-[#A54B3F] transition-colors"
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
    </div>
  );
}
