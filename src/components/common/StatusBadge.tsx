import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'ok' | 'warn' | 'danger' | 'neutral' | 'invert';
  className?: string;
}

export function StatusBadge({ status, variant, className = '' }: StatusBadgeProps) {
  let computedVariant = variant;

  if (!computedVariant) {
    const s = status?.toLowerCase() || '';
    if (s.includes('achieved') && !s.includes('not')) computedVariant = 'ok';
    else if (s.includes('closed') && !s.includes('belum')) computedVariant = 'ok';
    else if (s.includes('not achieved') || s.includes('overdue') || s.includes('danger')) computedVariant = 'danger';
    else if (s.includes('warning') || s.includes('approaching')) computedVariant = 'warn';
    else computedVariant = 'neutral';
  }

  const colorStyles = {
    ok: 'bg-status-ok/10 text-status-ok border-status-ok/25 font-medium',
    warn: 'bg-status-warn/10 text-status-warn border-status-warn/25 font-medium',
    danger: 'bg-status-danger/10 text-status-danger border-status-danger/25 font-medium',
    neutral: 'bg-base text-ink-muted border-border font-medium',
    invert: 'badge-inverted font-semibold shadow-xs',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${colorStyles[computedVariant]} ${className}`}
    >
      {status}
    </span>
  );
}
