import type {
  DatabaseBackupFile as DatabaseInfoResponse,
  DatabaseBackupResponse,
  CollectionCopyResult,
  DatabaseEngineBackupRunNowResponse,
  DatabaseEngineBackupSchedulerStatus as DatabaseEngineBackupSchedulerStatusResponse,
  DatabaseEngineBackupSchedulerTickResponse,
  DatabaseEngineOperationsJobs as DatabaseEngineOperationsJobsResponse,
  DatabaseEngineProviderPreview as DatabaseEngineProviderPreviewResponse,
  DatabaseEngineStatus as DatabaseEngineStatusResponse,
  DatabaseRestoreResponse,
  MultiSchemaResponse,
  RedisOverview as RedisOverviewResponse,
  SettingsBackfillResult,
  DatabaseTablePreviewData,
  CrudRequest,
  CrudResult,
  DatabasePreviewGroup,
  DatabasePreviewPayload,
  DatabasePreviewRequest,
  DatabasePreviewTable,
  DatabaseSyncDirection,
  DatabaseType,
  SqlQueryResult,
} from '@/shared/contracts/database';
import type { AppProviderDiagnosticsDto as ProviderDiagnosticsResponse } from '@/shared/contracts/system';
import { type ApiPayloadResult } from '@/shared/contracts/http';
import { api, ApiError } from '@/shared/lib/api-client';
import { DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY } from '@/shared/lib/db/database-engine-constants';

export type {
  CrudRequest,
  CrudResult,
  DatabasePreviewGroup,
  DatabasePreviewPayload,
  DatabasePreviewRequest,
  DatabaseSyncDirection,
  DatabaseType,
  DatabaseInfoResponse,
  SqlQueryResult,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const withDbTypeQuery = (endpoint: string, dbType?: DatabaseType): string => {
  if (!dbType) return endpoint;
  return `${endpoint}?type=${encodeURIComponent(dbType)}`;
};

const toFallbackErrorPayload = <T>(error: unknown): T =>
  ({
    success: false,
    error: error instanceof Error ? error.message : String(error),
  }) as T;

const wrapInApiPayloadResult = async <T>(promise: Promise<T>): Promise<ApiPayloadResult<T>> => {
  try {
    const data = await promise;
    return { ok: true, payload: data };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.payload !== undefined && error.payload !== null) {
        return { ok: false, payload: error.payload as T };
      }
      return { ok: false, payload: toFallbackErrorPayload<T>(error) };
    }
    return { ok: false, payload: toFallbackErrorPayload<T>(error) };
  }
};

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

export const getDatabaseStatus = async (): Promise<DatabaseEngineStatusResponse> =>
  api.get<DatabaseEngineStatusResponse>('/api/databases/engine/status');

export const fetchDatabaseEngineStatus = getDatabaseStatus;

export const getDatabaseInfo = async (dbType?: DatabaseType): Promise<DatabaseInfoResponse[]> => {
  const url = withDbTypeQuery('/api/databases/backups', dbType);
  return api.get<DatabaseInfoResponse[]>(url);
};

export const fetchDatabaseBackups = getDatabaseInfo;

export const createDatabaseBackup = async (
  dbType?: DatabaseType
): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  wrapInApiPayloadResult(
    api.post<DatabaseBackupResponse>(withDbTypeQuery('/api/databases/backup', dbType))
  );

export const restoreDatabaseBackup = async (
  dbType: DatabaseType,
  options: { backupName: string; truncateBeforeRestore: boolean }
): Promise<ApiPayloadResult<DatabaseRestoreResponse>> =>
  wrapInApiPayloadResult(
    api.post<DatabaseRestoreResponse>(withDbTypeQuery('/api/databases/restore', dbType), {
      backupName: options.backupName,
      truncateBeforeRestore: options.truncateBeforeRestore,
    })
  );

export const deleteDatabaseBackup = async (
  dbType: DatabaseType,
  backupName: string
): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  wrapInApiPayloadResult(
    api.post<DatabaseBackupResponse>('/api/databases/delete', { type: dbType, backupName })
  );

export const uploadDatabaseBackup = async (
  dbType: DatabaseType,
  file: File,
  onProgress?: (loaded: number, total?: number) => void
): Promise<ApiPayloadResult<DatabaseBackupResponse>> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', dbType);

  const { uploadWithProgress } = await import('@/shared/utils/upload-with-progress');
  const result = await uploadWithProgress<DatabaseBackupResponse>('/api/databases/upload', {
    formData,
    onProgress,
  });

  return { ok: result.ok, payload: result.data };
};

export const executeSqlQuery = async (input: {
  sql?: string;
  type: DatabaseType;
  collection?: string;
  operation?: string;
  filter?: Record<string, unknown>;
  document?: Record<string, unknown>;
  update?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
}): Promise<SqlQueryResult> => api.post<SqlQueryResult>('/api/databases/execute', input);

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

export const executeCrudOperation = async (input: CrudRequest): Promise<CrudResult> =>
  api.post<CrudResult>('/api/databases/crud', input);

export const getProviderDiagnostics = async (): Promise<ProviderDiagnosticsResponse> =>
  api.get<ProviderDiagnosticsResponse>('/api/settings/providers');

export const getRedisOverview = async (limit: number = 200): Promise<RedisOverviewResponse> =>
  api.get<RedisOverviewResponse>('/api/databases/redis', { params: { limit } });

export const fetchRedisOverview = getRedisOverview;

export const getDatabaseEngineStatus = async (): Promise<DatabaseEngineStatusResponse> =>
  api.get<DatabaseEngineStatusResponse>('/api/databases/engine/status');

export const runDatabaseEngineBackupNow = async (
  dbType: 'mongodb' | 'postgresql' | 'all'
): Promise<DatabaseEngineBackupRunNowResponse> =>
  api.post<DatabaseEngineBackupRunNowResponse>('/api/databases/engine/backup-scheduler/run-now', {
    dbType,
  });

export const getDatabaseEngineBackupSchedulerStatus =
  async (): Promise<DatabaseEngineBackupSchedulerStatusResponse> =>
    api.get<DatabaseEngineBackupSchedulerStatusResponse>(
      '/api/databases/engine/backup-scheduler/status'
    );

export const fetchDatabaseEngineBackupSchedulerStatus = getDatabaseEngineBackupSchedulerStatus;

export const tickDatabaseEngineBackupScheduler =
  async (): Promise<DatabaseEngineBackupSchedulerTickResponse> =>
    api.post<DatabaseEngineBackupSchedulerTickResponse>(
      '/api/databases/engine/backup-scheduler/tick'
    );

export const runDatabaseEngineBackupSchedulerTick = tickDatabaseEngineBackupScheduler;

export const getDatabaseEngineOperationsJobs = async (
  limit: number = 30
): Promise<DatabaseEngineOperationsJobsResponse> =>
  api.get<DatabaseEngineOperationsJobsResponse>('/api/databases/engine/operations/jobs', {
    params: { limit },
  });

export const fetchDatabaseEngineOperationsJobs = getDatabaseEngineOperationsJobs;

export const getDatabaseEngineProviderPreview = async (
  collections?: string[]
): Promise<DatabaseEngineProviderPreviewResponse> => {
  const params = collections ? { collections: collections.join(',') } : undefined;
  return api.get<DatabaseEngineProviderPreviewResponse>('/api/databases/engine/provider-preview', {
    params,
  });
};

export const fetchDatabaseEngineProviderPreview = getDatabaseEngineProviderPreview;

export const copyCollectionBetweenProviders = async (
  collection: string,
  direction: 'mongo_to_prisma' | 'prisma_to_mongo'
): Promise<ApiPayloadResult<CollectionCopyResult>> =>
  wrapInApiPayloadResult(
    api.post<CollectionCopyResult>('/api/databases/copy-collection', { collection, direction })
  );

export const updateDatabaseCollectionProviderMap = async (
  collectionName: string,
  provider: 'mongodb' | 'prisma'
): Promise<void> => {
  await api.patch('/api/settings', {
    key: DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
    value: JSON.stringify({ [collectionName]: provider }),
    mode: 'merge_json_object',
  });
};

export const syncDatabase = async (
  direction: DatabaseSyncDirection
): Promise<{ error?: string }> => {
  return api.post<{ error?: string }>('/api/settings/database/sync', { direction, manual: true });
};

export const backfillSettingsKeys = async (
  limit: number = 500,
  dryRun: boolean = false
): Promise<SettingsBackfillResult> => {
  return api.post<SettingsBackfillResult>('/api/settings/migrate/backfill-keys', {
    limit,
    dryRun,
    manual: true,
  });
};

export const cancelDatabaseEngineOperationJob = async (
  jobId: string
): Promise<{ success: boolean; job: unknown }> =>
  api.post<{ success: boolean; job: unknown }>(
    `/api/databases/engine/operations/jobs/${jobId}/cancel`
  );

export const fetchAllCollectionsSchema = async (): Promise<MultiSchemaResponse> =>
  api.get<MultiSchemaResponse>('/api/databases/schema');

export const createJsonBackup = async (): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  wrapInApiPayloadResult(api.post<DatabaseBackupResponse>('/api/databases/json-backup'));

export const restoreJsonBackup = async (
  backupName: string
): Promise<ApiPayloadResult<DatabaseRestoreResponse>> =>
  wrapInApiPayloadResult(
    api.post<DatabaseRestoreResponse>('/api/databases/json-restore', { backupName })
  );

export const fetchJsonBackups = async (): Promise<{ backups: string[] }> =>
  api.get<{ backups: string[] }>('/api/databases/json-backup');
