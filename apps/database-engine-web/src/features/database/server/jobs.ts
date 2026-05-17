import 'server-only';

import {
  createMongoBackup,
  createMongoManagedBackup,
} from '@/shared/lib/db/services/database-backup';
import {
  markDatabaseBackupJobFailed,
  markDatabaseBackupJobRunning,
  markDatabaseBackupJobSucceeded,
} from '@/shared/lib/db/services/database-backup-scheduler';
import type { DatabaseEngineManagedMongoApplicationTarget } from '@/shared/contracts/database';
import type {
  ProductAiJob,
  ProductAiJobRecord,
  ProductAiJobType,
  ProductAiJobUpdate,
} from '@/shared/contracts/jobs';
import { operationFailedError } from '@/shared/errors/app-error';
import { writeLastBackupState } from '@/shared/lib/db/services/last-backup-state';
import { getProductAiJobRepository } from '@/shared/lib/products/services/product-ai-job-repository';
import { createManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { isObjectRecord } from '@/shared/utils/object-utils';

type ProductAiJobWithProduct = Omit<ProductAiJob, 'product'> & {
  product: Record<string, unknown> | null;
};

type DatabaseBackupQueueJobData = {
  jobId: string;
  productId: string;
  type: string;
  payload: unknown;
};

const DATABASE_BACKUP_QUEUE_NAME = 'product-ai';
const DATABASE_BACKUP_JOB_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(process.env['DATABASE_ENGINE_BACKUP_JOB_TIMEOUT_MS'] ?? '', 10);
  if (!Number.isFinite(raw)) return 30 * 60 * 1000;
  return Math.max(5 * 60 * 1000, raw);
})();
const DATABASE_BACKUP_RUNNING_STALE_TTL_MS = (() => {
  const raw = Number.parseInt(
    process.env['DATABASE_ENGINE_BACKUP_RUNNING_STALE_TTL_MS'] ?? '',
    10
  );
  if (!Number.isFinite(raw)) return 10 * 60 * 1000;
  return Math.max(60 * 1000, raw);
})();

let backupJobRecoveryInFlight = false;

const isManagedMongoApplicationTarget = (
  value: unknown
): value is DatabaseEngineManagedMongoApplicationTarget =>
  value === 'all' ||
  value === 'geminitestapp' ||
  value === 'studiq' ||
  value === 'cms-builder' ||
  value === 'products' ||
  value === 'arch';

const resolveManagedBackupApplication = (
  payload: unknown
): DatabaseEngineManagedMongoApplicationTarget | null => {
  if (!isObjectRecord(payload)) return null;
  const directApplication = payload['application'];
  if (isManagedMongoApplicationTarget(directApplication)) return directApplication;
  const managedApplication = payload['managedApplication'];
  if (isManagedMongoApplicationTarget(managedApplication)) return managedApplication;
  return null;
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

/**
 * enqueueProductAiJob: Creates a new AI product job entry in the database.
 * @param productId - The ID of the product this job is associated with.
 * @param type - The type of AI job to create (e.g., 'db_backup').
 * @param payload - Arbitrary data payload required by the specific job.
 * @returns The newly created job record.
 */
export async function enqueueProductAiJob(
  productId: string,
  type: ProductAiJobType,
  payload: unknown
): Promise<ProductAiJob> {
  const repository = await getProductAiJobRepository();
  const record = await repository.createJob(productId, type, payload);
  return toProductAiJob(record);
}

/**
 * getProductAiJobs: Retrieves a list of AI product jobs.
 * @param productId - Optional filter to limit results by product ID.
 * @returns A list of job records with linked product data.
 */
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

/**
 * getProductAiJob: Fetches a specific AI product job by its ID.
 * @param jobId - The unique identifier of the job to retrieve.
 * @returns The job record, or null if not found.
 */
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

const runBackupForJob = async (record: ProductAiJobRecord) => {
  const managedApplication = resolveManagedBackupApplication(record.payload);
  if (managedApplication !== null) {
    return createMongoManagedBackup(managedApplication);
  }
  return createMongoBackup();
};

const isStaleRunningBackupJob = (record: ProductAiJobRecord, nowMs: number): boolean => {
  if (record.status !== 'running') return false;
  const startedAtMs = record.startedAt instanceof Date ? record.startedAt.getTime() : Number.NaN;
  if (!Number.isFinite(startedAtMs)) return true;
  return nowMs - startedAtMs >= DATABASE_BACKUP_RUNNING_STALE_TTL_MS;
};

const recoverInterruptedBackupJobs = async (): Promise<void> => {
  if (backupJobRecoveryInFlight) return;
  backupJobRecoveryInFlight = true;

  try {
    const repository = await getProductAiJobRepository();
    const [pending, running] = await Promise.all([
      repository.findJobs('system', { type: 'db_backup', statuses: ['pending'] }),
      repository.findJobs('system', { type: 'db_backup', statuses: ['running'] }),
    ]);
    const nowMs = Date.now();
    const jobsToRecover = [
      ...pending,
      ...running.filter((record) => isStaleRunningBackupJob(record, nowMs)),
    ];

    for (const record of jobsToRecover) {
      await enqueueProductAiJobToQueue(record.id, record.productId, record.type, record.payload);
    }
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'database-engine-db-backup-queue',
      action: 'recoverInterruptedBackupJobs',
    });
  } finally {
    backupJobRecoveryInFlight = false;
  }
};

/**
 * processProductAiJob: Executes the AI product job logic, specifically handling MongoDB backup jobs.
 * This includes updating the job status, performing the backup, and marking it as complete or failed.
 * @param jobId - The unique identifier of the job to process.
 */
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
    const result = await runBackupForJob(record);
    await markBackupSucceededSafely(jobId);
    await writeLastBackupState({
      lastBackupAt: new Date().toISOString(),
      application: resolveManagedBackupApplication(record.payload),
    });
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

const queue = createManagedQueue<DatabaseBackupQueueJobData>({
  name: DATABASE_BACKUP_QUEUE_NAME,
  concurrency: 1,
  jobTimeoutMs: DATABASE_BACKUP_JOB_TIMEOUT_MS,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => processProductAiJob(data.jobId),
  onFailed: async (_queueJobId, error, data) => {
    const message = error instanceof Error ? error.message : String(error);
    await markBackupFailedSafely(data.jobId, message);
  },
});

/**
 * startProductAiJobQueue: Ensures the job queue worker is initialized and running.
 */
export function startProductAiJobQueue(): void {
  queue.startWorker();
  void recoverInterruptedBackupJobs();
}

export async function enqueueProductAiJobToQueue(
  jobId: string,
  productId: string | null | undefined,
  runtimeType: string,
  payload: unknown
): Promise<void> {
  await queue.enqueue(
    {
      jobId,
      productId: productId ?? 'system',
      type: runtimeType,
      payload,
    },
    { jobId }
  );
}

export async function getQueueStatus(): Promise<Record<string, unknown>> {
  const repository = await getProductAiJobRepository();
  const [pending, running, health] = await Promise.all([
    repository.findJobs('system', { type: 'db_backup', statuses: ['pending'] }),
    repository.findJobs('system', { type: 'db_backup', statuses: ['running'] }),
    queue.getHealthStatus().catch(async (error: unknown) => {
      await ErrorSystem.captureException(error, {
        service: 'database-engine-db-backup-queue',
        action: 'getQueueStatus',
      });
      return {
        deliveryMode: 'inline' as const,
        workerState: 'offline' as const,
        redisAvailable: false,
        workerLocal: false,
        waitingCount: 0,
        activeCount: 0,
        completedCount: 0,
        failedCount: 0,
        running: false,
        healthy: false,
        processing: false,
      };
    }),
  ]);
  return {
    name: DATABASE_BACKUP_QUEUE_NAME,
    ...health,
    waitingCount: pending.length,
    activeCount: running.length,
    repositoryPendingCount: pending.length,
    repositoryRunningCount: running.length,
  };
}
