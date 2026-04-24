import 'server-only';

import type { AiPathRunRecord, AiPathRunStatus } from '@/shared/contracts/ai-paths';
import {
  forbiddenError,
  authError,
  rateLimitedError,
  serviceUnavailableError,
} from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { readOptionalServerAuthSession } from '@/features/auth/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { getRedisConnection } from '@/shared/lib/queue';
import { AI_PATHS_CANONICAL_RUN_SOURCE_FILTER } from '@/shared/lib/ai-paths/run-sources';

import type { NextRequest } from 'next/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export const AI_PATHS_PERMISSION = 'ai_paths.manage';
const AI_PATHS_RUNNER_PERMISSION = 'products.manage';
const DEV_INTERNAL_HEADER_VALUE = 'dev-internal-header-value-change-me';

const getExpectedInternalHeaderValue = (): string | null => {
  if (process.env['AI_PATHS_INTERNAL_TOKEN']) return process.env['AI_PATHS_INTERNAL_TOKEN'];
  if (process.env['AUTH_SECRET']) return process.env['AUTH_SECRET'];
  if (process.env['NEXTAUTH_SECRET']) return process.env['NEXTAUTH_SECRET'];
  if (process.env['NODE_ENV'] === 'development') return DEV_INTERNAL_HEADER_VALUE;
  return null;
};

export const isAiPathsInternalRequest = (request: NextRequest): boolean => {
  const expectedHeaderValue = getExpectedInternalHeaderValue();
  if (!expectedHeaderValue) return false;
  const header = request.headers.get('x-ai-paths-internal');
  return Boolean(header && header === expectedHeaderValue);
};

export type AiPathsAccessContext = {
  userId: string;
  permissions: string[];
  isElevated: boolean;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const RUN_RATE_WINDOW_SECONDS = parseNumber(
  process.env['AI_PATHS_RUN_RATE_LIMIT_WINDOW_SECONDS'],
  60
);
const RUN_RATE_MAX = parseNumber(process.env['AI_PATHS_RUN_RATE_LIMIT_MAX'], 20);
const RUN_ACTIVE_MAX = parseNumber(process.env['AI_PATHS_RUN_ACTIVE_LIMIT'], 5);
const RUN_GLOBAL_QUEUED_MAX = parseNumber(process.env['AI_PATHS_RUN_GLOBAL_QUEUED_LIMIT'], 500);
const RUN_RATE_QUERY_TIMEOUT_MS = parseNumber(
  process.env['AI_PATHS_RUN_RATE_QUERY_TIMEOUT_MS'],
  1_500
);
const RUN_RATE_CACHE_TTL_MS = parseNumber(process.env['AI_PATHS_RUN_RATE_CACHE_TTL_MS'], 5_000);
const RUN_ACTIVE_STALE_MAX_AGE_MS = parseNumber(
  process.env['AI_PATHS_RUN_ACTIVE_STALE_MAX_AGE_MS'],
  30 * 60 * 1000
);
const ACTION_RATE_WINDOW_SECONDS = parseNumber(
  process.env['AI_PATHS_ACTION_RATE_LIMIT_WINDOW_SECONDS'],
  60
);
const ACTION_RATE_MAX = parseNumber(process.env['AI_PATHS_ACTION_RATE_LIMIT_MAX'], 120);
const ACTION_RATE_BUCKET_PREFIX = 'ai_paths:action-rate:v1';
const RUN_RATE_CACHE_RETRY_AFTER_MS = 5_000;
const ACTION_BUCKETS_MAX_ENTRIES = 10_000;
const RUN_RATE_PROBE_CACHE_MAX_ENTRIES = 1_000;

const actionBuckets = new Map<string, { count: number; resetAt: number }>();
const runRateRecentProbeCache = new Map<string, { count: number; updatedAt: number }>();
const runRateActiveProbeCache = new Map<
  string,
  { activeCount: number; freshActiveCount: number; updatedAt: number }
>();
const runRateQueueStatsProbeCache = new Map<
  string,
  { queuedCount: number; oldestQueuedAt: Date | null; updatedAt: number }
>();

const touchMapEntry = <K, V>(map: Map<K, V>, key: K, value: V): void => {
  if (map.has(key)) {
    map.delete(key);
  }
  map.set(key, value);
};

const enforceMapEntryLimit = <K, V>(map: Map<K, V>, maxEntries: number): void => {
  if (!Number.isFinite(maxEntries) || maxEntries <= 0) {
    map.clear();
    return;
  }
  while (map.size > maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
};

const setBoundedMapEntry = <K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  maxEntries: number
): void => {
  touchMapEntry(map, key, value);
  enforceMapEntryLimit(map, maxEntries);
};

const withSoftTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<{ value: T | null; timedOut: boolean; failed: boolean }> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    try {
      return { value: await promise, timedOut: false, failed: false };
    } catch (error) {
      void ErrorSystem.captureException(error);
      return { value: null, timedOut: false, failed: true };
    }
  }
  const timeoutSentinel = Symbol('ai-paths-rate-timeout');
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const value = await Promise.race<T | typeof timeoutSentinel>([
      promise,
      new Promise<typeof timeoutSentinel>((resolve) => {
        timeoutId = setTimeout(() => resolve(timeoutSentinel), timeoutMs);
      }),
    ]);
    return value === timeoutSentinel
      ? { value: null, timedOut: true, failed: false }
      : { value, timedOut: false, failed: false };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return { value: null, timedOut: false, failed: true };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const parseTimestampMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const countFreshActiveRuns = (runs: AiPathRunRecord[], nowMs: number): number => {
  if (RUN_ACTIVE_STALE_MAX_AGE_MS <= 0) return runs.length;
  return runs.filter((run) => {
    const lastActivityMs =
      parseTimestampMs(run.updatedAt) ??
      parseTimestampMs(run.startedAt) ??
      parseTimestampMs(run.createdAt);
    if (lastActivityMs === null) return true;
    return nowMs - lastActivityMs < RUN_ACTIVE_STALE_MAX_AGE_MS;
  }).length;
};

const readFreshProbeCache = <T extends { updatedAt: number }>(
  cache: Map<string, T>,
  key: string,
  nowMs: number
): T | null => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (RUN_RATE_CACHE_TTL_MS <= 0) return null;
  if (nowMs - cached.updatedAt > RUN_RATE_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  touchMapEntry(cache, key, cached);
  return cached;
};

const logRateLimitProbeFallback = (input: {
  access: AiPathsAccessContext;
  probe: 'recent_runs' | 'active_runs' | 'queue_stats';
  timedOut: boolean;
  failed: boolean;
  usedCache: boolean;
}): void => {
  void logSystemEvent({
    level: 'warn',
    message: `[ai-paths.rate-limit] ${input.usedCache ? 'using cached probe result after unavailable probe' : 'rate-limit probe unavailable'}`,
    source: 'ai-paths-access',
    context: {
      userId: input.access.userId,
      probe: input.probe,
      timedOut: input.timedOut,
      failed: input.failed,
      usedCache: input.usedCache,
      timeoutMs: RUN_RATE_QUERY_TIMEOUT_MS,
      cacheTtlMs: RUN_RATE_CACHE_TTL_MS,
    },
  });
};

const requireAvailableRateLimitProbe = <T>(
  input: {
    access: AiPathsAccessContext;
    probe: 'recent_runs' | 'active_runs' | 'queue_stats';
    result: { value: T | null; timedOut: boolean; failed: boolean } | null;
    cached: T | null;
  }
): T => {
  if (input.result?.value) {
    return input.result.value;
  }
  if (input.cached) {
    logRateLimitProbeFallback({
      access: input.access,
      probe: input.probe,
      timedOut: input.result?.timedOut ?? false,
      failed: input.result?.failed ?? false,
      usedCache: true,
    });
    return input.cached;
  }
  logRateLimitProbeFallback({
    access: input.access,
    probe: input.probe,
    timedOut: input.result?.timedOut ?? false,
    failed: input.result?.failed ?? false,
    usedCache: false,
  });
  throw serviceUnavailableError(
    'AI Paths rate-limit checks are temporarily unavailable. Please retry shortly.',
    RUN_RATE_CACHE_RETRY_AFTER_MS,
    {
      probe: input.probe,
    }
  );
};

export const requireAiPathsAccess = async (): Promise<AiPathsAccessContext> => {
  const session = await readOptionalServerAuthSession();
  if (!session?.user?.id) {
    throw authError('Unauthorized.');
  }
  const permissions = session.user.permissions ?? [];
  const isElevated = Boolean(session.user.isElevated);
  const hasAccess = isElevated || permissions.includes(AI_PATHS_PERMISSION);
  if (!hasAccess) {
    throw forbiddenError('Forbidden.');
  }
  return {
    userId: session.user.id,
    permissions,
    isElevated,
  };
};

export const requireAiPathsRunAccess = async (): Promise<AiPathsAccessContext> => {
  const session = await readOptionalServerAuthSession();
  if (!session?.user?.id) {
    throw authError('Unauthorized.');
  }
  const permissions = session.user.permissions ?? [];
  const isElevated = Boolean(session.user.isElevated);
  const hasAccess =
    isElevated ||
    permissions.includes(AI_PATHS_PERMISSION) ||
    permissions.includes(AI_PATHS_RUNNER_PERMISSION);
  if (!hasAccess) {
    throw forbiddenError('Forbidden.');
  }
  return {
    userId: session.user.id,
    permissions,
    isElevated,
  };
};

export const requireAiPathsAccessOrInternal = async (
  request: NextRequest
): Promise<{ access: AiPathsAccessContext; isInternal: boolean }> => {
  if (isAiPathsInternalRequest(request)) {
    return {
      access: {
        userId: 'system',
        permissions: [AI_PATHS_PERMISSION],
        isElevated: true,
      },
      isInternal: true,
    };
  }
  return {
    access: await requireAiPathsAccess(),
    isInternal: false,
  };
};

export const ensureAiPathsPermission = (
  access: AiPathsAccessContext,
  permission: string,
  message: string = 'Forbidden.'
): void => {
  if (access.isElevated) return;
  if (!access.permissions.includes(permission)) {
    throw forbiddenError(message, { permission });
  }
};

export const canAccessGlobalAiPathRuns = (access: AiPathsAccessContext): boolean =>
  access.isElevated || access.permissions.includes(AI_PATHS_PERMISSION);

export const assertAiPathRunAccess = (access: AiPathsAccessContext, run: AiPathRunRecord): void => {
  if (canAccessGlobalAiPathRuns(access)) return;
  if (!run.userId || run.userId !== access.userId) {
    throw forbiddenError('Run access denied.');
  }
};

export const enforceAiPathsRunRateLimit = async (access: AiPathsAccessContext): Promise<void> => {
  const repo = await getPathRunRepository();
  const now = Date.now();
  const windowMs = RUN_RATE_WINDOW_SECONDS * 1000;
  const activeStatuses: AiPathRunStatus[] = ['running'];

  const recentCacheKey = access.userId;
  const activeCacheKey = access.userId;
  const queueCacheKey = 'global';

  // Run rate-limit probes in parallel with short soft timeouts.
  // If a probe is unavailable, use a fresh cached value or fail closed.
  const [recentProbe, activeProbe, queueStatsProbe] = await Promise.all([
    RUN_RATE_MAX > 0
      ? withSoftTimeout(
        repo.listRuns({
          userId: access.userId,
          createdAfter: new Date(now - windowMs).toISOString(),
          ...AI_PATHS_CANONICAL_RUN_SOURCE_FILTER,
          limit: RUN_RATE_MAX,
          offset: 0,
          includeTotal: false,
        }),
        RUN_RATE_QUERY_TIMEOUT_MS
      )
      : null,
    RUN_ACTIVE_MAX > 0
      ? withSoftTimeout(
        repo.listRuns({
          userId: access.userId,
          statuses: activeStatuses,
          ...AI_PATHS_CANONICAL_RUN_SOURCE_FILTER,
          limit: RUN_ACTIVE_MAX,
          offset: 0,
          includeTotal: false,
        }),
        RUN_RATE_QUERY_TIMEOUT_MS
      )
      : null,
    RUN_GLOBAL_QUEUED_MAX > 0
      ? withSoftTimeout(
        repo.getQueueStats(AI_PATHS_CANONICAL_RUN_SOURCE_FILTER),
        RUN_RATE_QUERY_TIMEOUT_MS
      )
      : null,
  ]);
  const cachedRecent = readFreshProbeCache(runRateRecentProbeCache, recentCacheKey, now);
  const cachedActive = readFreshProbeCache(runRateActiveProbeCache, activeCacheKey, now);
  const cachedQueueStats = readFreshProbeCache(runRateQueueStatsProbeCache, queueCacheKey, now);

  const recent =
    RUN_RATE_MAX > 0
      ? requireAvailableRateLimitProbe({
        access,
        probe: 'recent_runs',
        result: recentProbe,
        cached: cachedRecent ? { runs: Array.from({ length: cachedRecent.count }), total: cachedRecent.count } : null,
      })
      : null;
  if (recentProbe?.value) {
    setBoundedMapEntry(runRateRecentProbeCache, recentCacheKey, {
      count: recentProbe.value.runs.length,
      updatedAt: now,
    }, RUN_RATE_PROBE_CACHE_MAX_ENTRIES);
  }

  const active =
    RUN_ACTIVE_MAX > 0
      ? requireAvailableRateLimitProbe({
        access,
        probe: 'active_runs',
        result: activeProbe,
        cached:
          cachedActive
            ? {
              runs: Array.from({ length: cachedActive.activeCount }).map((_, index) =>
                buildCachedRateLimitRun(`cached-active-${index + 1}`)
              ),
              total: cachedActive.activeCount,
            }
            : null,
      })
      : null;
  let activeRunCount = active?.runs.length ?? 0;
  let freshActiveRunCount =
    activeProbe?.value !== null && activeProbe?.value !== undefined
      ? countFreshActiveRuns(activeProbe.value.runs, now)
      : cachedActive?.freshActiveCount ?? 0;
  if (activeProbe?.value) {
    activeRunCount = activeProbe.value.runs.length;
    freshActiveRunCount = countFreshActiveRuns(activeProbe.value.runs, now);
    setBoundedMapEntry(runRateActiveProbeCache, activeCacheKey, {
      activeCount: activeRunCount,
      freshActiveCount: freshActiveRunCount,
      updatedAt: now,
    }, RUN_RATE_PROBE_CACHE_MAX_ENTRIES);
  }

  const queueStats =
    RUN_GLOBAL_QUEUED_MAX > 0
      ? requireAvailableRateLimitProbe({
        access,
        probe: 'queue_stats',
        result: queueStatsProbe,
        cached:
          cachedQueueStats
            ? {
              queuedCount: cachedQueueStats.queuedCount,
              oldestQueuedAt: cachedQueueStats.oldestQueuedAt,
            }
            : null,
      })
      : null;
  if (queueStatsProbe?.value) {
    setBoundedMapEntry(runRateQueueStatsProbeCache, queueCacheKey, {
      queuedCount: queueStatsProbe.value.queuedCount,
      oldestQueuedAt: queueStatsProbe.value.oldestQueuedAt,
      updatedAt: now,
    }, RUN_RATE_PROBE_CACHE_MAX_ENTRIES);
  }

  if (recent && recent.runs.length >= RUN_RATE_MAX) {
    throw rateLimitedError('Too many runs queued. Please wait before trying again.', windowMs);
  }
  if (activeRunCount >= RUN_ACTIVE_MAX) {
    if (freshActiveRunCount >= RUN_ACTIVE_MAX) {
      throw rateLimitedError(
        'Too many active runs. Wait for one to finish before starting another.',
        windowMs,
        {
          activeCount: activeRunCount,
          activeFreshCount: freshActiveRunCount,
          activeLimit: RUN_ACTIVE_MAX,
          activeStatuses,
        }
      );
    }
    void logSystemEvent({
      level: 'warn',
      message: '[ai-paths.rate-limit] ignored stale active runs during admission',
      source: 'ai-paths-access',
      context: {
        userId: access.userId,
        activeCount: activeRunCount,
        activeFreshCount: freshActiveRunCount,
        activeLimit: RUN_ACTIVE_MAX,
        staleMaxAgeMs: RUN_ACTIVE_STALE_MAX_AGE_MS,
      },
    });
  }
  if (queueStats && queueStats.queuedCount >= RUN_GLOBAL_QUEUED_MAX) {
    throw rateLimitedError(
      'AI Paths queue is currently busy. Please retry shortly.',
      Math.max(windowMs, RUN_RATE_CACHE_RETRY_AFTER_MS),
      {
        queuedCount: queueStats.queuedCount,
        queuedLimit: RUN_GLOBAL_QUEUED_MAX,
      }
    );
  }
};

const buildCachedRateLimitRun = (id: string): AiPathRunRecord =>
  ({
    id,
    userId: 'cached-user',
    pathId: 'cached-path',
    pathName: 'Cached Path',
    status: 'running',
    triggerEvent: null,
    triggerNodeId: null,
    triggerContext: null,
    graph: { nodes: [], edges: [] },
    runtimeState: null,
    meta: null,
    entityId: null,
    entityType: null,
    errorMessage: null,
    retryCount: 0,
    maxAttempts: 1,
    nextRetryAt: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: null,
    startedAt: null,
    finishedAt: null,
  }) as AiPathRunRecord;

export const __resetAiPathsRunRateLimitProbeCacheForTests = (): void => {
  runRateRecentProbeCache.clear();
  runRateActiveProbeCache.clear();
  runRateQueueStatsProbeCache.clear();
};

const consumeRedisActionRateLimit = async (
  userId: string,
  action: string,
  windowMs: number
): Promise<{ count: number; resetAt: number } | null> => {
  const redis = getRedisConnection();
  if (!redis) return null;
  const key = `${ACTION_RATE_BUCKET_PREFIX}:${userId}:${action}`;
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const response = await redis.multi().incr(key).expire(key, ttlSeconds, 'NX').ttl(key).exec();
    if (!response || response.length < 3) return null;

    const count = Number((response[0] as [Error | null, number])[1] ?? 0);
    const ttl = Number((response[2] as [Error | null, number])[1] ?? 0);
    const retryAfterMs = Math.max(1_000, (ttl > 0 ? ttl : ttlSeconds) * 1000);
    return {
      count,
      resetAt: Date.now() + retryAfterMs,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const enforceAiPathsActionRateLimit = async (
  access: AiPathsAccessContext,
  action: string
): Promise<void> => {
  if (ACTION_RATE_MAX <= 0) return;
  const windowMs = ACTION_RATE_WINDOW_SECONDS * 1000;
  const redisBucket = await consumeRedisActionRateLimit(access.userId, action, windowMs);
  if (redisBucket) {
    if (redisBucket.count > ACTION_RATE_MAX) {
      const retryAfter = Math.max(redisBucket.resetAt - Date.now(), 1000);
      throw rateLimitedError('Too many requests. Please slow down.', retryAfter, {
        action,
      });
    }
    return;
  }

  const now = Date.now();
  const key = `${access.userId}:${action}`;
  const bucket = actionBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    if (bucket && now >= bucket.resetAt) {
      actionBuckets.delete(key);
    }
    setBoundedMapEntry(actionBuckets, key, { count: 1, resetAt: now + windowMs }, ACTION_BUCKETS_MAX_ENTRIES);
    return;
  }
  bucket.count += 1;
  touchMapEntry(actionBuckets, key, bucket);
  if (bucket.count > ACTION_RATE_MAX) {
    const retryAfter = Math.max(bucket.resetAt - now, 1000);
    throw rateLimitedError('Too many requests. Please slow down.', retryAfter, {
      action,
    });
  }
};
