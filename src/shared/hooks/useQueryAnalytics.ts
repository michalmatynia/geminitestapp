'use client';

import { useQueryClient, type Query } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface QueryMetrics {
  queryKey: string;
  executionTime: number;
  cacheHit: boolean;
  errorCount: number;
  successCount: number;
  lastExecuted: number;
  dataSize: number;
}

interface AnalyticsConfig {
  enabled?: boolean;
  sampleRate?: number; // 0-1, percentage of queries to track
  maxEntries?: number;
  onMetric?: (metric: QueryMetrics) => void;
}

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseEnvBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const QUERY_PERF_REPORT_INTERVAL_MS = parseEnvNumber(
  process.env['NEXT_PUBLIC_QUERY_PERF_REPORT_INTERVAL_MS'],
  30_000
);
const QUERY_PERF_REPORT_SLOW_THRESHOLD_MS = parseEnvNumber(
  process.env['NEXT_PUBLIC_QUERY_PERF_REPORT_SLOW_THRESHOLD_MS'],
  2_000
);
const QUERY_PERF_REPORT_TO_SERVER = parseEnvBoolean(
  process.env['NEXT_PUBLIC_QUERY_PERF_REPORT_TO_SERVER'],
  false
);
const QUERY_PERF_REPORT_TO_CONSOLE = parseEnvBoolean(
  process.env['NEXT_PUBLIC_QUERY_PERF_REPORT_TO_CONSOLE'],
  true
);

// Hook for query analytics and performance tracking
export function useQueryAnalytics(config: AnalyticsConfig = {}): {
  getMetrics: () => QueryMetrics[];
  getTopSlowQueries: (limit?: number) => QueryMetrics[];
  getErrorProneQueries: (limit?: number) => QueryMetrics[];
  getCacheStats: () => {
    total: number;
    cacheHits: number;
    cacheHitRate: number;
    avgExecutionTime: number;
    totalDataSize: number;
  };
  clearMetrics: () => void;
} {
  const queryClient = useQueryClient();
  const metricsRef = useRef<Map<string, QueryMetrics>>(new Map());
  const fetchStartedAtRef = useRef<
    WeakMap<Query<unknown, unknown, unknown, readonly unknown[]>, number>
  >(new WeakMap());
  const handledDataUpdatedAtRef = useRef<
    WeakMap<Query<unknown, unknown, unknown, readonly unknown[]>, number>
  >(new WeakMap());
  const handledErrorUpdatedAtRef = useRef<
    WeakMap<Query<unknown, unknown, unknown, readonly unknown[]>, number>
  >(new WeakMap());
  const enabled = config.enabled !== false;
  const sampleRate = config.sampleRate || 1;
  const maxEntries = config.maxEntries || 1000;

  const shouldSample = useCallback((): boolean => {
    return Math.random() < sampleRate;
  }, [sampleRate]);

  const getDataSize = useCallback((data: unknown): number => {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }, []);

  const recordMetric = useCallback(
    (
      queryKey: readonly unknown[],
      executionTime: number,
      cacheHit: boolean,
      success: boolean,
      data?: unknown
    ): void => {
      if (!enabled || !shouldSample()) return;

      const key = JSON.stringify(queryKey);
      const existing = metricsRef.current.get(key) || {
        queryKey: key,
        executionTime: 0,
        cacheHit: false,
        errorCount: 0,
        successCount: 0,
        lastExecuted: 0,
        dataSize: 0,
      };

      const updated: QueryMetrics = {
        ...existing,
        executionTime: (existing.executionTime + executionTime) / 2, // Moving average
        cacheHit: cacheHit || existing.cacheHit,
        errorCount: success ? existing.errorCount : existing.errorCount + 1,
        successCount: success ? existing.successCount + 1 : existing.successCount,
        lastExecuted: Date.now(),
        dataSize: data ? getDataSize(data) : existing.dataSize,
      };

      metricsRef.current.set(key, updated);

      // Limit entries
      if (metricsRef.current.size > maxEntries) {
        const oldestKey = Array.from(metricsRef.current.keys())[0];
        if (oldestKey) metricsRef.current.delete(oldestKey);
      }

      config.onMetric?.(updated);
    },
    [config, enabled, getDataSize, maxEntries, shouldSample]
  );

  useEffect((): (() => void) | void => {
    if (!enabled) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event): void => {
      if (event.type !== 'updated') return;
      const query = event.query as Query<unknown, unknown, unknown, readonly unknown[]>;

      if (query.state.fetchStatus === 'fetching') {
        if (!fetchStartedAtRef.current.has(query)) {
          fetchStartedAtRef.current.set(query, Date.now());
        }
        return;
      }

      if (query.state.status === 'success') {
        const dataUpdatedAt = query.state.dataUpdatedAt ?? 0;
        if (dataUpdatedAt <= 0) return;
        if (handledDataUpdatedAtRef.current.get(query) === dataUpdatedAt) return;
        handledDataUpdatedAtRef.current.set(query, dataUpdatedAt);

        const startedAt = fetchStartedAtRef.current.get(query);
        const hadTrackedFetch = typeof startedAt === 'number';
        if (hadTrackedFetch) {
          fetchStartedAtRef.current.delete(query);
        }

        recordMetric(
          query.queryKey,
          hadTrackedFetch ? Math.max(0, Date.now() - startedAt) : 0,
          !hadTrackedFetch,
          true,
          query.state.data
        );
        return;
      }

      if (query.state.status === 'error') {
        const errorUpdatedAt = query.state.errorUpdatedAt ?? 0;
        if (
          errorUpdatedAt > 0 &&
          handledErrorUpdatedAtRef.current.get(query) === errorUpdatedAt &&
          !fetchStartedAtRef.current.has(query)
        ) {
          return;
        }
        if (errorUpdatedAt > 0) {
          handledErrorUpdatedAtRef.current.set(query, errorUpdatedAt);
        }

        const startedAt = fetchStartedAtRef.current.get(query);
        const hadTrackedFetch = typeof startedAt === 'number';
        if (hadTrackedFetch) {
          fetchStartedAtRef.current.delete(query);
        }

        recordMetric(
          query.queryKey,
          hadTrackedFetch ? Math.max(0, Date.now() - startedAt) : 0,
          false,
          false
        );
      }
    });

    return unsubscribe;
  }, [enabled, queryClient, recordMetric]);

  const getMetrics = useCallback((): QueryMetrics[] => {
    return Array.from(metricsRef.current.values());
  }, []);

  const getTopSlowQueries = useCallback(
    (limit: number = 10): QueryMetrics[] => {
      return getMetrics()
        .sort((a: QueryMetrics, b: QueryMetrics) => b.executionTime - a.executionTime)
        .slice(0, limit);
    },
    [getMetrics]
  );

  const getErrorProneQueries = useCallback(
    (limit: number = 10): QueryMetrics[] => {
      return getMetrics()
        .filter((m: QueryMetrics) => m.errorCount > 0)
        .sort((a: QueryMetrics, b: QueryMetrics) => b.errorCount - a.errorCount)
        .slice(0, limit);
    },
    [getMetrics]
  );

  const getCacheStats = useCallback((): {
    total: number;
    cacheHits: number;
    cacheHitRate: number;
    avgExecutionTime: number;
    totalDataSize: number;
  } => {
    const metrics = getMetrics();
    const total = metrics.length;
    const cacheHits = metrics.filter((m: QueryMetrics) => m.cacheHit).length;

    return {
      total,
      cacheHits,
      cacheHitRate: total > 0 ? cacheHits / total : 0,
      avgExecutionTime:
        metrics.reduce((sum: number, m: QueryMetrics) => sum + m.executionTime, 0) / total || 0,
      totalDataSize: metrics.reduce((sum: number, m: QueryMetrics) => sum + m.dataSize, 0),
    };
  }, [getMetrics]);

  const clearMetrics = useCallback((): void => {
    metricsRef.current.clear();
  }, []);

  return {
    getMetrics,
    getTopSlowQueries,
    getErrorProneQueries,
    getCacheStats,
    clearMetrics,
  };
}

// Hook for real-time performance monitoring
export function usePerformanceMonitor(): ReturnType<typeof useQueryAnalytics> {
  const analytics = useQueryAnalytics({
    enabled: process.env['NODE_ENV'] === 'development',
    sampleRate: 1,
  });

  const logPerformanceReport = useCallback((): void => {
    const stats = analytics.getCacheStats();
    const slowQueries = analytics
      .getTopSlowQueries(5)
      .filter(
        (metric: QueryMetrics): boolean =>
          metric.executionTime >= QUERY_PERF_REPORT_SLOW_THRESHOLD_MS
      )
      .map((metric: QueryMetrics) => ({
        queryKey: metric.queryKey,
        avgExecutionTimeMs: Math.round(metric.executionTime),
        successCount: metric.successCount,
        errorCount: metric.errorCount,
      }));
    const errorQueries = analytics.getErrorProneQueries(5).map((metric: QueryMetrics) => ({
      queryKey: metric.queryKey,
      avgExecutionTimeMs: Math.round(metric.executionTime),
      successCount: metric.successCount,
      errorCount: metric.errorCount,
    }));
    if (slowQueries.length === 0 && errorQueries.length === 0) return;

    const report = {
      source: 'useQueryAnalytics',
      stats: {
        ...stats,
        avgExecutionTime: Math.round(stats.avgExecutionTime),
      },
      slowQueries,
      errorQueries,
    };
    if (process.env['NODE_ENV'] === 'development' && QUERY_PERF_REPORT_TO_CONSOLE) {
      console.info('[query-performance]', report);
    }
    if (!QUERY_PERF_REPORT_TO_SERVER) return;

    logClientError('Query Performance Report', {
      context: {
        ...report,
        level: 'info',
      },
    });
  }, [analytics]);

  // Log report every 30 seconds in development
  useEffect((): (() => void) | void => {
    if (process.env['NODE_ENV'] !== 'development') return;

    const interval = setInterval(logPerformanceReport, QUERY_PERF_REPORT_INTERVAL_MS);
    return (): void => clearInterval(interval);
  }, [logPerformanceReport]);

  return analytics;
}
