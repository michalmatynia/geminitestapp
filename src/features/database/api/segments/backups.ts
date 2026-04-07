import {
  DatabaseBackupFile as DatabaseInfoResponse,
  DatabaseBackupResponse,
  DatabaseRestoreResponse,
  DatabaseType,
} from '@/shared/contracts/database';
import { type ApiPayloadResult } from '@/shared/contracts/http';
import { api } from '@/shared/lib/api-client';
import { withDbTypeQuery, wrapInApiPayloadResult } from './shared';

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

export const createJsonBackup = async (): Promise<ApiPayloadResult<DatabaseBackupResponse>> =>
  wrapInApiPayloadResult(api.post<DatabaseBackupResponse>('/api/databases/json-backup'));

export const restoreJsonBackup = async (
  backupName: string
): Promise<ApiPayloadResult<DatabaseRestoreResponse>> =>
  wrapInApiPayloadResult(
    api.post<DatabaseRestoreResponse>(withDbTypeQuery('/api/databases/json-restore'), { backupName })
  );

export const fetchJsonBackups = async (): Promise<{ backups: string[] }> =>
  api.get<{ backups: string[] }>('/api/databases/json-backup');
