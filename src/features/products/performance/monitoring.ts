type PerformanceMetric = {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string> | undefined;
};

type CacheMetrics = {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memory: number;
};

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics: number = 1000;

  record(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      tags,
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  time<T>(name: string, fn: () => T, tags?: Record<string, string>): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.record(name, duration, tags);
    return result;
  }

  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.record(name, duration, tags);
    return result;
  }

  getMetrics(name?: string, timeWindow?: number): PerformanceMetric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter((m: PerformanceMetric) => m.name === name);
    }

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filtered = filtered.filter((m: PerformanceMetric) => m.timestamp > cutoff);
    }

    return filtered;
  }

  getStats(
    name: string,
    timeWindow: number = 300000
  ): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } {
    const metrics = this.getMetrics(name, timeWindow);

    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const values = metrics
      .map((m: PerformanceMetric) => m.value)
      .sort((a: number, b: number) => a - b);
    const sum = values.reduce((a: number, b: number) => a + b, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: values[0] ?? 0,
      max: values[values.length - 1] ?? 0,
      p95: values[Math.floor(values.length * 0.95)] ?? 0,
      p99: values[Math.floor(values.length * 0.99)] ?? 0,
    };
  }

  async getCacheMetrics(): Promise<CacheMetrics> {
    const { queryCache } = await import('./query-cache');
    const { imageOptimizer } = await import('./image-optimizer');

    const queryStats = queryCache.getStats();
    const imageStats = imageOptimizer.getCacheStats();

    // Calculate hit rates from recent metrics
    const cacheHits = this.getMetrics('cache.hit', 300000).length;
    const cacheMisses = this.getMetrics('cache.miss', 300000).length;
    const total = cacheHits + cacheMisses;

    return {
      hits: cacheHits,
      misses: cacheMisses,
      hitRate: total > 0 ? cacheHits / total : 0,
      size: queryStats.size + imageStats.entries,
      memory: queryStats.memory,
    };
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      avgQueryTime: number;
      avgImageOptTime: number;
      cacheHitRate: number;
      errorRate: number;
    };
    issues: string[];
  }> {
    const queryStats = this.getStats('db.query', 300000);
    const imageStats = this.getStats('image.optimize', 300000);
    const cacheMetrics = await this.getCacheMetrics();
    const errorCount = this.getMetrics('error', 300000).length;
    const totalRequests = this.getMetrics('request', 300000).length;

    const metrics = {
      avgQueryTime: queryStats.avg,
      avgImageOptTime: imageStats.avg,
      cacheHitRate: cacheMetrics.hitRate,
      errorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
    };

    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check query performance
    if (metrics.avgQueryTime > 1000) {
      status = 'degraded';
      issues.push(`Slow database queries: ${metrics.avgQueryTime.toFixed(0)}ms avg`);
    }

    // Check image optimization performance
    if (metrics.avgImageOptTime > 2000) {
      status = 'degraded';
      issues.push(`Slow image optimization: ${metrics.avgImageOptTime.toFixed(0)}ms avg`);
    }

    // Check cache hit rate
    if (metrics.cacheHitRate < 0.7) {
      status = 'degraded';
      issues.push(`Low cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    }

    // Check error rate
    if (metrics.errorRate > 0.05) {
      status = metrics.errorRate > 0.1 ? 'unhealthy' : 'degraded';
      issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    }

    return { status, metrics, issues };
  }

  clear(): void {
    this.metrics = [];
  }
}

// Performance decorators
export function withPerformanceTracking<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string,
  tags?: Record<string, string>
): T {
  const wrapped = (...args: Parameters<T>): unknown => {
    return performanceMonitor.time(name, () => fn(...args), tags);
  };
  return wrapped as T;
}

export function withAsyncPerformanceTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  name: string,
  tags?: Record<string, string>
): T {
  const wrapped = async (...args: Parameters<T>): Promise<unknown> => {
    return performanceMonitor.timeAsync(name, () => fn(...args), tags);
  };
  return wrapped as T;
}

// Global performance monitor
export const performanceMonitor: PerformanceMonitor = new PerformanceMonitor();

// Performance middleware for API routes
export function withPerformanceMiddleware(
  handler: (...args: unknown[]) => Promise<unknown>,
  name: string
): (...args: unknown[]) => Promise<unknown> {
  return async (req: unknown, res: unknown, ...args: unknown[]): Promise<unknown> => {
    const start = performance.now();

    try {
      const result = await handler(req, res, ...args);
      const duration = performance.now() - start;

      performanceMonitor.record('request', duration, {
        method: String((req as { method?: string })?.method || 'UNKNOWN'),
        endpoint: name,
        status: 'success',
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      performanceMonitor.record('request', duration, {
        method: String((req as { method?: string })?.method || 'UNKNOWN'),
        endpoint: name,
        status: 'error',
      });

      performanceMonitor.record('error', 1, {
        endpoint: name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  };
}
