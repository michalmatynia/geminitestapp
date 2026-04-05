import 'server-only';

import { resolveAiPathsStaleRunningMaxAgeMs } from '@/features/ai/ai-paths/services/path-run-recovery-service';
import type { AiPathRunRecord, AiPathRunStatus } from '@/shared/contracts/ai-paths';
import { forbiddenError, authError, rateLimitedError } from '@/shared/errors/app-error';
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
const RUN_ACTIVE_STALE_RECOVERY_INTERVAL_MS = parseNumber(
  process.env['AI_PATHS_RUN_ACTIVE_STALE_RECOVERY_INTERVAL_MS'],
  60_000
);
const RUN_ACTIVE_STALE_MAX_AGE_MS = resolveAiPathsStaleRunningMaxAgeMs();
const ACTION_RATE_WINDOW_SECONDS = parseNumber(
  process.env['AI_PATHS_ACTION_RATE_LIMIT_WINDOW_SECONDS'],
  60
);
const ACTION_RATE_MAX = parseNumber(process.env['AI_PATHS_ACTION_RATE_LIMIT_MAX'], 120);
const ACTION_RATE_BUCKET_PREFIX = 'ai_paths:action-rate:v1';

const actionBuckets = new Map<string, { count: number; resetAt: number }>();
let staleRunningRecoveryInFlight: Promise<void> | null = null;
let lastStaleRunningRecoveryAt = 0;

const withSoftTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<{ value: T | null; timedOut: boolean }> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    try {
      return { value: await promise, timedOut: false };
    } catch (error) {
      void ErrorSystem.captureException(error);
      return { value: null, timedOut: false };
    }
  }
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const value = await Promise.race<T | null>([
      promise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
    return { value, timedOut: value === null };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return { value: null, timedOut: false };
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

const maybeRecoverStaleRunningRunsForRateLimit = async (
  access: AiPathsAccessContext
): Promise<void> => {
  if (RUN_ACTIVE_STALE_RECOVERY_INTERVAL_MS <= 0 || RUN_ACTIVE_STALE_MAX_AGE_MS <= 0) {
    return;
  }
  if (staleRunningRecoveryInFlight) {
    await staleRunningRecoveryInFlight;
    return;
  }
  const now = Date.now();
  if (now - lastStaleRunningRecoveryAt < RUN_ACTIVE_STALE_RECOVERY_INTERVAL_MS) {
    return;
  }

  lastStaleRunningRecoveryAt = now;
  staleRunningRecoveryInFlight = (async (): Promise<void> => {
    try {
      const repo = await getPathRunRepository();
      const result = await repo.markStaleRunningRuns(RUN_ACTIVE_STALE_MAX_AGE_MS);
      if (result.count > 0) {
        void logSystemEvent({
          level: 'warn',
          message: '[ai-paths.rate-limit] stale running recovery released active slots',
          source: 'ai-paths-access',
          context: {
            userId: access.userId,
            recoveredCount: result.count,
            maxAgeMs: RUN_ACTIVE_STALE_MAX_AGE_MS,
          },
        });
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // Recovery is best-effort in the rate-limit path.
    } finally {
      staleRunningRecoveryInFlight = null;
    }
  })();

  await staleRunningRecoveryInFlight;
};

export const enforceAiPathsRunRateLimit = async (access: AiPathsAccessContext): Promise<void> => {
  const repo = await getPathRunRepository();
  const now = Date.now();
  const windowMs = RUN_RATE_WINDOW_SECONDS * 1000;
  const activeStatuses: AiPathRunStatus[] = ['running'];

  // Run rate-limit probes in parallel with short soft timeouts.
  // If a probe times out, fail open for that probe to keep enqueue hot path responsive.
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
  const recent = recentProbe?.value ?? null;
  const active = activeProbe?.value ?? null;
  const queueStats = queueStatsProbe?.value ?? null;

  if (recentProbe?.timedOut || activeProbe?.timedOut || queueStatsProbe?.timedOut) {
    void logSystemEvent({
      level: 'warn',
      message: '[ai-paths.rate-limit] soft timeout while probing rate limits',
      source: 'ai-paths-access',
      context: {
        userId: access.userId,
        recentTimedOut: recentProbe?.timedOut ?? false,
        activeTimedOut: activeProbe?.timedOut ?? false,
        queueTimedOut: queueStatsProbe?.timedOut ?? false,
        timeoutMs: RUN_RATE_QUERY_TIMEOUT_MS,
      },
    });
  }

  if (recent && recent.runs.length >= RUN_RATE_MAX) {
    throw rateLimitedError('Too many runs queued. Please wait before trying again.', windowMs);
  }
  let activeRunCount = active?.runs.length ?? 0;
  let freshActiveRunCount = countFreshActiveRuns(active?.runs ?? [], now);
  if (activeRunCount >= RUN_ACTIVE_MAX) {
    await maybeRecoverStaleRunningRunsForRateLimit(access);
    const refreshedActiveProbe =
      RUN_ACTIVE_MAX > 0
        ? await withSoftTimeout(
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
        : null;
    if (refreshedActiveProbe?.timedOut) {
      void logSystemEvent({
        level: 'warn',
        message: '[ai-paths.rate-limit] soft timeout while re-probing active runs',
        source: 'ai-paths-access',
        context: {
          userId: access.userId,
          timeoutMs: RUN_RATE_QUERY_TIMEOUT_MS,
          activeStatuses,
        },
      });
    }
    if (refreshedActiveProbe?.value) {
      activeRunCount = refreshedActiveProbe.value.runs.length;
      freshActiveRunCount = countFreshActiveRuns(refreshedActiveProbe.value.runs, now);
    }
  }
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
  if (activeRunCount >= RUN_ACTIVE_MAX && freshActiveRunCount < RUN_ACTIVE_MAX) {
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
      Math.max(windowMs, 5000),
      {
        queuedCount: queueStats.queuedCount,
        queuedLimit: RUN_GLOBAL_QUEUED_MAX,
      }
    );
  }
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
    actionBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > ACTION_RATE_MAX) {
    const retryAfter = Math.max(bucket.resetAt - now, 1000);
    throw rateLimitedError('Too many requests. Please slow down.', retryAfter, {
      action,
    });
  }
};
