import { useState, useEffect } from 'react';

import { createListQueryV2 } from '@/shared/lib/query-factories-v2';

import type { UndefinedInitialDataOptions, UseQueryResult } from '@tanstack/react-query';

interface QueryPerformanceMetrics {
  queryKey: string;
  fetchTime: number;
  cacheHit: boolean;
  dataSize: number;
  timestamp: number;
}

class QueryPerformanceMonitor {
  private metrics: QueryPerformanceMetrics[] = [];
  private maxMetrics: number = 100;

  addMetric(metric: QueryPerformanceMetrics): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getMetrics(): QueryPerformanceMetrics[] {
    return this.metrics;
  }

  getAverageTime(queryKey?: string): number {
    const filtered = queryKey
      ? this.metrics.filter((m: QueryPerformanceMetrics) => m.queryKey === queryKey)
      : this.metrics;

    if (filtered.length === 0) return 0;
    return (
      filtered.reduce((sum: number, m: QueryPerformanceMetrics) => sum + m.fetchTime, 0) /
      filtered.length
    );
  }

  getCacheHitRate(queryKey?: string): number {
    const filtered = queryKey
      ? this.metrics.filter((m: QueryPerformanceMetrics) => m.queryKey === queryKey)
      : this.metrics;

    if (filtered.length === 0) return 0;
    const hits = filtered.filter((m: QueryPerformanceMetrics) => m.cacheHit).length;
    return (hits / filtered.length) * 100;
  }
}

const performanceMonitor = new QueryPerformanceMonitor();

export interface QueryPerformanceHookResult {
  metrics: QueryPerformanceMetrics[];
  averageTime: number;
  cacheHitRate: number;
  getQueryStats: (queryKey: string) => { averageTime: number; cacheHitRate: number };
}

export function useQueryPerformance(): QueryPerformanceHookResult {
  const [metrics, setMetrics] = useState<QueryPerformanceMetrics[]>(
    performanceMonitor.getMetrics()
  );

  useEffect((): (() => void) => {
    const interval = setInterval((): void => {
      setMetrics([...performanceMonitor.getMetrics()]);
    }, 5000);

    return (): void => {
      clearInterval(interval);
    };
  }, []);

  return {
    metrics,
    averageTime: performanceMonitor.getAverageTime(),
    cacheHitRate: performanceMonitor.getCacheHitRate(),
    getQueryStats: (queryKey: string): { averageTime: number; cacheHitRate: number } => ({
      averageTime: performanceMonitor.getAverageTime(queryKey),
      cacheHitRate: performanceMonitor.getCacheHitRate(queryKey),
    }),
  };
}

// Enhanced query hook with performance monitoring
export function useQueryWithPerformance<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<
    UndefinedInitialDataOptions<TData, Error, TData, readonly unknown[]>,
    'queryKey' | 'queryFn' | 'meta'
  >
): UseQueryResult<TData, Error> {
  const keyString = JSON.stringify(queryKey);

  return createListQueryV2<TData, TData>({
    queryKey,
    queryFn: async (): Promise<TData> => {
      const startTime = Date.now();
      const data = await queryFn();
      const fetchTime = Date.now() - startTime;
      const dataSize = JSON.stringify(data).length;

      performanceMonitor.addMetric({
        queryKey: keyString,
        fetchTime,
        cacheHit: false, // In a real implementation, we'd check if data was from cache
        dataSize,
        timestamp: Date.now(),
      });

      return data;
    },
    meta: {
      source: 'shared.hooks.useQueryWithPerformance',
      operation: 'list',
      resource: 'query-performance',
      domain: 'global',
      tags: ['performance', 'query'],
      description: 'Loads query performance.'},
    ...options,
  });
}
