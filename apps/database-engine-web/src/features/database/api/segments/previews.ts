import {
  type DatabasePreviewGroup,
  type DatabasePreviewPayload,
  type DatabasePreviewRequest,
  type DatabasePreviewTable,
  type DatabaseTableDetail,
  type DatabaseTablePreviewData,
} from '@/shared/contracts/database';
import { type ApiPayloadResult } from '@/shared/contracts/http';
import { api, ApiError } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { toFallbackErrorPayload } from './shared';

const normalizeStringRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeArray = <T>(value: unknown, isItem: (item: unknown) => item is T): T[] =>
  Array.isArray(value) ? value.filter(isItem) : [];

const normalizeStringArray = (value: unknown): string[] =>
  normalizeArray(value, (item): item is string => typeof item === 'string');

const normalizeRecordArray = (value: unknown): Record<string, unknown>[] =>
  normalizeArray(value, isRecordObject);

const toDatabaseSizeString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
};

const parsePositiveInt = (rawValue: unknown, fallback: number): number => {
  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : fallback;
  }

  if (typeof rawValue === 'string') {
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  return fallback;
};

const parseTotal = (primary: unknown, fallback: unknown): number => {
  if (typeof primary === 'number' && Number.isFinite(primary)) {
    return primary;
  }

  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return fallback;
  }

  return 0;
};

const firstStringValue = (values: unknown[]): string => {
  const found = values.find(
    (value): value is string => typeof value === 'string' && value.length > 0
  );
  return found ?? '';
};

const getRawPayload = (raw: Record<string, unknown>): Record<string, unknown> => {
  const rawData = raw['data'];
  if (rawData !== null && typeof rawData === 'object') {
    return normalizeStringRecord(rawData);
  }

  return raw;
};

const normalizeGroups = (data: unknown): DatabasePreviewGroup[] => {
  if (!Array.isArray(data)) return [];

  return data
    .filter((group): group is Record<string, unknown> => group !== null && typeof group === 'object')
    .map((group) => {
      const type = group['type'];
      return {
        type: firstStringValue([type, group['name']]),
        objects: normalizeStringArray(group['objects'] ?? group['tables']),
      };
    });
};

export const getDatabasePreview = async (
  input: DatabasePreviewRequest
): Promise<ApiPayloadResult<DatabasePreviewPayload>> => {
  try {
    const raw = await api.post<Record<string, unknown>>('/api/databases/preview', input);
    const normalized = getRawPayload(raw);
    const rawStats = normalizeStringRecord(normalized['stats']);

    const groups = normalizeGroups(normalized['groups'] ?? rawStats['groups']);
    const tables = normalizeRecordArray(normalized['tables']) as DatabasePreviewTable[];
    const tableRows = normalizeRecordArray(normalized['tableRows']) as DatabaseTablePreviewData[];
    const tableDetails = normalizeRecordArray(normalized['tableDetails']) as DatabaseTableDetail[];
    const total = normalized['total'];
    const totalRows = rawStats['total'];
    const finalPage = normalized['page'] ?? input.page;
    const finalPageSize = normalized['pageSize'] ?? input.pageSize;
    const databaseSize = toDatabaseSizeString(normalized['databaseSize']);

    const payload: DatabasePreviewPayload = {
      groups,
      tables,
      tableRows,
      tableDetails,
      databaseSize,
      total: parseTotal(total, totalRows),
      page: parsePositiveInt(finalPage, input.page ?? 1),
      pageSize: parsePositiveInt(finalPageSize, input.pageSize ?? 20),
    };

    return { ok: true, payload };
  } catch (error) {
    logClientError(error);
    if (error instanceof ApiError) {
      if (error.payload !== undefined && error.payload !== null) {
        return { ok: false, payload: error.payload as DatabasePreviewPayload };
      }
      return { ok: false, payload: toFallbackErrorPayload(error) };
    }
    return { ok: false, payload: toFallbackErrorPayload(error) };
  }
};

export const fetchDatabasePreview = getDatabasePreview;
