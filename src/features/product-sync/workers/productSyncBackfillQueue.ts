import 'server-only';

import { runBaseListingBackfill } from '@/features/product-sync/services/product-sync-service';
import { createManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type ProductSyncBackfillJobData = {
  connectionId?: string;
  inventoryId?: string;
  catalogId?: string | null;
  limit?: number;
  source?: string;
};

const encodeJobIdPart = (value: string | null | undefined, fallback: string): string => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? encodeURIComponent(normalized) : fallback;
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
  // BullMQ rejects custom job IDs containing ":".
  const jobId = [
    'product-sync-backfill',
    String(dedupeBucket),
    encodeJobIdPart(data.connectionId, 'default'),
    encodeJobIdPart(data.catalogId, 'all'),
  ].join('__');
  return queue.enqueue(data, { jobId });
};
