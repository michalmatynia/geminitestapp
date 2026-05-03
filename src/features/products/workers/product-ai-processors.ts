import 'server-only';

import { createMongoBackup } from '@/shared/lib/db/services/database-backup';
import {
  markDatabaseBackupJobFailed,
  markDatabaseBackupJobRunning,
  markDatabaseBackupJobSucceeded,
} from '@/shared/lib/db/services/database-backup-scheduler';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  processBase64ConvertAll,
  processBaseImageSyncAll,
} from './product-ai-processors.bulk';
import { processGraphModel } from './product-ai-processors.graph-model';
import type { Job } from './product-ai-processors.types';

export type { Job, JobPayload } from './product-ai-processors.types';
export { processGraphModel };

const markDatabaseBackupRunningSafely = async (
  dbType: 'mongodb',
  jobId: string
): Promise<void> => {
  try {
    await markDatabaseBackupJobRunning(dbType, jobId);
  } catch (error) {
    await ErrorSystem.captureException(error);
  }
};

const markDatabaseBackupSucceededSafely = async (
  dbType: 'mongodb',
  jobId: string
): Promise<void> => {
  try {
    await markDatabaseBackupJobSucceeded(dbType, jobId);
  } catch (error) {
    await ErrorSystem.captureException(error);
  }
};

const markDatabaseBackupFailedSafely = async (
  dbType: 'mongodb',
  jobId: string,
  message: string
): Promise<void> => {
  try {
    await markDatabaseBackupJobFailed(dbType, jobId, message);
  } catch (error) {
    await ErrorSystem.captureException(error);
  }
};

export async function processDatabaseBackup(job: Job): Promise<Record<string, unknown>> {
  const dbType = job.payload['dbType'];
  if (dbType !== 'mongodb') {
    throw badRequestError('Database backup job missing valid dbType', {
      jobId: job.id,
      dbType,
    });
  }

  await markDatabaseBackupRunningSafely(dbType, job.id);
  try {
    const result = await createMongoBackup();
    await markDatabaseBackupSucceededSafely(dbType, job.id);
    return { ...result, dbType };
  } catch (error: unknown) {
    await ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : String(error);
    await markDatabaseBackupFailedSafely(dbType, job.id, message);
    throw error;
  }
}

export async function dispatchProductAiJob(job: Job): Promise<unknown> {
  switch (job.type) {
    case 'graph_model':
      return processGraphModel(job);
    case 'db_backup':
      return processDatabaseBackup(job);
    case 'base64_all':
      return processBase64ConvertAll(job);
    case 'base_images_sync_all':
      return processBaseImageSyncAll(job);
    default:
      throw operationFailedError(`Unknown job type: ${job.type}`, undefined, {
        jobId: job.id,
        type: job.type,
      });
  }
}
