import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'ok' | 'warn' | 'danger' | 'neutral';
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
    ok: 'bg-[#3B7A57]/15 text-[#3B7A57] border-[#3B7A57]/30 dark:bg-[#489369]/20 dark:text-[#6ec491] dark:border-[#489369]/40',
    warn: 'bg-[#B8863B]/15 text-[#B8863B] border-[#B8863B]/30 dark:bg-[#C99645]/20 dark:text-[#e4b568] dark:border-[#C99645]/40',
    danger: 'bg-[#A54B3F]/15 text-[#A54B3F] border-[#A54B3F]/30 dark:bg-[#BD584B]/20 dark:text-[#e87f71] dark:border-[#BD584B]/40',
    neutral: 'bg-[#8B897F]/15 text-[#6B6A63] border-[#8B897F]/30 dark:bg-[#9A988F]/20 dark:text-[#b5b3aa] dark:border-[#9A988F]/40',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorStyles[computedVariant]} ${className}`}
    >
      {status}
    </span>
  );
}
