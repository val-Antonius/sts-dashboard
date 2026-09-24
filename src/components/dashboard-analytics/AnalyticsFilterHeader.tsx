'use client';

import React from 'react';
import { Users, ShieldCheck, Layers, Loader2 } from 'lucide-react';
import { TimeRangeFilter, TimeRangeOption } from '@/components/common/TimeRangeFilter';

interface AnalyticsFilterHeaderProps {
  title: string;
  subtitle?: string; // Optional for backward compatibility, will not be rendered
  range: TimeRangeOption;
  selectedSegment: 'all' | 'All Customer' | 'KA Nasional';
  customStart?: string;
  customEnd?: string;
  loading: boolean;
  onRangeChange: (range: TimeRangeOption, start?: string, end?: string) => void;
  onSegmentChange: (segment: 'all' | 'All Customer' | 'KA Nasional') => void;
}

export function AnalyticsFilterHeader({
  title,
  range,
  selectedSegment,
  customStart,
  customEnd,
  loading,
  onRangeChange,
  onSegmentChange,
}: AnalyticsFilterHeaderProps) {
  return (
    <div className="space-y-3 pb-1">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-ink-primary tracking-tight font-sans">
          {title}
        </h2>
      </div>

      {/* Divider */}
      <div className="border-b border-border" />

      {/* Filter Row: Segment on the left, Time on the right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Left: Customer Segment Filter */}
        <div className="flex items-center gap-1 p-0.5 bg-base/80 border border-border rounded-lg shadow-xs self-start">
          <button
            type="button"
            onClick={() => onSegmentChange('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              selectedSegment === 'all'
                ? 'bg-surface text-accent-brass shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Segmen</span>
          </button>
          <button
            type="button"
            onClick={() => onSegmentChange('All Customer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              selectedSegment === 'All Customer'
                ? 'bg-surface text-accent-brass shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Customer</span>
          </button>
          <button
            type="button"
            onClick={() => onSegmentChange('KA Nasional')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              selectedSegment === 'KA Nasional'
                ? 'bg-surface text-accent-brass shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>KA Nasional</span>
          </button>
        </div>

        {/* Right: Time Range Filter & Loading Spinner */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-brass" />}
          <TimeRangeFilter
            selectedRange={range}
            onChange={onRangeChange}
            customStart={customStart}
            customEnd={customEnd}
          />
        </div>
      </div>
    </div>
  );
}
