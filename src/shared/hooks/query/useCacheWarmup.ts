'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';

interface CacheWarmupConfig {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  priority?: 'high' | 'medium' | 'low';
  conditions?: () => boolean;
}

// Hook for intelligent cache warming based on user behavior
export function useCacheWarmup(configs: CacheWarmupConfig[]): void {
  const queryClient = useQueryClient();
  const warmupTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const warmupQuery = useCallback((config: CacheWarmupConfig): void => {
    const key = JSON.stringify(config.queryKey);
    
    // Check if already cached
    const existingData = queryClient.getQueryData(config.queryKey);
    if (existingData) return;

    // Check conditions
    if (config.conditions && !config.conditions()) return;

    const delay = config.priority === 'high' ? 100 : 
      config.priority === 'medium' ? 500 : 1000;

    const timeout = setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: config.queryKey,
        queryFn: config.queryFn,
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
      warmupTimeouts.current.delete(key);
    }, delay);

    warmupTimeouts.current.set(key, timeout);
  }, [queryClient]);

  useEffect((): (() => void) => {
    configs.forEach(warmupQuery);

    const currentTimeouts = warmupTimeouts.current;
    return (): void => {
      // Cleanup timeouts
      currentTimeouts.forEach((timeout: NodeJS.Timeout) => clearTimeout(timeout));
      currentTimeouts.clear();
    };
  }, [configs, warmupQuery]);
}

// Hook for smart prefetching based on user interactions
export function useSmartPrefetch(): {
  prefetchOnHover: (queryKey: readonly unknown[], queryFn: () => Promise<unknown>, delay?: number) => { onMouseEnter: () => void; onMouseLeave: () => void };
  prefetchOnFocus: (queryKey: readonly unknown[], queryFn: () => Promise<unknown>) => { onFocus: () => void };
  } {
  const queryClient = useQueryClient();

  const prefetchOnHover = useCallback((
    queryKey: readonly unknown[],
    queryFn: () => Promise<unknown>,
    delay: number = 300
  ): { onMouseEnter: () => void; onMouseLeave: () => void } => {
    let timeout: NodeJS.Timeout;

    return {
      onMouseEnter: (): void => {
        timeout = setTimeout(() => {
          void queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime: 2 * 60 * 1000, // 2 minutes
          });
        }, delay);
      },
      onMouseLeave: (): void => {
        if (timeout) clearTimeout(timeout);
      },
    };
  }, [queryClient]);

  const prefetchOnFocus = useCallback((
    queryKey: readonly unknown[],
    queryFn: () => Promise<unknown>
  ): { onFocus: () => void } => {
    return {
      onFocus: (): void => {
        void queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: 1 * 60 * 1000, // 1 minute
        });
      },
    };
  }, [queryClient]);

  return { prefetchOnHover, prefetchOnFocus };
}
