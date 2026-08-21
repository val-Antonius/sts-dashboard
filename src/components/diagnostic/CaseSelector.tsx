'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaseOption } from '@/lib/queries/diagnostic';
import { Search, ChevronDown } from 'lucide-react';

interface CaseSelectorProps {
  cases: CaseOption[];
  selectedCaseId: string;
}

export function CaseSelector({ cases, selectedCaseId }: CaseSelectorProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedCase = cases.find((c) => c.issue_case_id === selectedCaseId);

  const filteredCases = cases.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.customer_name?.toLowerCase().includes(q) ||
      c.serial_number?.toLowerCase().includes(q) ||
      c.branch_code?.toLowerCase().includes(q) ||
      c.unit_model_name?.toLowerCase().includes(q)
    );
  });

  const handleSelect = (id: string) => {
    setIsOpen(false);
    setSearchTerm('');
    router.push(`/case-solution-process/diagnostic?id=${id}`);
  };

  return (
    <div className="relative w-full max-w-xl">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-surface border border-border cursor-pointer shadow-xs hover:border-accent-brass transition-colors"
      >
        <div className="flex items-center gap-2 overflow-hidden text-xs">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          {selectedCase ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-ink-primary truncate">
                {selectedCase.customer_name}
              </span>
              <span className="font-mono text-ink-muted text-[11px] px-1.5 py-0.2 bg-base rounded border border-border">
                {selectedCase.branch_code}
              </span>
              <span className="font-mono text-ink-muted text-[11px] truncate">
                SN: {selectedCase.serial_number || '—'}
              </span>
            </div>
          ) : (
            <span className="text-ink-muted">Select or search a case...</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-ink-muted shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-30 max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border bg-base/50">
            <input
              type="text"
              placeholder="Search customer, serial number, model, branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded focus:outline-hidden focus:border-accent-brass text-ink-primary"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto divide-y divide-border">
            {filteredCases.length > 0 ? (
              filteredCases.map((c) => {
                const isSelected = c.issue_case_id === selectedCaseId;
                return (
                  <button
                    key={c.issue_case_id}
                    onClick={() => handleSelect(c.issue_case_id)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-surface-hover transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-accent-brass/10 font-semibold' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-ink-primary">{c.customer_name}</div>
                      <div className="text-[11px] text-ink-muted font-mono mt-0.5 flex items-center gap-2">
                        <span>{c.unit_model_name}</span>
                        <span>•</span>
                        <span>SN: {c.serial_number || '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-base border border-border rounded text-ink-muted">
                        {c.branch_code}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          c.status_wo === 'Closed'
                            ? 'bg-[#3B7A57]/15 text-[#3B7A57]'
                            : 'bg-[#B8863B]/15 text-[#B8863B]'
                        }`}
                      >
                        {c.status_wo}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-ink-muted">No cases found matching &quot;{searchTerm}&quot;</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
