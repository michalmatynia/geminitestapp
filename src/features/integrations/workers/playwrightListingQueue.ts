import 'server-only';

import type { PlaywrightListingJobInput as _PlaywrightListingJobInput } from '@/features/integrations/services/playwright-listing-service';
import { createManagedQueue, type ManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type PlaywrightListingQueueJobData = {
  listingId: string;
  action: 'list' | 'relist';
  source?: 'manual' | 'scheduler' | 'api';
  jobId?: string;
  browserMode?: 'connection_default' | 'headless' | 'headed';
};

type PlaywrightListingServiceModule = {
  processPlaywrightListingJob: (
    input: PlaywrightListingQueueJobData & { jobId?: string }
  ) => Promise<void>;
};

const loadPlaywrightListingService = async (): Promise<PlaywrightListingServiceModule> =>
  import('../services/' + 'playwright-listing-service') as Promise<PlaywrightListingServiceModule>;

const queue: ManagedQueue<PlaywrightListingQueueJobData> =
  createManagedQueue<PlaywrightListingQueueJobData>({
    name: 'playwright-programmable-listings',
    concurrency: 1,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    },
    processor: async (data: PlaywrightListingQueueJobData, jobId: string) => {
      const { processPlaywrightListingJob } = await loadPlaywrightListingService();
      await processPlaywrightListingJob({ ...data, jobId });
      return { ok: true, listingId: data.listingId, action: data.action };
    },
    onCompleted: async (jobId: string, _result: unknown, data: PlaywrightListingQueueJobData) => {
      await ErrorSystem.logInfo('Programmable Playwright listing job completed', {
        service: 'playwright-programmable-listing-queue',
        listingId: data.listingId,
        action: data.action,
        jobId,
      });
    },
    onFailed: async (jobId: string, error: Error, data: PlaywrightListingQueueJobData) => {
      await ErrorSystem.captureException(error, {
        service: 'playwright-programmable-listing-queue',
        listingId: data.listingId,
        action: data.action,
        jobId,
      });
    },
  });

export const startPlaywrightListingQueue = (): void => {
  queue.startWorker();
};

export const stopPlaywrightListingQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueuePlaywrightListingJob = async (
  data: PlaywrightListingQueueJobData
): Promise<string> => {
  const dedupeBucket = Math.floor(Date.now() / 30_000);
  const jobId = `${data.action}:${data.listingId}:${dedupeBucket}`;
  const queuedJobId = await queue.enqueue(data, {
    jobId,
  });
  await ErrorSystem.logInfo('Programmable Playwright listing job queued', {
    service: 'playwright-programmable-listing-queue',
    listingId: data.listingId,
    action: data.action,
    jobId: queuedJobId,
  });
  return queuedJobId;
};
