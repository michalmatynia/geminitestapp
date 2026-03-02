import 'server-only';

import { Queue } from 'bullmq';

import { resolveAiPathsStaleRunningCleanupIntervalMs } from '@/features/ai/ai-paths/services/path-run-recovery-service';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import {
  getRuntimeAnalyticsAvailability,
  getRuntimeAnalyticsSummary,
  recordRuntimeRunStarted,
  type RuntimeAnalyticsAvailability,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  processRun,
  processStaleRunRecovery,
} from '@/features/ai/ai-paths/workers/ai-path-run-processor';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { configurationError, serviceUnavailableError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { createManagedQueue, getRedisConnection } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  computeAiPathRunQueueSlo,
  type AiPathRunQueueSloStatus,
  type SloLevel,
} from './ai-path-run-queue-slo';
import {
  isQueueTransportError,
  createDebugQueueLogger,
  parseEnvNumber,
} from './ai-path-run-queue-utils';
import {
  type AiPathRunQueueBaseStatus,
  type AiPathRunQueueStatus,
} from '@/shared/contracts/ai-paths-runtime';

export type { AiPathRunQueueSloStatus, SloLevel };

const AI_PATH_RUN_QUEUE_NAME = 'ai-path-run';
const LOG_SOURCE = 'ai-path-run-queue';
const DEBUG_AI_PATH_QUEUE = process.env['AI_PATHS_QUEUE_DEBUG'] === 'true';

const { log: debugQueueLog, warn: debugQueueWarn } = createDebugQueueLogger(
  LOG_SOURCE,
  DEBUG_AI_PATH_QUEUE
);

// Default concurrency raised from 1 → 3: one slow job no longer blocks the whole queue.
// claimRunForProcessing uses an atomic findOneAndUpdate so concurrent workers never
// double-process the same run.  Override with AI_PATHS_RUN_CONCURRENCY env var.
const DEFAULT_CONCURRENCY = parseEnvNumber('AI_PATHS_RUN_CONCURRENCY', 3);
// Per-job wall-clock timeout.  After this many ms the run's AbortController is fired,
// the engine stops iteration, and the run is marked canceled.  Set to 0 to disable.
// Default: 10 minutes.  Override with AI_PATHS_JOB_TIMEOUT_MS env var.
const JOB_EXECUTION_TIMEOUT_MS = parseEnvNumber('AI_PATHS_JOB_TIMEOUT_MS', 10 * 60 * 1000);

const RECOVERY_REPEAT_MS = resolveAiPathsStaleRunningCleanupIntervalMs();
const buildRetryJobId = (runId: string): string => `${runId}:retry`;
const localFallbackTimers = new Map<string, NodeJS.Timeout>();
const REQUIRE_DURABLE_QUEUE =
  process.env['AI_PATHS_REQUIRE_DURABLE_QUEUE'] === 'true' ||
  (process.env.NODE_ENV === 'production' &&
    process.env['AI_PATHS_ALLOW_LOCAL_QUEUE_FALLBACK'] !== 'true');

type AiPathRunJobData = {
  runId: string;
  type?: 'run' | 'recovery';
};

type AiInsightsQueueStatus = {
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeJobs: number;
  waitingJobs: number;
  failedJobs: number;
  completedJobs: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
};

const EMPTY_AI_INSIGHTS_QUEUE_STATUS: AiInsightsQueueStatus = {
  running: false,
  healthy: false,
  processing: false,
  activeJobs: 0,
  waitingJobs: 0,
  failedJobs: 0,
  completedJobs: 0,
  lastPollTime: 0,
  timeSinceLastPoll: 0,
};

const getAiInsightsQueueStatusSnapshot = async (): Promise<AiInsightsQueueStatus> => {
  const module = (await import('@/features/ai/insights/workers/aiInsightsQueue')) as {
    getAiInsightsQueueStatus?: () => Promise<AiInsightsQueueStatus>;
  };
  const readStatus = module.getAiInsightsQueueStatus;
  if (typeof readStatus !== 'function') return EMPTY_AI_INSIGHTS_QUEUE_STATUS;
  return readStatus();
};

type EnqueuePathRunJobOptions = {
  delayMs?: number;
};

const queue = createManagedQueue<AiPathRunJobData>({
  name: AI_PATH_RUN_QUEUE_NAME,
  concurrency: Math.max(1, DEFAULT_CONCURRENCY),
  jobTimeoutMs: JOB_EXECUTION_TIMEOUT_MS > 0 ? JOB_EXECUTION_TIMEOUT_MS : undefined,
  defaultJobOptions: {
    attempts: 1, // Retries are handled by the processor (custom dead-letter logic)
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    // How often BullMQ checks for stalled jobs (ms). Default: 30 s.
    stalledInterval: 30_000,
    // Allow 2 stall cycles before declaring a job dead.  Default is 1; the
    // extra window tolerates transient GC pauses or a slow MongoDB lock-renewal.
    maxStalledCount: 2,
  },
  processor: async (data, _jobId, signal) => {
    // Handle stale run recovery job
    if (data.runId === '__recovery__' || data.type === 'recovery') {
      await processStaleRunRecovery();
      return;
    }

    const repo = await getPathRunRepository();
    const run = await repo.claimRunForProcessing(data.runId);
    if (!run) {
      const latest = await repo.findRunById(data.runId);
      if (!latest) {
        debugQueueWarn(`[aiPathRunQueue] Run ${data.runId} not found, skipping`);
        return;
      }
      if (latest.status === 'running') {
        debugQueueLog(
          `[aiPathRunQueue] Run ${data.runId} is already running, skipping duplicate job`
        );
        return;
      }
      debugQueueLog(`[aiPathRunQueue] Run ${data.runId} has status "${latest.status}", skipping`);
      return;
    }
    await recordRuntimeRunStarted({ runId: run.id });
    const outcome = await processRun(run, signal);
    if (outcome?.requeueDelayMs !== undefined) {
      await enqueuePathRunJob(run.id, { delayMs: outcome.requeueDelayMs });
    }
  },
  onFailed: async (_jobId, error, data) => {
    try {
      const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
      void ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        runId: data.runId,
      });
    } catch {
      void logSystemEvent({
        level: 'error',
        source: LOG_SOURCE,
        message: 'Fatal queue error',
        error,
      });
    }
  },
});

type AiPathRunQueueState = {
  workerStarted: boolean;
  recoveryScheduled: boolean;
};

const globalWithAiPathRunQueueState = globalThis as typeof globalThis & {
  __aiPathRunQueueState__?: AiPathRunQueueState;
};

const aiPathRunQueueState =
  globalWithAiPathRunQueueState.__aiPathRunQueueState__ ??
  (globalWithAiPathRunQueueState.__aiPathRunQueueState__ = {
    workerStarted: false,
    recoveryScheduled: false,
  });

let reconcileInFlight: Promise<void> | null = null;

type RepeatableJobEntry = {
  id?: string | null;
  name?: string;
  every?: number | null;
  key: string;
};

const hasRepeatableQueueApi = (
  value: unknown
): value is {
  getRepeatableJobs: () => Promise<RepeatableJobEntry[]>;
  removeRepeatableByKey: (key: string) => Promise<void>;
} =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { getRepeatableJobs?: unknown }).getRepeatableJobs === 'function' &&
  typeof (value as { removeRepeatableByKey?: unknown }).removeRepeatableByKey === 'function';

const removeRecoveryRepeatJobs = async (): Promise<void> => {
  const queueApi = queue.getQueue();
  if (!hasRepeatableQueueApi(queueApi)) return;
  const repeatableJobs = await queueApi.getRepeatableJobs();
  const targets = repeatableJobs.filter(
    (job) =>
      job.id === 'ai-path-run-recovery' ||
      (job.name === AI_PATH_RUN_QUEUE_NAME && job.every === RECOVERY_REPEAT_MS)
  );
  await Promise.all(targets.map(async (job) => queueApi.removeRepeatableByKey(job.key)));
};

const isAiPathsEnabled = async (): Promise<boolean> => {
  const brain = await getBrainAssignmentForFeature('ai_paths');
  return brain.enabled;
};

const getAiPathsEnabledCached = async (options?: { bypassCache?: boolean }): Promise<boolean> => {
  const now = Date.now();
  const bypassCache = options?.bypassCache === true;
  if (!bypassCache && aiPathsEnabledCache && aiPathsEnabledCache.expiresAt > now) {
    return aiPathsEnabledCache.value;
  }
  if (!bypassCache && aiPathsEnabledInFlight) {
    return await aiPathsEnabledInFlight;
  }

  const fetchEnabled = async (): Promise<boolean> => {
    const enabled = await isAiPathsEnabled();
    aiPathsEnabledCache = {
      value: enabled,
      expiresAt: Date.now() + AI_PATHS_ENABLED_CACHE_TTL_MS,
    };
    return enabled;
  };

  if (bypassCache) {
    return await fetchEnabled();
  }

  aiPathsEnabledInFlight = fetchEnabled();
  try {
    return await aiPathsEnabledInFlight;
  } finally {
    aiPathsEnabledInFlight = null;
  }
};

const assertAiPathsEnabled = async (): Promise<void> => {
  const enabled = await getAiPathsEnabledCached();
  if (enabled) return;
  throw configurationError(
    'AI Paths is disabled in AI Brain. Enable it in /admin/brain?tab=routing before queuing runs.'
  );
};

const stopAiPathRunQueueInternal = async (): Promise<void> => {
  await removeRecoveryRepeatJobs().catch((error) => {
    void ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      action: 'removeRecoverySchedule',
    });
  });
  aiPathRunQueueState.recoveryScheduled = false;
  if (!aiPathRunQueueState.workerStarted) return;
  await queue.stopWorker();
  aiPathRunQueueState.workerStarted = false;
};

export const startAiPathRunQueue = (): void => {
  if (reconcileInFlight) return;
  reconcileInFlight = (async (): Promise<void> => {
    let enabled: boolean;
    try {
      enabled = await getAiPathsEnabledCached();
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        action: 'validateBrainGate',
      });
      return;
    }

    if (!enabled) {
      await stopAiPathRunQueueInternal().catch((error) => {
        void ErrorSystem.captureException(error, {
          service: LOG_SOURCE,
          action: 'stopWorker',
        });
      });
      return;
    }

    if (!aiPathRunQueueState.workerStarted) {
      queue.startWorker();
      aiPathRunQueueState.workerStarted = true;

      // Eagerly establish the MongoDB connection so the first job does not pay
      // the full cold-start latency (~20 s on Atlas) inline.  Fire-and-forget;
      // a failure here is harmless — jobs will reconnect on their own.
      void (async (): Promise<void> => {
        try {
          const { getMongoClient } = await import('@/shared/lib/db/mongo-client');
          await getMongoClient();
        } catch {
          // Advisory only — swallow to avoid crashing startAiPathRunQueue.
        }
      })();
    }
    if (aiPathRunQueueState.recoveryScheduled) return;

    // Schedule stale-run recovery using the same interval as HTTP cleanup guards.
    aiPathRunQueueState.recoveryScheduled = true;
    await queue
      .enqueue(
        { runId: '__recovery__', type: 'recovery' },
        { repeat: { every: RECOVERY_REPEAT_MS }, jobId: 'ai-path-run-recovery' }
      )
      .catch((error) => {
        aiPathRunQueueState.recoveryScheduled = false;
        void ErrorSystem.captureException(error, {
          service: LOG_SOURCE,
          action: 'registerRecoverySchedule',
        });
      });
  })().finally(() => {
    reconcileInFlight = null;
  });
};

type RuntimeAnalyticsSummarySnapshot = Awaited<ReturnType<typeof getRuntimeAnalyticsSummary>>;

const QUEUE_STATUS_CACHE_TTL_MS = parseEnvNumber('AI_PATHS_QUEUE_STATUS_CACHE_TTL_MS', 2_000, 250);
const QUEUE_HOT_STATUS_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_QUEUE_HOT_STATUS_CACHE_TTL_MS',
  1_000,
  100
);
const QUEUE_HOT_WAITING_LIMIT = parseEnvNumber('AI_PATHS_QUEUE_HOT_WAITING_LIMIT', 2_000, 1);
const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = parseEnvNumber(
  'AI_PATHS_QUEUE_UNAVAILABLE_RETRY_AFTER_MS',
  5_000,
  500
);
const AI_PATHS_ENABLED_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_ENABLED_CACHE_TTL_MS',
  5_000,
  250
);

type AiPathRunQueueHotStatus = {
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeRuns: number;
  waitingRuns: number;
  failedRuns: number;
  completedRuns: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
};

let queueStatusCache: { value: AiPathRunQueueStatus; expiresAt: number } | null = null;
let queueStatusInFlight: Promise<AiPathRunQueueStatus> | null = null;
let queueHotStatusCache: { value: AiPathRunQueueHotStatus; expiresAt: number } | null = null;
let queueHotStatusInFlight: Promise<AiPathRunQueueHotStatus> | null = null;
let aiPathsEnabledCache: { value: boolean; expiresAt: number } | null = null;
let aiPathsEnabledInFlight: Promise<boolean> | null = null;

const EMPTY_BRAIN_ANALYTICS_24H: AiPathRunQueueStatus['brainAnalytics24h'] = {
  analyticsReports: 0,
  logReports: 0,
  totalReports: 0,
  warningReports: 0,
  errorReports: 0,
};

type GetAiPathRunQueueStatusOptions = {
  bypassCache?: boolean;
};

const readQueueHealthSnapshot = async () => {
  return aiPathRunQueueState.workerStarted
    ? await queue.getHealthStatus()
    : {
      running: false,
      healthy: false,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    };
};

const readAiPathRunQueueBaseStatus = async (now: number): Promise<AiPathRunQueueBaseStatus> => {
  const health = await readQueueHealthSnapshot();
  const repo = await getPathRunRepository();
  const [stats, insightsQueueHealth, runtimeAnalytics] = await Promise.all([
    repo.getQueueStats(),
    getAiInsightsQueueStatusSnapshot(),
    getRuntimeAnalyticsAvailability(),
  ]);
  const oldestQueuedAt = stats.oldestQueuedAt ? stats.oldestQueuedAt.getTime() : null;
  const queueLagMs = oldestQueuedAt !== null ? Math.max(0, now - oldestQueuedAt) : null;

  return {
    running: health.running ?? false,
    healthy: health.healthy ?? false,
    processing: health.processing ?? false,
    activeRuns: health.activeCount,
    concurrency: Math.max(1, DEFAULT_CONCURRENCY),
    lastPollTime: health.lastPollTime ?? 0,
    timeSinceLastPoll: health.timeSinceLastPoll ?? 0,
    queuedCount: stats.queuedCount,
    oldestQueuedAt,
    queueLagMs,
    completedLastMinute: health.completedCount,
    throughputPerMinute: health.completedCount,
    avgRuntimeMs: null,
    p50RuntimeMs: null,
    p95RuntimeMs: null,
    runtimeAnalytics,
    brainQueue: {
      running: insightsQueueHealth.running,
      healthy: insightsQueueHealth.healthy,
      processing: insightsQueueHealth.processing,
      activeJobs: insightsQueueHealth.activeJobs,
      waitingJobs: insightsQueueHealth.waitingJobs,
      failedJobs: insightsQueueHealth.failedJobs,
      completedJobs: insightsQueueHealth.completedJobs,
    },
  };
};

const finalizeAiPathRunQueueStatus = (
  baseStatus: AiPathRunQueueBaseStatus,
  runtimeAnalyticsSummary?: RuntimeAnalyticsSummarySnapshot
): AiPathRunQueueStatus => {
  const brainAnalytics24h = runtimeAnalyticsSummary
    ? {
      analyticsReports: runtimeAnalyticsSummary.brain.analyticsReports,
      logReports: runtimeAnalyticsSummary.brain.logReports,
      totalReports: runtimeAnalyticsSummary.brain.totalReports,
      warningReports: runtimeAnalyticsSummary.brain.warningReports,
      errorReports: runtimeAnalyticsSummary.brain.errorReports,
    }
    : EMPTY_BRAIN_ANALYTICS_24H;
  const terminalRuns24h = runtimeAnalyticsSummary
    ? runtimeAnalyticsSummary.runs.completed +
      runtimeAnalyticsSummary.runs.failed +
      runtimeAnalyticsSummary.runs.canceled +
      runtimeAnalyticsSummary.runs.deadLettered
    : 0;
  const brainTotalReports24h = brainAnalytics24h.totalReports;
  const brainErrorRate24h =
    brainTotalReports24h > 0
      ? Math.max(0, Math.min(100, (brainAnalytics24h.errorReports / brainTotalReports24h) * 100))
      : 0;
  const slo = computeAiPathRunQueueSlo({
    queueRunning: baseStatus.running,
    queueHealthy: baseStatus.healthy,
    queueLagMs: baseStatus.queueLagMs,
    successRate24h: runtimeAnalyticsSummary?.runs.successRate ?? 0,
    terminalRuns24h,
    deadLetterRate24h: runtimeAnalyticsSummary?.runs.deadLetterRate ?? 0,
    brainErrorRate24h,
    brainTotalReports24h,
  });

  return {
    ...baseStatus,
    avgRuntimeMs: runtimeAnalyticsSummary?.runs.avgDurationMs ?? null,
    p50RuntimeMs: null,
    p95RuntimeMs: runtimeAnalyticsSummary?.runs.p95DurationMs ?? null,
    brainAnalytics24h,
    slo,
  };
};

const readAiPathRunQueueStatus = async (now: number): Promise<AiPathRunQueueStatus> => {
  const baseStatus = await readAiPathRunQueueBaseStatus(now);
  if (!baseStatus.runtimeAnalytics.enabled) {
    return finalizeAiPathRunQueueStatus(baseStatus);
  }

  const runtimeAnalyticsSummary = await getRuntimeAnalyticsSummary({
    from: new Date(now - 24 * 60 * 60 * 1000),
    to: new Date(now),
    range: '24h',
    includeTraces: false,
  });
  return finalizeAiPathRunQueueStatus(baseStatus, runtimeAnalyticsSummary);
};

const readAiPathRunQueueHotStatus = async (): Promise<AiPathRunQueueHotStatus> => {
  const health = await readQueueHealthSnapshot();
  return {
    running: health.running ?? false,
    healthy: health.healthy ?? false,
    processing: health.processing ?? false,
    activeRuns: health.activeCount,
    waitingRuns: health.waitingCount,
    failedRuns: health.failedCount,
    completedRuns: health.completedCount,
    lastPollTime: health.lastPollTime ?? 0,
    timeSinceLastPoll: health.timeSinceLastPoll ?? 0,
  };
};

export const getAiPathRunQueueStatus = async (
  options: GetAiPathRunQueueStatusOptions = {}
): Promise<AiPathRunQueueStatus> => {
  const now = Date.now();
  const bypassCache = options.bypassCache === true;
  if (!bypassCache && queueStatusCache && queueStatusCache.expiresAt > now) {
    return queueStatusCache.value;
  }
  if (!bypassCache && queueStatusInFlight) {
    return queueStatusInFlight;
  }

  const fetchStatus = async (): Promise<AiPathRunQueueStatus> => {
    const status = await readAiPathRunQueueStatus(now);
    queueStatusCache = {
      value: status,
      expiresAt: Date.now() + QUEUE_STATUS_CACHE_TTL_MS,
    };
    return status;
  };

  if (bypassCache) {
    return fetchStatus();
  }

  queueStatusInFlight = fetchStatus();
  try {
    return await queueStatusInFlight;
  } finally {
    queueStatusInFlight = null;
  }
};

export const getAiPathRunQueueHotStatus = async (
  options: GetAiPathRunQueueStatusOptions = {}
): Promise<AiPathRunQueueHotStatus> => {
  const now = Date.now();
  const bypassCache = options.bypassCache === true;
  if (!bypassCache && queueHotStatusCache && queueHotStatusCache.expiresAt > now) {
    return queueHotStatusCache.value;
  }
  if (!bypassCache && queueHotStatusInFlight) {
    return queueHotStatusInFlight;
  }

  const fetchStatus = async (): Promise<AiPathRunQueueHotStatus> => {
    const status = await readAiPathRunQueueHotStatus();
    queueHotStatusCache = {
      value: status,
      expiresAt: Date.now() + QUEUE_HOT_STATUS_CACHE_TTL_MS,
    };
    return status;
  };

  if (bypassCache) {
    return fetchStatus();
  }

  queueHotStatusInFlight = fetchStatus();
  try {
    return await queueHotStatusInFlight;
  } finally {
    queueHotStatusInFlight = null;
  }
};

const waitForQueueReconciliation = async (): Promise<void> => {
  if (!reconcileInFlight) return;
  await reconcileInFlight;
};

export const assertAiPathRunQueueReady = async (): Promise<AiPathRunQueueStatus> => {
  const aiPathsEnabled = await getAiPathsEnabledCached().catch(() => false);
  if (!aiPathsEnabled) {
    throw serviceUnavailableError(
      'AI Paths execution is disabled in Brain settings. Enable AI Paths and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { feature: 'ai_paths' }
    );
  }

  startAiPathRunQueue();
  await waitForQueueReconciliation();
  // Use the short-lived cache (QUEUE_STATUS_CACHE_TTL_MS, default 2 s) instead of bypassing it.
  // Bypassing forces a full analytics recomputation on every enqueue (Redis pipeline +
  // MongoDB trace query) which was causing enqueue to block for 5–15 s.
  // A 2-second stale status is accurate enough for a pre-enqueue health check.
  const status = await getAiPathRunQueueStatus();
  if (status.running) return status;

  if (!REQUIRE_DURABLE_QUEUE) {
    debugQueueWarn(
      '[aiPathRunQueue] Worker not running, but durable queue is not required; allowing local fallback execution.',
      {
        queueRunning: status.running,
        queueHealthy: status.healthy,
        queuedCount: status.queuedCount,
      }
    );
    return status;
  }

  throw serviceUnavailableError(
    'AI Paths queue worker is unavailable. Please retry in a few seconds.',
    QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
    {
      queueRunning: status.running,
      queueHealthy: status.healthy,
      queuedCount: status.queuedCount,
      activeRuns: status.activeRuns,
    }
  );
};

export const assertAiPathRunQueueReadyForEnqueue = async (): Promise<AiPathRunQueueHotStatus> => {
  const aiPathsEnabled = await getAiPathsEnabledCached().catch(() => false);
  if (!aiPathsEnabled) {
    throw serviceUnavailableError(
      'AI Paths execution is disabled in Brain settings. Enable AI Paths and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { feature: 'ai_paths' }
    );
  }

  if (!aiPathRunQueueState.workerStarted || !aiPathRunQueueState.recoveryScheduled) {
    startAiPathRunQueue();
    await waitForQueueReconciliation();
  }
  const status = await getAiPathRunQueueHotStatus();
  if (status.waitingRuns >= QUEUE_HOT_WAITING_LIMIT) {
    throw serviceUnavailableError(
      'AI Paths queue is currently saturated. Please retry in a few seconds.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      {
        queueWaitingRuns: status.waitingRuns,
        queueWaitingLimit: QUEUE_HOT_WAITING_LIMIT,
      }
    );
  }
  if (status.running) return status;

  if (!REQUIRE_DURABLE_QUEUE) {
    debugQueueWarn(
      '[aiPathRunQueue] Worker not running, but durable queue is not required; allowing local fallback execution.',
      {
        queueRunning: status.running,
        queueHealthy: status.healthy,
      }
    );
    return status;
  }

  throw serviceUnavailableError(
    'AI Paths queue worker is unavailable. Please retry in a few seconds.',
    QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
    {
      queueRunning: status.running,
      queueHealthy: status.healthy,
      queueWaitingRuns: status.waitingRuns,
      activeRuns: status.activeRuns,
    }
  );
};

export const processSingleRun = async (runId: string): Promise<void> => {
  try {
    const repo = await getPathRunRepository();
    const run = await repo.claimRunForProcessing(runId);
    if (!run) {
      const latest = await repo.findRunById(runId);
      if (!latest) {
        throw new Error('Run not found');
      }
      return;
    }
    await recordRuntimeRunStarted({ runId: run.id });
    const { executePathRun } = await import('@/features/ai/ai-paths/services/path-run-executor');
    await executePathRun(run);
  } catch (error) {
    try {
      const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
      void ErrorSystem.captureException(error, {
        service: `${LOG_SOURCE}-single`,
        runId,
      });
    } catch {
      void logSystemEvent({
        level: 'error',
        source: LOG_SOURCE,
        message: 'Fatal inline execution error',
        error,
      });
    }
    throw error;
  }
};

const scheduleLocalFallbackRun = (runId: string, delayMs: number): void => {
  const existing = localFallbackTimers.get(runId);
  if (existing) {
    clearTimeout(existing);
    localFallbackTimers.delete(runId);
  }
  const timeout = setTimeout(
    () => {
      localFallbackTimers.delete(runId);
      void processSingleRun(runId).catch((error: unknown) => {
        void logSystemEvent({
          level: 'error',
          source: LOG_SOURCE,
          message: `[aiPathRunQueue] Local fallback execution failed for run ${runId}`,
          error,
        });
      });
    },
    Math.max(0, delayMs)
  );
  localFallbackTimers.set(runId, timeout);
};

const normalizeDelayMs = (value?: number): number => {
  if (!Number.isFinite(value) || value === undefined || value <= 0) return 0;
  return Math.floor(value);
};

const hasSameDelay = async (
  job: Awaited<ReturnType<Queue['getJob']>>,
  delayMs: number
): Promise<boolean> => {
  if (!job) return false;
  const state = await job.getState();
  if (state !== 'delayed') {
    return delayMs === 0;
  }
  const delayUntil = job.timestamp + job.delay;
  const remainingDelay = Math.max(0, delayUntil - Date.now());
  const toleranceMs = 250;
  return Math.abs(remainingDelay - delayMs) <= toleranceMs;
};

export const enqueuePathRunJob = async (
  runId: string,
  options: EnqueuePathRunJobOptions = {}
): Promise<void> => {
  await assertAiPathsEnabled();

  const delayMs = normalizeDelayMs(options.delayMs);
  const { queue: bullQueue, owned } = resolveAiPathRunQueue();
  if (!bullQueue) {
    if (REQUIRE_DURABLE_QUEUE) {
      throw new Error(
        `AI Paths durable queue unavailable; local fallback is disabled for run ${runId}.`
      );
    }
    debugQueueWarn(
      `[aiPathRunQueue] Redis unavailable; scheduling local fallback execution for run ${runId}.`,
      { runId, delayMs }
    );
    scheduleLocalFallbackRun(runId, delayMs);
    return;
  }

  try {
    const retryJobId = buildRetryJobId(runId);
    const existing = await bullQueue.getJob(runId);
    if (existing) {
      const state = (await existing.getState()) as string;
      if (state === 'active') {
        if (delayMs > 0) {
          const existingRetry = await bullQueue.getJob(retryJobId);
          if (existingRetry && (await hasSameDelay(existingRetry, delayMs))) {
            return;
          }
          if (existingRetry) {
            try {
              await existingRetry.remove();
            } catch {
              // Keep the existing retry job if it cannot be replaced.
              return;
            }
          }
          await bullQueue.add(
            AI_PATH_RUN_QUEUE_NAME,
            { runId },
            {
              jobId: retryJobId,
              delay: delayMs,
            }
          );
        }
        return;
      }
      if (
        (state === 'waiting' ||
          state === 'delayed' ||
          state === 'paused' ||
          state === 'prioritized' ||
          state === 'waiting-children') &&
        (await hasSameDelay(existing, delayMs))
      ) {
        return;
      }
      try {
        await existing.remove();
      } catch {
        if (
          state === 'waiting' ||
          state === 'delayed' ||
          state === 'paused' ||
          state === 'prioritized' ||
          state === 'waiting-children'
        ) {
          return;
        }
      }
    }

    await bullQueue.add(
      AI_PATH_RUN_QUEUE_NAME,
      { runId },
      {
        jobId: runId,
        ...(delayMs > 0 ? { delay: delayMs } : {}),
      }
    );
  } catch (error) {
    if (!REQUIRE_DURABLE_QUEUE && isQueueTransportError(error)) {
      debugQueueWarn(
        `[aiPathRunQueue] Queue transport error; scheduling local fallback execution for run ${runId}.`,
        { runId, delayMs, error: error instanceof Error ? error.message : String(error) }
      );
      scheduleLocalFallbackRun(runId, delayMs);
      return;
    }
    throw error;
  } finally {
    if (owned) {
      await bullQueue.close();
    }
  }
};

const resolveAiPathRunQueue = (): { queue: Queue | null; owned: boolean } => {
  const existing = queue.getQueue();
  if (existing) {
    return { queue: existing as unknown as Queue, owned: false };
  }
  const connection = getRedisConnection();
  if (!connection) {
    return { queue: null, owned: false };
  }
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    queue: new Queue(AI_PATH_RUN_QUEUE_NAME, { connection: connection as any }),
    owned: true,
  };

};

export const removePathRunQueueEntries = async (
  runIds: string[]
): Promise<{ removed: number; requested: number }> => {
  const uniqueRunIds = Array.from(
    new Set(
      runIds
        .map((runId: string): string => runId.trim())
        .filter((runId: string): boolean => runId.length > 0)
    )
  );
  if (uniqueRunIds.length === 0) {
    return { removed: 0, requested: 0 };
  }

  let removed = 0;
  uniqueRunIds.forEach((runId: string): void => {
    const timer = localFallbackTimers.get(runId);
    if (!timer) return;
    clearTimeout(timer);
    localFallbackTimers.delete(runId);
    removed += 1;
  });

  const { queue: bullQueue, owned } = resolveAiPathRunQueue();
  if (!bullQueue) {
    return { removed, requested: uniqueRunIds.length };
  }

  const pendingRunIds = new Set(uniqueRunIds);
  try {
    for (const runId of uniqueRunIds) {
      const directJob = await bullQueue.getJob(runId);
      if (!directJob) continue;
      try {
        await directJob.remove();
        removed += 1;
        pendingRunIds.delete(runId);
      } catch {
        // Active/locked jobs may fail removal; keep deleting run records regardless.
      }
    }

    if (pendingRunIds.size > 0) {
      const queuedJobs = await bullQueue.getJobs(
        ['waiting', 'delayed', 'paused', 'prioritized', 'waiting-children', 'active'],
        0,
        -1
      );
      for (const job of queuedJobs) {
        const runId = (job.data as { runId?: unknown } | undefined)?.runId;
        if (typeof runId !== 'string' || !pendingRunIds.has(runId)) continue;
        try {
          await job.remove();
          removed += 1;
          pendingRunIds.delete(runId);
        } catch {
          // Active/locked jobs may fail removal; keep deleting run records regardless.
        }
      }
    }
  } finally {
    if (owned) {
      await bullQueue.close();
    }
  }

  return { removed, requested: uniqueRunIds.length };
};

export const __testOnly = {
  clearAiPathsEnabledCache(): void {
    aiPathsEnabledCache = null;
    aiPathsEnabledInFlight = null;
  },
};
