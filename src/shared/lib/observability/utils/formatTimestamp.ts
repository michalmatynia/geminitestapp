/**
 * Timestamp Formatting Utility
 * 
 * Formats Date objects or ISO strings to localized display format.
 * Provides:
 * - Date object and string parsing
 * - Invalid date handling with fallback
 * - Locale-aware formatting
 */

/**
 * Formats a timestamp to a localized string representation
 * Handles both Date objects and ISO date strings
 * 
 * @param value - Date object or ISO date string
 * @returns Formatted timestamp or '—' if invalid
 */
export const formatTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  // Return dash for invalid dates
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};
