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
    ok: 'bg-[#2E7D52]/10 text-[#2E7D52] border-[#2E7D52]/25 dark:bg-[#41A86F]/15 dark:text-[#60C990] dark:border-[#41A86F]/30 font-medium',
    warn: 'bg-[#B87A28]/10 text-[#B87A28] border-[#B87A28]/25 dark:bg-[#D4953C]/15 dark:text-[#EBB562] dark:border-[#D4953C]/30 font-medium',
    danger: 'bg-[#B5302E]/10 text-[#B5302E] border-[#B5302E]/25 dark:bg-[#E05350]/15 dark:text-[#F3817F] dark:border-[#E05350]/30 font-medium',
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
