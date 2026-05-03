import 'server-only';

import { randomUUID } from 'crypto';

import type {
  AiPathRuntimePortableEngineAnalytics,
  AiPathRuntimeAnalyticsRange,
  AiPathRuntimeAnalyticsSummary,
} from '@/shared/contracts/ai-paths';
import { getPortablePathRunExecutionSnapshot } from '@/shared/lib/ai-paths/portable-engine';
import {
  getRuntimeAnalyticsAvailability as getRuntimeAnalyticsAvailabilityShared,
  type RuntimeAnalyticsAvailability,
} from '@/shared/lib/ai-paths/services/runtime-analytics/availability';
import { keyBrain, keyTotals } from '@/shared/lib/ai-paths/services/runtime-analytics/config';
import {
  recordRuntimeNodeStatus as recordRuntimeNodeStatusShared,
  recordRuntimeRunFinished as recordRuntimeRunFinishedShared,
  recordRuntimeRunQueued as recordRuntimeRunQueuedShared,
  recordRuntimeRunStarted as recordRuntimeRunStartedShared,
} from '@/shared/lib/ai-paths/services/runtime-analytics/recording';
import {
  getRuntimeAnalyticsSummaryBase,
  resolveRuntimeAnalyticsRangeWindow,
} from '@/shared/lib/ai-paths/services/runtime-analytics/summary';
import { summarizeRuntimeTraceAnalytics } from '@/shared/lib/ai-paths/services/runtime-analytics/trace';
import {
  buildEventMember,
  clampRate,
  pruneBefore,
  toTimestampMs,
} from '@/shared/lib/ai-paths/services/runtime-analytics/utils';
import { getRedisConnection } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { RuntimeAnalyticsAvailability };
export { summarizeRuntimeTraceAnalytics };
export { resolveRuntimeAnalyticsRangeWindow };

export const getRuntimeAnalyticsAvailability = getRuntimeAnalyticsAvailabilityShared;

const toPortableEngineRates = (
  counts: Pick<
    AiPathRuntimePortableEngineAnalytics['totals'],
    'attempts' | 'successes' | 'failures'
  >
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
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Failed to read portable engine runtime analytics snapshot', {
      service: 'ai-paths-analytics',
      error,
    });
    return emptyPortableEngineAnalytics('unavailable');
  }
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
    void ErrorSystem.captureException(error);
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
  const summary = await getRuntimeAnalyticsSummaryBase(input);
  return {
    ...summary,
    portableEngine: buildPortableEngineAnalytics(),
  };
};
