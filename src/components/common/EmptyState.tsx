import React from 'react';
import { Database } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  className?: string;
}

export function EmptyState({
  message = 'No historical data available for this criteria',
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center text-ink-muted border border-dashed border-border rounded-lg bg-surface/50 ${className}`}
    >
      <Database className="w-8 h-8 mb-2 stroke-1 text-ink-muted/60" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
