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
      // When the worker is killed mid-job (stall), processTraderaListingJob never runs to
      // completion, so the listing stays in 'queued' forever and blocks re-listing attempts.
      try {
        const { getProductListingRepository } = await import('@/features/integrations/server');
        const repo = await getProductListingRepository();
        await repo.updateListingStatus(data.listingId, 'failed');
      } catch (cleanupError) {
        await ErrorSystem.captureException(cleanupError, {
          service: 'tradera-listing-queue',
          listingId: data.listingId,
          phase: 'on-failed-status-cleanup',
        });
      }
    },
  });

export const startTraderaListingQueue = (): void => {
  queue.startWorker();
};

export const stopTraderaListingQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

const resolveTraderaListingSelectorProfile = (
  selectorProfile: string | undefined
): string =>
  typeof selectorProfile === 'string' && selectorProfile.trim().length > 0
    ? selectorProfile.trim()
    : 'default';

export const buildTraderaListingQueueJobId = (
  data: TraderaListingQueueJobData,
  nowMs = Date.now()
): string => {
  const dedupeBucket = Math.floor(nowMs / 30_000);
  const jobIdParts = [
    data.action,
    data.listingId,
    data.browserMode ?? 'connection_default',
    resolveTraderaListingSelectorProfile(data.selectorProfile),
    String(dedupeBucket),
  ];
  return jobIdParts.join(':');
};

const resolveRequestedTraderaListingQueueJobId = (
  data: TraderaListingQueueJobData
): string =>
  typeof data.jobId === 'string' && data.jobId.trim().length > 0
    ? data.jobId.trim()
    : buildTraderaListingQueueJobId(data);

export const enqueueTraderaListingJob = async (
  data: TraderaListingQueueJobData
): Promise<string> => {
  const jobId = resolveRequestedTraderaListingQueueJobId(data);
  const queuedJobId = await queue.enqueue({ ...data, jobId }, {
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
