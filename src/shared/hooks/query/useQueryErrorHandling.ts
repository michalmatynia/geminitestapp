'use client';

import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { ERROR_CATEGORY } from '@/shared/contracts/observability';
import { classifyError } from '@/shared/errors/error-classifier';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import type { TanstackFactoryDomain } from '@/shared/lib/tanstack-factory-v2.types';
import { useToast } from '@/shared/ui/primitives.public';
import {
  logClientCatch,
  logClientError,
  isLoggableObject,
} from '@/shared/utils/observability/client-error-logger';
import { getTraceId } from '@/shared/utils/observability/trace';

interface LoggableWithErrorFlag {
  __logged?: boolean;
}

interface ErrorHandlingConfig {
  showToast?: boolean;
  logErrors?: boolean;
  retryOnError?: boolean;
  retryDelayMs?: number;
  maxAutoRetriesPerQuery?: number;
  toastDedupeWindowMs?: number;
  onError?: (error: Error, queryKey: unknown[]) => void;
}

const NOISE_MESSAGES = new Set(['{}', '[]', '[object Object]']);
const DEFAULT_TOAST_DEDUPE_WINDOW_MS = 20_000;
const DEFAULT_AUTO_RETRY_DELAY_MS = 5_000;
const DEFAULT_MAX_AUTO_RETRIES_PER_QUERY = 1;

const isMeaningfulMessage = (message: string): boolean => {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (NOISE_MESSAGES.has(trimmed)) return false;
  return true;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message?.trim() || '';
  if (typeof error === 'string') return error.trim();
  if (error && typeof error === 'object') {
    const entries = Object.entries(error as Record<string, unknown>).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      return true;
    });
    if (entries.length > 0) {
      return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
    }
  }
  return '';
};

const shouldLogError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof Error) return isMeaningfulMessage(error.message || '');
  if (typeof error === 'object') {
    const entries = Object.entries(error as Record<string, unknown>).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      return true;
    });
    return entries.length > 0;
  }
  return true;
};

const isEmptyError = (error: unknown): boolean => {
  if (!error) return true;
  if (error instanceof Error) return !isMeaningfulMessage(error.message || '');
  if (typeof error === 'object') {
    return Object.keys(error as Record<string, unknown>).length === 0;
  }
  return false;
};

const hasMeaningfulError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof Error) return isMeaningfulMessage(error.message || '');
  if (typeof error === 'string') return isMeaningfulMessage(error);
  if (typeof error === 'object') {
    return shouldLogError(error);
  }
  return true;
};

const getLoggableError = (error: unknown): unknown => {
  if (!error) return undefined;
  if (error instanceof Error) {
    return isMeaningfulMessage(error.message || '') ? error : undefined;
  }
  if (typeof error === 'string') {
    return isMeaningfulMessage(error) ? error : undefined;
  }
  if (typeof error === 'object') {
    const keys = Object.keys(error as Record<string, unknown>);
    return keys.length > 0 ? error : undefined;
  }
  return undefined;
};

const toQueryKeySignature = (queryKey: unknown[]): string => {
  try {
    return JSON.stringify(queryKey);
  } catch (error) {
    logClientCatch(error, {
      source: 'useQueryErrorHandling',
      action: 'toQueryKeySignature',
      queryKeyLength: queryKey.length,
    });
    return String(queryKey);
  }
};

const pruneErrorToastSignatures = (
  signatures: Map<string, number>,
  nowMs: number,
  dedupeWindowMs: number
): void => {
  const maxAgeMs = Math.max(dedupeWindowMs * 3, dedupeWindowMs + 1);
  signatures.forEach((lastShownAt: number, signature: string): void => {
    if (nowMs - lastShownAt > maxAgeMs) {
      signatures.delete(signature);
    }
  });
};

export const buildQueryErrorSignature = (queryKey: unknown[], message: string): string =>
  `${toQueryKeySignature(queryKey)}::${message.trim().toLowerCase()}`;

export const buildErrorToastSignature = (
  queryKey: unknown[],
  message: string,
  error?: unknown
): string => {
  const normalizedMessage = message.trim().toLowerCase();
  if (!normalizedMessage) {
    return buildQueryErrorSignature(queryKey, message);
  }

  const category = classifyError(error ?? message);
  if (category === ERROR_CATEGORY.AUTH) {
    return `${ERROR_CATEGORY.AUTH}::${normalizedMessage}`;
  }

  return buildQueryErrorSignature(queryKey, message);
};

export const shouldEmitDedupedErrorToast = (args: {
  signature: string;
  dedupeWindowMs: number;
  nowMs: number;
  lastShownAtBySignature: Map<string, number>;
}): boolean => {
  const { signature, dedupeWindowMs, nowMs, lastShownAtBySignature } = args;
  const normalizedWindowMs = Math.max(0, dedupeWindowMs);
  if (normalizedWindowMs === 0) {
    lastShownAtBySignature.set(signature, nowMs);
    return true;
  }

  pruneErrorToastSignatures(lastShownAtBySignature, nowMs, normalizedWindowMs);
  const lastShownAt = lastShownAtBySignature.get(signature);
  if (typeof lastShownAt === 'number' && nowMs - lastShownAt < normalizedWindowMs) {
    return false;
  }
  lastShownAtBySignature.set(signature, nowMs);
  return true;
};

// Global error handler for queries
export function useGlobalQueryErrorHandler(config: ErrorHandlingConfig = {}): void {
  const queryClient = useQueryClient();
  const errorToastSignaturesRef = useRef<Map<string, number>>(new Map());
  const autoRetryCountByQueryRef = useRef<Map<string, number>>(new Map());
  const autoRetryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = config.showToast ?? false;
  const logErrors = config.logErrors !== false;
  const retryOnError = config.retryOnError ?? false;
  const retryDelayMs = config.retryDelayMs ?? DEFAULT_AUTO_RETRY_DELAY_MS;
  const maxAutoRetriesPerQuery =
    config.maxAutoRetriesPerQuery ?? DEFAULT_MAX_AUTO_RETRIES_PER_QUERY;
  const toastDedupeWindowMs = config.toastDedupeWindowMs ?? DEFAULT_TOAST_DEDUPE_WINDOW_MS;
  const onError = config.onError;

  // Only use toast on client side
  const toast = typeof window !== 'undefined' ? useToast().toast : null;

  useEffect((): (() => void) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event): void => {
      if (event.type !== 'updated') return;
      const queryKey = event.query.queryKey as unknown[];
      const queryKeySignature = toQueryKeySignature(queryKey);

      if (event.query.state.status === 'success') {
        autoRetryCountByQueryRef.current.delete(queryKeySignature);
        const retryTimer = autoRetryTimersRef.current.get(queryKeySignature);
        if (retryTimer !== undefined) {
          clearTimeout(retryTimer);
          autoRetryTimersRef.current.delete(queryKeySignature);
        }
        return;
      }

      if (event.query.state.status === 'error') {
        const error = event.query.state.error as unknown;

        if (
          !error ||
          (typeof error === 'object' &&
            !Array.isArray(error) &&
            Object.keys(error as Record<string, unknown>).length === 0)
        ) {
          return;
        }

        // Log error
        const message = getErrorMessage(error);
        if (!isMeaningfulMessage(message)) {
          return;
        }
        const isErrorLike =
          error instanceof Error ||
          typeof error === 'string' ||
          (error &&
            typeof error === 'object' &&
            typeof (error as { message?: unknown }).message === 'string' &&
            Boolean((error as { message?: string }).message?.trim()));
        if (!message || !isErrorLike || !hasMeaningfulError(error) || isEmptyError(error)) {
          return;
        }
        if (
          logErrors &&
          shouldLogError(error) &&
          message &&
          !(isLoggableObject(error) && (error as LoggableWithErrorFlag).__logged)
        ) {
          const logPayload: Record<string, unknown> = { message, queryKey, traceId: getTraceId() };
          const loggableError = getLoggableError(error);
          if (loggableError !== undefined) {
            logPayload['error'] = loggableError;
          }
          logClientError(loggableError || message, { context: logPayload });

          // Mark as logged
          if (isLoggableObject(error)) {
            try {
              (error as LoggableWithErrorFlag).__logged = true;
            } catch (markLoggedError) {
              logClientCatch(markLoggedError, {
                source: 'useQueryErrorHandling',
                action: 'markErrorLogged',
              });

              // ignore
            }
          }
        }

        // Show toast notification
        if (showToast && toast) {
          const shouldShowToast = shouldEmitDedupedErrorToast({
            signature: buildErrorToastSignature(queryKey, message, error),
            dedupeWindowMs: toastDedupeWindowMs,
            nowMs: Date.now(),
            lastShownAtBySignature: errorToastSignaturesRef.current,
          });
          if (shouldShowToast) {
            toast(message, {
              variant: 'error',
              error: isErrorLike ? error : new Error(message),
            });
          }
        }

        // Custom error handler
        onError?.(error instanceof Error ? error : new Error(message), queryKey);

        // Optional additional retry hook for stubborn transient network errors.
        // React Query already retries by default; keep this capped to avoid loops.
        if (retryOnError && isNetworkError(error instanceof Error ? error : new Error(message))) {
          const retriesPerformed = autoRetryCountByQueryRef.current.get(queryKeySignature) ?? 0;
          if (retriesPerformed >= Math.max(0, maxAutoRetriesPerQuery)) {
            return;
          }
          autoRetryCountByQueryRef.current.set(queryKeySignature, retriesPerformed + 1);
          const existingRetryTimer = autoRetryTimersRef.current.get(queryKeySignature);
          if (existingRetryTimer !== undefined) {
            clearTimeout(existingRetryTimer);
          }
          const retryTimer = setTimeout((): void => {
            clearTimeout(retryTimer);
            autoRetryTimersRef.current.delete(queryKeySignature);
            void queryClient.invalidateQueries({ queryKey });
          }, Math.max(0, retryDelayMs));
          autoRetryTimersRef.current.set(queryKeySignature, retryTimer);
        }
      }
    });

    return (): void => {
      unsubscribe();
      autoRetryTimersRef.current.forEach((timerId: ReturnType<typeof setTimeout>): void => {
        clearTimeout(timerId);
      });
      autoRetryTimersRef.current.clear();
    };
  }, [
    logErrors,
    maxAutoRetriesPerQuery,
    onError,
    queryClient,
    retryDelayMs,
    retryOnError,
    showToast,
    toast,
    toastDedupeWindowMs,
  ]);
}

// Enhanced query hook with error recovery
export function useResilientQuery<TData>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: {
    fallbackData?: TData;
    maxRetries?: number;
    retryDelay?: number;
    onError?: (error: Error) => void;
    domain?: TanstackFactoryDomain;
  }
): UseQueryResult<TData, Error> {
  const toast = typeof window !== 'undefined' ? useToast().toast : null;
  const domain = options?.domain ?? 'global';

  const query = createListQueryV2<unknown, TData>({
    queryKey,
    queryFn,
    retry: (failureCount: number, error: Error): boolean => {
      const maxRetries = options?.maxRetries || 3;

      // Don't retry on client errors (4xx)
      if (isClientError(error)) return false;

      return failureCount < maxRetries;
    },
    retryDelay: (attemptIndex: number): number => {
      const baseDelay = options?.retryDelay || 1000;
      return Math.min(baseDelay * Math.pow(2, attemptIndex), 30000);
    },
    placeholderData: options?.fallbackData as TData extends Function ? never : TData,
    meta: {
      source: 'shared.hooks.query.useResilientQuery',
      operation: 'list',
      resource: 'resilient-query',
      domain,
      tags: ['error-handling', 'resilient'],
      description: 'Loads resilient query.'},
  });

  useEffect((): void => {
    if (query.isError) {
      logClientError(query.error, { context: { queryKey } });
      if (toast) {
        toast(query.error.message, { variant: 'error', error: query.error });
      }
      options?.onError?.(query.error);
    }
  }, [query.isError, query.error, queryKey, toast, options]);

  return query;
}

// Circuit breaker pattern for queries
export function useCircuitBreakerQuery<TData>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: {
    failureThreshold?: number;
    resetTimeout?: number;
    fallbackData?: TData;
    domain?: TanstackFactoryDomain;
  }
): UseQueryResult<TData, Error> {
  const failureThreshold = options?.failureThreshold || 5;
  const resetTimeout = options?.resetTimeout || 60000; // 1 minute
  const domain = options?.domain ?? 'global';

  const circuitKey = `circuit-${JSON.stringify(queryKey)}`;

  const getCircuitState = useCallback((): {
    failures: number;
    isOpen: boolean;
    lastFailure: number;
  } => {
    const stored = localStorage.getItem(circuitKey);
    if (!stored) return { failures: 0, isOpen: false, lastFailure: 0 };
    return JSON.parse(stored) as { failures: number; isOpen: boolean; lastFailure: number };
  }, [circuitKey]);

  const updateCircuitState = useCallback(
    (state: { failures: number; isOpen: boolean; lastFailure: number }): void => {
      localStorage.setItem(circuitKey, JSON.stringify(state));
    },
    [circuitKey]
  );

  return createListQueryV2<unknown, TData>({
    queryKey,
    queryFn: async (): Promise<TData> => {
      const circuit = getCircuitState();

      // Check if circuit is open and should reset
      if (circuit.isOpen && Date.now() - circuit.lastFailure > resetTimeout) {
        updateCircuitState({ failures: 0, isOpen: false, lastFailure: 0 });
      }

      // If circuit is open, return fallback or throw
      if (circuit.isOpen) {
        if (options?.fallbackData !== undefined) {
          return options.fallbackData;
        }
        throw new Error('Circuit breaker is open');
      }

      try {
        const result = await queryFn();
        // Reset on success
        if (circuit.failures > 0) {
          updateCircuitState({ failures: 0, isOpen: false, lastFailure: 0 });
        }
        return result;
      } catch (error) {
        logClientCatch(error, {
          source: 'useQueryErrorHandling',
          action: 'useCircuitBreakerQuery.queryFn',
          queryKey,
        });
        const newFailures = circuit.failures + 1;
        const shouldOpen = newFailures >= failureThreshold;

        updateCircuitState({
          failures: newFailures,
          isOpen: shouldOpen,
          lastFailure: Date.now(),
        });

        throw error;
      }
    },
    retry: false, // Circuit breaker handles retries
    meta: {
      source: 'shared.hooks.query.useCircuitBreakerQuery',
      operation: 'list',
      resource: 'circuit-breaker-query',
      domain,
      tags: ['error-handling', 'circuit-breaker'],
      description: 'Loads circuit breaker query.'},
  });
}

// Helper functions
function isNetworkError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout'))
  );
}

function isClientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if ('status' in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === 'number' && status >= 400 && status < 500;
  }
  return false;
}
