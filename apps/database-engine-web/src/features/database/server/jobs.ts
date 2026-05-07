import 'server-only';

import { createMongoBackup } from '@/shared/lib/db/services/database-backup';
import {
  markDatabaseBackupJobFailed,
  markDatabaseBackupJobRunning,
  markDatabaseBackupJobSucceeded,
} from '@/shared/lib/db/services/database-backup-scheduler';
import type {
  ProductAiJob,
  ProductAiJobRecord,
  ProductAiJobType,
  ProductAiJobUpdate,
} from '@/shared/contracts/jobs';
import { operationFailedError } from '@/shared/errors/app-error';
import { getProductAiJobRepository } from '@/shared/lib/products/services/product-ai-job-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { isObjectRecord } from '@/shared/utils/object-utils';

type ProductAiJobWithProduct = Omit<ProductAiJob, 'product'> & {
  product: Record<string, unknown> | null;
};

const toIsoString = (value?: Date | null): string | null => {
  if (!value) return null;
  return value.toISOString();
};

const toJobResult = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  return isObjectRecord(value) ? value : null;
};

const toProductAiJob = (record: ProductAiJobRecord): ProductAiJob => ({
  id: record.id,
  productId: record.productId,
  status: record.status === 'canceled' ? 'cancelled' : record.status,
  type: record.type,
  jobType: record.type as ProductAiJobType,
  payload: isObjectRecord(record.payload) ? record.payload : undefined,
  result: toJobResult(record.result),
  errorMessage: record.errorMessage ?? null,
  error: record.errorMessage ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
  startedAt: toIsoString(record.startedAt),
  finishedAt: toIsoString(record.finishedAt),
  completedAt: toIsoString(record.finishedAt),
});

const toJobUpdate = (data: ProductAiJobUpdate): ProductAiJobUpdate => data;

const markBackupRunningSafely = async (jobId: string): Promise<void> => {
  try {
    await markDatabaseBackupJobRunning('mongodb', jobId);
  } catch (error) {
    await ErrorSystem.captureException(error);
  }
};

const markBackupSucceededSafely = async (jobId: string): Promise<void> => {
  try {
    await markDatabaseBackupJobSucceeded('mongodb', jobId);
  } catch (error) {
    await ErrorSystem.captureException(error);
  }
};

const markBackupFailedSafely = async (jobId: string, message: string): Promise<void> => {
  try {
    await markDatabaseBackupJobFailed('mongodb', jobId, message);
  } catch (error) {
    await ErrorSystem.captureException(error);
  }
};

export async function enqueueProductAiJob(
  productId: string,
  type: ProductAiJobType,
  payload: unknown
): Promise<ProductAiJob> {
  const repository = await getProductAiJobRepository();
  const record = await repository.createJob(productId, type, payload);
  return toProductAiJob(record);
}

export async function getProductAiJobs(
  productId?: string
): Promise<ProductAiJobWithProduct[]> {
  const repository = await getProductAiJobRepository();
  const records = await repository.findJobs(productId);
  return records.map((record) => ({
    ...toProductAiJob(record),
    product: null,
  }));
}

export async function getProductAiJob(jobId: string): Promise<ProductAiJobWithProduct | null> {
  const repository = await getProductAiJobRepository();
  const record = await repository.findJobById(jobId);
  if (!record) return null;
  return {
    ...toProductAiJob(record),
    product: null,
  };
}

export async function cancelProductAiJob(jobId: string): Promise<ProductAiJob> {
  const repository = await getProductAiJobRepository();
  const updated = await repository.updateJob(
    jobId,
    toJobUpdate({
      status: 'canceled',
      finishedAt: new Date(),
      errorMessage: 'Cancelled by Database Engine.',
    })
  );
  return toProductAiJob(updated);
}

export function startProductAiJobQueue(): void {
  // The standalone Database Engine runs db_backup jobs inline.
}

export async function enqueueProductAiJobToQueue(
  _jobId: string,
  _productId: string | null | undefined,
  _runtimeType: string,
  _payload: unknown
): Promise<never> {
  throw operationFailedError('Database Engine job queue is not available in standalone mode.');
}

export async function processProductAiJob(jobId: string): Promise<ProductAiJob> {
  const repository = await getProductAiJobRepository();
  const record = await repository.findJobById(jobId);
  if (!record) {
    throw operationFailedError('Job not found.', undefined, { jobId });
  }
  if (record.type !== 'db_backup') {
    throw operationFailedError('Standalone Database Engine can only process db_backup jobs.', undefined, {
      jobId,
      type: record.type,
    });
  }

  await markBackupRunningSafely(jobId);
  await repository.updateJob(
    jobId,
    toJobUpdate({
      status: 'running',
      startedAt: new Date(),
      errorMessage: null,
    })
  );

  try {
    const result = await createMongoBackup();
    await markBackupSucceededSafely(jobId);
    const updated = await repository.updateJob(
      jobId,
      toJobUpdate({
        status: 'completed',
        result: { ...result, dbType: 'mongodb' },
        finishedAt: new Date(),
        errorMessage: null,
      })
    );
    return toProductAiJob(updated);
  } catch (error) {
    await ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : String(error);
    await markBackupFailedSafely(jobId, message);
    await repository.updateJob(
      jobId,
      toJobUpdate({
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: message,
      })
    );
    throw error;
  }
}

export async function getQueueStatus(): Promise<Record<string, unknown>> {
  const repository = await getProductAiJobRepository();
  const pending = await repository.findJobs('system', { type: 'db_backup', statuses: ['pending'] });
  const running = await repository.findJobs('system', { type: 'db_backup', statuses: ['running'] });
  return {
    name: 'database-engine-db-backup-inline',
    deliveryMode: 'inline',
    workerState: 'inline',
    redisAvailable: false,
    workerLocal: true,
    waitingCount: pending.length,
    activeCount: running.length,
    completedCount: 0,
    failedCount: 0,
    running: false,
    healthy: true,
    processing: false,
  };
}
