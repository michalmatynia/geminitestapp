import 'server-only';

import { processBaseImportRun } from '@/features/integrations/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { BaseImportItemStatus } from '@/shared/contracts/integrations';
import { createManagedQueue } from '@/shared/lib/queue';

type BaseImportQueueJobData = {
  runId: string;
  reason: 'start' | 'resume';
  statuses?: BaseImportItemStatus[];
};

const queue = createManagedQueue<BaseImportQueueJobData>({
  name: 'base-import',
  concurrency: 1,
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
