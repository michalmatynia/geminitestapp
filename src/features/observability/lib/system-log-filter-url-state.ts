import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';

import { SYSTEM_LOG_FILTER_DEFAULTS, type SystemLogFilterFormValues } from './log-triage-presets';

export type SystemLogUrlState = SystemLogFilterFormValues & {
  page: number;
};

const MANAGED_PARAM_KEYS: Array<keyof SystemLogFilterFormValues | 'from' | 'to' | 'page'> = [
  'level',
  'query',
  'source',
  'method',
  'statusCode',
  'requestId',
  'userId',
  'fingerprint',
  'category',
  'from',
  'to',
  'page',
];

const parseDateParamToInput = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const parsePage = (value: string | null): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

const normalizeStatusCode = (value: string): string => {
  if (!value.trim()) return '';
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return '';
  return String(parsed);
};

const toIsoDateBoundary = (value: string, endOfDay: boolean): string | null => {
  if (!value) return null;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parseLevel = (value: string | null): SystemLogLevel | 'all' => {
  if (value === 'error' || value === 'warn' || value === 'info') return value;
  return 'all';
};

export const readSystemLogUrlState = (search: string): SystemLogUrlState => {
  const params = new URLSearchParams(search);
  return {
    ...SYSTEM_LOG_FILTER_DEFAULTS,
    level: parseLevel(params.get('level')),
    query: params.get('query') ?? '',
    source: params.get('source') ?? '',
    method: params.get('method') ?? '',
    statusCode: normalizeStatusCode(params.get('statusCode') ?? ''),
    requestId: params.get('requestId') ?? '',
    userId: params.get('userId') ?? '',
    fingerprint: params.get('fingerprint') ?? '',
    category: params.get('category') ?? '',
    fromDate: parseDateParamToInput(params.get('from')),
    toDate: parseDateParamToInput(params.get('to')),
    page: parsePage(params.get('page')),
  };
};

export const writeSystemLogUrlState = (
  baseSearch: string,
  state: SystemLogUrlState,
): string => {
  const params = new URLSearchParams(baseSearch);
  MANAGED_PARAM_KEYS.forEach((key) => params.delete(key));

  if (state.level !== 'all') params.set('level', state.level);
  if (state.query.trim()) params.set('query', state.query.trim());
  if (state.source.trim()) params.set('source', state.source.trim());
  if (state.method.trim()) params.set('method', state.method.trim());
  if (state.requestId.trim()) params.set('requestId', state.requestId.trim());
  if (state.userId.trim()) params.set('userId', state.userId.trim());
  if (state.fingerprint.trim()) params.set('fingerprint', state.fingerprint.trim());
  if (state.category.trim()) params.set('category', state.category.trim());

  const statusCode = normalizeStatusCode(state.statusCode);
  if (statusCode) params.set('statusCode', statusCode);

  const fromIso = toIsoDateBoundary(state.fromDate, false);
  if (fromIso) params.set('from', fromIso);
  const toIso = toIsoDateBoundary(state.toDate, true);
  if (toIso) params.set('to', toIso);

  if (state.page > 1) params.set('page', String(state.page));

  return params.toString();
};
