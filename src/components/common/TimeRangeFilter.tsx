'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

export type TimeRangeOption =
  | 'this_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_1_year'
  | 'custom';

interface TimeRangeFilterProps {
  selectedRange: TimeRangeOption;
  onChange: (range: TimeRangeOption, customStart?: string, customEnd?: string) => void;
  customStart?: string;
  customEnd?: string;
}

export function TimeRangeFilter({
  selectedRange,
  onChange,
  customStart: initialStart = '',
  customEnd: initialEnd = '',
}: TimeRangeFilterProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(selectedRange === 'custom');
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  const options: { id: TimeRangeOption; label: string }[] = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_3_months', label: 'Last 3 Months' },
    { id: 'last_6_months', label: 'Last 6 Months' },
    { id: 'last_1_year', label: 'Last 1 Year' },
    { id: 'custom', label: 'Custom' },
  ];

  const handleSelect = (id: TimeRangeOption) => {
    if (id === 'custom') {
      setShowCustomPicker(true);
      if (start && end) {
        onChange('custom', start, end);
      }
    } else {
      setShowCustomPicker(false);
      onChange(id);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (start && end) {
      onChange('custom', start, end);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-border bg-base/50 p-0.5 shadow-xs">
        {options.map((opt) => {
          const isActive = selectedRange === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                isActive
                  ? 'bg-surface text-accent-brass shadow-xs font-semibold'
                  : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {showCustomPicker && (
        <form
          onSubmit={handleApplyCustom}
          className="inline-flex items-center gap-1.5 text-xs bg-surface border border-border px-2.5 py-1 rounded-lg shadow-xs animate-in fade-in"
        >
          <Calendar className="w-3.5 h-3.5 text-ink-muted shrink-0" />
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-transparent text-ink-primary font-mono text-xs focus:outline-none"
            required
          />
          <span className="text-ink-muted text-xs">—</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-transparent text-ink-primary font-mono text-xs focus:outline-none"
            required
          />
          <button
            type="submit"
            className="bg-accent-brass text-white px-2.5 py-0.5 rounded text-xs font-bold hover:bg-accent-brass/90 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
