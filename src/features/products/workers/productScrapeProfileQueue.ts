import 'server-only';

import { randomUUID } from 'node:crypto';

import { QueueEvents, type Queue as BullMqQueue } from 'bullmq';

import { runProductScrapeProfile } from '@/features/products/server/product-scrape-profiles';
import type {
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import { productScrapeProfileRunResponseSchema } from '@/shared/contracts/products/scrape-profiles';
import { serviceUnavailableError, timeoutError } from '@/shared/errors/app-error';
import {
  createManagedQueue,
  getRedisConnection,
  isRedisAvailable,
  isRedisReachable,
} from '@/shared/lib/queue';
import type { ManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const PRODUCT_SCRAPE_PROFILE_QUEUE_NAME = 'product-scrape-profile';

type ProductScrapeProfileQueueJobData = {
  request: ProductScrapeProfileRunRequest;
  userId: string | null;
  requestedAt: string;
};

type BullMqQueueEventsConnection = NonNullable<
  ConstructorParameters<typeof QueueEvents>[1]
>['connection'];

const WAIT_FOR_RESULT_TIMEOUT_MS = 300_000;
const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = 3_000;
const LOG_SERVICE = 'product-scrape-profile-queue';

const queue: ManagedQueue<ProductScrapeProfileQueueJobData> =
  createManagedQueue<ProductScrapeProfileQueueJobData>({
    name: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    concurrency: 1,
    jobTimeoutMs: 15 * 60 * 1000,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: false,
    },
    processor: async (data) =>
      runProductScrapeProfile(data.request, {
        userId: data.userId,
        runtimeQueueName: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
      }),
    onCompleted: async (jobId, result, data) => {
      await ErrorSystem.logInfo('Product scrape profile job completed', {
        service: LOG_SERVICE,
        jobId,
      profileId: data.request.profileId,
      queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
      runtime: result.runtime,
      result,
      });
    },
    onFailed: async (jobId, error, data) => {
      await ErrorSystem.captureException(error, {
        service: LOG_SERVICE,
      jobId,
      profileId: data.request.profileId,
      queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    });
    },
  });

const assertRedisRuntimeAvailable = async (): Promise<void> => {
  if (!isRedisAvailable()) {
    throw serviceUnavailableError(
      'Scrape profiles require Redis runtime. Configure Redis and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME }
    );
  }
  if ((await isRedisReachable()) === false) {
    throw serviceUnavailableError(
      'Scrape profiles Redis runtime is unreachable. Please retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME }
    );
  }
};

const requireBullMqQueue = (): BullMqQueue<ProductScrapeProfileQueueJobData> => {
  const bullQueue = queue.getQueue() as BullMqQueue<ProductScrapeProfileQueueJobData> | null;
  if (bullQueue === null) {
    throw serviceUnavailableError(
      'Scrape profiles Redis runtime is not initialized. Please retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME }
    );
  }
  return bullQueue;
};

const waitForQueuedResult = async (
  jobId: string
): Promise<ProductScrapeProfileRunResponse> => {
  const redis = getRedisConnection();
  if (redis === null) {
    throw serviceUnavailableError(
      'Scrape profiles Redis runtime is not initialized. Please retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME, jobId }
    );
  }

  const events = new QueueEvents(PRODUCT_SCRAPE_PROFILE_QUEUE_NAME, {
    connection: redis as BullMqQueueEventsConnection,
  });
  try {
    await events.waitUntilReady();
    const job = await requireBullMqQueue().getJob(jobId);
    if (job === undefined) {
      throw timeoutError('Scrape profile job was queued but could not be found.', {
        queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
        jobId,
      });
    }
    const result: unknown = await job.waitUntilFinished(events, WAIT_FOR_RESULT_TIMEOUT_MS);
    return productScrapeProfileRunResponseSchema.parse(result);
  } finally {
    await events.close().catch(() => undefined);
  }
};

const buildJobId = (profileId: string): string =>
  ['product-scrape-profile', encodeURIComponent(profileId), randomUUID()].join('__');

export const startProductScrapeProfileQueue = (): void => {
  queue.startWorker();
};

export const stopProductScrapeProfileQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const runProductScrapeProfileViaRedisRuntime = async (
  request: ProductScrapeProfileRunRequest,
  options: { userId?: string | null } = {}
): Promise<ProductScrapeProfileRunResponse> => {
  await assertRedisRuntimeAvailable();
  startProductScrapeProfileQueue();
  const jobId = await queue.enqueue(
    {
      request,
      userId: options.userId ?? null,
      requestedAt: new Date().toISOString(),
    },
    { jobId: buildJobId(request.profileId) }
  );
  await ErrorSystem.logInfo('Product scrape profile job queued', {
    service: LOG_SERVICE,
    jobId,
    profileId: request.profileId,
    queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    userId: options.userId ?? null,
  });
  return await waitForQueuedResult(jobId);
};
