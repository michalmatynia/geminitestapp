import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { processProductSyncRun } from '@/features/product-sync/services/product-sync-service';
import type { ProductSyncRunTriggerDto as ProductSyncRunTrigger } from '@/shared/contracts/product-sync';
import { createManagedQueue } from '@/shared/lib/queue';

type ProductSyncQueueJobData = {
  runId: string;
  profileId: string;
  trigger: ProductSyncRunTrigger;
};

const queue = createManagedQueue<ProductSyncQueueJobData>({
  name: 'product-sync',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => {
    const run = await processProductSyncRun(data.runId);
    return {
      ok: true,
      runId: run.id,
      profileId: run.profileId,
      status: run.status,
    };
  },
  onCompleted: async (jobId, _result, data) => {
    await ErrorSystem.logInfo('Product sync job completed', {
      service: 'product-sync-queue',
      runId: data.runId,
      profileId: data.profileId,
      trigger: data.trigger,
      jobId,
    });
  },
  onFailed: async (jobId, error, data) => {
    await ErrorSystem.captureException(error, {
      service: 'product-sync-queue',
      runId: data.runId,
      profileId: data.profileId,
      trigger: data.trigger,
      jobId,
    });
  },
});

export const startProductSyncQueue = (): void => {
  queue.startWorker();
};

export const stopProductSyncQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueProductSyncRunJob = async (
  data: ProductSyncQueueJobData
): Promise<string> => {
  const dedupeBucket = Math.floor(Date.now() / 10_000);
  const jobId = `${data.profileId}:${data.runId}:${data.trigger}:${dedupeBucket}`;
  return queue.enqueue(data, { jobId });
};
