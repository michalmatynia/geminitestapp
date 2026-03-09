import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import {
  getRuntimeAnalyticsAvailability,
  getRuntimeAnalyticsSummary,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import type { AiPathRunVisibility } from '@/shared/contracts/ai-paths';
import {
  type AiPathRunQueueBaseStatus,
  type AiPathRunQueueStatus,
} from '@/shared/contracts/ai-paths-runtime';
import {
  DEFAULT_CONCURRENCY,
  QUEUE_HOT_STATUS_CACHE_TTL_MS,
  QUEUE_STATUS_CACHE_TTL_MS,
} from './config';
import { aiPathRunQueueState } from './state';
import { AiPathRunQueueHotStatus } from './types';
import { queue } from './queue';
import {
  finalizeAiPathRunQueueStatus,
  getAiInsightsQueueStatusSnapshot,
  getQueueStatusScopeKey,
} from './status-utils';

export type GetAiPathRunQueueStatusOptions = {
  bypassCache?: boolean;
  visibility?: AiPathRunVisibility;
  userId?: string | null;
};

const queueStatusCache = new Map<string, { value: AiPathRunQueueStatus; expiresAt: number }>();
const queueStatusInFlight = new Map<string, Promise<AiPathRunQueueStatus>>();
let queueHotStatusCache: { value: AiPathRunQueueHotStatus; expiresAt: number } | null = null;
let queueHotStatusInFlight: Promise<AiPathRunQueueHotStatus> | null = null;
const ACTIVE_PERSISTED_RUN_STATUSES = [
  'running',
  'blocked_on_lease',
  'handoff_ready',
  'paused',
] as const;

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
      delayedCount: 0,
      pausedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    };
};

const readAiPathRunQueueBaseStatus = async (
  now: number,
  options: GetAiPathRunQueueStatusOptions
): Promise<AiPathRunQueueBaseStatus> => {
  const health = await readQueueHealthSnapshot();
  const repo = await getPathRunRepository();
  const visibility = options.visibility === 'scoped' ? 'scoped' : 'global';
  const [stats, activeRunsSnapshot, insightsQueueHealth, runtimeAnalytics] = await Promise.all([
    repo.getQueueStats(
      visibility === 'scoped' && options.userId ? { userId: options.userId } : undefined
    ),
    repo.listRuns({
      ...(visibility === 'scoped' && options.userId ? { userId: options.userId } : {}),
      statuses: [...ACTIVE_PERSISTED_RUN_STATUSES],
      limit: 1,
    }),
    getAiInsightsQueueStatusSnapshot(),
    getRuntimeAnalyticsAvailability(),
  ]);
  const oldestQueuedAt = stats.oldestQueuedAt ? stats.oldestQueuedAt.getTime() : null;
  const queueLagMs = oldestQueuedAt !== null ? Math.max(0, now - oldestQueuedAt) : null;
  const persistedActiveRuns =
    typeof activeRunsSnapshot.total === 'number' && Number.isFinite(activeRunsSnapshot.total)
      ? activeRunsSnapshot.total
      : 0;
  const activeRuns = Math.max(health.activeCount ?? 0, persistedActiveRuns);

  return {
    running: health.running ?? false,
    healthy: health.healthy ?? false,
    processing: (health.processing ?? false) || activeRuns > 0,
    activeCount: health.activeCount,
    activeRuns,
    concurrency: Math.max(1, DEFAULT_CONCURRENCY),
    lastPollTime: health.lastPollTime ?? 0,
    timeSinceLastPoll: health.timeSinceLastPoll ?? 0,
    queuedCount: stats.queuedCount,
    oldestQueuedAt,
    queueLagMs,
    completedLastMinute: health.completedCount,
    throughputPerMinute: health.completedCount,
    waitingCount: health.waitingCount,
    failedCount: health.failedCount,
    completedCount: health.completedCount,
    delayedCount: health.delayedCount,
    pausedCount: 0,
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

const readAiPathRunQueueStatus = async (
  now: number,
  options: GetAiPathRunQueueStatusOptions
): Promise<AiPathRunQueueStatus> => {
  const baseStatus = await readAiPathRunQueueBaseStatus(now, options);
  if (!baseStatus.runtimeAnalytics?.enabled) {
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
  const visibility = options.visibility === 'scoped' ? 'scoped' : 'global';
  const scopeKey = getQueueStatusScopeKey(visibility, options);
  const cached = queueStatusCache.get(scopeKey);
  if (!bypassCache && cached && cached.expiresAt > now) {
    return cached.value;
  }
  const inFlight = queueStatusInFlight.get(scopeKey);
  if (!bypassCache && inFlight) {
    return inFlight;
  }

  const fetchStatus = async (): Promise<AiPathRunQueueStatus> => {
    const status = await readAiPathRunQueueStatus(now, options);
    queueStatusCache.set(scopeKey, {
      value: status,
      expiresAt: Date.now() + QUEUE_STATUS_CACHE_TTL_MS,
    });
    return status;
  };

  if (bypassCache) {
    return fetchStatus();
  }

  const result = fetchStatus();
  queueStatusInFlight.set(scopeKey, result);
  try {
    return await result;
  } finally {
    queueStatusInFlight.delete(scopeKey);
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

  const result = fetchStatus();
  queueHotStatusInFlight = result;
  try {
    return await result;
  } finally {
    queueHotStatusInFlight = null;
  }
};

export const clearAiPathRunQueueStatusCache = (): void => {
  queueStatusCache.clear();
  queueStatusInFlight.clear();
  queueHotStatusCache = null;
  queueHotStatusInFlight = null;
};
