/* eslint-disable */
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { createListQueryV2 } from "@/shared/lib/query-factories-v2";
import { useToast } from "@/shared/ui";
import { logClientError, isLoggableObject } from "@/shared/utils/observability/client-error-logger";
import { getTraceId } from "@/shared/utils/observability/trace";

interface ErrorHandlingConfig {
  showToast?: boolean;
  logErrors?: boolean;
  retryOnError?: boolean;
  onError?: (error: Error, queryKey: unknown[]) => void;
}

const NOISE_MESSAGES = new Set(["{}", "[]", "[object Object]"]);

const isMeaningfulMessage = (message: string): boolean => {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (NOISE_MESSAGES.has(trimmed)) return false;
  return true;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message?.trim() || "";
  if (typeof error === "string") return error.trim();
  if (error && typeof error === "object") {
    const entries = Object.entries(error as Record<string, unknown>).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;
      return true;
    });
    if (entries.length > 0) {
      return entries
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ");
    }
  }
  return "";
};

const shouldLogError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof Error) return isMeaningfulMessage(error.message || "");
  if (typeof error === "object") {
    const entries = Object.entries(error as Record<string, unknown>).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;
      return true;
    });
    return entries.length > 0;
  }
  return true;
};

const isEmptyError = (error: unknown): boolean => {
  if (!error) return true;
  if (error instanceof Error) return !isMeaningfulMessage(error.message || "");
  if (typeof error === "object") {
    return Object.keys(error as Record<string, unknown>).length === 0;
  }
  return false;
};

const hasMeaningfulError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof Error) return isMeaningfulMessage(error.message || "");
  if (typeof error === "string") return isMeaningfulMessage(error);
  if (typeof error === "object") {
    return shouldLogError(error);
  }
  return true;
};

const getLoggableError = (error: unknown): unknown => {
  if (!error) return undefined;
  if (error instanceof Error) {
    return isMeaningfulMessage(error.message || "") ? error : undefined;
  }
  if (typeof error === "string") {
    return isMeaningfulMessage(error) ? error : undefined;
  }
  if (typeof error === "object") {
    const keys = Object.keys(error as Record<string, unknown>);
    return keys.length > 0 ? error : undefined;
  }
  return undefined;
};

// Global error handler for queries
export function useGlobalQueryErrorHandler(config: ErrorHandlingConfig = {}): void {
  const queryClient = useQueryClient();
  
  // Only use toast on client side
  const toast = typeof window !== 'undefined' ? useToast().toast : null;

  useEffect((): (() => void) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event): void => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        const error = event.query.state.error as unknown;
        const queryKey = event.query.queryKey;

        if (
          !error ||
          (typeof error === "object" &&
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
          typeof error === "string" ||
          (error &&
            typeof error === "object" &&
            typeof (error as { message?: unknown }).message === "string" &&
            Boolean((error as { message?: string }).message?.trim()));
        if (!message || !isErrorLike || !hasMeaningfulError(error) || isEmptyError(error)) {
          return;
        }
        if (
          config.logErrors !== false &&
          shouldLogError(error) &&
          message &&
          !(isLoggableObject(error) && error.__logged)
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
              error.__logged = true;
            } catch {}
          }
        }

        // Show toast notification
        if (config.showToast && toast) {
          toast(message, { 
            variant: "error",
            error: isErrorLike ? error : new Error(message)
          });
        }

        // Custom error handler
        config.onError?.(
          error instanceof Error ? error : new Error(message),
          queryKey as unknown[]
        );

        // Auto-retry on network errors
        if (
          config.retryOnError &&
          isNetworkError(error instanceof Error ? error : new Error(message))
        ) {
          setTimeout((): void => {
            void queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
          }, 5000);
        }
      }
    });

    return (): void => unsubscribe();
  }, [queryClient, config, toast]);
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
  }
): any {
  const toast = typeof window !== 'undefined' ? useToast().toast : null;
  
  const query = createListQueryV2<TData, TData>({
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
    placeholderData: options?.fallbackData as any,
    meta: {
      source: 'shared.hooks.query.useResilientQuery',
      operation: 'list',
      resource: 'resilient-query',
      domain: 'global',
      tags: ['error-handling', 'resilient'],
    },
  });

  useEffect((): void => {
    if (query.isError) {
      logClientError(query.error, { context: { queryKey } });
      if (toast) {
        toast(query.error.message, { variant: "error", error: query.error });
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
  }
): any {
  const failureThreshold = options?.failureThreshold || 5;
  const resetTimeout = options?.resetTimeout || 60000; // 1 minute
  
  const circuitKey = `circuit-${JSON.stringify(queryKey)}`;
  
  const getCircuitState = useCallback((): { failures: number; isOpen: boolean; lastFailure: number } => {
    const stored = localStorage.getItem(circuitKey);
    if (!stored) return { failures: 0, isOpen: false, lastFailure: 0 };
    return JSON.parse(stored) as { failures: number; isOpen: boolean; lastFailure: number };
  }, [circuitKey]);

  const updateCircuitState = useCallback((state: { failures: number; isOpen: boolean; lastFailure: number }): void => {
    localStorage.setItem(circuitKey, JSON.stringify(state));
  }, [circuitKey]);

  return createListQueryV2<TData, TData>({
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
      domain: 'global',
      tags: ['error-handling', 'circuit-breaker'],
    },
  });
}

// Helper functions
function isNetworkError(error: unknown): boolean {
  return error instanceof Error && 
    (error.message.includes('fetch') || 
     error.message.includes('network') ||
     error.message.includes('timeout'));
}

function isClientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if ('status' in error) {
    const status = (error as any).status;
    return typeof status === 'number' && status >= 400 && status < 500;
  }
  return false;
}
