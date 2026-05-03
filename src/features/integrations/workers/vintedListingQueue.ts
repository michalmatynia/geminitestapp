import 'server-only';

import type { VintedListingJobInput } from '@/features/integrations/services/vinted-listing-service';
import { createManagedQueue, type ManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type VintedListingServiceModule = {
  processVintedListingJob: (input: VintedListingJobInput) => Promise<void>;
};

const loadVintedListingService = async (): Promise<VintedListingServiceModule> =>
  import('../services/' + 'vinted-listing-service') as Promise<VintedListingServiceModule>;

const queue: ManagedQueue<VintedListingJobInput> =
  createManagedQueue<VintedListingJobInput>({
    name: 'vinted-listings',
    concurrency: 1,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    },
    processor: async (data: VintedListingJobInput, jobId: string) => {
      const { processVintedListingJob } = await loadVintedListingService();
      await processVintedListingJob({ ...data, jobId });
      return { ok: true, listingId: data.listingId, action: data.action };
    },
    onCompleted: async (jobId: string, _result: unknown, data: VintedListingJobInput) => {
      await ErrorSystem.logInfo('Vinted listing job completed', {
        service: 'vinted-listing-queue',
        listingId: data.listingId,
        action: data.action,
        jobId,
      });
    },
    onFailed: async (jobId: string, error: Error, data: VintedListingJobInput) => {
      await ErrorSystem.captureException(error, {
        service: 'vinted-listing-queue',
        listingId: data.listingId,
        action: data.action,
        jobId,
      });
    },
  });

export const startVintedListingQueue = (): void => {
  queue.startWorker();
};

export const stopVintedListingQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueVintedListingJob = async (
  data: VintedListingJobInput
): Promise<string> => {
  const dedupeBucket = Math.floor(Date.now() / 30_000);
  const browserMode = data.browserMode ?? 'connection_default';
  const browserPreference = data.browserPreference ?? 'auto';
  const jobId = `${data.action}:${data.listingId}:${browserMode}:${browserPreference}:${dedupeBucket}`;
  const queuedJobId = await queue.enqueue(data, {
    jobId,
  });
  await ErrorSystem.logInfo('Vinted listing job queued', {
    service: 'vinted-listing-queue',
    listingId: data.listingId,
    action: data.action,
    jobId: queuedJobId,
  });
  return queuedJobId;
};
