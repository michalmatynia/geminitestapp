import { useQuery, type UseQueryResult, type UndefinedInitialDataOptions } from "@tanstack/react-query";
import { useState, useEffect } from "react";

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
    return filtered.reduce((sum: number, m: QueryPerformanceMetrics) => sum + m.fetchTime, 0) / filtered.length;
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
  const [metrics, setMetrics] = useState<QueryPerformanceMetrics[]>(performanceMonitor.getMetrics());

  useEffect((): () => void => {
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
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UndefinedInitialDataOptions<TData, Error, TData, unknown[]>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, Error> {
  const keyString = JSON.stringify(queryKey);

  return useQuery({
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
    ...options,
  } as UndefinedInitialDataOptions<TData, Error, TData, unknown[]>);
}
