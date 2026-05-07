/**
 * Database Utilities
 * 
 * Collection of utility functions for database operations and data formatting.
 * Provides:
 * - Cell value formatting for different data types
 * - Type detection and parsing logic
 * - Database-specific data transformation
 * - Consistent data display patterns
 */

import { formatDatabaseCellValue } from '../components/format-cell-value';

export { formatDatabaseCellValue };

// Database type classifications for proper data handling
const BOOLEAN_TYPES = ['bool', 'boolean', 'bit'];
const NUMBER_TYPES = ['int', 'number', 'float', 'double', 'decimal', 'real', 'bigint', 'smallint', 'long', 'short'];
const OBJECT_TYPES = ['object', 'array', 'json', 'document', 'map'];
const OBJECT_ID_TYPES = ['objectid', 'object id'];
const DATE_TYPES = ['date', 'datetime', 'timestamp'];

function shouldParseAsBoolean(columnType: string): boolean {
  const normalizedType = columnType.toLowerCase();
  return BOOLEAN_TYPES.some((type) => normalizedType.includes(type));
}

function shouldParseAsNumber(columnType: string): boolean {
  const normalizedType = columnType.toLowerCase();
  return NUMBER_TYPES.some((type) => normalizedType.includes(type));
}

function shouldParseAsJson(columnType: string): boolean {
  const normalizedType = columnType.toLowerCase();
  return OBJECT_TYPES.some((type) => normalizedType.includes(type));
}

function shouldParseAsObjectId(columnType: string): boolean {
  const normalizedType = columnType.toLowerCase();
  return OBJECT_ID_TYPES.some((type) => normalizedType.includes(type));
}

function shouldParseAsDate(columnType: string): boolean {
  const normalizedType = columnType.toLowerCase();
  return DATE_TYPES.some((type) => normalizedType.includes(type));
}

export function parseInputValue(value: string, columnType: string): unknown {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }
  if (trimmed === 'null') return null;
  if (shouldParseAsObjectId(columnType)) return parseObjectIdValue(trimmed);
  if (shouldParseAsDate(columnType)) return parseDateValue(trimmed);
  if (shouldParseAsBoolean(columnType)) return parseBooleanValue(trimmed);
  if (shouldParseAsNumber(columnType)) return parseNumericValue(trimmed);
  if (shouldParseAsJson(columnType)) return parseJsonLikeValue(trimmed);
  return trimmed;
}

function parseBooleanValue(trimmed: string): boolean | string {
  const normalized = trimmed.toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return trimmed;
}

function parseNumericValue(trimmed: string): number | string {
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? trimmed : parsed;
}

function parseJsonLikeValue(trimmed: string): unknown {
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return trimmed;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function parseObjectIdValue(trimmed: string): unknown {
  return /^[a-f0-9]{24}$/i.test(trimmed) ? { $oid: trimmed } : trimmed;
}

function parseDateValue(trimmed: string): unknown {
  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? trimmed : { $date: new Date(timestamp).toISOString() };
}
