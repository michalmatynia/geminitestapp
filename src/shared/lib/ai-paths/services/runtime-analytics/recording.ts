import 'server-only';

import type { Redis } from 'ioredis';

import { getRedisConnection } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { keyRuns, keyTotals, keyDurations, keyNodes, keyBrain } from './config';
import {
  toTimestampMs,
  pruneBefore,
  buildEventMember,
  buildDurationMember,
  resolveRuntimeAnalyticsNodeStatusKey,
} from './utils';

const isRedisReady = (redis: ReturnType<typeof getRedisConnection>): redis is Redis =>
  Boolean(redis && redis.status === 'ready');

export const recordRuntimeRunQueued = async (input: {
  runId: string;
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = getRedisConnection();
    if (!isRedisReady(redis) || !input.runId) return;
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
    void ErrorSystem.captureException(error);
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
    if (!isRedisReady(redis) || !input.runId) return;
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
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Failed to record run started analytics', {
      service: 'ai-paths-analytics',
      error,
      runId: input.runId,
    });
  }
};

const recordRuntimeRunStatusMetric = async (input: {
  runId: string;
  status: 'blocked_on_lease' | 'handoff_ready';
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = getRedisConnection();
    if (!isRedisReady(redis) || !input.runId) return;
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
    await multi.exec();
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Failed to record run status analytics', {
      service: 'ai-paths-analytics',
      error,
      runId: input.runId,
      status: input.status,
    });
  }
};

export const recordRuntimeRunBlockedOnLease = async (input: {
  runId: string;
  timestamp?: Date | string | number | null;
}): Promise<void> =>
  recordRuntimeRunStatusMetric({
    ...input,
    status: 'blocked_on_lease',
  });

export const recordRuntimeRunHandoffReady = async (input: {
  runId: string;
  timestamp?: Date | string | number | null;
}): Promise<void> =>
  recordRuntimeRunStatusMetric({
    ...input,
    status: 'handoff_ready',
  });

export const recordRuntimeRunFinished = async (input: {
  runId: string;
  status: 'completed' | 'failed' | 'canceled' | 'dead_lettered';
  durationMs?: number | null;
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = getRedisConnection();
    if (!isRedisReady(redis) || !input.runId) return;
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
    void ErrorSystem.captureException(error);
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
    if (!isRedisReady(redis) || !input.runId || !input.nodeId) return;
    const statusKey = resolveRuntimeAnalyticsNodeStatusKey(input.status);
    if (!statusKey) return;

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
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Failed to record node status analytics', {
      service: 'ai-paths-analytics',
      error,
      runId: input.runId,
      nodeId: input.nodeId,
    });
  }
};

export const recordBrainInsightAnalytics = async (input: {
  type: 'analytics' | 'logs' | 'generation';
  status: 'success' | 'error' | 'warning';
  metadata?: Record<string, unknown>;
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = getRedisConnection();
    if (!redis) return;
    const timestampMs = toTimestampMs(input.timestamp);
    const pruneTo = pruneBefore(timestampMs);
    const multi = redis.multi();
    const eventType = `brain_${input.type}_${input.status}`;
    const member = buildEventMember(eventType, JSON.stringify(input.metadata ?? {}), timestampMs);

    multi.zadd(keyBrain('all'), String(timestampMs), member);
    multi.zremrangebyscore(keyBrain('all'), 0, pruneTo);

    if (input.type === 'analytics') {
      multi.zadd(keyBrain('analytics'), String(timestampMs), member);
      multi.zremrangebyscore(keyBrain('analytics'), 0, pruneTo);
    } else if (input.type === 'logs') {
      multi.zadd(keyBrain('logs'), String(timestampMs), member);
      multi.zremrangebyscore(keyBrain('logs'), 0, pruneTo);
    }

    if (input.status === 'warning') {
      multi.zadd(keyBrain('warning'), String(timestampMs), member);
      multi.zremrangebyscore(keyBrain('warning'), 0, pruneTo);
    } else if (input.status === 'error') {
      multi.zadd(keyBrain('error'), String(timestampMs), member);
      multi.zremrangebyscore(keyBrain('error'), 0, pruneTo);
    }

    multi.hincrby(keyTotals(), `brain_${input.type}_${input.status}`, 1);
    await multi.exec();
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Failed to record Brain insight analytics', {
      service: 'ai-paths-analytics',
      error,
    });
  }
};
