import 'server-only';

import { randomUUID } from 'node:crypto';

import { runProductScrapeProfile } from '@/features/products/server/product-scrape-profiles';
import type {
  ProductScrapeProfileRuntimeRun,
  ProductScrapeProfileRunQueuedResponse,
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import { conflictError, notFoundError, serviceUnavailableError } from '@/shared/errors/app-error';
import {
  createManagedQueue,
  isRedisAvailable,
  isRedisReachable,
} from '@/shared/lib/queue';
import type { ManagedQueue, QueueHealthStatus } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  LOG_SERVICE,
  PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
  QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
  type ProductScrapeProfileQueueJobData,
} from './productScrapeProfileQueue.constants';
import {
  buildRun,
  clearActiveRunId,
  isTerminalStatus,
  markRunCompleted,
  markRunFailed,
  markRunRunning,
  readActiveRunId,
  readLatestRunId,
  readRun,
  setActiveRunId,
  storeRun,
  updateRun,
  updateRunProgress,
  waitWhilePausedFromStore,
} from './productScrapeProfileQueue.state';
import {
  reconcileRuntimeRun,
  resolveRunResultBeforeProcessing,
} from './productScrapeProfileQueue.recovery';

export { PRODUCT_SCRAPE_PROFILE_QUEUE_NAME };

const resolveAbortSignalError = (signal: AbortSignal, jobId: string): Error => {
  const reason = signal.reason as unknown;
  if (reason instanceof Error) return reason;
  return new Error(`Scrape profile job ${jobId} was aborted.`);
};

const raceScrapeWithAbortSignal = async (
  scrape: Promise<ProductScrapeProfileRunResponse>,
  signal: AbortSignal,
  jobId: string
): Promise<ProductScrapeProfileRunResponse> => {
  let rejectAbort: ((error: Error) => void) | undefined;
  const abortScrape = (): void => {
    rejectAbort?.(resolveAbortSignalError(signal, jobId));
  };
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
    signal.addEventListener('abort', abortScrape, { once: true });
  });
  try {
    return await Promise.race([scrape, aborted]);
  } finally {
    signal.removeEventListener('abort', abortScrape);
  }
};

const runProductScrapeProfileJob = async (
  data: ProductScrapeProfileQueueJobData,
  jobId: string,
  signal: AbortSignal | undefined
): Promise<ProductScrapeProfileRunResponse> => {
  if (signal?.aborted === true) throw resolveAbortSignalError(signal, jobId);
  const scrape = runProductScrapeProfile(data.request, {
    reportProgress: async (progress) => {
      await updateRunProgress(jobId, progress);
    },
    signal,
    userId: data.userId,
    runtimeQueueName: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    waitWhilePaused: () => waitWhilePausedFromStore(jobId),
  });
  return signal === undefined ? await scrape : await raceScrapeWithAbortSignal(scrape, signal, jobId);
};

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
    processor: async (data, jobId, signal) => {
      const existingResult = await resolveRunResultBeforeProcessing(jobId, queue);
      if (existingResult !== null) return existingResult;
      await markRunRunning(data, jobId);
      await waitWhilePausedFromStore(jobId);
      try {
        const result = await runProductScrapeProfileJob(data, jobId, signal);
        await markRunCompleted(jobId, result);
        return result;
      } catch (error) {
        await markRunFailed(data, jobId, error);
        throw error;
      }
    },
    onCompleted: async (jobId, result, data) => {
      const scrapeResult = result as ProductScrapeProfileRunResponse;
      await markRunCompleted(jobId, scrapeResult);
      await ErrorSystem.logInfo('Product scrape profile job completed', {
        service: LOG_SERVICE,
        jobId,
        profileId: data.request.profileId,
        queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
        runtime: scrapeResult.runtime,
        result: scrapeResult,
      });
    },
    onFailed: async (jobId, error, data) => {
      await markRunFailed(data, jobId, error);
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

const isProductScrapeProfileWorkerHealthReady = (health: QueueHealthStatus): boolean =>
  health.deliveryMode === 'queue' &&
  health.redisAvailable !== false &&
  health.workerLocal === true &&
  health.healthy !== false;

const readProductScrapeProfileWorkerHealth = async (): Promise<QueueHealthStatus> => {
  try {
    startProductScrapeProfileQueue();
    return await queue.getHealthStatus();
  } catch (error) {
    throw serviceUnavailableError(
      'Scrape profiles Redis worker could not be started. Please retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      {
        error: error instanceof Error ? error.message : String(error),
        queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
      }
    );
  }
};

const assertProductScrapeProfileWorkerReady = async (): Promise<void> => {
  const health = await readProductScrapeProfileWorkerHealth();
  if (isProductScrapeProfileWorkerHealthReady(health)) return;
  throw serviceUnavailableError(
    'Scrape profiles Redis worker did not start. Please retry.',
    QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
    {
      health,
      queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    }
  );
};

const buildJobId = (profileId: string): string =>
  ['product-scrape-profile', encodeURIComponent(profileId), randomUUID()].join('__');

export const readProductScrapeProfileRun = async (
  runId: string
): Promise<ProductScrapeProfileRuntimeRun | null> => {
  const trimmedRunId = runId.trim();
  if (trimmedRunId.length === 0) return null;
  const run = await readRun(trimmedRunId);
  if (run === null || isTerminalStatus(run.status)) return run;
  return await reconcileRuntimeRun(run, queue);
};

export const readLatestProductScrapeProfileRun =
  async (): Promise<ProductScrapeProfileRuntimeRun | null> => {
    const runId = await readLatestRunId();
    if (runId === null) return null;
    const run = await readRun(runId);
    if (run === null || isTerminalStatus(run.status)) return run;
    return await reconcileRuntimeRun(run, queue);
  };

export const readActiveProductScrapeProfileRun =
  async (): Promise<ProductScrapeProfileRuntimeRun | null> => {
    const runId = await readActiveRunId();
    if (runId === null) return null;
    const run = await readRun(runId);
    if (run === null || isTerminalStatus(run.status)) {
      await clearActiveRunId(runId);
      return null;
    }
    const reconciled = await reconcileRuntimeRun(run, queue);
    if (isTerminalStatus(reconciled.status)) {
      await clearActiveRunId(runId);
      return null;
    }
    return reconciled;
  };

export const pauseProductScrapeProfileRun = async (
  runId: string
): Promise<ProductScrapeProfileRuntimeRun> => {
  const run = await readRun(runId);
  if (run === null) {
    throw notFoundError(`Scrape profile run not found: ${runId}`, { runId });
  }
  if (isTerminalStatus(run.status)) {
    throw conflictError('Scrape profile run has already finished.', {
      runId,
      status: run.status,
    });
  }
  if (run.status === 'paused') return run;
  return await updateRun(runId, { status: 'paused' });
};

export const resumeProductScrapeProfileRun = async (
  runId: string
): Promise<ProductScrapeProfileRuntimeRun> => {
  const run = await readRun(runId);
  if (run === null) {
    throw notFoundError(`Scrape profile run not found: ${runId}`, { runId });
  }
  if (isTerminalStatus(run.status)) {
    throw conflictError('Scrape profile run has already finished.', {
      runId,
      status: run.status,
    });
  }
  if (run.status !== 'paused') return run;
  return await updateRun(runId, { status: run.startedAt === null ? 'queued' : 'running' });
};

export const startProductScrapeProfileQueue = (): void => {
  queue.startWorker();
};

export const stopProductScrapeProfileQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const runProductScrapeProfileViaRedisRuntime = async (
  request: ProductScrapeProfileRunRequest,
  options: { userId?: string | null } = {}
): Promise<ProductScrapeProfileRunQueuedResponse> => {
  await assertRedisRuntimeAvailable();
  const enqueuedAt = new Date().toISOString();
  const jobId = buildJobId(request.profileId);
  const run = buildRun(request, jobId, enqueuedAt);
  const jobData: ProductScrapeProfileQueueJobData = {
    request,
    userId: options.userId ?? null,
    requestedAt: enqueuedAt,
  };
  await assertProductScrapeProfileWorkerReady();
  await storeRun(run);
  await setActiveRunId(jobId);
  const enqueuedJobId = await queue.enqueue(jobData, { jobId }).catch(async (error: unknown) => {
    await markRunFailed(jobData, jobId, error);
    throw error;
  });
  await ErrorSystem.logInfo('Product scrape profile job queued', {
    service: LOG_SERVICE,
    enqueuedJobId,
    jobId,
    profileId: request.profileId,
    queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    userId: options.userId ?? null,
  });
  return {
    status: 'queued',
    profileId: request.profileId,
    dryRun: request.dryRun ?? false,
    jobId,
    imageImportMode: request.imageImportMode ?? 'links',
    queueName: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    enqueuedAt,
    run,
  };
};
