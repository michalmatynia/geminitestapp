/* eslint-disable */
"use client";

import { useQueryClient, type Query } from "@tanstack/react-query";
import { useEffect } from "react";

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
          console.warn(`Middleware ${middleware.name} error:`, error);
        }
      });
    });

    return (): void => unsubscribe();
  }, [queryClient, middlewares]);
}

// Logging middleware
export const loggingMiddleware: QueryMiddleware = {
  name: 'logging',
  onQueryStart: (query: Query): void => {
    console.log(`🔄 Query started: ${JSON.stringify(query.queryKey)}`);
  },
  onQuerySuccess: (query: Query, data: unknown): void => {
    console.log(`✅ Query success: ${JSON.stringify(query.queryKey)}`, data);
  },
  onQueryError: (query: Query, error: Error): void => {
    console.error(`❌ Query error: ${JSON.stringify(query.queryKey)}`, error);
  },
};

// Performance tracking middleware
export const performanceMiddleware: QueryMiddleware = {
  name: 'performance',
  onQueryStart: (query: Query): void => {
    (query as any)._startTime = performance.now();
  },
  onQuerySuccess: (query: Query): void => {
    const duration = performance.now() - ((query as any)._startTime || 0);
    if (duration > 1000) { // Log slow queries
      console.warn(`🐌 Slow query (${duration.toFixed(0)}ms): ${JSON.stringify(query.queryKey)}`);
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
    // Auto-retry network errors after delay
    if (error.message.includes('fetch') || error.message.includes('network')) {
      setTimeout((): void => {
        void query.fetch();
      }, 5000);
    }
  },
};

// Data validation middleware
export const validationMiddleware: QueryMiddleware = {
  name: 'validation',
  onQuerySuccess: (query: Query, data: unknown): void => {
    // Basic data validation
    if (data === null || data === undefined) {
      console.warn(`⚠️ Query returned null/undefined: ${JSON.stringify(query.queryKey)}`);
    }
    
    if (Array.isArray(data) && data.length === 0) {
      console.info(`ℹ️ Query returned empty array: ${JSON.stringify(query.queryKey)}`);
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
      console.warn(`🔒 Potential sensitive data in query key: ${JSON.stringify(query.queryKey)}`);
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
