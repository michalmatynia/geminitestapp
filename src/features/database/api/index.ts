import type {
  DatabaseBackupFileDto as DatabaseInfoResponse,
  DatabaseBackupOperationResponseDto as DatabaseBackupResponse,
  DatabaseCollectionCopyResultDto as CollectionCopyResult,
  DatabaseEngineBackupRunNowResponseDto as DatabaseEngineBackupRunNowResponse,
  DatabaseEngineBackupSchedulerStatusDto as DatabaseEngineBackupSchedulerStatusResponse,
  DatabaseEngineBackupSchedulerTickResponseDto as DatabaseEngineBackupSchedulerTickResponse,
  DatabaseEngineOperationsJobsDto as DatabaseEngineOperationsJobsResponse,
  DatabaseEngineProviderPreviewDto as DatabaseEngineProviderPreviewResponse,
  DatabaseEngineStatusDto as DatabaseEngineStatusResponse,
  DatabaseRestoreOperationResponseDto as DatabaseRestoreResponse,
  MultiSchemaResponseDto as MultiSchemaResponse,
  RedisOverviewDto as RedisOverviewResponse,
  SettingsBackfillResultDto,
  DatabaseTablePreviewDataDto as DatabaseTablePreviewData,
  CrudRequest,
  CrudResult,
  DatabasePreviewGroup,
  DatabasePreviewMode,
  DatabasePreviewPayload,
  DatabasePreviewRow,
  DatabasePreviewTable,
  DatabaseSyncDirection,
  DatabaseType,
  SqlQueryResult,
} from '@/shared/contracts/database';
import type { AppProviderDiagnosticsDto as ProviderDiagnosticsResponse } from '@/shared/contracts/system';
import { apiClient, api, ApiError, type ApiClientOptions } from '@/shared/lib/api-client';
import { DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY } from '@/shared/lib/db/database-engine-constants';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';


export type {
  CrudRequest,
  CrudResult,
  DatabasePreviewGroup,
  DatabasePreviewMode,
  DatabasePreviewPayload,
  DatabasePreviewRow,
  DatabasePreviewTable,
  DatabaseType,
  DatabaseInfoResponse,
  DatabaseBackupResponse,
  DatabaseRestoreResponse,
  SqlQueryResult,
};

export type ApiPayloadResult<T> = {
  ok: boolean;
  payload: T;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const wrapInApiPayloadResult = async <T>(
  promise: Promise<T>
): Promise<ApiPayloadResult<T>> => {
  try {
    const data = await promise;
    return { ok: true, payload: data };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, payload: error.payload as T };
    }
    return { ok: false, payload: { error: error instanceof Error ? error.message : String(error) } as unknown as T };
  }
};

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

export const getDatabaseStatus = async (): Promise<DatabaseEngineStatusResponse> =>
  api.get<DatabaseEngineStatusResponse>('/api/system/database/status');

export const fetchDatabaseEngineStatus = getDatabaseStatus;

export const getDatabaseInfo = async (dbType?: DatabaseType): Promise<DatabaseInfoResponse[]> => {
  const url = dbType ? `/api/settings/database/info?type=${dbType}` : '/api/settings/database/info';
  return api.get<DatabaseInfoResponse[]>(url);
};

export const fetchDatabaseBackups = getDatabaseInfo;

export const createDatabaseBackup = async (
  dbType?: DatabaseType,
  name?: string
): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  wrapInApiPayloadResult(
    api.post<DatabaseBackupResponse>('/api/settings/database/backup', { type: dbType, name })
  );

export const restoreDatabaseBackup = async (
  dbType: DatabaseType,
  options: { backupName: string; truncateBeforeRestore: boolean }
): Promise<ApiPayloadResult<DatabaseRestoreResponse>> =>
  wrapInApiPayloadResult(
    api.post<DatabaseRestoreResponse>('/api/settings/database/restore', {
      type: dbType,
      filename: options.backupName,
      truncate: options.truncateBeforeRestore,
    })
  );

export const deleteDatabaseBackup = async (
  dbType: DatabaseType,
  backupName: string
): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  wrapInApiPayloadResult(
    api.delete<DatabaseBackupResponse>('/api/settings/database/backup', {
      body: JSON.stringify({ type: dbType, filename: backupName }),
    } as ApiClientOptions)
  );

export const uploadDatabaseBackup = async (
  dbType: DatabaseType,
  file: File,
  onProgress?: (loaded: number, total?: number) => void
): Promise<ApiPayloadResult<DatabaseBackupResponse>> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', dbType);

  return wrapInApiPayloadResult(
    apiClient<DatabaseBackupResponse>('/api/settings/database/backup/upload', {
      method: 'POST',
      body: formData,
      onProgress
    } as any)
  );
};

export const executeSqlQuery = async (
  input: {
    sql?: string;
    type: DatabaseType;
    collection?: string;
    operation?: string;
    filter?: Record<string, unknown>;
    document?: Record<string, unknown>;
    update?: Record<string, unknown>;
    pipeline?: Record<string, unknown>[];
  }
): Promise<SqlQueryResult> =>
  api.post<SqlQueryResult>('/api/settings/database/query', input);

export const getDatabasePreview = async (
  input: CrudRequest
): Promise<ApiPayloadResult<DatabasePreviewPayload>> => {
  const params: Record<string, string | number | boolean | undefined> = {
    table: input.table,
    page: input.page,
    pageSize: input.pageSize,
    search: input.search,
    provider: input.provider,
    backupName: input.backupName,
    mode: input.mode,
    type: input.type,
  };

  try {
    const raw = await api.get<any>('/api/settings/database/preview', { params });

    // Normalize response
    const normalizeGroups = (data: unknown): DatabasePreviewGroup[] => {
      if (!Array.isArray(data)) return [];
      return data.map((g: any) => ({
        name: g.name,
        tables: Array.isArray(g.tables) ? g.tables : [],
      }));
    };

    const groups = normalizeGroups(raw.groups ?? raw.stats?.groups);
    const tables = raw.tables ?? raw.stats?.tables ?? [];
    const tableRows = (raw.tableRows ?? raw.data ?? []) as DatabaseTablePreviewData[];
    const finalPage = raw.page ?? input.page;
    const finalPageSize = raw.pageSize ?? input.pageSize;
    
    const payload: DatabasePreviewPayload = {
      groups,
      tables,
      data: tableRows,
      total: raw.total ?? raw.stats?.total ?? 0,
      page: typeof finalPage === 'string' ? parseInt(finalPage, 10) : (finalPage || 1),
      pageSize: typeof finalPageSize === 'string' ? parseInt(finalPageSize, 10) : (finalPageSize || 50),
    };

    return { ok: true, payload };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, payload: error.payload as DatabasePreviewPayload };
    }
    return { ok: false, payload: { error: error instanceof Error ? error.message : String(error) } as unknown as DatabasePreviewPayload };
  }
};

export const fetchDatabasePreview = getDatabasePreview;

export const executeCrudOperation = async (
  input: CrudRequest
): Promise<CrudResult> =>
  api.post<CrudResult>('/api/settings/database/crud', input);

export const getProviderDiagnostics = async (): Promise<ProviderDiagnosticsResponse> =>
  api.get<ProviderDiagnosticsResponse>('/api/system/diagnostics');

export const getRedisOverview = async (limit: number = 200): Promise<RedisOverviewResponse> =>
  api.get<RedisOverviewResponse>('/api/system/redis/overview', { params: { limit } });

export const fetchRedisOverview = getRedisOverview;

export const getDatabaseEngineStatus = async (): Promise<DatabaseEngineStatusResponse> =>
  api.get<DatabaseEngineStatusResponse>('/api/system/database/engine/status');

export const runDatabaseEngineBackupNow = async (dbType: 'mongodb' | 'postgresql' | 'all'): Promise<DatabaseEngineBackupRunNowResponse> =>
  api.post<DatabaseEngineBackupRunNowResponse>('/api/system/database/engine/backup/run', { type: dbType });

export const getDatabaseEngineBackupSchedulerStatus = async (): Promise<DatabaseEngineBackupSchedulerStatusResponse> =>
  api.get<DatabaseEngineBackupSchedulerStatusResponse>('/api/system/database/engine/backup/scheduler/status');

export const fetchDatabaseEngineBackupSchedulerStatus = getDatabaseEngineBackupSchedulerStatus;

export const tickDatabaseEngineBackupScheduler = async (): Promise<DatabaseEngineBackupSchedulerTickResponse> =>
  api.post<DatabaseEngineBackupSchedulerTickResponse>('/api/system/database/engine/backup/scheduler/tick');

export const runDatabaseEngineBackupSchedulerTick = tickDatabaseEngineBackupScheduler;

export const getDatabaseEngineOperationsJobs = async (limit: number = 30): Promise<DatabaseEngineOperationsJobsResponse> =>
  api.get<DatabaseEngineOperationsJobsResponse>('/api/system/database/engine/operations/jobs', { params: { limit } });

export const fetchDatabaseEngineOperationsJobs = getDatabaseEngineOperationsJobs;

export const getDatabaseEngineProviderPreview = async (
  collections?: string[]
): Promise<DatabaseEngineProviderPreviewResponse> => {
  const params = collections ? { collections: collections.join(',') } : undefined;
  return api.get<DatabaseEngineProviderPreviewResponse>('/api/system/database/engine/provider/preview', { params });
};

export const fetchDatabaseEngineProviderPreview = getDatabaseEngineProviderPreview;

export const copyCollectionBetweenProviders = async (
  collection: string,
  direction: 'mongo_to_prisma' | 'prisma_to_mongo'
): Promise<ApiPayloadResult<CollectionCopyResult>> =>
  wrapInApiPayloadResult(
    api.post<CollectionCopyResult>('/api/system/database/engine/operations/copy-collection', { collection, direction })
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
  return api.post<SettingsBackfillResult>('/api/settings/migrate/backfill-keys', { limit, dryRun, manual: true });
};

export const cancelDatabaseEngineOperationJob = async (
  jobId: string
): Promise<{ success: boolean; job: unknown }> =>
  api.post<{ success: boolean; job: unknown }>(`/api/system/database/engine/operations/jobs/${jobId}/cancel`);

export const fetchAllCollectionsSchema = async (): Promise<MultiSchemaResponse> =>
  api.get<MultiSchemaResponse>('/api/system/database/engine/schema/all');

export const createJsonBackup = async (): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  wrapInApiPayloadResult(
    api.post<DatabaseBackupResponse>('/api/settings/database/json-backup')
  );

export const restoreJsonBackup = async (
  backupName: string
): Promise<ApiPayloadResult<DatabaseRestoreResponse>> =>
  wrapInApiPayloadResult(
    api.post<DatabaseRestoreResponse>('/api/settings/database/json-restore', { filename: backupName })
  );

export const fetchJsonBackups = async (): Promise<{ backups: string[] }> =>
  api.get<{ backups: string[] }>('/api/settings/database/json-backups');

export type SettingsBackfillResult = SettingsBackfillResultDto;
