/**
 * UI Logs Contracts
 * 
 * Type definitions for log display components.
 * Provides:
 * - Log list entry interface
 * - Log level and message types
 * - Context data structure
 * - Timestamp handling
 * - Source identification
 */

export type LogListEntryDto = {
  id: string;
  timestamp: string | number | Date;
  level: string;
  message: string;
  context?: Record<string, unknown> | null | undefined;
  source?: string | undefined;
};
export type LogListEntry = LogListEntryDto;
