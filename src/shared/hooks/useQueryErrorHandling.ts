/* eslint-disable */
"use client";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useToast } from "@/shared/ui";

interface ErrorHandlingConfig {
  showToast?: boolean;
  logErrors?: boolean;
  retryOnError?: boolean;
  onError?: (error: Error, queryKey: unknown[]) => void;
}

// Global error handler for queries
export function useGlobalQueryErrorHandler(config: ErrorHandlingConfig = {}): void {
  const queryClient = useQueryClient();
  
  // Only use toast on client side
  const toast = typeof window !== 'undefined' ? useToast().toast : null;

  useEffect((): (() => void) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event): void => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        const error = event.query.state.error as Error;
        const queryKey = event.query.queryKey;

        // Log error
        if (config.logErrors !== false) {
          console.error('Query error:', { error, queryKey });
        }

        // Show toast notification
        if (config.showToast && toast) {
          toast(error.message || "Something went wrong", { variant: "error" });
        }

        // Custom error handler
        config.onError?.(error, queryKey as unknown[]);

        // Auto-retry on network errors
        if (config.retryOnError && isNetworkError(error)) {
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
  
  const query = useQuery({
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
  });

  useEffect((): void => {
    if (query.isError) {
      console.error('Query failed:', { queryKey, error: query.error });
      if (toast) {
        toast(query.error.message, { variant: "error" });
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

  return useQuery({
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
