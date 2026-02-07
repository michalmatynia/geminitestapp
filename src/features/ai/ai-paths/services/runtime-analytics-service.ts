import 'server-only';

import { randomUUID } from 'crypto';

import { ErrorSystem } from '@/features/observability/services/error-system';
import { getRedisConnection } from '@/shared/lib/queue';
import type {
  AiPathRuntimeAnalyticsRange,
  AiPathRuntimeAnalyticsSummary,
  AiPathRuntimeNodeStatus,
} from '@/shared/types/ai-paths';

const KEY_PREFIX = 'ai_paths:runtime:analytics:v1';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const keyRuns = (status: 'all' | 'queued' | 'started' | 'completed' | 'failed' | 'canceled'): string =>
  `${KEY_PREFIX}:runs:${status}`;
const keyDurations = (): string => `${KEY_PREFIX}:runs:durations`;
const keyNodes = (status: string): string => `${KEY_PREFIX}:nodes:${status}`;
const keyBrain = (scope: 'all' | 'analytics' | 'logs' | 'warning' | 'error'): string =>
  `${KEY_PREFIX}:brain:${scope}`;
const keyTotals = (): string => `${KEY_PREFIX}:totals`;

const toTimestampMs = (value?: Date | string | number | null): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};

const normalizeNodeStatus = (value: unknown): AiPathRuntimeNodeStatus | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return normalized as AiPathRuntimeNodeStatus;
};

const buildEventMember = (type: string, id: string, timestampMs: number): string =>
  `${type}|${id}|${timestampMs}|${randomUUID()}`;

const buildDurationMember = (runId: string, durationMs: number, timestampMs: number): string =>
  `${timestampMs}|${Math.max(0, Math.round(durationMs))}|${runId}|${randomUUID()}`;

const pruneBefore = (timestampMs: number): number => Math.max(0, timestampMs - RETENTION_MS);

const clampRate = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

const emptySummary = (from: Date, to: Date, range: AiPathRuntimeAnalyticsRange | 'custom'): AiPathRuntimeAnalyticsSummary => ({
  from: from.toISOString(),
  to: to.toISOString(),
  range,
  storage: 'disabled',
  runs: {
    total: 0,
    queued: 0,
    started: 0,
    completed: 0,
    failed: 0,
    canceled: 0,
    successRate: 0,
    failureRate: 0,
    avgDurationMs: null,
    p95DurationMs: null,
  },
  nodes: {
    started: 0,
    completed: 0,
    failed: 0,
    queued: 0,
    running: 0,
    polling: 0,
    cached: 0,
    waitingCallback: 0,
  },
  brain: {
    analyticsReports: 0,
    logReports: 0,
    totalReports: 0,
    warningReports: 0,
    errorReports: 0,
  },
  generatedAt: new Date().toISOString(),
});

export const resolveRuntimeAnalyticsRangeWindow = (
  range: AiPathRuntimeAnalyticsRange
): { from: Date; to: Date } => {
  const to = new Date();
  const msByRange: Record<AiPathRuntimeAnalyticsRange, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return {
    from: new Date(to.getTime() - msByRange[range]),
    to,
  };
};

export const recordRuntimeRunQueued = async (input: {
  runId: string;
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = getRedisConnection();
    if (!redis || !input.runId) return;
    const timestampMs = toTimestampMs(input.timestamp);
    const pruneTo = pruneBefore(timestampMs);
    const multi = redis.multi();
    multi.zadd(keyRuns('all'), String(timestampMs), buildEventMember('run_queued', input.runId, timestampMs));
    multi.zadd(keyRuns('queued'), String(timestampMs), buildEventMember('queued', input.runId, timestampMs));
    multi.zremrangebyscore(keyRuns('all'), 0, pruneTo);
    multi.zremrangebyscore(keyRuns('queued'), 0, pruneTo);
    multi.hincrby(keyTotals(), 'runs_total', 1);
    multi.hincrby(keyTotals(), 'runs_queued', 1);
    await multi.exec();
  } catch (error) {
    void ErrorSystem.logWarning('Failed to record run queued analytics', {
      service: 'ai-paths-analytics',
      error,
      runId: input.runId,
    });
  }
};

export const recordRuntimeRunStarted = async (input: {
  runId: string;
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = getRedisConnection();
    if (!redis || !input.runId) return;
    const timestampMs = toTimestampMs(input.timestamp);
    const pruneTo = pruneBefore(timestampMs);
    const multi = redis.multi();
    multi.zadd(keyRuns('started'), String(timestampMs), buildEventMember('started', input.runId, timestampMs));
    multi.zremrangebyscore(keyRuns('started'), 0, pruneTo);
    multi.hincrby(keyTotals(), 'runs_started', 1);
    await multi.exec();
  } catch (error) {
    void ErrorSystem.logWarning('Failed to record run started analytics', {
      service: 'ai-paths-analytics',
      error,
      runId: input.runId,
    });
  }
};

export const recordRuntimeRunFinished = async (input: {
  runId: string;
  status: 'completed' | 'failed' | 'canceled';
  durationMs?: number | null;
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = getRedisConnection();
    if (!redis || !input.runId) return;
    const timestampMs = toTimestampMs(input.timestamp);
    const pruneTo = pruneBefore(timestampMs);
    const runStatusKey = keyRuns(input.status);
    const multi = redis.multi();
    multi.zadd(runStatusKey, String(timestampMs), buildEventMember(input.status, input.runId, timestampMs));
    multi.zremrangebyscore(runStatusKey, 0, pruneTo);
    multi.hincrby(keyTotals(), `runs_${input.status}`, 1);

    const durationMs =
      typeof input.durationMs === 'number' && Number.isFinite(input.durationMs)
        ? Math.max(0, Math.round(input.durationMs))
        : null;
    if (durationMs !== null) {
      multi.zadd(keyDurations(), String(timestampMs), buildDurationMember(input.runId, durationMs, timestampMs));
      multi.zremrangebyscore(keyDurations(), 0, pruneTo);
      multi.hincrby(keyTotals(), 'runs_duration_count', 1);
      multi.hincrby(keyTotals(), 'runs_duration_total_ms', durationMs);
    }
    await multi.exec();
  } catch (error) {
    void ErrorSystem.logWarning('Failed to record run finished analytics', {
      service: 'ai-paths-analytics',
      error,
      runId: input.runId,
    });
  }
};

export const recordRuntimeNodeStatus = async (input: {
  runId: string;
  nodeId: string;
  status: unknown;
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = getRedisConnection();
    if (!redis || !input.runId || !input.nodeId) return;
    const normalizedStatus = normalizeNodeStatus(input.status);
    if (!normalizedStatus) return;

    const trackedStatuses = new Set<string>([
      'started',
      'completed',
      'failed',
      'queued',
      'running',
      'polling',
      'cached',
      'waiting_callback',
    ]);
    const statusKey = normalizedStatus === 'running' ? 'started' : normalizedStatus;
    if (!trackedStatuses.has(statusKey)) return;

    const timestampMs = toTimestampMs(input.timestamp);
    const pruneTo = pruneBefore(timestampMs);
    const multi = redis.multi();
    multi.zadd(
      keyNodes(statusKey),
      String(timestampMs),
      buildEventMember(`node_${statusKey}`, `${input.runId}:${input.nodeId}`, timestampMs)
    );
    multi.zremrangebyscore(keyNodes(statusKey), 0, pruneTo);
    multi.hincrby(keyTotals(), `nodes_${statusKey}`, 1);
    await multi.exec();
  } catch (error) {
    void ErrorSystem.logWarning('Failed to record node status analytics', {
      service: 'ai-paths-analytics',
      error,
      runId: input.runId,
      nodeId: input.nodeId,
    });
  }
};

export const recordBrainInsightAnalytics = async (input: {
  type: 'analytics' | 'logs';
  status?: string | null;
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = getRedisConnection();
    if (!redis) return;
    const timestampMs = toTimestampMs(input.timestamp);
    const pruneTo = pruneBefore(timestampMs);
    const typeKey = keyBrain(input.type);
    const status = typeof input.status === 'string' ? input.status.trim().toLowerCase() : '';

    const multi = redis.multi();
    multi.zadd(typeKey, String(timestampMs), buildEventMember(input.type, randomUUID(), timestampMs));
    multi.zadd(keyBrain('all'), String(timestampMs), buildEventMember('all', randomUUID(), timestampMs));
    multi.zremrangebyscore(typeKey, 0, pruneTo);
    multi.zremrangebyscore(keyBrain('all'), 0, pruneTo);
    multi.hincrby(keyTotals(), `brain_${input.type}_reports`, 1);
    multi.hincrby(keyTotals(), 'brain_reports_total', 1);

    if (status === 'warning') {
      multi.zadd(keyBrain('warning'), String(timestampMs), buildEventMember('warning', randomUUID(), timestampMs));
      multi.zremrangebyscore(keyBrain('warning'), 0, pruneTo);
      multi.hincrby(keyTotals(), 'brain_warning_reports', 1);
    } else if (status === 'error') {
      multi.zadd(keyBrain('error'), String(timestampMs), buildEventMember('error', randomUUID(), timestampMs));
      multi.zremrangebyscore(keyBrain('error'), 0, pruneTo);
      multi.hincrby(keyTotals(), 'brain_error_reports', 1);
    }
    await multi.exec();
  } catch (error) {
    void ErrorSystem.logWarning('Failed to record brain insight analytics', {
      service: 'ai-paths-analytics',
      error,
    });
  }
};

export const getRuntimeAnalyticsSummary = async (input: {
  from: Date;
  to: Date;
  range?: AiPathRuntimeAnalyticsRange | 'custom';
}): Promise<AiPathRuntimeAnalyticsSummary> => {
  const from = input.from;
  const to = input.to;
  const range = input.range ?? 'custom';
  const redis = getRedisConnection();
  if (!redis) {
    return emptySummary(from, to, range);
  }

  const fromMs = from.getTime();
  const toMs = to.getTime();
  const [
    runsTotal,
    runsQueued,
    runsStarted,
    runsCompleted,
    runsFailed,
    runsCanceled,
    nodeStarted,
    nodeCompleted,
    nodeFailed,
    nodeQueued,
    nodeRunning,
    nodePolling,
    nodeCached,
    nodeWaitingCallback,
    brainAnalyticsReports,
    brainLogReports,
    brainTotalReports,
    brainWarningReports,
    brainErrorReports,
    durationMembers,
  ] = await Promise.all([
    redis.zcount(keyRuns('all'), fromMs, toMs),
    redis.zcount(keyRuns('queued'), fromMs, toMs),
    redis.zcount(keyRuns('started'), fromMs, toMs),
    redis.zcount(keyRuns('completed'), fromMs, toMs),
    redis.zcount(keyRuns('failed'), fromMs, toMs),
    redis.zcount(keyRuns('canceled'), fromMs, toMs),
    redis.zcount(keyNodes('started'), fromMs, toMs),
    redis.zcount(keyNodes('completed'), fromMs, toMs),
    redis.zcount(keyNodes('failed'), fromMs, toMs),
    redis.zcount(keyNodes('queued'), fromMs, toMs),
    redis.zcount(keyNodes('running'), fromMs, toMs),
    redis.zcount(keyNodes('polling'), fromMs, toMs),
    redis.zcount(keyNodes('cached'), fromMs, toMs),
    redis.zcount(keyNodes('waiting_callback'), fromMs, toMs),
    redis.zcount(keyBrain('analytics'), fromMs, toMs),
    redis.zcount(keyBrain('logs'), fromMs, toMs),
    redis.zcount(keyBrain('all'), fromMs, toMs),
    redis.zcount(keyBrain('warning'), fromMs, toMs),
    redis.zcount(keyBrain('error'), fromMs, toMs),
    redis.zrangebyscore(keyDurations(), fromMs, toMs),
  ]);

  const durations = durationMembers
    .map((member: string): number | null => {
      const parts = member.split('|');
      if (parts.length < 2) return null;
      const value = Number(parts[1]);
      return Number.isFinite(value) ? Math.max(0, value) : null;
    })
    .filter((value: number | null): value is number => value !== null)
    .sort((a: number, b: number) => a - b);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((sum: number, value: number) => sum + value, 0) / durations.length)
      : null;
  const p95DurationMs =
    durations.length > 0
      ? durations[Math.min(durations.length - 1, Math.max(0, Math.ceil(durations.length * 0.95) - 1))]!
      : null;

  const terminalRuns = runsCompleted + runsFailed + runsCanceled;
  const successRate = terminalRuns > 0 ? clampRate((runsCompleted / terminalRuns) * 100) : 0;
  const failureRate = terminalRuns > 0 ? clampRate(((runsFailed + runsCanceled) / terminalRuns) * 100) : 0;

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    range,
    storage: 'redis',
    runs: {
      total: runsTotal,
      queued: runsQueued,
      started: runsStarted,
      completed: runsCompleted,
      failed: runsFailed,
      canceled: runsCanceled,
      successRate,
      failureRate,
      avgDurationMs,
      p95DurationMs,
    },
    nodes: {
      started: nodeStarted,
      completed: nodeCompleted,
      failed: nodeFailed,
      queued: nodeQueued,
      running: nodeRunning,
      polling: nodePolling,
      cached: nodeCached,
      waitingCallback: nodeWaitingCallback,
    },
    brain: {
      analyticsReports: brainAnalyticsReports,
      logReports: brainLogReports,
      totalReports: brainTotalReports,
      warningReports: brainWarningReports,
      errorReports: brainErrorReports,
    },
    generatedAt: new Date().toISOString(),
  };
};
