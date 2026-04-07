import {
  DatabaseEngineBackupRunNowResponse,
  DatabaseEngineBackupSchedulerStatus as DatabaseEngineBackupSchedulerStatusResponse,
  DatabaseEngineBackupSchedulerTickResponse,
  DatabaseEngineOperationsJobs as DatabaseEngineOperationsJobsResponse,
  DatabaseEngineProviderPreview as DatabaseEngineProviderPreviewResponse,
  DatabaseEngineStatus as DatabaseEngineStatusResponse,
  MultiSchemaResponse,
  RedisOverview as RedisOverviewResponse,
  SettingsBackfillResult,
} from '@/shared/contracts/database';
import type { AppProviderDiagnostics as ProviderDiagnosticsResponse } from '@/shared/contracts/system';
import { api } from '@/shared/lib/api-client';

export const getDatabaseStatus = async (): Promise<DatabaseEngineStatusResponse> =>
  api.get<DatabaseEngineStatusResponse>('/api/databases/engine/status');

export const fetchDatabaseEngineStatus = getDatabaseStatus;

export const getDatabaseEngineStatus = getDatabaseStatus;

export const getProviderDiagnostics = async (): Promise<ProviderDiagnosticsResponse> =>
  api.get<ProviderDiagnosticsResponse>('/api/settings/providers');

export const getRedisOverview = async (limit: number = 200): Promise<RedisOverviewResponse> =>
  api.get<RedisOverviewResponse>('/api/databases/redis', { params: { limit } });

export const fetchRedisOverview = getRedisOverview;

export const runDatabaseEngineBackupNow = async (
  dbType: 'mongodb' | 'all'
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
