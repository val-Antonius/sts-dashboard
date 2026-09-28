/**
 * Semantic Chart & Visual Role Colors
 * Conforms to design tokens defined in src/app/globals.css
 */

export const CLAIM_COLORS = {
  claimable: 'var(--chart-1)',
  covered: 'var(--chart-1)',
  goodwill: 'color-mix(in srgb, var(--chart-1) 55%, var(--surface))',
  unclaimable: 'var(--chart-2)',
  nonWarranty: 'var(--chart-2)',
  unrecorded: 'var(--chart-5)',
  checkingOrWaiting: 'var(--chart-5)',
  // Claimable GOEM is on hold per instruction
  goem: '#6366F1',
  claimableGoem: '#6366F1',
} as const;

export const ON_CHART_TEXT = {
  onChart1: 'var(--on-chart-1)',
  onChart2: 'var(--on-chart-2)',
} as const;

export const FLOW_COLORS = {
  intake: 'var(--chart-2)',
  closed: 'var(--chart-1)',
  netDelta: 'var(--accent)',
} as const;

export const SLA_STATUS_COLORS = {
  achieved: 'var(--chart-1)',
  breach: 'var(--status-danger)',
  overdue: 'var(--status-danger)',
  thresholdLine: 'var(--ink-muted)',
  okMark: 'var(--status-ok)',
  warnMark: 'var(--status-warn)',
} as const;

export const PARETO_COLORS = {
  bar: 'var(--chart-1)',
  cumulativeLine: 'var(--accent)',
  threshold80: 'var(--ink-muted)',
} as const;

export const FAULT_ATTRIBUTION_COLORS = {
  productSide: 'var(--chart-1)',
  customerSide: 'var(--chart-3)',
  processSide: 'var(--chart-4)',
  external: 'var(--chart-2)',
  unrecorded: 'var(--chart-5)',
} as const;

export const PRODUCT_DONUT_TINTS = [
  'var(--chart-1)', // 100%
  'color-mix(in srgb, var(--chart-1) 80%, var(--surface))',
  'color-mix(in srgb, var(--chart-1) 62%, var(--surface))',
  'color-mix(in srgb, var(--chart-1) 48%, var(--surface))',
  'color-mix(in srgb, var(--chart-1) 36%, var(--surface))',
  'color-mix(in srgb, var(--chart-1) 26%, var(--surface))',
  'color-mix(in srgb, var(--chart-1) 18%, var(--surface))',
] as const;

export const PRODUCT_OTHERS_COLOR = 'var(--chart-5)';

export function getProductColorByRank(rankIndex: number, isOthers = false): string {
  if (isOthers) return PRODUCT_OTHERS_COLOR;
  if (rankIndex >= 0 && rankIndex < PRODUCT_DONUT_TINTS.length) {
    return PRODUCT_DONUT_TINTS[rankIndex];
  }
  return PRODUCT_DONUT_TINTS[PRODUCT_DONUT_TINTS.length - 1];
}

export function getHeatmapColor(intensityRatio: number): string {
  if (intensityRatio <= 0) return 'transparent';
  // Intensity ratio between 0 and 1 maps to 8% to 100% of var(--accent)
  const pct = Math.round(8 + Math.min(1, Math.max(0, intensityRatio)) * 92);
  return `color-mix(in srgb, var(--accent) ${pct}%, var(--surface))`;
}

export const BUBBLE_MATRIX_COLORS = {
  default: 'var(--chart-1)',
  selectedRing: 'var(--accent)',
  zeroCase: 'var(--chart-5)',
} as const;
