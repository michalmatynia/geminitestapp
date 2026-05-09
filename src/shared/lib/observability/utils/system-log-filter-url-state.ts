/**
 * System Log Filter URL State Management
 * 
 * Utilities for serializing and deserializing system log filters to/from URL parameters.
 * Provides:
 * - URL parameter parsing and normalization
 * - Filter state serialization
 * - Date boundary handling
 * - Input validation and type coercion
 * - Pagination state management
 */

import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';
import {
  SYSTEM_LOG_FILTER_DEFAULTS,
  type SystemLogFilterFormValues,
} from '@/shared/lib/observability/log-triage-presets';

/**
 * Complete system log URL state including pagination
 */
export type SystemLogUrlState = SystemLogFilterFormValues & {
  /** Current page number (1-indexed) */
  page: number;
};

/**
 * List of URL parameters managed by this module
 * Used to clean up unrelated parameters when updating state
 */
const MANAGED_PARAM_KEYS: Array<keyof SystemLogFilterFormValues | 'from' | 'to' | 'page'> = [
  'level',
  'query',
  'source',
  'service',
  'method',
  'statusCode',
  'minDurationMs',
  'requestId',
  'traceId',
  'correlationId',
  'userId',
  'fingerprint',
  'category',
  'from',
  'to',
  'page',
];

/**
 * Converts ISO date string to input date format (YYYY-MM-DD)
 * 
 * @param value - ISO date string or null
 * @returns Date in YYYY-MM-DD format or empty string
 */
const parseDateParamToInput = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

/**
 * Parses page number from URL parameter
 * Defaults to 1 if invalid or missing
 * 
 * @param value - Page parameter value
 * @returns Valid page number (minimum 1)
 */
const parsePage = (value: string | null): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

/**
 * Normalizes HTTP status code input
 * Validates and returns as string or empty
 * 
 * @param value - Status code input
 * @returns Valid status code string or empty
 */
const normalizeStatusCode = (value: string): string => {
  if (!value.trim()) return '';
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return '';
  return String(parsed);
};

/**
 * Normalizes positive integer input
 * Validates and returns as string or empty
 * 
 * @param value - Integer input
 * @returns Valid positive integer string or empty
 */
const normalizePositiveInteger = (value: string): string => {
  if (!value.trim()) return '';
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return '';
  return String(parsed);
};

/**
 * Converts date string to ISO boundary timestamp
 * Optionally sets to end-of-day (23:59:59.999)
 * 
 * @param value - Date string (YYYY-MM-DD)
 * @param endOfDay - Whether to set to end of day
 * @returns ISO timestamp or null if invalid
 */
const toIsoDateBoundary = (value: string, endOfDay: boolean): string | null => {
  if (!value) return null;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

/**
 * Parses log level from URL parameter
 * Validates against allowed levels
 * 
 * @param value - Level parameter value
 * @returns Valid log level or 'all'
 */
const parseLevel = (value: string | null): SystemLogLevel | 'all' => {
  if (value === 'error' || value === 'warn' || value === 'info') return value;
  return 'all';
};

/**
 * Reads system log filter state from URL search parameters
 * Parses and validates all filter parameters
 * 
 * @param search - URL search string
 * @returns Parsed and normalized filter state
 */
export const readSystemLogUrlState = (search: string): SystemLogUrlState => {
  const params = new URLSearchParams(search);
  return {
    ...SYSTEM_LOG_FILTER_DEFAULTS,
    level: parseLevel(params.get('level')),
    query: params.get('query') ?? '',
    source: params.get('source') ?? '',
    service: params.get('service') ?? '',
    method: params.get('method') ?? '',
    statusCode: normalizeStatusCode(params.get('statusCode') ?? ''),
    minDurationMs: normalizePositiveInteger(params.get('minDurationMs') ?? ''),
    requestId: params.get('requestId') ?? '',
    traceId: params.get('traceId') ?? '',
    correlationId: params.get('correlationId') ?? '',
    userId: params.get('userId') ?? '',
    fingerprint: params.get('fingerprint') ?? '',
    category: params.get('category') ?? '',
    fromDate: parseDateParamToInput(params.get('from')),
    toDate: parseDateParamToInput(params.get('to')),
    page: parsePage(params.get('page')),
  };
};

/**
 * Writes system log filter state to URL search parameters
 * Serializes filter state and updates URL parameters
 * 
 * @param baseSearch - Base URL search string
 * @param state - Filter state to serialize
 * @returns Updated URL search string
 */
export const writeSystemLogUrlState = (baseSearch: string, state: SystemLogUrlState): string => {
  const params = new URLSearchParams(baseSearch);
  // Remove all managed parameters to avoid stale values
  MANAGED_PARAM_KEYS.forEach((key) => params.delete(key));

  // Add non-empty filter parameters
  if (state.level !== 'all') params.set('level', state.level);
  if (state.query.trim()) params.set('query', state.query.trim());
  if (state.source.trim()) params.set('source', state.source.trim());
  if (state.service.trim()) params.set('service', state.service.trim());
  if (state.method.trim()) params.set('method', state.method.trim());
  if (state.requestId.trim()) params.set('requestId', state.requestId.trim());
  if (state.traceId.trim()) params.set('traceId', state.traceId.trim());
  if (state.correlationId.trim()) params.set('correlationId', state.correlationId.trim());
  if (state.userId.trim()) params.set('userId', state.userId.trim());
  if (state.fingerprint.trim()) params.set('fingerprint', state.fingerprint.trim());
  if (state.category.trim()) params.set('category', state.category.trim());

  const statusCode = normalizeStatusCode(state.statusCode);
  if (statusCode) params.set('statusCode', statusCode);
  const minDurationMs = normalizePositiveInteger(state.minDurationMs);
  if (minDurationMs) params.set('minDurationMs', minDurationMs);

  const fromIso = toIsoDateBoundary(state.fromDate, false);
  if (fromIso) params.set('from', fromIso);
  const toIso = toIsoDateBoundary(state.toDate, true);
  if (toIso) params.set('to', toIso);

  if (state.page > 1) params.set('page', String(state.page));

  return params.toString();
};
