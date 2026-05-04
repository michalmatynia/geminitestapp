/**
 * Formatting Utilities
 * 
 * Collection of formatting functions for consistent data display.
 * Provides:
 * - File size formatting with appropriate units (B, KB, MB, GB)
 * - Date and time formatting with locale support
 * - Number formatting with proper fallbacks
 * - Null-safe formatting with configurable fallback values
 */

/**
 * Formats file sizes in human-readable format with appropriate units.
 * Handles null/undefined values gracefully with fallback display.
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/**
 * Formats dates and times with consistent fallback handling.
 * Accepts various input formats and provides locale-aware formatting.
 */
export const formatDateTime = (
  value: Date | string | number | null | undefined,
  fallback = '—'
): string => {
  if (value === null || value === undefined || value === '') return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString();
};
