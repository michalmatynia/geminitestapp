import {
  DatabasePreviewGroup,
  DatabasePreviewPayload,
  DatabasePreviewRequest,
  DatabasePreviewTable,
  DatabaseTablePreviewData,
} from '@/shared/contracts/database';
import { type ApiPayloadResult } from '@/shared/contracts/http';
import { api, ApiError } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { toFallbackErrorPayload } from './shared';

export const getDatabasePreview = async (
  input: DatabasePreviewRequest
): Promise<ApiPayloadResult<DatabasePreviewPayload>> => {
  try {
    const raw = await api.post<Record<string, unknown>>('/api/databases/preview', input);

    // Normalize response
    const normalizeGroups = (data: unknown): DatabasePreviewGroup[] => {
      if (!Array.isArray(data)) return [];
      return data.map((g: Record<string, unknown>) => ({
        type: (g['type'] ?? g['name']) as string,
        objects: Array.isArray(g['objects'])
          ? (g['objects'] as string[])
          : Array.isArray(g['tables'])
            ? (g['tables'] as string[])
            : [],
      }));
    };

    const rawStats = raw['stats'] as Record<string, unknown> | undefined;
    const groups = normalizeGroups(raw['groups'] ?? rawStats?.['groups']);
    const tables = (raw['tables'] ?? rawStats?.['tables'] ?? []) as DatabasePreviewTable[];
    const tableRows = (raw['tableRows'] ?? raw['data'] ?? []) as DatabaseTablePreviewData[];
    const finalPage = raw['page'] ?? input.page;
    const finalPageSize = raw['pageSize'] ?? input.pageSize;

    const payload: DatabasePreviewPayload = {
      groups,
      tables,
      tableRows,
      total: (raw['total'] ?? rawStats?.['total'] ?? 0) as number,
      page: typeof finalPage === 'string' ? parseInt(finalPage, 10) : (finalPage as number) || 1,
      pageSize:
        typeof finalPageSize === 'string'
          ? parseInt(finalPageSize, 10)
          : (finalPageSize as number) || 50,
    };

    return { ok: true, payload };
  } catch (error) {
    logClientError(error);
    if (error instanceof ApiError) {
      if (error.payload !== undefined && error.payload !== null) {
        return { ok: false, payload: error.payload as DatabasePreviewPayload };
      }
      return { ok: false, payload: toFallbackErrorPayload<DatabasePreviewPayload>(error) };
    }
    return { ok: false, payload: toFallbackErrorPayload<DatabasePreviewPayload>(error) };
  }
};

export const fetchDatabasePreview = getDatabasePreview;
