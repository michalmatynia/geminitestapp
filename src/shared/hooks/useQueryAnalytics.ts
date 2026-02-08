 
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';

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

// Hook for query analytics and performance tracking
export function useQueryAnalytics(config: AnalyticsConfig = {}): {
  getMetrics: () => QueryMetrics[];
  getTopSlowQueries: (limit?: number) => QueryMetrics[];
  getErrorProneQueries: (limit?: number) => QueryMetrics[];
  getCacheStats: () => { total: number; cacheHits: number; cacheHitRate: number; avgExecutionTime: number; totalDataSize: number };
  clearMetrics: () => void;
} {
  const queryClient = useQueryClient();
  const metricsRef = useRef<Map<string, QueryMetrics>>(new Map());
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

  const recordMetric = useCallback((
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
  }, [enabled, shouldSample, getDataSize, maxEntries, config]);

  useEffect((): (() => void) | void => {
    if (!enabled) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event): void => {
      if (event.type === 'updated') {
        const query = event.query;
        const startTime = Date.now();
        
        // Track cache hits vs network requests
        const cacheHit = query.state.dataUpdatedAt > 0 && 
                         query.state.fetchStatus === 'idle';
        
        const executionTime = startTime - (query.state.dataUpdatedAt || startTime);
        const success = query.state.status === 'success';
        
        recordMetric(
          query.queryKey,
          executionTime,
          cacheHit,
          success,
          query.state.data
        );
      }
    });

    return unsubscribe;
  }, [queryClient, enabled, recordMetric]);

  const getMetrics = useCallback((): QueryMetrics[] => {
    return Array.from(metricsRef.current.values());
  }, []);

  const getTopSlowQueries = useCallback((limit: number = 10): QueryMetrics[] => {
    return getMetrics()
      .sort((a: QueryMetrics, b: QueryMetrics) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }, [getMetrics]);

  const getErrorProneQueries = useCallback((limit: number = 10): QueryMetrics[] => {
    return getMetrics()
      .filter((m: QueryMetrics) => m.errorCount > 0)
      .sort((a: QueryMetrics, b: QueryMetrics) => b.errorCount - a.errorCount)
      .slice(0, limit);
  }, [getMetrics]);

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
      avgExecutionTime: metrics.reduce((sum: number, m: QueryMetrics) => sum + m.executionTime, 0) / total || 0,
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
    enabled: process.env["NODE_ENV"] === 'development',
    sampleRate: 1,
  });

  const logPerformanceReport = useCallback((): void => {
    const stats = analytics.getCacheStats();
    const slowQueries = analytics.getTopSlowQueries(5);
    const errorQueries = analytics.getErrorProneQueries(5);

    console.group('🔍 Query Performance Report');
    console.log('📊 Cache Stats:', stats);
    console.log('🐌 Slowest Queries:', slowQueries);
    console.log('❌ Error-Prone Queries:', errorQueries);
    console.groupEnd();
  }, [analytics]);

  // Log report every 30 seconds in development
  useEffect((): (() => void) | void => {
    if (process.env["NODE_ENV"] !== 'development') return;

    const interval = setInterval(logPerformanceReport, 30000);
    return (): void => clearInterval(interval);
  }, [logPerformanceReport]);

  return analytics;
}
