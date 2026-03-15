import 'server-only';

import type {
  AiPathRuntimeAnalyticsRange,
  AiPathRuntimeAnalyticsSummary,
} from '@/shared/contracts/ai-paths';
import { getRedisConnection } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getRuntimeAnalyticsAvailability } from './availability';
import {
  buildSummaryCacheKey,
  readCachedSummary,
  readStaleSummary,
  setCachedSummary,
  summaryInFlight,
} from './cache';
import {
  DURATION_SAMPLE_LIMIT,
  SUMMARY_QUERY_TIMEOUT_MS,
  keyBrain,
  keyDurations,
  keyNodes,
  keyRuns,
} from './config';
import { emptySummary, emptyTraceAnalytics, loadRuntimeTraceAnalytics } from './trace';
import {
  clampRate,
  parseDurationMember,
  toPipelineCount,
  toPipelineStrings,
  withTimeout,
} from './utils';

export type RuntimeAnalyticsSummaryInput = {
  from: Date;
  to: Date;
  range?: AiPathRuntimeAnalyticsRange | 'custom';
  includeTraces?: boolean;
};

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

export const getRuntimeAnalyticsSummaryBase = async (
  input: RuntimeAnalyticsSummaryInput
): Promise<AiPathRuntimeAnalyticsSummary> => {
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
      pipeline.zcount(keyRuns('blocked_on_lease'), fromMs, toMs);
      pipeline.zcount(keyRuns('handoff_ready'), fromMs, toMs);
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
      const durationMembers = toPipelineStrings(Array.isArray(results[22]) ? results[22]?.[1] : []);
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
      const runsBlockedOnLease = readCountAt(7);
      const runsHandoffReady = readCountAt(8);
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
          blockedOnLease: runsBlockedOnLease,
          handoffReady: runsHandoffReady,
          successRate,
          failureRate,
          deadLetterRate,
          avgDurationMs,
          p95DurationMs,
        },
        nodes: {
          started: readCountAt(9),
          completed: readCountAt(10),
          failed: readCountAt(11),
          queued: readCountAt(12),
          running: readCountAt(13),
          polling: readCountAt(14),
          cached: readCountAt(15),
          waitingCallback: readCountAt(16),
        },
        brain: {
          analyticsReports: readCountAt(17),
          logReports: readCountAt(18),
          totalReports: readCountAt(19),
          warningReports: readCountAt(20),
          errorReports: readCountAt(21),
        },
        traces,
        generatedAt: new Date().toISOString(),
      };
      setCachedSummary(cacheKey, summary, Date.now());
      return summary;
    } catch (error) {
      void ErrorSystem.captureException(error);
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
