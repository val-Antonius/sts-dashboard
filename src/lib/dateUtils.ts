/**
 * Standardized Date Formatting Utilities for STS Dashboard
 * Uniform display format: DD MMM YYYY (e.g., 20 Apr 2026) in English.
 */

const MONTH_NAMES_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats an ISO date string (YYYY-MM-DD), datetime string, or Date object
 * into standardized English format: "DD MMM YYYY" (e.g. "20 Apr 2026").
 *
 * Avoids timezone drift issues with raw "YYYY-MM-DD" inputs by parsing string parts directly.
 *
 * @param date - The date to format (string, Date, null, or undefined)
 * @param fallback - String returned if date is null, undefined, or empty (default: '—')
 * @returns Formatted date string (e.g. "20 Apr 2026")
 */
export function formatDisplayDate(
  date?: string | Date | null,
  fallback: string = '—'
): string {
  if (!date) return fallback;

  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return fallback;

    // Fast path: matches YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const monthIndex = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);

      if (
        monthIndex >= 0 &&
        monthIndex < 12 &&
        day >= 1 &&
        day <= 31 &&
        year > 1900
      ) {
        const dayStr = String(day).padStart(2, '0');
        const monthStr = MONTH_NAMES_EN[monthIndex];
        return `${dayStr} ${monthStr} ${year}`;
      }
    }

    // Fallback parser for standard Date parsing if not matching YYYY-MM-DD
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return trimmed;
    }
    const dayStr = String(parsed.getDate()).padStart(2, '0');
    const monthStr = MONTH_NAMES_EN[parsed.getMonth()];
    const year = parsed.getFullYear();
    return `${dayStr} ${monthStr} ${year}`;
  }

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return fallback;
    const dayStr = String(date.getDate()).padStart(2, '0');
    const monthStr = MONTH_NAMES_EN[date.getMonth()];
    const year = date.getFullYear();
    return `${dayStr} ${monthStr} ${year}`;
  }

  return fallback;
}
