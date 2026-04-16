import 'server-only';

import { processBaseImportRun } from '@/features/integrations/server';
import { BASE_IMPORT_QUEUE_LOCK_DURATION_MS } from '@/features/integrations/services/imports/base-import-service-shared';
import type { BaseImportDispatchMode, BaseImportItemStatus } from '@/shared/contracts/integrations/base-com';
import { createManagedQueue, isRedisAvailable } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type BaseImportQueueJobData = {
  runId: string;
  reason: 'start' | 'resume';
  statuses?: BaseImportItemStatus[];
};

const queue = createManagedQueue<BaseImportQueueJobData>({
  name: 'base-import',
  concurrency: 1,
  workerOptions: {
    lockDuration: BASE_IMPORT_QUEUE_LOCK_DURATION_MS,
  },
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data, jobId) => {
    await processBaseImportRun(data.runId, {
      jobId,
      ...(Array.isArray(data.statuses) ? { allowedStatuses: data.statuses } : {}),
    });
    return {
      ok: true,
      runId: data.runId,
      reason: data.reason,
    };
  },
  onCompleted: async (jobId, _result, data) => {
    await ErrorSystem.logInfo('Base import job completed', {
      service: 'base-import-queue',
      runId: data.runId,
      reason: data.reason,
      jobId,
    });
  },
  onFailed: async (jobId, error, data) => {
    await ErrorSystem.captureException(error, {
      service: 'base-import-queue',
      runId: data.runId,
      reason: data.reason,
      jobId,
    });
  },
});

export const startBaseImportQueue = (): void => {
  queue.startWorker();
};

export const stopBaseImportQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueBaseImportRunJob = async (data: BaseImportQueueJobData): Promise<string> => {
  const dedupeBucket = Math.floor(Date.now() / 30_000);
  const statusesKey = (data.statuses ?? ['pending']).join('-');
  // BullMQ rejects custom job IDs containing ":".
  const jobId = [data.reason, data.runId, statusesKey, String(dedupeBucket)].join('__');
  const queuedJobId = await queue.enqueue(data, { jobId });

  await ErrorSystem.logInfo('Base import job queued', {
    service: 'base-import-queue',
    runId: data.runId,
    reason: data.reason,
    jobId: queuedJobId,
    statuses: data.statuses ?? ['pending'],
  });

  return queuedJobId;
};

export type BaseImportDispatchResult = {
  dispatchMode: BaseImportDispatchMode;
  queueJobId: string;
};

const startInlineBaseImportRunInBackground = (
  data: BaseImportQueueJobData,
  queueJobId: string,
  reason: 'redis_unavailable' | 'enqueue_failed'
): void => {
  void processBaseImportRun(data.runId, {
    jobId: queueJobId,
    ...(Array.isArray(data.statuses) ? { allowedStatuses: data.statuses } : {}),
  })
    .then(async () => {
      await ErrorSystem.logInfo('Base import job completed', {
        service: 'base-import-queue',
        runId: data.runId,
        reason: data.reason,
        jobId: queueJobId,
        dispatchReason: reason,
      });
    })
    .catch(async (error: unknown) => {
      await ErrorSystem.captureException(error, {
        service: 'base-import-queue',
        runId: data.runId,
        reason: data.reason,
        jobId: queueJobId,
        action: 'inline-background-failed',
        dispatchReason: reason,
      });
    });
};

/**
 * Dispatches a Base import run job and reports whether it was submitted to the
 * Redis queue or executed inline (Redis unavailable). Inline jobs start in the
 * background immediately; both paths return without waiting for the run to finish.
 */
export const dispatchBaseImportRunJob = async (
  data: BaseImportQueueJobData
): Promise<BaseImportDispatchResult> => {
  if (!isRedisAvailable()) {
    const queueJobId = `inline-${Date.now()}`;
    await ErrorSystem.logInfo('Base import redis unavailable, running inline in background', {
      service: 'base-import-queue',
      runId: data.runId,
      reason: data.reason,
      jobId: queueJobId,
      statuses: data.statuses ?? ['pending'],
    });
    startInlineBaseImportRunInBackground(data, queueJobId, 'redis_unavailable');
    return { dispatchMode: 'inline', queueJobId };
  }

  try {
    const queueJobId = await enqueueBaseImportRunJob(data);
    return { dispatchMode: 'queued', queueJobId };
  } catch (error: unknown) {
    void ErrorSystem.captureException(error, {
      service: 'base-import-queue',
      runId: data.runId,
      reason: data.reason,
      action: 'enqueue-failed',
    });
    const queueJobId = `inline-${Date.now()}`;
    await ErrorSystem.logInfo('Base import enqueue failed, running inline in background', {
      service: 'base-import-queue',
      runId: data.runId,
      reason: data.reason,
      jobId: queueJobId,
      statuses: data.statuses ?? ['pending'],
      error: error instanceof Error ? error.message : String(error),
    });
    startInlineBaseImportRunInBackground(data, queueJobId, 'enqueue_failed');
    return { dispatchMode: 'inline', queueJobId };
  }
};
