import 'server-only';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/**
 * AI Path Runtime Analytics Service
 *
 * Provides recording and retrieval of AI Path execution metrics via Redis.
 */

export * from './runtime-analytics/config';
export * from './runtime-analytics/utils';
export * from './runtime-analytics/availability';
export * from './runtime-analytics/cache';
export * from './runtime-analytics/trace';
export * from './runtime-analytics/recording';

import {
  AiPathRuntimeAnalyticsRange,
  AiPathRuntimeAnalyticsSummary,
} from '@/shared/contracts/ai-paths';
import { getRedisConnection } from '@/shared/lib/queue';
import {
  keyRuns,
  keyDurations,
  keyNodes,
  keyBrain,
  SUMMARY_QUERY_TIMEOUT_MS,
} from './runtime-analytics/config';
import { withTimeout, parseDurationMember, clampRate } from './runtime-analytics/utils';
import {
  buildSummaryCacheKey,
  readCachedSummary,
  setCachedSummary,
  summaryInFlight,
  readStaleSummary,
} from './runtime-analytics/cache';
import { emptySummary, loadRuntimeTraceAnalytics } from './runtime-analytics/trace';
import { getRuntimeAnalyticsAvailability } from './runtime-analytics/availability';

export const getRuntimeAnalyticsSummary = async (
  window: { from: Date; to: Date },
  range: AiPathRuntimeAnalyticsRange | 'custom' = 'custom'
): Promise<AiPathRuntimeAnalyticsSummary> => {
  const fromMs = window.from.getTime();
  const toMs = window.to.getTime();
  const cacheKey = buildSummaryCacheKey(fromMs, toMs, range);
  const now = Date.now();

  const cached = readCachedSummary(cacheKey, now);
  if (cached) return cached;

  const inFlight = summaryInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const availability = await getRuntimeAnalyticsAvailability();
  if (!availability.enabled || availability.storage !== 'redis') {
    return emptySummary(window.from, window.to, range);
  }

  const promise = (async (): Promise<AiPathRuntimeAnalyticsSummary> => {
    try {
      const redis = getRedisConnection();
      if (!redis) return emptySummary(window.from, window.to, range);

      const [
        total,
        queued,
        started,
        completed,
        failed,
        canceled,
        deadLettered,
        durations,
        nodesStarted,
        nodesCompleted,
        nodesFailed,
        nodesQueued,
        nodesRunning,
        nodesPolling,
        nodesCached,
        nodesWaitingCallback,
        brainAnalytics,
        brainLogs,
        brainWarning,
        brainError,
        traces,
      ] = await withTimeout(
        Promise.all([
          redis.zcount(keyRuns('all'), fromMs, toMs),
          redis.zcount(keyRuns('queued'), fromMs, toMs),
          redis.zcount(keyRuns('started'), fromMs, toMs),
          redis.zcount(keyRuns('completed'), fromMs, toMs),
          redis.zcount(keyRuns('failed'), fromMs, toMs),
          redis.zcount(keyRuns('canceled'), fromMs, toMs),
          redis.zcount(keyRuns('dead_lettered'), fromMs, toMs),
          redis.zrangebyscore(keyDurations(), fromMs, toMs),
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
          redis.zcount(keyBrain('warning'), fromMs, toMs),
          redis.zcount(keyBrain('error'), fromMs, toMs),
          loadRuntimeTraceAnalytics(window),
        ]),
        SUMMARY_QUERY_TIMEOUT_MS,
        'ai-paths runtime analytics redis query'
      );

      const parsedDurations = (durations as any[])
        .map(parseDurationMember)
        .filter((d): d is number => d !== null);
      parsedDurations.sort((a, b) => a - b);

      const avgDurationMs =
        parsedDurations.length > 0
          ? Math.round(parsedDurations.reduce((a, b) => a + b, 0) / parsedDurations.length)
          : null;
      const p95DurationMs =
        parsedDurations.length > 0
          ? (parsedDurations[Math.floor(parsedDurations.length * 0.95)] ?? null)
          : null;

      const successRate = total > 0 ? clampRate((completed / total) * 100) : 0;
      const failureRate = total > 0 ? clampRate((failed / total) * 100) : 0;
      const deadLetterRate = total > 0 ? clampRate((deadLettered / total) * 100) : 0;

      const summary: AiPathRuntimeAnalyticsSummary = {
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        range,
        storage: 'redis',
        runs: {
          total: total,
          queued: queued,
          started: started,
          completed: completed,
          failed: failed,
          canceled: canceled,
          deadLettered: deadLettered,
          successRate,
          failureRate,
          deadLetterRate,
          avgDurationMs,
          p95DurationMs,
        },
        nodes: {
          started: nodesStarted,
          completed: nodesCompleted,
          failed: nodesFailed,
          queued: nodesQueued,
          running: nodesRunning,
          polling: nodesPolling,
          cached: nodesCached,
          waitingCallback: nodesWaitingCallback,
        },
        brain: {
          analyticsReports: brainAnalytics,
          logReports: brainLogs,
          totalReports: brainAnalytics + brainLogs,
          warningReports: brainWarning,
          errorReports: brainError,
        },
        traces: traces as any,
        generatedAt: new Date().toISOString(),
      };

      setCachedSummary(cacheKey, summary, now);
      return summary;
    } catch (error) {
      const stale = readStaleSummary(cacheKey);
      if (stale) return stale;
      throw error;
    } finally {
      summaryInFlight.delete(cacheKey);
    }
  })();

  summaryInFlight.set(cacheKey, promise);
  return promise;
};
