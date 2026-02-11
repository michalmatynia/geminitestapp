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

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isEnabled = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

const SLOW_QUERY_THRESHOLD_MS = parseEnvNumber(
  process.env["NEXT_PUBLIC_QUERY_SLOW_THRESHOLD_MS"],
  process.env["NODE_ENV"] === "production" ? 2000 : 5000
);
const SLOW_QUERY_COOLDOWN_MS = parseEnvNumber(
  process.env["NEXT_PUBLIC_QUERY_SLOW_COOLDOWN_MS"],
  60_000
);
const QUERY_WARNING_COOLDOWN_MS = parseEnvNumber(
  process.env["NEXT_PUBLIC_QUERY_WARNING_COOLDOWN_MS"],
  60_000
);
const REPORT_SLOW_QUERIES = isEnabled(
  process.env["NEXT_PUBLIC_QUERY_SLOW_REPORTING_ENABLED"],
  process.env["NODE_ENV"] === "production"
);
const REPORT_QUERY_WARNINGS = isEnabled(
  process.env["NEXT_PUBLIC_QUERY_WARNING_REPORTING_ENABLED"],
  process.env["NODE_ENV"] === "production"
);

const queryStartTimes = new WeakMap<Query, number>();
const slowQueryLastReportedAt = new Map<string, number>();
const queryWarningLastReportedAt = new Map<string, number>();

const getQueryKeyLabel = (query: Query): string => {
  try {
    return JSON.stringify(query.queryKey);
  } catch {
    return String((query as { queryHash?: string }).queryHash ?? "unknown-query");
  }
};

const shouldReportWithCooldown = (
  bucket: Map<string, number>,
  key: string,
  cooldownMs: number
): boolean => {
  const now = Date.now();
  const lastReportedAt = bucket.get(key);
  if (typeof lastReportedAt === "number" && now - lastReportedAt < cooldownMs) {
    return false;
  }
  bucket.set(key, now);
  return true;
};

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
    if (!queryStartTimes.has(query)) {
      queryStartTimes.set(query, performance.now());
    }
  },
  onQuerySuccess: (query: Query): void => {
    const startTime = queryStartTimes.get(query);
    if (typeof startTime !== 'number') return;
    const duration = performance.now() - startTime;
    queryStartTimes.delete(query);
    if (!REPORT_SLOW_QUERIES) return;
    if (duration <= SLOW_QUERY_THRESHOLD_MS) return;
    const queryLabel = getQueryKeyLabel(query);
    if (!shouldReportWithCooldown(slowQueryLastReportedAt, queryLabel, SLOW_QUERY_COOLDOWN_MS)) return;
    logClientError(`Slow query: ${queryLabel}`, {
      context: {
        source: 'PerformanceMiddleware',
        queryKey: query.queryKey,
        durationMs: duration,
        thresholdMs: SLOW_QUERY_THRESHOLD_MS,
        cooldownMs: SLOW_QUERY_COOLDOWN_MS,
        level: 'warn',
      },
    });
  },
  onQueryError: (query: Query): void => {
    queryStartTimes.delete(query);
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
      if (!REPORT_QUERY_WARNINGS) return;
      const queryLabel = getQueryKeyLabel(query);
      const warningKey = `validation:null-data:${queryLabel}`;
      if (!shouldReportWithCooldown(queryWarningLastReportedAt, warningKey, QUERY_WARNING_COOLDOWN_MS)) return;
      logClientError(`Query returned null/undefined: ${queryLabel}`, {
        context: {
          source: 'ValidationMiddleware',
          queryKey: query.queryKey,
          cooldownMs: QUERY_WARNING_COOLDOWN_MS,
          level: 'warn',
        },
      });
    }
    

  },
};

// Security middleware
export const securityMiddleware: QueryMiddleware = {
  name: 'security',
  onQueryStart: (query: Query): void => {
    // Check for sensitive data in query keys
    if (!REPORT_QUERY_WARNINGS) return;
    const queryLabel = getQueryKeyLabel(query);
    const queryKeyStr = queryLabel.toLowerCase();
    const sensitivePatterns = ['password', 'token', 'secret', 'key'];

    const matchedPattern = sensitivePatterns.find((pattern: string) => queryKeyStr.includes(pattern));
    if (matchedPattern) {
      const warningKey = `security:sensitive-query-key:${queryLabel}`;
      if (!shouldReportWithCooldown(queryWarningLastReportedAt, warningKey, QUERY_WARNING_COOLDOWN_MS)) return;
      logClientError(`Potential sensitive data in query key: ${queryLabel}`, {
        context: {
          source: 'SecurityMiddleware',
          queryKey: query.queryKey,
          matchedPattern,
          cooldownMs: QUERY_WARNING_COOLDOWN_MS,
          level: 'warn',
        },
      });
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
