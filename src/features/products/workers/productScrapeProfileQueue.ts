/* eslint-disable max-lines, no-await-in-loop */
import 'server-only';

import { randomUUID } from 'node:crypto';

import { runProductScrapeProfile } from '@/features/products/server/product-scrape-profiles';
import type {
  ProductScrapeProfileRuntimeProgressUpdate,
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
import type { ManagedQueue, QueueHealthStatus } from '@/shared/lib/queue';
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
const STALE_QUEUED_RUN_MS = 2 * 60 * 1000;
const STALE_RUNNING_RUN_MS = 20 * 60 * 1000;
const TERMINAL_STATUSES = new Set<ProductScrapeProfileRuntimeStatus>([
  'canceled',
  'completed',
  'failed',
]);
const STALE_QUEUE_JOB_STATES = new Set(['delayed', 'missing', 'unknown', 'waiting', 'waiting-children']);

type RedisClient = NonNullable<ReturnType<typeof getRedisClient>>;

const memoryRuns = new Map<string, ProductScrapeProfileRuntimeRun>();
let memoryActiveRunId: string | null = null;
let memoryLatestRunId: string | null = null;

const runKey = (runId: string): string => `${RUN_KEY_PREFIX}:${runId}`;
const nowIso = (): string => new Date().toISOString();

const isTerminalStatus = (status: ProductScrapeProfileRuntimeStatus): boolean =>
  TERMINAL_STATUSES.has(status);

const parseTimestampMs = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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
  imageImportMode: request.imageImportMode ?? 'links',
  profileId: request.profileId,
  progress: null,
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
  if (run.status === 'completed') return run;
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

const updateRunProgress = async (
  runId: string,
  progress: ProductScrapeProfileRuntimeProgressUpdate
): Promise<ProductScrapeProfileRuntimeRun | null> => {
  const existing = await readRun(runId);
  if (existing === null || isTerminalStatus(existing.status)) return existing;
  const updatedAt = nowIso();
  return await updateRun(runId, {
    progress: {
      current: progress.current,
      message: progress.message,
      stage: progress.stage,
      total: progress.total,
      updatedAt,
    },
  });
};

const waitWhilePausedFromStore = async (runId: string): Promise<void> => {
  let run = await readRun(runId);
  while (run?.status === 'paused') {
    await sleep(PAUSE_POLL_INTERVAL_MS);
    run = await readRun(runId);
  }
};

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
  const aborted = new Promise<never>((_, reject) => {
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

type QueueJobRuntimeState = {
  failedReason: string | null;
  state: string;
};

type QueueWithJobLookup = {
  getJob: (jobId: string) => Promise<QueueJobLike | null>;
};

type QueueJobLike = {
  failedReason?: unknown;
  getState?: () => Promise<string>;
};

const getRunLastActivityMs = (run: ProductScrapeProfileRuntimeRun): number | null =>
  parseTimestampMs(run.updatedAt) ??
  parseTimestampMs(run.startedAt) ??
  parseTimestampMs(run.createdAt);

const shouldInspectQueueJob = (run: ProductScrapeProfileRuntimeRun): boolean =>
  run.status === 'queued' || run.status === 'running';

const startRuntimeWorkerForActiveRun = (): void => {
  if (!isRedisAvailable()) return;
  try {
    queue.startWorker();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      action: 'start-runtime-worker-for-active-run',
      queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
      service: LOG_SERVICE,
    });
  }
};

const getQueueWithJobLookup = (): QueueWithJobLookup | null => {
  const maybeQueue = queue.getQueue();
  if (
    maybeQueue === null ||
    typeof maybeQueue !== 'object' ||
    typeof (maybeQueue as { getJob?: unknown }).getJob !== 'function'
  ) {
    return null;
  }
  return maybeQueue as QueueWithJobLookup;
};

const readQueueJobRuntimeState = async (
  runId: string
): Promise<QueueJobRuntimeState | null> => {
  try {
    await queue.getHealthStatus();
    const jobQueue = getQueueWithJobLookup();
    if (jobQueue === null) return null;
    const job = await jobQueue.getJob(runId);
    if (job === null) return { failedReason: null, state: 'missing' };
    const state =
      typeof job.getState === 'function' ? await job.getState() : 'unknown';
    return {
      failedReason: typeof job.failedReason === 'string' ? job.failedReason : null,
      state,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      action: 'read-queue-job-runtime-state',
      jobId: runId,
      queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
      service: LOG_SERVICE,
    });
    return null;
  }
};

const resolveTerminalQueueJobMessage = (
  queueJobState: QueueJobRuntimeState | null
): string | null => {
  if (queueJobState?.state === 'failed') {
    return queueJobState.failedReason ?? 'Scrape profile Redis job failed before the run state was updated.';
  }
  if (queueJobState?.state === 'completed') {
    return 'Scrape profile Redis job completed before the run state was updated.';
  }
  return null;
};

const resolveImmediateRunRecoveryMessage = (
  run: ProductScrapeProfileRuntimeRun,
  queueJobState: QueueJobRuntimeState | null
): string | null => {
  const terminalMessage = resolveTerminalQueueJobMessage(queueJobState);
  if (terminalMessage !== null) return terminalMessage;
  if (run.status === 'running' && queueJobState?.state === 'missing') {
    return 'Scrape profile Redis job disappeared while the run was marked running.';
  }
  return null;
};

const resolveQueuedStaleRunMessage = (
  queueJobState: QueueJobRuntimeState | null
): string | null => {
  const state = queueJobState?.state ?? 'unknown';
  if (!STALE_QUEUE_JOB_STATES.has(state)) return null;
  return 'Scrape profile run was marked failed after being queued for over 2 minutes without Redis worker pickup.';
};

const resolveRunningStaleRunMessage = (
  queueJobState: QueueJobRuntimeState | null
): string | null =>
  queueJobState?.state === 'active'
    ? 'Scrape profile run was marked failed after exceeding 20 minutes while the Redis job was still active.'
    : 'Scrape profile run was marked failed after exceeding 20 minutes without Redis worker progress.';

const resolveStaleRunMessage = (
  run: ProductScrapeProfileRuntimeRun,
  queueJobState: QueueJobRuntimeState | null
): string | null =>
  resolveTerminalQueueJobMessage(queueJobState) ??
  (run.status === 'queued'
    ? resolveQueuedStaleRunMessage(queueJobState)
    : resolveRunningStaleRunMessage(queueJobState));

const failRecoveredRuntimeRun = async (
  run: ProductScrapeProfileRuntimeRun,
  error: string,
  queueJobState: QueueJobRuntimeState | null
): Promise<ProductScrapeProfileRuntimeRun> => {
  const recovered = await updateRun(run.id, {
    completedAt: nowIso(),
    error,
    status: 'failed',
  });
  await ErrorSystem.logWarning('Recovered stale scrape profile runtime run', {
    error,
    jobId: run.id,
    profileId: run.profileId,
    queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    queueJobState: queueJobState?.state ?? null,
    service: LOG_SERVICE,
    status: run.status,
  });
  return recovered;
};

const reconcileRuntimeRun = async (
  run: ProductScrapeProfileRuntimeRun
): Promise<ProductScrapeProfileRuntimeRun> => {
  if (!shouldInspectQueueJob(run)) return run;
  startRuntimeWorkerForActiveRun();
  const queueJobState = await readQueueJobRuntimeState(run.id);
  const immediateMessage = resolveImmediateRunRecoveryMessage(run, queueJobState);
  if (immediateMessage !== null) {
    return await failRecoveredRuntimeRun(run, immediateMessage, queueJobState);
  }
  const lastActivityMs = getRunLastActivityMs(run);
  if (lastActivityMs === null) return run;

  const ageMs = Math.max(0, Date.now() - lastActivityMs);
  const staleAfterMs =
    run.status === 'queued' ? STALE_QUEUED_RUN_MS : STALE_RUNNING_RUN_MS;
  if (ageMs < staleAfterMs) return run;

  const staleMessage = resolveStaleRunMessage(run, queueJobState);
  return staleMessage === null
    ? run
    : await failRecoveredRuntimeRun(run, staleMessage, queueJobState);
};

const resolveRunResultBeforeProcessing = async (
  runId: string
): Promise<ProductScrapeProfileRunResponse | null> => {
  const existing = await readRun(runId);
  if (existing === null) return null;
  const reconciled = await reconcileRuntimeRun(existing);
  if (reconciled.status === 'completed' && reconciled.result !== null) {
    return reconciled.result;
  }
  if (isTerminalStatus(reconciled.status)) {
    // Run has already completed or failed and cannot be reprocessed
    throw new Error(`Scrape profile run ${runId} is already ${reconciled.status}.`);
  }
  return null;
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
      const existingResult = await resolveRunResultBeforeProcessing(jobId);
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
  return await reconcileRuntimeRun(run);
};

export const readLatestProductScrapeProfileRun =
  async (): Promise<ProductScrapeProfileRuntimeRun | null> => {
    const redis = getRedisClient();
    const runId = redis === null ? memoryLatestRunId : await readRunId(redis, LATEST_RUN_KEY);
    if (runId === null) return null;
    const run = await readRun(runId);
    if (run === null || isTerminalStatus(run.status)) return run;
    return await reconcileRuntimeRun(run);
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
    const reconciled = await reconcileRuntimeRun(run);
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
