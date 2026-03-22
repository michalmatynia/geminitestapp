import 'server-only';

import { createManagedQueue, type ManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { processBaseExportJob } from './baseExportProcessor';

import type { ImageBase64Mode, ImageTransformOptions } from '@/shared/contracts/integrations/base';

export type BaseExportJobData = {
  productId: string;
  connectionId: string;
  inventoryId: string;
  templateId: string | null;
  imagesOnly: boolean;
  listingId: string | null;
  externalListingId: string | null;
  allowDuplicateSku: boolean;
  exportImagesAsBase64: boolean;
  imageBase64Mode: ImageBase64Mode | null;
  imageTransform: ImageTransformOptions | null;
  imageBaseUrl: string;
  requestId: string | null;
  runId: string;
  userId: string | null;
};

const queue: ManagedQueue<BaseExportJobData> = createManagedQueue<BaseExportJobData>({
  name: 'base-export',
  concurrency: 2,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data: BaseExportJobData, jobId: string) => {
    await processBaseExportJob(data, jobId);
    return { ok: true, productId: data.productId, runId: data.runId };
  },
  onCompleted: async (jobId: string, _result: unknown, data: BaseExportJobData) => {
    await ErrorSystem.logInfo('Base export job completed', {
      service: 'base-export-queue',
      productId: data.productId,
      runId: data.runId,
      jobId,
    });
  },
  onFailed: async (jobId: string, error: Error, data: BaseExportJobData) => {
    await ErrorSystem.captureException(error, {
      service: 'base-export-queue',
      productId: data.productId,
      runId: data.runId,
      jobId,
    });
  },
});

export const startBaseExportQueue = (): void => {
  queue.startWorker();
};

export const stopBaseExportQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueBaseExportJob = async (data: BaseExportJobData): Promise<string> => {
  const dedupeBucket = Math.floor(Date.now() / 30_000);
  const jobId = `export:${data.productId}:${data.connectionId}:${data.inventoryId}:${dedupeBucket}`;
  const queuedJobId = await queue.enqueue(data, { jobId });
  await ErrorSystem.logInfo('Base export job queued', {
    service: 'base-export-queue',
    productId: data.productId,
    connectionId: data.connectionId,
    runId: data.runId,
    jobId: queuedJobId,
  });
  return queuedJobId;
};
