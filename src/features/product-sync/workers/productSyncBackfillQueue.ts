import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { runBaseListingBackfill } from '@/features/product-sync/services/product-sync-service';
import { createManagedQueue } from '@/shared/lib/queue';

type ProductSyncBackfillJobData = {
  connectionId?: string;
  inventoryId?: string;
  catalogId?: string | null;
  limit?: number;
  source?: string;
};

const queue = createManagedQueue<ProductSyncBackfillJobData>({
  name: 'product-sync-backfill',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => {
    return runBaseListingBackfill(data);
  },
  onCompleted: async (jobId, result) => {
    await ErrorSystem.logInfo('Product sync backfill completed', {
      service: 'product-sync-backfill-queue',
      jobId,
      result,
    });
  },
  onFailed: async (jobId, error, data) => {
    await ErrorSystem.captureException(error, {
      service: 'product-sync-backfill-queue',
      jobId,
      data,
    });
  },
});

export const startProductSyncBackfillQueue = (): void => {
  queue.startWorker();
};

export const stopProductSyncBackfillQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueProductSyncBackfillJob = async (
  data: ProductSyncBackfillJobData
): Promise<string> => {
  const dedupeBucket = Math.floor(Date.now() / 30_000);
  const jobId = `product-sync-backfill:${dedupeBucket}:${data.connectionId ?? 'default'}:${data.catalogId ?? 'all'}`;
  return queue.enqueue(data, { jobId });
};
