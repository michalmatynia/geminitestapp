"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";

interface QuerySchedulerConfig {
  priority: 'high' | 'medium' | 'low';
  delay?: number;
  condition?: () => boolean;
}

// Hook for query scheduling and prioritization
export function useQueryScheduler() {
  const queryClient = useQueryClient();
  const scheduledQueries = useRef<Map<string, {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
    config: QuerySchedulerConfig;
    timeout?: NodeJS.Timeout;
  }>>(new Map());

  const scheduleQuery = useCallback((
    id: string,
    queryKey: unknown[],
    queryFn: () => Promise<unknown>,
    config: QuerySchedulerConfig
  ) => {
    // Cancel existing scheduled query
    const existing = scheduledQueries.current.get(id);
    if (existing?.timeout) {
      clearTimeout(existing.timeout);
    }

    const delay = config.delay || (
      config.priority === 'high' ? 0 :
      config.priority === 'medium' ? 1000 : 3000
    );

    const timeout = setTimeout(() => {
      if (!config.condition || config.condition()) {
        void queryClient.prefetchQuery({ queryKey, queryFn });
      }
      scheduledQueries.current.delete(id);
    }, delay);

    scheduledQueries.current.set(id, {
      queryKey,
      queryFn,
      config,
      timeout,
    });
  }, [queryClient]);

  const cancelScheduledQuery = useCallback((id: string) => {
    const query = scheduledQueries.current.get(id);
    if (query?.timeout) {
      clearTimeout(query.timeout);
      scheduledQueries.current.delete(id);
    }
  }, []);

  const clearAllScheduled = useCallback(() => {
    scheduledQueries.current.forEach(query => {
      if (query.timeout) clearTimeout(query.timeout);
    });
    scheduledQueries.current.clear();
  }, []);

  useEffect(() => {
    return () => clearAllScheduled();
  }, [clearAllScheduled]);

  return {
    scheduleQuery,
    cancelScheduledQuery,
    clearAllScheduled,
  };
}

// Hook for background query execution
export function useBackgroundQueries(
  queries: Array<{
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
    interval?: number;
    enabled?: boolean;
  }>
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    queries.forEach(({ queryKey, queryFn, interval = 30000, enabled = true }) => {
      if (!enabled) return;

      const intervalId = setInterval(() => {
        // Only run if page is visible and online
        if (!document.hidden && navigator.onLine) {
          void queryClient.prefetchQuery({ queryKey, queryFn });
        }
      }, interval);

      intervals.push(intervalId);
    });

    return () => {
      intervals.forEach(clearInterval);
    };
  }, [queries, queryClient]);
}
