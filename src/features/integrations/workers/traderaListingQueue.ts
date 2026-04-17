import 'server-only';

import type { TraderaListingJobInput as _TraderaListingJobInput } from '@/features/integrations/services/tradera-listing-service';
import { createManagedQueue, type ManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type TraderaListingQueueJobData = {
  listingId: string;
  action: 'list' | 'relist' | 'sync' | 'check_status';
  source?: 'manual' | 'scheduler' | 'api';
  jobId?: string;
  browserMode?: 'connection_default' | 'headless' | 'headed';
  selectorProfile?: string;
};

type TraderaListingServiceModule = {
  processTraderaListingJob: (
    input: TraderaListingQueueJobData & { jobId?: string }
  ) => Promise<void>;
};

const loadTraderaListingService = async (): Promise<TraderaListingServiceModule> =>
  import('../services/' + 'tradera-listing-service') as Promise<TraderaListingServiceModule>;

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
      const { processTraderaListingJob } = await loadTraderaListingService();
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
  const normalizedSelectorProfile =
    typeof data.selectorProfile === 'string' && data.selectorProfile.trim().length > 0
      ? data.selectorProfile.trim()
      : 'default';
  const jobIdParts = [
    data.action,
    data.listingId,
    data.browserMode ?? 'connection_default',
    normalizedSelectorProfile,
    String(dedupeBucket),
  ];
  const jobId = jobIdParts.join(':');
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
