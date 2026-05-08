/* eslint-disable max-lines, no-await-in-loop */
import 'server-only';

import { randomUUID } from 'node:crypto';

import { runProductScrapeProfile } from '@/features/products/server/product-scrape-profiles';
import type {
  ProductScrapeProfileRuntimeRun,
  ProductScrapeProfileRuntimeStatus,
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
import type { ManagedQueue } from '@/shared/lib/queue';
import { getRedisClient } from '@/shared/lib/redis';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const PRODUCT_SCRAPE_PROFILE_QUEUE_NAME = 'product-scrape-profile';

type ProductScrapeProfileQueueJobData = {
  request: ProductScrapeProfileRunRequest;
  userId: string | null;
  requestedAt: string;
};

const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = 3_000;
const LOG_SERVICE = 'product-scrape-profile-queue';
const RUN_KEY_PREFIX = 'product:scrape-profile:run';
const ACTIVE_RUN_KEY = 'product:scrape-profile:active-run';
const LATEST_RUN_KEY = 'product:scrape-profile:latest-run';
const RUN_TTL_SECONDS = 60 * 60 * 24 * 7;
const MEMORY_RUN_LIMIT = 100;
const PAUSE_POLL_INTERVAL_MS = 750;
const TERMINAL_STATUSES = new Set<ProductScrapeProfileRuntimeStatus>([
  'canceled',
  'completed',
  'failed',
]);

type RedisClient = NonNullable<ReturnType<typeof getRedisClient>>;

const memoryRuns = new Map<string, ProductScrapeProfileRuntimeRun>();
let memoryActiveRunId: string | null = null;
let memoryLatestRunId: string | null = null;

const runKey = (runId: string): string => `${RUN_KEY_PREFIX}:${runId}`;
const nowIso = (): string => new Date().toISOString();

const isTerminalStatus = (status: ProductScrapeProfileRuntimeStatus): boolean =>
  TERMINAL_STATUSES.has(status);

const cloneRun = (run: ProductScrapeProfileRuntimeRun): ProductScrapeProfileRuntimeRun => ({
  ...run,
  result: run.result === null ? null : { ...run.result },
});

const parseRun = (value: string | null): ProductScrapeProfileRuntimeRun | null => {
  if (value === null) return null;
  try {
    return JSON.parse(value) as ProductScrapeProfileRuntimeRun;
  } catch {
    return null;
  }
};

const evictTerminalMemoryRuns = (): void => {
  if (memoryRuns.size <= MEMORY_RUN_LIMIT) return;
  for (const [id, run] of memoryRuns) {
    if (memoryRuns.size <= MEMORY_RUN_LIMIT) break;
    if (id === memoryActiveRunId || id === memoryLatestRunId) continue;
    if (!isTerminalStatus(run.status)) continue;
    memoryRuns.delete(id);
  }
};

const storeRun = async (run: ProductScrapeProfileRuntimeRun): Promise<void> => {
  const redis = getRedisClient();
  if (redis === null) {
    memoryRuns.delete(run.id);
    memoryRuns.set(run.id, cloneRun(run));
    memoryLatestRunId = run.id;
    evictTerminalMemoryRuns();
    return;
  }
  await redis.set(runKey(run.id), JSON.stringify(run), 'EX', RUN_TTL_SECONDS);
  await redis.set(LATEST_RUN_KEY, run.id, 'EX', RUN_TTL_SECONDS);
};

const setActiveRunId = async (runId: string): Promise<void> => {
  const redis = getRedisClient();
  if (redis === null) {
    memoryActiveRunId = runId;
    return;
  }
  await redis.set(ACTIVE_RUN_KEY, runId, 'EX', RUN_TTL_SECONDS);
};

const clearActiveRunId = async (runId: string): Promise<void> => {
  const redis = getRedisClient();
  if (redis === null) {
    if (memoryActiveRunId === runId) memoryActiveRunId = null;
    return;
  }
  const current = await redis.get(ACTIVE_RUN_KEY);
  if (current === runId) {
    await redis.del(ACTIVE_RUN_KEY);
  }
};

const readRun = async (runId: string): Promise<ProductScrapeProfileRuntimeRun | null> => {
  const redis = getRedisClient();
  if (redis === null) {
    const run = memoryRuns.get(runId);
    return run === undefined ? null : cloneRun(run);
  }
  return parseRun(await redis.get(runKey(runId)));
};

const readRunId = async (
  redis: RedisClient,
  key: string
): Promise<string | null> => {
  const value = await redis.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const updateRun = async (
  runId: string,
  patch: Partial<ProductScrapeProfileRuntimeRun>
): Promise<ProductScrapeProfileRuntimeRun> => {
  const current = await readRun(runId);
  if (current === null) {
    throw notFoundError(`Scrape profile run not found: ${runId}`, { runId });
  }
  const next: ProductScrapeProfileRuntimeRun = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };
  await storeRun(next);
  if (isTerminalStatus(next.status)) {
    await clearActiveRunId(runId);
  } else {
    await setActiveRunId(runId);
  }
  return next;
};

const sleep = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

const buildRun = (
  request: ProductScrapeProfileRunRequest,
  runId: string,
  createdAt: string
): ProductScrapeProfileRuntimeRun => ({
  completedAt: null,
  createdAt,
  dryRun: request.dryRun ?? false,
  error: null,
  id: runId,
  profileId: request.profileId,
  queueName: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
  result: null,
  startedAt: null,
  status: 'queued',
  updatedAt: createdAt,
});

const markRunRunning = async (
  data: ProductScrapeProfileQueueJobData,
  runId: string
): Promise<ProductScrapeProfileRuntimeRun> => {
  const existing = await readRun(runId);
  const startedAt = nowIso();
  if (existing === null) {
    const fallback = buildRun(data.request, runId, data.requestedAt);
    const run: ProductScrapeProfileRuntimeRun = {
      ...fallback,
      startedAt,
      status: 'running',
      updatedAt: startedAt,
    };
    await storeRun(run);
    await setActiveRunId(runId);
    return run;
  }
  return await updateRun(runId, {
    error: null,
    startedAt: existing.startedAt ?? startedAt,
    status: existing.status === 'paused' ? 'paused' : 'running',
  });
};

const markRunCompleted = async (
  runId: string,
  result: ProductScrapeProfileRunResponse
): Promise<ProductScrapeProfileRuntimeRun | null> => {
  const completedAt = nowIso();
  const run = await readRun(runId);
  if (run === null) return null;
  return await updateRun(runId, {
    completedAt,
    error: null,
    result,
    status: 'completed',
  });
};

const markRunFailed = async (
  data: ProductScrapeProfileQueueJobData,
  runId: string,
  error: unknown
): Promise<ProductScrapeProfileRuntimeRun | null> => {
  const existing = await readRun(runId);
  const message = error instanceof Error ? error.message : String(error);
  const completedAt = nowIso();
  if (existing === null) {
    const fallback = buildRun(data.request, runId, data.requestedAt);
    const run: ProductScrapeProfileRuntimeRun = {
      ...fallback,
      completedAt,
      error: message,
      status: 'failed',
      updatedAt: completedAt,
    };
    await storeRun(run);
    await clearActiveRunId(runId);
    return run;
  }
  if (isTerminalStatus(existing.status)) return existing;
  return await updateRun(runId, {
    completedAt,
    error: message,
    status: 'failed',
  });
};

const waitWhilePausedFromStore = async (runId: string): Promise<void> => {
  let run = await readRun(runId);
  while (run?.status === 'paused') {
    await sleep(PAUSE_POLL_INTERVAL_MS);
    run = await readRun(runId);
  }
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
    processor: async (data, jobId) => {
      await markRunRunning(data, jobId);
      await waitWhilePausedFromStore(jobId);
      try {
        return await runProductScrapeProfile(data.request, {
          userId: data.userId,
          runtimeQueueName: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
          waitWhilePaused: () => waitWhilePausedFromStore(jobId),
        });
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

const buildJobId = (profileId: string): string =>
  ['product-scrape-profile', encodeURIComponent(profileId), randomUUID()].join('__');

export const readProductScrapeProfileRun = async (
  runId: string
): Promise<ProductScrapeProfileRuntimeRun | null> => {
  const trimmedRunId = runId.trim();
  if (trimmedRunId.length === 0) return null;
  return await readRun(trimmedRunId);
};

export const readLatestProductScrapeProfileRun =
  async (): Promise<ProductScrapeProfileRuntimeRun | null> => {
    const redis = getRedisClient();
    const runId = redis === null ? memoryLatestRunId : await readRunId(redis, LATEST_RUN_KEY);
    return runId === null ? null : await readRun(runId);
  };

export const readActiveProductScrapeProfileRun =
  async (): Promise<ProductScrapeProfileRuntimeRun | null> => {
    const redis = getRedisClient();
    const runId = redis === null ? memoryActiveRunId : await readRunId(redis, ACTIVE_RUN_KEY);
    if (runId === null) return null;
    const run = await readRun(runId);
    if (run === null || isTerminalStatus(run.status)) {
      await clearActiveRunId(runId);
      return null;
    }
    return run;
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
  await storeRun(run);
  await setActiveRunId(jobId);
  startProductScrapeProfileQueue();
  const jobData: ProductScrapeProfileQueueJobData = {
    request,
    userId: options.userId ?? null,
    requestedAt: enqueuedAt,
  };
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
    queueName: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    enqueuedAt,
    run,
  };
};
