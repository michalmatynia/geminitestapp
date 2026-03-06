import 'server-only';

import { randomUUID } from 'crypto';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type {
  AiPathRuntimePortableEngineAnalytics,
  AiPathRuntimeAnalyticsRange,
  AiPathRuntimeAnalyticsSummary,
} from '@/shared/contracts/ai-paths';
import { getPortablePathRunExecutionSnapshot } from '@/shared/lib/ai-paths/portable-engine';
import { getRedisConnection } from '@/shared/lib/queue';
import {
  DURATION_SAMPLE_LIMIT,
  SUMMARY_QUERY_TIMEOUT_MS,
  keyBrain,
  keyDurations,
  keyNodes,
  keyRuns,
  keyTotals,
} from '@/shared/lib/ai-paths/services/runtime-analytics/config';
import {
  buildSummaryCacheKey,
  readCachedSummary,
  readStaleSummary,
  setCachedSummary,
  summaryInFlight,
} from '@/shared/lib/ai-paths/services/runtime-analytics/cache';
import {
  getRuntimeAnalyticsAvailability as getRuntimeAnalyticsAvailabilityShared,
  type RuntimeAnalyticsAvailability,
} from '@/shared/lib/ai-paths/services/runtime-analytics/availability';
import {
  emptySummary as buildRuntimeAnalyticsEmptySummary,
  emptyTraceAnalytics,
  loadRuntimeTraceAnalytics,
  summarizeRuntimeTraceAnalytics,
} from '@/shared/lib/ai-paths/services/runtime-analytics/trace';
import {
  buildEventMember,
  clampRate,
  parseDurationMember,
  pruneBefore,
  toPipelineCount,
  toPipelineStrings,
  toTimestampMs,
  withTimeout,
} from '@/shared/lib/ai-paths/services/runtime-analytics/utils';
import {
  recordRuntimeNodeStatus as recordRuntimeNodeStatusShared,
  recordRuntimeRunFinished as recordRuntimeRunFinishedShared,
  recordRuntimeRunQueued as recordRuntimeRunQueuedShared,
  recordRuntimeRunStarted as recordRuntimeRunStartedShared,
} from '@/shared/lib/ai-paths/services/runtime-analytics/recording';

export type { RuntimeAnalyticsAvailability };
export { summarizeRuntimeTraceAnalytics };

export const getRuntimeAnalyticsAvailability = getRuntimeAnalyticsAvailabilityShared;

const toPortableEngineRates = (
  counts: Pick<AiPathRuntimePortableEngineAnalytics['totals'], 'attempts' | 'successes' | 'failures'>
): Pick<AiPathRuntimePortableEngineAnalytics['totals'], 'successRate' | 'failureRate'> => {
  if (counts.attempts <= 0) {
    return {
      successRate: 0,
      failureRate: 0,
    };
  }
  return {
    successRate: clampRate((counts.successes / counts.attempts) * 100),
    failureRate: clampRate((counts.failures / counts.attempts) * 100),
  };
};

const emptyPortableEngineAnalytics = (
  source: AiPathRuntimePortableEngineAnalytics['source']
): AiPathRuntimePortableEngineAnalytics => ({
  source,
  totals: {
    attempts: 0,
    successes: 0,
    failures: 0,
    successRate: 0,
    failureRate: 0,
  },
  byRunner: {
    client: { attempts: 0, successes: 0, failures: 0 },
    server: { attempts: 0, successes: 0, failures: 0 },
  },
  bySurface: {
    canvas: { attempts: 0, successes: 0, failures: 0 },
    product: { attempts: 0, successes: 0, failures: 0 },
    api: { attempts: 0, successes: 0, failures: 0 },
  },
  byInputSource: {
    portable_package: { attempts: 0, successes: 0, failures: 0 },
    portable_envelope: { attempts: 0, successes: 0, failures: 0 },
    semantic_canvas: { attempts: 0, successes: 0, failures: 0 },
    path_config: { attempts: 0, successes: 0, failures: 0 },
  },
  failureStageCounts: {
    resolve: 0,
    validation: 0,
    runtime: 0,
  },
  recentFailures: [],
});

const buildPortableEngineAnalytics = (): AiPathRuntimePortableEngineAnalytics => {
  try {
    const snapshot = getPortablePathRunExecutionSnapshot();
    const recentFailures = snapshot.recentEvents
      .filter((event) => event.outcome === 'failure')
      .slice(-10)
      .reverse()
      .map((event) => ({
        at: event.at,
        runner: event.runner,
        surface: event.surface,
        source: event.source,
        stage: event.failureStage ?? 'runtime',
        error: event.error ?? 'Unknown portable engine runtime failure.',
        durationMs: event.durationMs,
        validateBeforeRun: event.validateBeforeRun,
        validationMode: event.validationMode,
      }));

    return {
      source: 'in_memory',
      totals: {
        ...snapshot.totals,
        ...toPortableEngineRates(snapshot.totals),
      },
      byRunner: snapshot.byRunner,
      bySurface: snapshot.bySurface,
      byInputSource: snapshot.bySource,
      failureStageCounts: snapshot.failureStageCounts,
      recentFailures,
    };
  } catch (error) {
    void ErrorSystem.logWarning('Failed to read portable engine runtime analytics snapshot', {
      service: 'ai-paths-analytics',
      error,
    });
    return emptyPortableEngineAnalytics('unavailable');
  }
};

const emptySummary = (
  from: Date,
  to: Date,
  range: AiPathRuntimeAnalyticsRange | 'custom'
): AiPathRuntimeAnalyticsSummary => ({
  ...buildRuntimeAnalyticsEmptySummary(from, to, range),
  portableEngine: buildPortableEngineAnalytics(),
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

export const recordRuntimeRunQueued = recordRuntimeRunQueuedShared;
export const recordRuntimeRunStarted = recordRuntimeRunStartedShared;
export const recordRuntimeRunFinished = recordRuntimeRunFinishedShared;
export const recordRuntimeNodeStatus = recordRuntimeNodeStatusShared;

const normalizeBrainInsightStatus = (
  value: string | null | undefined
): 'success' | 'warning' | 'error' | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'warning') return 'warning';
  if (normalized === 'error' || normalized === 'failed' || normalized === 'failure') return 'error';
  if (normalized === 'success' || normalized === 'completed' || normalized === 'complete') {
    return 'success';
  }
  return null;
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
    const status = normalizeBrainInsightStatus(input.status);

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
  includeTraces?: boolean;
}): Promise<AiPathRuntimeAnalyticsSummary> => {
  const from = input.from;
  const to = input.to;
  const range = input.range ?? 'custom';
  const includeTraces = input.includeTraces !== false;
  const availability = await getRuntimeAnalyticsAvailability();
  if (!availability.enabled) {
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
    const runtimeTracePromise = includeTraces
      ? loadRuntimeTraceAnalytics({ from, to })
      : Promise.resolve(emptyTraceAnalytics());
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
        portableEngine: buildPortableEngineAnalytics(),
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
      fallback.traces = includeTraces ? await runtimeTracePromise : emptyTraceAnalytics();
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
