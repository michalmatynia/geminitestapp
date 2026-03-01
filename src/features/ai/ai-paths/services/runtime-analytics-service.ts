import 'server-only';

import { randomUUID } from 'crypto';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { getBrainAssignmentForCapability } from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type {
  AiPathRuntimeAnalyticsRange,
  AiPathRuntimeAnalyticsSummary,
  AiPathRuntimeTraceAnalytics,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import { getRedisConnection } from '@/shared/lib/queue';

const KEY_PREFIX = 'ai_paths:runtime:analytics:v1';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const keyRuns = (
  status: 'all' | 'queued' | 'started' | 'completed' | 'failed' | 'canceled' | 'dead_lettered'
): string => `${KEY_PREFIX}:runs:${status}`;
const keyDurations = (): string => `${KEY_PREFIX}:runs:durations`;
const keyNodes = (status: string): string => `${KEY_PREFIX}:nodes:${status}`;
const keyBrain = (scope: 'all' | 'analytics' | 'logs' | 'warning' | 'error'): string =>
  `${KEY_PREFIX}:brain:${scope}`;
const keyTotals = (): string => `${KEY_PREFIX}:totals`;

const parseEnvNumber = (name: string, fallback: number, min: number, max: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const SUMMARY_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_RUNTIME_SUMMARY_CACHE_TTL_MS',
  5_000,
  500,
  120_000
);
const SUMMARY_QUERY_TIMEOUT_MS = parseEnvNumber(
  'AI_PATHS_RUNTIME_SUMMARY_TIMEOUT_MS',
  5_000,
  250,
  60_000
);
const DURATION_SAMPLE_LIMIT = parseEnvNumber(
  'AI_PATHS_RUNTIME_DURATION_SAMPLE_LIMIT',
  2_000,
  50,
  50_000
);
const TRACE_RUN_SAMPLE_LIMIT = parseEnvNumber(
  'AI_PATHS_RUNTIME_TRACE_RUN_SAMPLE_LIMIT',
  100,
  20,
  10_000
);
const TRACE_NODE_HIGHLIGHT_LIMIT = parseEnvNumber(
  'AI_PATHS_RUNTIME_TRACE_NODE_HIGHLIGHT_LIMIT',
  5,
  1,
  25
);
const SUMMARY_RANGE_BUCKET_MS = Math.max(1_000, SUMMARY_CACHE_TTL_MS);
const RUNTIME_ANALYTICS_CAPABILITY_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_RUNTIME_ANALYTICS_CAPABILITY_CACHE_TTL_MS',
  5_000,
  500,
  60_000
);

type SummaryCacheEntry = {
  value: AiPathRuntimeAnalyticsSummary;
  expiresAt: number;
};

const summaryCache = new Map<string, SummaryCacheEntry>();
const summaryInFlight = new Map<string, Promise<AiPathRuntimeAnalyticsSummary>>();
let runtimeAnalyticsCapabilityCache: { enabled: boolean; expiresAt: number } | null = null;

const toTimestampMs = (value?: Date | string | number | null): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};

const normalizeNodeStatus = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return normalized;
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

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const buildSummaryCacheKey = (
  fromMs: number,
  toMs: number,
  range: AiPathRuntimeAnalyticsRange | 'custom'
): string => {
  if (range === 'custom') {
    return `custom:${fromMs}:${toMs}`;
  }
  const bucket = Math.floor(toMs / SUMMARY_RANGE_BUCKET_MS);
  return `${range}:${bucket}`;
};

const pruneSummaryCache = (now: number): void => {
  summaryCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      summaryCache.delete(key);
    }
  });
};

const readCachedSummary = (cacheKey: string, now: number): AiPathRuntimeAnalyticsSummary | null => {
  const cached = summaryCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    summaryCache.delete(cacheKey);
    return null;
  }
  return cached.value;
};

const readStaleSummary = (cacheKey: string): AiPathRuntimeAnalyticsSummary | null => {
  const cached = summaryCache.get(cacheKey);
  return cached?.value ?? null;
};

const setCachedSummary = (
  cacheKey: string,
  summary: AiPathRuntimeAnalyticsSummary,
  now: number
): void => {
  summaryCache.set(cacheKey, {
    value: summary,
    expiresAt: now + SUMMARY_CACHE_TTL_MS,
  });
  pruneSummaryCache(now);
};

const isRuntimeAnalyticsCapabilityEnabled = async (): Promise<boolean> => {
  const now = Date.now();
  if (runtimeAnalyticsCapabilityCache && runtimeAnalyticsCapabilityCache.expiresAt > now) {
    return runtimeAnalyticsCapabilityCache.enabled;
  }
  try {
    const [runtimeAnalyticsAssignment, aiPathsAssignment] = await Promise.all([
      getBrainAssignmentForCapability('insights.runtime_analytics'),
      getBrainAssignmentForCapability('ai_paths.model'),
    ]);
    const enabled = runtimeAnalyticsAssignment.enabled && aiPathsAssignment.enabled;
    runtimeAnalyticsCapabilityCache = {
      enabled,
      expiresAt: now + RUNTIME_ANALYTICS_CAPABILITY_CACHE_TTL_MS,
    };
    return enabled;
  } catch (error) {
    // Fail closed to avoid analytics execution leaks when Brain settings are unavailable.
    void ErrorSystem.logWarning('Failed to resolve Brain runtime analytics capability gate.', {
      service: 'ai-paths-analytics',
      error,
    });
    runtimeAnalyticsCapabilityCache = {
      enabled: false,
      expiresAt: now + Math.min(1_000, RUNTIME_ANALYTICS_CAPABILITY_CACHE_TTL_MS),
    };
    return false;
  }
};

const toPipelineCount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
};

const toPipelineStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item: unknown): item is string => typeof item === 'string');
};

const parseDurationMember = (member: string): number | null => {
  const parts = member.split('|');
  if (parts.length < 2) return null;
  const value = Number(parts[1]);
  return Number.isFinite(value) ? Math.max(0, value) : null;
};

const emptyTraceAnalytics = (): AiPathRuntimeTraceAnalytics => ({
  source: 'none',
  sampledRuns: 0,
  sampledSpans: 0,
  completedSpans: 0,
  failedSpans: 0,
  cachedSpans: 0,
  avgDurationMs: null,
  p95DurationMs: null,
  slowestSpan: null,
  topSlowNodes: [],
  topFailedNodes: [],
  truncated: false,
});

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const extractRuntimeTraceNodeSpans = (run: AiPathRunRecord): unknown[] => {
  const meta = asRecord(run.meta);
  if (!meta) return [];
  const runtimeTrace = asRecord(meta['runtimeTrace']);
  if (!runtimeTrace) return [];
  const profile = asRecord(runtimeTrace['profile']);
  if (!profile) return [];
  const nodeSpans = profile['nodeSpans'];
  return Array.isArray(nodeSpans) ? nodeSpans : [];
};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toFiniteDurationMs = (
  value: unknown,
  startedAt: unknown,
  finishedAt: unknown
): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  const startedAtValue = toNonEmptyString(startedAt);
  const finishedAtValue = toNonEmptyString(finishedAt);
  if (!startedAtValue || !finishedAtValue) return null;
  const startedAtMs = Date.parse(startedAtValue);
  const finishedAtMs = Date.parse(finishedAtValue);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs)) return null;
  return Math.max(0, Math.round(finishedAtMs - startedAtMs));
};

export const summarizeRuntimeTraceAnalytics = (input: {
  runs: AiPathRunRecord[];
  total?: number;
}): AiPathRuntimeTraceAnalytics => {
  const runs = input.runs ?? [];
  const durations: number[] = [];
  type NodeAggregate = {
    nodeId: string;
    nodeType: string;
    spanCount: number;
    failedCount: number;
    durationCount: number;
    totalDurationMs: number;
    maxDurationMs: number;
  };
  const nodeAggregates = new Map<string, NodeAggregate>();
  let sampledSpans = 0;
  let completedSpans = 0;
  let failedSpans = 0;
  let cachedSpans = 0;
  let slowestSpan: AiPathRuntimeTraceAnalytics['slowestSpan'] = null;

  runs.forEach((run: AiPathRunRecord): void => {
    const spans = extractRuntimeTraceNodeSpans(run);
    spans.forEach((spanValue: unknown): void => {
      const span = asRecord(spanValue);
      if (!span) return;

      sampledSpans += 1;
      const nodeId = toNonEmptyString(span['nodeId']) ?? 'unknown';
      const nodeType = toNonEmptyString(span['nodeType']) ?? 'unknown';
      const status = toNonEmptyString(span['status']) ?? 'unknown';
      if (status === 'completed') completedSpans += 1;
      if (status === 'failed') failedSpans += 1;
      if (status === 'cached') cachedSpans += 1;
      const aggregateKey = `${nodeId}::${nodeType}`;
      const aggregate = nodeAggregates.get(aggregateKey) ?? {
        nodeId,
        nodeType,
        spanCount: 0,
        failedCount: 0,
        durationCount: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
      };
      aggregate.spanCount += 1;
      if (status === 'failed') {
        aggregate.failedCount += 1;
      }

      const durationMs = toFiniteDurationMs(
        span['durationMs'],
        span['startedAt'],
        span['finishedAt']
      );
      if (durationMs !== null) {
        durations.push(durationMs);
        aggregate.durationCount += 1;
        aggregate.totalDurationMs += durationMs;
        aggregate.maxDurationMs = Math.max(aggregate.maxDurationMs, durationMs);

        if (!slowestSpan || durationMs > slowestSpan.durationMs) {
          slowestSpan = {
            runId: toNonEmptyString(run.id) ?? 'unknown',
            spanId: toNonEmptyString(span['spanId']) ?? 'unknown',
            nodeId,
            nodeType,
            status,
            durationMs,
          };
        }
      }
      nodeAggregates.set(aggregateKey, aggregate);
    });
  });

  durations.sort((a: number, b: number): number => a - b);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(
        durations.reduce((sum: number, value: number) => sum + value, 0) / durations.length
      )
      : null;
  const p95DurationMs =
    durations.length > 0
      ? durations[
        Math.min(durations.length - 1, Math.max(0, Math.ceil(durations.length * 0.95) - 1))
      ]!
      : null;
  const topSlowNodes = Array.from(nodeAggregates.values())
    .filter((aggregate) => aggregate.durationCount > 0)
    .map((aggregate) => ({
      nodeId: aggregate.nodeId,
      nodeType: aggregate.nodeType,
      spanCount: aggregate.spanCount,
      avgDurationMs: Math.round(aggregate.totalDurationMs / aggregate.durationCount),
      maxDurationMs: aggregate.maxDurationMs,
      totalDurationMs: aggregate.totalDurationMs,
    }))
    .sort((left, right) => {
      if (right.totalDurationMs !== left.totalDurationMs) {
        return right.totalDurationMs - left.totalDurationMs;
      }
      return right.maxDurationMs - left.maxDurationMs;
    })
    .slice(0, TRACE_NODE_HIGHLIGHT_LIMIT);
  const topFailedNodes = Array.from(nodeAggregates.values())
    .filter((aggregate) => aggregate.failedCount > 0)
    .map((aggregate) => ({
      nodeId: aggregate.nodeId,
      nodeType: aggregate.nodeType,
      failedCount: aggregate.failedCount,
      spanCount: aggregate.spanCount,
    }))
    .sort((left, right) => {
      if (right.failedCount !== left.failedCount) {
        return right.failedCount - left.failedCount;
      }
      return right.spanCount - left.spanCount;
    })
    .slice(0, TRACE_NODE_HIGHLIGHT_LIMIT);

  const total = typeof input.total === 'number' ? Math.max(0, input.total) : runs.length;
  const sampledRuns = runs.length;
  return {
    source: 'db_sample',
    sampledRuns,
    sampledSpans,
    completedSpans,
    failedSpans,
    cachedSpans,
    avgDurationMs,
    p95DurationMs,
    slowestSpan,
    topSlowNodes,
    topFailedNodes,
    truncated: total > sampledRuns,
  };
};

const loadRuntimeTraceAnalytics = async (input: {
  from: Date;
  to: Date;
}): Promise<AiPathRuntimeTraceAnalytics> => {
  try {
    const repo = await getPathRunRepository();
    const result = await withTimeout(
      repo.listRuns({
        statuses: ['completed', 'failed', 'canceled', 'dead_lettered'],
        createdAfter: input.from.toISOString(),
        createdBefore: input.to.toISOString(),
        limit: TRACE_RUN_SAMPLE_LIMIT,
        offset: 0,
        // Skip countDocuments — we only need the sample for trace analysis, not the total.
        includeTotal: false,
      }),
      SUMMARY_QUERY_TIMEOUT_MS,
      'ai-paths runtime trace analytics query'
    );
    return summarizeRuntimeTraceAnalytics({
      runs: result.runs,
      total: result.total,
    });
  } catch (error) {
    void ErrorSystem.logWarning('Failed to load runtime trace analytics sample', {
      service: 'ai-paths-analytics',
      error,
    });
    return emptyTraceAnalytics();
  }
};

const emptySummary = (
  from: Date,
  to: Date,
  range: AiPathRuntimeAnalyticsRange | 'custom'
): AiPathRuntimeAnalyticsSummary => ({
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
    deadLettered: 0,
    successRate: 0,
    failureRate: 0,
    deadLetterRate: 0,
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
  traces: emptyTraceAnalytics(),
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
    multi.zadd(
      keyRuns('all'),
      String(timestampMs),
      buildEventMember('run_queued', input.runId, timestampMs)
    );
    multi.zadd(
      keyRuns('queued'),
      String(timestampMs),
      buildEventMember('queued', input.runId, timestampMs)
    );
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
    multi.zadd(
      keyRuns('started'),
      String(timestampMs),
      buildEventMember('started', input.runId, timestampMs)
    );
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
  status: 'completed' | 'failed' | 'canceled' | 'dead_lettered';
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
    multi.zadd(
      runStatusKey,
      String(timestampMs),
      buildEventMember(input.status, input.runId, timestampMs)
    );
    multi.zremrangebyscore(runStatusKey, 0, pruneTo);
    multi.hincrby(keyTotals(), `runs_${input.status}`, 1);

    const durationMs =
      typeof input.durationMs === 'number' && Number.isFinite(input.durationMs)
        ? Math.max(0, Math.round(input.durationMs))
        : null;
    if (durationMs !== null) {
      multi.zadd(
        keyDurations(),
        String(timestampMs),
        buildDurationMember(input.runId, durationMs, timestampMs)
      );
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
    multi.zadd(
      typeKey,
      String(timestampMs),
      buildEventMember(input.type, randomUUID(), timestampMs)
    );
    multi.zadd(
      keyBrain('all'),
      String(timestampMs),
      buildEventMember('all', randomUUID(), timestampMs)
    );
    multi.zremrangebyscore(typeKey, 0, pruneTo);
    multi.zremrangebyscore(keyBrain('all'), 0, pruneTo);
    multi.hincrby(keyTotals(), `brain_${input.type}_reports`, 1);
    multi.hincrby(keyTotals(), 'brain_reports_total', 1);

    if (status === 'warning') {
      multi.zadd(
        keyBrain('warning'),
        String(timestampMs),
        buildEventMember('warning', randomUUID(), timestampMs)
      );
      multi.zremrangebyscore(keyBrain('warning'), 0, pruneTo);
      multi.hincrby(keyTotals(), 'brain_warning_reports', 1);
    } else if (status === 'error') {
      multi.zadd(
        keyBrain('error'),
        String(timestampMs),
        buildEventMember('error', randomUUID(), timestampMs)
      );
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
  const analyticsEnabled = await isRuntimeAnalyticsCapabilityEnabled();
  if (!analyticsEnabled) {
    return emptySummary(from, to, range);
  }
  const redis = getRedisConnection();
  if (!redis) {
    return emptySummary(from, to, range);
  }

  const fromMs = from.getTime();
  const toMs = to.getTime();
  const cacheKey = buildSummaryCacheKey(fromMs, toMs, range);
  const now = Date.now();
  const cached = readCachedSummary(cacheKey, now);
  if (cached) return cached;

  const inFlight = summaryInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const loadPromise = (async (): Promise<AiPathRuntimeAnalyticsSummary> => {
    const runtimeTracePromise = loadRuntimeTraceAnalytics({ from, to });
    try {
      const pipeline = redis.pipeline();
      pipeline.zcount(keyRuns('all'), fromMs, toMs);
      pipeline.zcount(keyRuns('queued'), fromMs, toMs);
      pipeline.zcount(keyRuns('started'), fromMs, toMs);
      pipeline.zcount(keyRuns('completed'), fromMs, toMs);
      pipeline.zcount(keyRuns('failed'), fromMs, toMs);
      pipeline.zcount(keyRuns('canceled'), fromMs, toMs);
      pipeline.zcount(keyRuns('dead_lettered'), fromMs, toMs);
      pipeline.zcount(keyNodes('started'), fromMs, toMs);
      pipeline.zcount(keyNodes('completed'), fromMs, toMs);
      pipeline.zcount(keyNodes('failed'), fromMs, toMs);
      pipeline.zcount(keyNodes('queued'), fromMs, toMs);
      pipeline.zcount(keyNodes('running'), fromMs, toMs);
      pipeline.zcount(keyNodes('polling'), fromMs, toMs);
      pipeline.zcount(keyNodes('cached'), fromMs, toMs);
      pipeline.zcount(keyNodes('waiting_callback'), fromMs, toMs);
      pipeline.zcount(keyBrain('analytics'), fromMs, toMs);
      pipeline.zcount(keyBrain('logs'), fromMs, toMs);
      pipeline.zcount(keyBrain('all'), fromMs, toMs);
      pipeline.zcount(keyBrain('warning'), fromMs, toMs);
      pipeline.zcount(keyBrain('error'), fromMs, toMs);
      pipeline.zrangebyscore(keyDurations(), fromMs, toMs, 'LIMIT', 0, DURATION_SAMPLE_LIMIT);

      const results =
        (await withTimeout(
          pipeline.exec(),
          SUMMARY_QUERY_TIMEOUT_MS,
          'ai-paths runtime analytics summary'
        )) ?? [];
      for (const result of results) {
        if (Array.isArray(result) && result[0]) {
          throw result[0];
        }
      }

      const readCountAt = (index: number): number =>
        toPipelineCount(Array.isArray(results[index]) ? results[index]?.[1] : 0);
      const durationMembers = toPipelineStrings(Array.isArray(results[20]) ? results[20]?.[1] : []);
      const durations = durationMembers
        .map(parseDurationMember)
        .filter((value: number | null): value is number => value !== null)
        .sort((a: number, b: number) => a - b);
      const avgDurationMs =
        durations.length > 0
          ? Math.round(
            durations.reduce((sum: number, value: number) => sum + value, 0) / durations.length
          )
          : null;
      const p95DurationMs =
        durations.length > 0
          ? durations[
            Math.min(durations.length - 1, Math.max(0, Math.ceil(durations.length * 0.95) - 1))
          ]!
          : null;

      const runsCompleted = readCountAt(3);
      const runsFailed = readCountAt(4);
      const runsCanceled = readCountAt(5);
      const runsDeadLettered = readCountAt(6);
      const terminalRuns = runsCompleted + runsFailed + runsCanceled + runsDeadLettered;
      const successRate = terminalRuns > 0 ? clampRate((runsCompleted / terminalRuns) * 100) : 0;
      const failureRate =
        terminalRuns > 0
          ? clampRate(((runsFailed + runsCanceled + runsDeadLettered) / terminalRuns) * 100)
          : 0;
      const deadLetterRate =
        terminalRuns > 0 ? clampRate((runsDeadLettered / terminalRuns) * 100) : 0;
      const traces = await runtimeTracePromise;

      const summary: AiPathRuntimeAnalyticsSummary = {
        from: from.toISOString(),
        to: to.toISOString(),
        range,
        storage: 'redis',
        runs: {
          total: readCountAt(0),
          queued: readCountAt(1),
          started: readCountAt(2),
          completed: runsCompleted,
          failed: runsFailed,
          canceled: runsCanceled,
          deadLettered: runsDeadLettered,
          successRate,
          failureRate,
          deadLetterRate,
          avgDurationMs,
          p95DurationMs,
        },
        nodes: {
          started: readCountAt(7),
          completed: readCountAt(8),
          failed: readCountAt(9),
          queued: readCountAt(10),
          running: readCountAt(11),
          polling: readCountAt(12),
          cached: readCountAt(13),
          waitingCallback: readCountAt(14),
        },
        brain: {
          analyticsReports: readCountAt(15),
          logReports: readCountAt(16),
          totalReports: readCountAt(17),
          warningReports: readCountAt(18),
          errorReports: readCountAt(19),
        },
        traces,
        generatedAt: new Date().toISOString(),
      };
      setCachedSummary(cacheKey, summary, Date.now());
      return summary;
    } catch (error) {
      void ErrorSystem.logWarning('Failed to load runtime analytics summary', {
        service: 'ai-paths-analytics',
        error,
        range,
      });
      const stale = readStaleSummary(cacheKey);
      if (stale) return stale;
      const fallback = emptySummary(from, to, range);
      fallback.traces = await runtimeTracePromise;
      return fallback;
    }
  })();

  summaryInFlight.set(cacheKey, loadPromise);
  try {
    return await loadPromise;
  } finally {
    summaryInFlight.delete(cacheKey);
  }
};
