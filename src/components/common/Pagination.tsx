'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 15,
  onPageChange,
  itemLabel = 'records',
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // If there's only 1 page and rows <= pageSize, show a clean record counter bar
  if (totalPages <= 1) {
    return (
      <div className="px-4 py-2.5 border-t border-border bg-base/30 flex items-center justify-between text-xs text-ink-muted">
        <span>
          Showing all <strong className="text-ink-primary font-mono">{totalItems}</strong> {itemLabel}
        </span>
        <span className="text-[11px] font-mono text-ink-muted">Page 1 of 1</span>
      </div>
    );
  }

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="px-4 py-2.5 border-t border-border bg-base/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      {/* Item Range Counter */}
      <div className="text-ink-muted">
        Showing <span className="font-mono font-semibold text-ink-primary">{startItem}</span>–
        <span className="font-mono font-semibold text-ink-primary">{endItem}</span> of{' '}
        <span className="font-mono font-semibold text-ink-primary">{totalItems}</span> {itemLabel}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First Page"
          className="p-1.5 rounded-md border border-border text-ink-muted hover:text-ink-primary hover:bg-surface disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous Page"
          className="p-1.5 rounded-md border border-border text-ink-muted hover:text-ink-primary hover:bg-surface disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Number Buttons */}
        <div className="flex items-center gap-1 px-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-ink-muted select-none">
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[28px] h-7 px-2 text-xs font-mono font-medium rounded-md transition-colors flex items-center justify-center ${
                  isActive
                    ? 'bg-accent-brass text-white font-bold shadow-xs'
                    : 'border border-border text-ink-muted hover:text-ink-primary hover:bg-surface'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next Page"
          className="p-1.5 rounded-md border border-border text-ink-muted hover:text-ink-primary hover:bg-surface disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last Page"
          className="p-1.5 rounded-md border border-border text-ink-muted hover:text-ink-primary hover:bg-surface disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
