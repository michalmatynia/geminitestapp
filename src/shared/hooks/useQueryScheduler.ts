'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';

import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';

interface QuerySchedulerConfig {
  priority: 'high' | 'medium' | 'low';
  delay?: number;
  condition?: () => boolean;
}

type SchedulerTimeout = ReturnType<typeof safeSetTimeout>;

type ScheduledQuery = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  config: QuerySchedulerConfig;
  timeout?: SchedulerTimeout;
};

type QuerySchedulerResult = {
  scheduleQuery: (
    id: string,
    queryKey: readonly unknown[],
    queryFn: () => Promise<unknown>,
    config: QuerySchedulerConfig
  ) => void;
  cancelScheduledQuery: (id: string) => void;
  clearAllScheduled: () => void;
};

const PRIORITY_DELAYS: Record<QuerySchedulerConfig['priority'], number> = {
  high: 0,
  medium: 1000,
  low: 3000,
};

const resolvePriorityDelay = (priority: QuerySchedulerConfig['priority']): number =>
  PRIORITY_DELAYS[priority];

const resolveScheduleDelay = (config: QuerySchedulerConfig): number =>
  config.delay ?? resolvePriorityDelay(config.priority);

const shouldRunScheduledQuery = (condition: QuerySchedulerConfig['condition']): boolean =>
  condition === undefined || condition();

const runScheduledPrefetch = (
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  queryFn: () => Promise<unknown>
): void => {
  void prefetchQueryV2(queryClient, {
    queryKey,
    queryFn,
    meta: {
      source: 'shared.hooks.useQueryScheduler.scheduleQuery',
      operation: 'list',
      resource: 'scheduled-query',
      domain: 'global',
      queryKey,
      tags: ['scheduler', 'scheduled'],
      description: 'Loads scheduled query.',
    },
  })();
};

// Hook for query scheduling and prioritization
export function useQueryScheduler(): QuerySchedulerResult {
  const queryClient = useQueryClient();
  const scheduledQueries = useRef<Map<string, ScheduledQuery>>(new Map());

  const scheduleQuery = useCallback(
    (
      id: string,
      queryKey: readonly unknown[],
      queryFn: () => Promise<unknown>,
      config: QuerySchedulerConfig
    ): void => {
      // Cancel existing scheduled query
      const existing = scheduledQueries.current.get(id);
      if (existing?.timeout !== undefined) {
        safeClearTimeout(existing.timeout);
      }

      const timeout = safeSetTimeout((): void => {
        if (shouldRunScheduledQuery(config.condition)) {
          runScheduledPrefetch(queryClient, queryKey, queryFn);
        }
        scheduledQueries.current.delete(id);
      }, resolveScheduleDelay(config));

      scheduledQueries.current.set(id, {
        queryKey,
        queryFn,
        config,
        timeout,
      });
    },
    [queryClient]
  );

  const cancelScheduledQuery = useCallback((id: string): void => {
    const query = scheduledQueries.current.get(id);
    if (query?.timeout === undefined) return;
    safeClearTimeout(query.timeout);
    scheduledQueries.current.delete(id);
  }, []);

  const clearAllScheduled = useCallback((): void => {
    scheduledQueries.current.forEach((query) => {
      if (query.timeout !== undefined) safeClearTimeout(query.timeout);
    });
    scheduledQueries.current.clear();
  }, []);

  useEffect((): (() => void) => {
    return (): void => clearAllScheduled();
  }, [clearAllScheduled]);

  return {
    scheduleQuery,
    cancelScheduledQuery,
    clearAllScheduled,
  };
}
