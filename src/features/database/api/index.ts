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
} from '@/shared/contracts/database';
import type {
  CrudRequest,
  CrudResult,
  DatabasePreviewGroup,
  DatabasePreviewMode,
  DatabasePreviewPayload,
  DatabasePreviewRow,
  DatabasePreviewTable,
  DatabaseType,
  SqlQueryResult,
} from '@/shared/contracts/database';
import type { AppProviderDiagnosticsDto as ProviderDiagnosticsResponse } from '@/shared/contracts/system';
import { apiClient, ApiError, type ApiClientOptions } from '@/shared/lib/api-client';
import { DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY } from '@/shared/lib/db/database-engine-constants';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';


export type {
  CollectionCopyResult,
  DatabaseEngineBackupRunNowResponse,
  DatabaseEngineBackupSchedulerTickResponse,
  MultiSchemaResponse,
};

export type ApiPayloadResult<TPayload> = {
  ok: boolean;
  payload: TPayload;
};

const fetchJsonResult = async <TPayload>(
  input: string,
  init?: ApiClientOptions
): Promise<ApiPayloadResult<TPayload>> => {
  try {
    const payload = await apiClient<TPayload>(input, init);
    return { ok: true, payload };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, payload: error.payload as TPayload ?? { error: error.message } as TPayload };
    }
    return { ok: false, payload: { error: (error as Error).message } as TPayload };
  }
};

const resolveApiErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record['error'] === 'string' && record['error'].trim()) {
    return record['error'];
  }
  if (typeof record['message'] === 'string' && record['message'].trim()) {
    return record['message'];
  }
  return fallback;
};

const requireOk = <TPayload>(
  result: ApiPayloadResult<TPayload>,
  fallbackErrorMessage: string
): TPayload => {
  if (!result.ok) {
    const message = resolveApiErrorMessage(result.payload, fallbackErrorMessage);
    const error = new ApiError(message, 400);
    error.payload = result.payload;
    throw error;
  }
  return result.payload;
};

const normalizeGroups = (
  groups?: Record<string, string[]> | DatabasePreviewGroup[]
): DatabasePreviewGroup[] => {
  if (!groups) return [];
  if (Array.isArray(groups)) return groups;
  return Object.entries(groups).map(([type, objects]: [string, string[]]) => ({
    type,
    objects,
  }));
};

type PreviewApiResponse = DatabasePreviewPayload & {
  stats?: {
    groups?: Record<string, string[]>;
    tables?: DatabasePreviewTable[];
  };
  data?: DatabasePreviewRow[];
};

export const fetchProviderDiagnostics = async (): Promise<ProviderDiagnosticsResponse> => {
  return requireOk(
    await fetchJsonResult<ProviderDiagnosticsResponse>('/api/settings/providers', {
      cache: 'no-store',
    }),
    'Failed to fetch provider diagnostics.'
  );
};

export const fetchDatabaseBackups = async (
  dbType: DatabaseType
): Promise<DatabaseInfoResponse[]> => {
  return requireOk(
    await fetchJsonResult<DatabaseInfoResponse[]>(`/api/databases/backups?type=${dbType}`),
    'Failed to fetch backups.'
  );
};

export const createDatabaseBackup = async (
  dbType: DatabaseType
): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  fetchJsonResult<DatabaseBackupResponse>(`/api/databases/backup?type=${dbType}`, {
    method: 'POST',
    headers: withCsrfHeaders(),
  });

export const restoreDatabaseBackup = async (
  dbType: DatabaseType,
  input: { backupName: string; truncateBeforeRestore: boolean }
): Promise<ApiPayloadResult<DatabaseRestoreResponse>> =>
  fetchJsonResult<DatabaseRestoreResponse>(`/api/databases/restore?type=${dbType}`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      backupName: input.backupName,
      truncateBeforeRestore: input.truncateBeforeRestore,
    }),
  });

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

export const deleteDatabaseBackup = async (
  dbType: DatabaseType,
  backupName: string
): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  fetchJsonResult<DatabaseBackupResponse>('/api/databases/delete', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ backupName, type: dbType }),
  });

export const fetchDatabasePreview = async (input: {
  backupName?: string | undefined;
  mode?: DatabasePreviewMode | undefined;
  type?: DatabaseType | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}): Promise<ApiPayloadResult<DatabasePreviewPayload>> => {
  const result = await fetchJsonResult<PreviewApiResponse>('/api/databases/preview', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      backupName: input.backupName,
      mode: input.mode,
      type: input.type,
      page: input.page,
      pageSize: input.pageSize,
    }),
  });
  const raw = result.payload;
  const groups = normalizeGroups(raw.groups ?? raw.stats?.groups);
  const tables = raw.tables ?? raw.stats?.tables ?? [];
  const tableRows = raw.tableRows ?? raw.data ?? [];
  const finalPage = raw.page ?? input.page;
  const finalPageSize = raw.pageSize ?? input.pageSize;
  const payload: DatabasePreviewPayload = {
    ...raw,
    groups,
    tables,
    tableRows,
    ...(finalPage !== undefined ? { page: finalPage } : {}),
    ...(finalPageSize !== undefined ? { pageSize: finalPageSize } : {}),
  };
  return { ok: result.ok, payload };
};

export const executeSqlQuery = async (input: {
  sql?: string;
  type: DatabaseType;
  // MongoDB fields
  collection?: string;
  operation?: string;
  filter?: Record<string, unknown>;
  document?: Record<string, unknown>;
  update?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
}): Promise<SqlQueryResult> => {
  const result = await fetchJsonResult<SqlQueryResult>('/api/databases/execute', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  return result.payload;
};

export const executeCrudOperation = async (
  input: CrudRequest
): Promise<CrudResult> => {
  const result = await fetchJsonResult<CrudResult>('/api/databases/crud', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  return result.payload;
};

// ── Control Panel APIs ──

export const fetchAllCollectionsSchema = async (): Promise<MultiSchemaResponse> => {
  return requireOk(
    await fetchJsonResult<MultiSchemaResponse>('/api/databases/schema?provider=all&includeCounts=true', {
      timeout: 60_000,
    }),
    'Failed to fetch collections schema.'
  );
};

export const fetchRedisOverview = async (limit = 200): Promise<RedisOverviewResponse> => {
  return requireOk(
    await fetchJsonResult<RedisOverviewResponse>(
      `/api/databases/redis?limit=${encodeURIComponent(String(limit))}`,
      { cache: 'no-store' }
    ),
    'Failed to fetch Redis overview.'
  );
};

export const fetchDatabaseEngineStatus = async (): Promise<DatabaseEngineStatusResponse> => {
  return requireOk(
    await fetchJsonResult<DatabaseEngineStatusResponse>('/api/databases/engine/status', {
      cache: 'no-store',
    }),
    'Failed to fetch Database Engine status.'
  );
};

export const fetchDatabaseEngineBackupSchedulerStatus = async (): Promise<DatabaseEngineBackupSchedulerStatusResponse> => {
  return requireOk(
    await fetchJsonResult<DatabaseEngineBackupSchedulerStatusResponse>(
      '/api/databases/engine/backup-scheduler/status',
      { cache: 'no-store' }
    ),
    'Failed to fetch Database Engine backup scheduler status.'
  );
};

export const fetchDatabaseEngineProviderPreview = async (
  collections?: string[]
): Promise<DatabaseEngineProviderPreviewResponse> => {
  const params = new URLSearchParams();
  if (collections && collections.length > 0) {
    params.set('collections', collections.join(','));
  }
  const query = params.toString();
  const url = query
    ? `/api/databases/engine/provider-preview?${query}`
    : '/api/databases/engine/provider-preview';
  return requireOk(
    await fetchJsonResult<DatabaseEngineProviderPreviewResponse>(url, {
      cache: 'no-store',
    }),
    'Failed to fetch Database Engine provider preview.'
  );
};

export const fetchDatabaseEngineOperationsJobs = async (
  limit = 30
): Promise<DatabaseEngineOperationsJobsResponse> => {
  return requireOk(
    await fetchJsonResult<DatabaseEngineOperationsJobsResponse>(
      `/api/databases/engine/operations/jobs?limit=${encodeURIComponent(String(limit))}`,
      { cache: 'no-store' }
    ),
    'Failed to fetch Database Engine operations jobs.'
  );
};

export const runDatabaseEngineBackupSchedulerTick = async (): Promise<DatabaseEngineBackupSchedulerTickResponse> => {
  return requireOk(
    await fetchJsonResult<DatabaseEngineBackupSchedulerTickResponse>(
      '/api/databases/engine/backup-scheduler/tick',
      {
        method: 'POST',
        headers: withCsrfHeaders(),
      }
    ),
    'Failed to run Database Engine backup scheduler tick.'
  );
};

export const runDatabaseEngineBackupNow = async (
  dbType: 'mongodb' | 'postgresql' | 'all'
): Promise<DatabaseEngineBackupRunNowResponse> => {
  return requireOk(
    await fetchJsonResult<DatabaseEngineBackupRunNowResponse>(
      '/api/databases/engine/backup-scheduler/run-now',
      {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ dbType }),
      }
    ),
    'Failed to queue manual database backup.'
  );
};

export const cancelDatabaseEngineOperationJob = async (
  jobId: string
): Promise<{ success: boolean; job: unknown }> => {
  return requireOk(
    await fetchJsonResult<{ success: boolean; job: unknown }>(
      `/api/databases/engine/operations/jobs/${encodeURIComponent(jobId)}/cancel`,
      {
        method: 'POST',
        headers: withCsrfHeaders(),
      }
    ),
    'Failed to cancel Database Engine operation job.'
  );
};

export const copyCollectionBetweenProviders = async (
  collection: string,
  direction: 'mongo_to_prisma' | 'prisma_to_mongo'
): Promise<ApiPayloadResult<CollectionCopyResult>> =>
  fetchJsonResult<CollectionCopyResult>('/api/databases/copy-collection', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ collection, direction }),
  });

export const fetchSupportedCollections = async (): Promise<{ collections: string[] }> => {
  return requireOk(
    await fetchJsonResult<{ collections: string[] }>('/api/databases/copy-collection'),
    'Failed to fetch supported collections.'
  );
};

export const createJsonBackup = async (): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  fetchJsonResult<DatabaseBackupResponse>('/api/databases/json-backup', {
    method: 'POST',
    headers: withCsrfHeaders(),
  });

export const restoreJsonBackup = async (
  backupName: string
): Promise<ApiPayloadResult<DatabaseRestoreResponse>> =>
  fetchJsonResult<DatabaseRestoreResponse>('/api/databases/json-restore', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ backupName }),
  });

export const fetchJsonBackups = async (): Promise<{ backups: string[] }> => {
  return requireOk(
    await fetchJsonResult<{ backups: string[] }>('/api/databases/json-backup'),
    'Failed to fetch JSON backups.'
  );
};

export const updateCollectionProviderMap = async (
  map: Record<string, string>
): Promise<void> => {
  const result = await fetchJsonResult<unknown>('/api/settings', {
    method: 'PUT',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      key: DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
      value: JSON.stringify(map),
    }),
  });
  if (!result.ok) {
    const message = resolveApiErrorMessage(result.payload, 'Failed to update collection provider map');
    throw new ApiError(message, 400);
  }
};

export type DatabaseSyncDirection = 'mongo_to_prisma' | 'prisma_to_mongo';

export const syncDatabase = async (
  direction: DatabaseSyncDirection
): Promise<{ error?: string }> => {
  const result = await fetchJsonResult<{ error?: string }>(
    '/api/settings/database/sync',
    {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ direction, manual: true }),
    }
  );
  if (!result.ok) {
    const message = resolveApiErrorMessage(result.payload, 'Failed to enqueue database sync.');
    throw new ApiError(message, 400);
  }
  return result.payload ?? {};
};

export type SettingsBackfillResult = SettingsBackfillResultDto;

export const backfillSettings = async (
  dryRun: boolean,
  limit: number
): Promise<SettingsBackfillResult> => {
  return requireOk(
    await fetchJsonResult<SettingsBackfillResult>('/api/settings/migrate/backfill-keys', {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ dryRun, limit, manual: true }),
    }),
    'Failed to backfill settings keys.'
  );
};
