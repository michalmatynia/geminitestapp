/**
 * Database Cell Value Formatting
 * 
 * Utilities for consistent formatting of database cell values in UI.
 * Handles:
 * - Null and undefined value display
 * - Object and array serialization
 * - Type-specific formatting rules
 * - Consistent empty value representation
 */

export const DATABASE_EMPTY_CELL_VALUE = '∅';

export function formatDatabaseCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return DATABASE_EMPTY_CELL_VALUE;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
