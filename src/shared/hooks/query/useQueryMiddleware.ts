"use client";

import { useQueryClient, type Query } from "@tanstack/react-query";
import { useEffect } from "react";
import { logClientError } from "@/features/observability";

interface QueryMiddleware {
  name: string;
  onQueryStart?: (query: Query) => void;
  onQuerySuccess?: (query: Query, data: unknown) => void;
  onQueryError?: (query: Query, error: Error) => void;
  onQueryUpdate?: (query: Query) => void;
}

// Hook for query middleware system
export function useQueryMiddleware(middlewares: QueryMiddleware[]): void {
  const queryClient = useQueryClient();

  useEffect((): (() => void) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event): void => {
      const query = event.query;

      middlewares.forEach((middleware: QueryMiddleware): void => {
        try {
          switch (event.type) {
            case 'updated':
              if (query.state.fetchStatus === 'fetching') {
                middleware.onQueryStart?.(query);
              } else if (query.state.status === 'success') {
                middleware.onQuerySuccess?.(query, query.state.data);
              } else if (query.state.status === 'error') {
                middleware.onQueryError?.(query, query.state.error as Error);
              }
              middleware.onQueryUpdate?.(query);
              break;
          }
        } catch (error) {
          logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'QueryMiddleware', action: 'middlewareError', middlewareName: middleware.name } });
        }
      });
    });

    return (): void => unsubscribe();
  }, [queryClient, middlewares]);
}

// Logging middleware
export const loggingMiddleware: QueryMiddleware = {
  name: 'logging',


  onQueryError: (query: Query, error: Error): void => {
    const message = error?.message?.trim() || "";
    if (!message || ["{}", "[]", "[object Object]"].includes(message)) {
      return;
    }
    logClientError(error, { 
      context: { 
        source: "QueryMiddleware", 
        queryKey: query.queryKey,
        fetchStatus: query.state.fetchStatus
      } 
    });

  },
};

// Performance tracking middleware
export const performanceMiddleware: QueryMiddleware = {
  name: 'performance',
  onQueryStart: (query: Query): void => {
    if (typeof (query as any)._startTime !== 'number') {
      (query as any)._startTime = performance.now();
    }
  },
  onQuerySuccess: (query: Query): void => {
    const startTime = (query as any)._startTime;
    if (typeof startTime !== 'number') return;
    const duration = performance.now() - startTime;
    delete (query as any)._startTime;
    if (duration > 1000) { // Log slow queries
      logClientError(new Error(`Slow query: ${JSON.stringify(query.queryKey)}`), { context: { source: 'PerformanceMiddleware', queryKey: query.queryKey, durationMs: duration, level: 'warn' } });
    }
  },
  onQueryError: (query: Query): void => {
    if (typeof (query as any)._startTime === 'number') {
      delete (query as any)._startTime;
    }
  },
};

// Cache optimization middleware
export const cacheOptimizationMiddleware: QueryMiddleware = {
  name: 'cacheOptimization',
  onQuerySuccess: (query: Query, data: unknown): void => {
    // Automatically set longer stale time for large datasets
    if (Array.isArray(data) && data.length > 100) {
      if (typeof (query as any).setOptions === 'function') {
        (query as any).setOptions({
          staleTime: 10 * 60 * 1000, // 10 minutes for large datasets
        });
      }
    }
  },
};

// Error recovery middleware
export const errorRecoveryMiddleware: QueryMiddleware = {
  name: 'errorRecovery',
  onQueryError: (query: Query, error: Error): void => {
    // Auto-retry only genuine network errors after delay.
    // Avoid retrying application errors (e.g. 429/4xx) which can trigger rate-limit loops.
    const message = (error?.message ?? '').toLowerCase();
    const isNetworkError =
      error?.name === 'TypeError' ||
      message === 'failed to fetch' ||
      message.includes('networkerror') ||
      message.includes('network request failed');
    if (!isNetworkError) return;
    setTimeout((): void => {
      void query.fetch();
    }, 5000);
  },
};

// Data validation middleware
export const validationMiddleware: QueryMiddleware = {
  name: 'validation',
  onQuerySuccess: (query: Query, data: unknown): void => {
    // Basic data validation
    if (data === null || data === undefined) {
      logClientError(new Error(`Query returned null/undefined: ${JSON.stringify(query.queryKey)}`), { context: { source: 'ValidationMiddleware', queryKey: query.queryKey, level: 'warn' } });
    }
    

  },
};

// Security middleware
export const securityMiddleware: QueryMiddleware = {
  name: 'security',
  onQueryStart: (query: Query): void => {
    // Check for sensitive data in query keys
    const queryKeyStr = JSON.stringify(query.queryKey).toLowerCase();
    const sensitivePatterns = ['password', 'token', 'secret', 'key'];
    
    if (sensitivePatterns.some((pattern: string) => queryKeyStr.includes(pattern))) {
      logClientError(new Error(`Potential sensitive data in query key: ${JSON.stringify(query.queryKey)}`), { context: { source: 'SecurityMiddleware', queryKey: query.queryKey, level: 'warn' } });
    }
  },
  onQuerySuccess: (_query: Query, data: unknown): void => {
    // Sanitize sensitive data from logs
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      ['password', 'token', 'secret', 'apiKey'].forEach((key: string) => {
        if (key in sanitized) {
          (sanitized as any)[key] = '[REDACTED]';
        }
      });
    }
  },
};

// Default middleware stack
export const defaultMiddlewares: QueryMiddleware[] = [
  loggingMiddleware,
  performanceMiddleware,
  cacheOptimizationMiddleware,
  errorRecoveryMiddleware,
  validationMiddleware,
];

// Development middleware stack
export const developmentMiddlewares: QueryMiddleware[] = [
  ...defaultMiddlewares,
  securityMiddleware,
];

// Production middleware stack (minimal logging)
export const productionMiddlewares: QueryMiddleware[] = [
  performanceMiddleware,
  errorRecoveryMiddleware,
  validationMiddleware,
];
