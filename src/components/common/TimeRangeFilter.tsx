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
      <div className="inline-flex rounded-md border border-border bg-surface p-0.5 shadow-sm">
        {options.map((opt) => {
          const isActive = selectedRange === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isActive
                  ? 'bg-accent-brass text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink-primary hover:bg-surface-hover'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {showCustomPicker && (
        <form onSubmit={handleApplyCustom} className="flex items-center gap-1.5 text-xs bg-surface border border-border px-2.5 py-1 rounded-md shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-ink-muted" />
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-transparent text-ink-primary border border-border rounded px-1.5 py-0.5 text-xs focus:outline-hidden focus:border-accent-brass"
            required
          />
          <span className="text-ink-muted">—</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-transparent text-ink-primary border border-border rounded px-1.5 py-0.5 text-xs focus:outline-hidden focus:border-accent-brass"
            required
          />
          <button
            type="submit"
            className="bg-accent-brass text-white px-2 py-0.5 rounded text-xs font-medium hover:opacity-90"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
