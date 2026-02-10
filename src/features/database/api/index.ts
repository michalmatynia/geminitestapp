import type { AppProviderDiagnosticsDto as ProviderDiagnosticsResponse } from '@/shared/dtos/system';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

import type {
  CrudRequest,
  CrudResult,
  DatabaseBackupResponse,
  DatabaseInfo,
  DatabasePreviewGroup,
  DatabasePreviewMode,
  DatabasePreviewPayload,
  DatabasePreviewRow,
  DatabasePreviewTable,
  DatabaseRestoreResponse,
  DatabaseType,
  SqlQueryResult,
} from '../types';

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
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
  const res = await fetch('/api/settings/providers', { cache: 'no-store' });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Failed to fetch provider diagnostics.');
  }
  return (await res.json()) as ProviderDiagnosticsResponse;
};

export const fetchDatabaseBackups = async (
  dbType: DatabaseType
): Promise<DatabaseInfo[]> => {
  const res = await fetch(`/api/databases/backups?type=${dbType}`);
  if (!res.ok) {
    throw new Error('Failed to fetch backups');
  }
  return res.json() as Promise<DatabaseInfo[]>;
};

export const createDatabaseBackup = async (dbType: DatabaseType): Promise<{ ok: boolean; payload: DatabaseBackupResponse }> => {
  const res = await fetch(`/api/databases/backup?type=${dbType}`, {
    method: 'POST',
    headers: withCsrfHeaders(),
  });
  const payload = await safeJson<DatabaseBackupResponse>(res);
  return { ok: res.ok, payload };
};

export const restoreDatabaseBackup = async (
  dbType: DatabaseType,
  input: { backupName: string; truncateBeforeRestore: boolean }
): Promise<{ ok: boolean; payload: DatabaseRestoreResponse }> => {
  const res = await fetch(`/api/databases/restore?type=${dbType}`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      backupName: input.backupName,
      truncateBeforeRestore: input.truncateBeforeRestore,
    }),
  });
  const payload = await safeJson<DatabaseRestoreResponse>(res);
  return { ok: res.ok, payload };
};

export const uploadDatabaseBackup = async (
  dbType: DatabaseType,
  file: File,
  onProgress?: (loaded: number, total?: number) => void
): Promise<{ ok: boolean; payload: DatabaseBackupResponse }> => {
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
): Promise<{ ok: boolean; payload: DatabaseBackupResponse }> => {
  const res = await fetch('/api/databases/delete', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ backupName, type: dbType }),
  });
  const payload = await safeJson<DatabaseBackupResponse>(res);
  return { ok: res.ok, payload };
};

export const fetchDatabasePreview = async (input: {
  backupName?: string | undefined;
  mode?: DatabasePreviewMode | undefined;
  type?: DatabaseType | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}): Promise<{ ok: boolean; payload: DatabasePreviewPayload }> => {
  const res = await fetch('/api/databases/preview', {
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
  const raw = await safeJson<PreviewApiResponse>(res);
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
  return { ok: res.ok, payload };
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
  const res = await fetch('/api/databases/execute', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  return safeJson<SqlQueryResult>(res);
};

export const executeCrudOperation = async (
  input: CrudRequest
): Promise<CrudResult> => {
  const res = await fetch('/api/databases/crud', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  return safeJson<CrudResult>(res);
};

// ── Control Panel APIs ──

export type MultiSchemaResponse = {
  provider: 'multi';
  collections: Array<{
    name: string;
    fields: { name: string; type: string }[];
    provider: 'mongodb' | 'prisma';
    documentCount?: number | undefined;
  }>;
  sources: Partial<Record<'mongodb' | 'prisma', { provider: string; collections: unknown[] }>>;
};

export type CollectionCopyResult = {
  name: string;
  status: 'completed' | 'skipped' | 'failed';
  sourceCount: number;
  targetDeleted: number;
  targetInserted: number;
  warnings?: string[];
  error?: string;
};

export const fetchAllCollectionsSchema = async (): Promise<MultiSchemaResponse> => {
  const res = await fetch('/api/databases/schema?provider=all&includeCounts=true');
  if (!res.ok) {
    throw new Error('Failed to fetch collections schema');
  }
  return res.json() as Promise<MultiSchemaResponse>;
};

export const copyCollectionBetweenProviders = async (
  collection: string,
  direction: 'mongo_to_prisma' | 'prisma_to_mongo'
): Promise<CollectionCopyResult> => {
  const res = await fetch('/api/databases/copy-collection', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ collection, direction }),
  });
  return safeJson<CollectionCopyResult>(res);
};

export const fetchSupportedCollections = async (): Promise<{ collections: string[] }> => {
  const res = await fetch('/api/databases/copy-collection');
  if (!res.ok) {
    throw new Error('Failed to fetch supported collections');
  }
  return res.json() as Promise<{ collections: string[] }>;
};

export const createJsonBackup = async (): Promise<DatabaseBackupResponse> => {
  const res = await fetch('/api/databases/json-backup', {
    method: 'POST',
    headers: withCsrfHeaders(),
  });
  return safeJson<DatabaseBackupResponse>(res);
};

export const restoreJsonBackup = async (
  backupName: string
): Promise<DatabaseRestoreResponse> => {
  const res = await fetch('/api/databases/json-restore', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ backupName }),
  });
  return safeJson<DatabaseRestoreResponse>(res);
};

export const fetchJsonBackups = async (): Promise<{ backups: string[] }> => {
  const res = await fetch('/api/databases/json-backup');
  if (!res.ok) {
    throw new Error('Failed to fetch JSON backups');
  }
  return res.json() as Promise<{ backups: string[] }>;
};

export const updateCollectionProviderMap = async (
  map: Record<string, string>
): Promise<void> => {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      key: 'collection_provider_map',
      value: JSON.stringify(map),
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to update collection provider map');
  }
};

export type DatabaseSyncDirection = 'mongo_to_prisma' | 'prisma_to_mongo';

export const syncDatabase = async (
  direction: DatabaseSyncDirection
): Promise<{ error?: string }> => {
  const res = await fetch('/api/settings/database/sync', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ direction }),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload?.error || 'Failed to enqueue database sync.');
  }
  return {};
};

export type SettingsBackfillResult = {
  matched: number;
  modified: number;
  remaining: number;
  sampleIds?: string[];
};

export const backfillSettings = async (
  dryRun: boolean,
  limit: number
): Promise<SettingsBackfillResult> => {
  const res = await fetch('/api/settings/migrate/backfill-keys', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ dryRun, limit }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Failed to backfill settings keys.');
  }
  return res.json() as Promise<SettingsBackfillResult>;
};
