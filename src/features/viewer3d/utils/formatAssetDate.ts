/**
 * Asset Date Formatting Utility
 * 
 * Formats dates for display in 3D asset management interfaces.
 * Provides:
 * - Consistent date formatting across asset views
 * - UTC date handling for global consistency
 * - Invalid date fallback handling
 * - String date parsing with error recovery
 * - Abbreviated month display format
 */

/** Abbreviated month labels for date formatting */
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/**
 * Formats a date for asset display in "MMM DD, YYYY" format
 * @param date - Date object or ISO string to format
 * @returns Formatted date string or original string if parsing fails
 */
export function formatAssetDate(date: Date | string): string {
  /** Parse date from string or use existing Date object */
  const resolvedDate = date instanceof Date ? date : new Date(date);

  /** Return original string if date parsing fails */
  if (Number.isNaN(resolvedDate.getTime())) {
    return typeof date === 'string' ? date : '';
  }

  /** Extract date components using UTC to avoid timezone issues */
  const month = MONTH_LABELS[resolvedDate.getUTCMonth()] ?? '';
  const day = resolvedDate.getUTCDate();
  const year = resolvedDate.getUTCFullYear();

  /** Format as "MMM DD, YYYY" */
  return `${month} ${day}, ${year}`;
}
