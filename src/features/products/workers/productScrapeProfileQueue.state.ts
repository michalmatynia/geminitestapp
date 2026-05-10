import 'server-only';

import type {
  ProductScrapeProfileRuntimeProgressUpdate,
  ProductScrapeProfileRuntimeRun,
  ProductScrapeProfileRuntimeStatus,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import { notFoundError } from '@/shared/errors/app-error';
import { getRedisClient } from '@/shared/lib/redis';

import {
  ACTIVE_RUN_KEY,
  LATEST_RUN_KEY,
  MEMORY_RUN_LIMIT,
  PAUSE_POLL_INTERVAL_MS,
  PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
  RUN_KEY_PREFIX,
  RUN_TTL_SECONDS,
  TERMINAL_STATUSES,
  type ProductScrapeProfileQueueJobData,
} from './productScrapeProfileQueue.constants';

type RedisClient = NonNullable<ReturnType<typeof getRedisClient>>;

const memoryRuns = new Map<string, ProductScrapeProfileRuntimeRun>();
let memoryActiveRunId: string | null = null;
let memoryLatestRunId: string | null = null;

const runKey = (runId: string): string => `${RUN_KEY_PREFIX}:${runId}`;

export const nowIso = (): string => new Date().toISOString();

export const isTerminalStatus = (status: ProductScrapeProfileRuntimeStatus): boolean =>
  TERMINAL_STATUSES.has(status);

const parseTimestampMs = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getRunLastActivityMs = (run: ProductScrapeProfileRuntimeRun): number | null =>
  parseTimestampMs(run.updatedAt) ??
  parseTimestampMs(run.startedAt) ??
  parseTimestampMs(run.createdAt);

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

export const storeRun = async (run: ProductScrapeProfileRuntimeRun): Promise<void> => {
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

export const setActiveRunId = async (runId: string): Promise<void> => {
  const redis = getRedisClient();
  if (redis === null) {
    memoryActiveRunId = runId;
    return;
  }
  await redis.set(ACTIVE_RUN_KEY, runId, 'EX', RUN_TTL_SECONDS);
};

export const clearActiveRunId = async (runId: string): Promise<void> => {
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

export const readRun = async (
  runId: string
): Promise<ProductScrapeProfileRuntimeRun | null> => {
  const redis = getRedisClient();
  if (redis === null) {
    const run = memoryRuns.get(runId);
    return run === undefined ? null : cloneRun(run);
  }
  return parseRun(await redis.get(runKey(runId)));
};

const readRunId = async (redis: RedisClient, key: string): Promise<string | null> => {
  const value = await redis.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

export const readLatestRunId = async (): Promise<string | null> => {
  const redis = getRedisClient();
  return redis === null ? memoryLatestRunId : await readRunId(redis, LATEST_RUN_KEY);
};

export const readActiveRunId = async (): Promise<string | null> => {
  const redis = getRedisClient();
  return redis === null ? memoryActiveRunId : await readRunId(redis, ACTIVE_RUN_KEY);
};

export const updateRun = async (
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

export const buildRun = (
  request: ProductScrapeProfileQueueJobData['request'],
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

export const markRunRunning = async (
  data: ProductScrapeProfileQueueJobData,
  runId: string
): Promise<ProductScrapeProfileRuntimeRun> => {
  const existing = await readRun(runId);
  const startedAt = nowIso();
  if (existing === null) {
    const run: ProductScrapeProfileRuntimeRun = {
      ...buildRun(data.request, runId, data.requestedAt),
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

export const markRunCompleted = async (
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

export const markRunFailed = async (
  data: ProductScrapeProfileQueueJobData,
  runId: string,
  error: unknown
): Promise<ProductScrapeProfileRuntimeRun | null> => {
  const existing = await readRun(runId);
  const message = error instanceof Error ? error.message : String(error);
  const completedAt = nowIso();
  if (existing === null) {
    const run: ProductScrapeProfileRuntimeRun = {
      ...buildRun(data.request, runId, data.requestedAt),
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

export const updateRunProgress = async (
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

export const waitWhilePausedFromStore = async (runId: string): Promise<void> => {
  const run = await readRun(runId);
  if (run?.status !== 'paused') return;
  await sleep(PAUSE_POLL_INTERVAL_MS);
  await waitWhilePausedFromStore(runId);
};
