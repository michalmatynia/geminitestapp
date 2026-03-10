import 'server-only';

import {
  processTraderaListingJob,
  type TraderaListingJobInput as _TraderaListingJobInput,
} from '@/features/integrations/services/tradera-listing-service';
import { createManagedQueue, type ManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type TraderaListingQueueJobData = {
  listingId: string;
  action: 'list' | 'relist';
  source?: 'manual' | 'scheduler' | 'api';
  jobId?: string;
};

const queue: ManagedQueue<TraderaListingQueueJobData> =
  createManagedQueue<TraderaListingQueueJobData>({
    name: 'tradera-listings',
    concurrency: 1,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    },
    processor: async (data: TraderaListingQueueJobData, jobId: string) => {
      await processTraderaListingJob({ ...data, jobId });
      return { ok: true, listingId: data.listingId, action: data.action };
    },
    onCompleted: async (jobId: string, _result: unknown, data: TraderaListingQueueJobData) => {
      await ErrorSystem.logInfo('Tradera listing job completed', {
        service: 'tradera-listing-queue',
        listingId: data.listingId,
        action: data.action,
        jobId,
      });
    },
    onFailed: async (jobId: string, error: Error, data: TraderaListingQueueJobData) => {
      await ErrorSystem.captureException(error, {
        service: 'tradera-listing-queue',
        listingId: data.listingId,
        action: data.action,
        jobId,
      });
    },
  });

export const startTraderaListingQueue = (): void => {
  queue.startWorker();
};

export const stopTraderaListingQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueTraderaListingJob = async (
  data: TraderaListingQueueJobData
): Promise<string> => {
  const dedupeBucket = Math.floor(Date.now() / 30_000);
  const jobId = `${data.action}:${data.listingId}:${dedupeBucket}`;
  const queuedJobId = await queue.enqueue(data, {
    jobId,
  });
  await ErrorSystem.logInfo('Tradera listing job queued', {
    service: 'tradera-listing-queue',
    listingId: data.listingId,
    action: data.action,
    jobId: queuedJobId,
  });
  return queuedJobId;
};
