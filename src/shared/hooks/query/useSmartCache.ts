'use client';

import { useQueryClient, type Query, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchLiteSettingsCached } from '@/shared/api/settings-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

// Predefined cache strategies
export const cacheStrategies = {
  // For frequently changing data
  realtime: {
    staleTime: 0,
    gcTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // For moderately changing data
  standard: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // For rarely changing data
  longTerm: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // For static/configuration data
  static: {
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
} as const;

// Hook for intelligent cache management
export function useSmartCache(): {
  optimizeCache: () => void;
  getCacheStats: () => {
    totalQueries: number;
    activeQueries: number;
    staleQueries: number;
    errorQueries: number;
    totalSize: number;
    avgSize: number;
  };
  preloadCriticalData: <TData = unknown>(
    criticalQueries: Array<{ queryKey: unknown[]; queryFn: () => Promise<TData> }>
  ) => Promise<void>;
  } {
  const queryClient = useQueryClient();

  const optimizeCache = useCallback((): void => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    queries.forEach((query: Query) => {
      const dataSize = JSON.stringify(query.state.data || {}).length;
      const lastAccessed = query.state.dataUpdatedAt;
      const observers = query.getObserversCount();

      // Remove large unused queries
      if (dataSize > 100000 && observers === 0 && Date.now() - lastAccessed > 1000 * 60 * 10) {
        // 10 minutes
        cache.remove(query);
      }

      // Adjust stale time based on usage
      if (observers > 0) {
        const queryWithSetOptions = query as Query & {
          setOptions?: (options: { staleTime: number }) => void;
        };
        if (typeof queryWithSetOptions.setOptions === 'function') {
          queryWithSetOptions.setOptions({
            staleTime:
              observers > 2
                ? cacheStrategies.realtime.staleTime
                : cacheStrategies.standard.staleTime,
          });
        }
      }
    });
  }, [queryClient]);

  const getCacheStats = useCallback((): {
    totalQueries: number;
    activeQueries: number;
    staleQueries: number;
    errorQueries: number;
    totalSize: number;
    avgSize: number;
  } => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    const totalSize = queries.reduce((sum: number, query: Query) => {
      return sum + JSON.stringify(query.state.data || {}).length;
    }, 0);

    const activeQueries = queries.filter((q: Query) => q.getObserversCount() > 0).length;
    const staleQueries = queries.filter((q: Query) => q.isStale()).length;
    const errorQueries = queries.filter((q: Query) => q.state.status === 'error').length;

    return {
      totalQueries: queries.length,
      activeQueries,
      staleQueries,
      errorQueries,
      totalSize: Math.round(totalSize / 1024), // KB
      avgSize: Math.round(totalSize / (queries.length || 1) / 1024), // KB
    };
  }, [queryClient]);

  const preloadCriticalData = useCallback(
    async <TData = unknown>(
      criticalQueries: Array<{
        queryKey: unknown[];
        queryFn: () => Promise<TData>;
      }>
    ): Promise<void> => {
      const promises = criticalQueries.map(({ queryKey, queryFn }) =>
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: cacheStrategies.longTerm.staleTime,
        })
      );

      await Promise.allSettled(promises);
    },
    [queryClient]
  );

  return {
    optimizeCache,
    getCacheStats,
    preloadCriticalData,
  };
}

// Hook for cache warming strategies
export function useCacheWarming(): {
  warmUserSpecificData: (userId: string) => Promise<void>;
  warmNavigationData: (routes: string[]) => Promise<void>;
  warmFrequentlyAccessedData: () => Promise<void>;
  } {
  const queryClient = useQueryClient();

  const warmUserSpecificData = useCallback(
    async (userId: string): Promise<void> => {
      const userQueries = [
        {
          queryKey: QUERY_KEYS.user.preferences(userId),
          queryFn: async (): Promise<unknown> =>
            await fetch(`/api/user/${userId}/preferences`).then((r: Response) => r.json()),
        },
        {
          queryKey: QUERY_KEYS.user.settings(userId),
          queryFn: async (): Promise<unknown> =>
            await fetch(`/api/user/${userId}/settings`).then((r: Response) => r.json()),
        },
      ];

      await Promise.allSettled(
        userQueries.map(({ queryKey, queryFn }) => queryClient.prefetchQuery({ queryKey, queryFn }))
      );
    },
    [queryClient]
  );

  const warmNavigationData = useCallback(
    async (routes: string[]): Promise<void> => {
      const navigationQueries = routes.map((route: string) => ({
        queryKey: QUERY_KEYS.navigation.route(route),
        queryFn: async (): Promise<unknown> =>
          await fetch(`/api${route}`).then((r: Response) => r.json()),
      }));

      await Promise.allSettled(
        navigationQueries.map(({ queryKey, queryFn }) =>
          queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime: cacheStrategies.standard.staleTime,
          })
        )
      );
    },
    [queryClient]
  );

  const warmFrequentlyAccessedData = useCallback(async (): Promise<void> => {
    const frequentQueries = [
      {
        // Match SettingsStoreProvider default query key to avoid duplicate warm + runtime fetches.
        queryKey: QUERY_KEYS.settings.scope('lite'),
        queryFn: async (): Promise<unknown> => await fetchLiteSettingsCached(),
      },
    ];

    await Promise.allSettled(
      frequentQueries.map(({ queryKey, queryFn }) =>
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: cacheStrategies.longTerm.staleTime,
        })
      )
    );
  }, [queryClient]);

  return {
    warmUserSpecificData,
    warmNavigationData,
    warmFrequentlyAccessedData,
  };
}

// Hook for query with automatic cache strategy selection
export function useAdaptiveQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: {
    dataType?: 'realtime' | 'standard' | 'longTerm' | 'static';
    priority?: 'high' | 'medium' | 'low';
  }
): UseQueryResult<T> {
  const dataType = options?.dataType || 'standard';
  const strategy = cacheStrategies[dataType];

  return createListQueryV2<T, T>({
    queryKey,
    queryFn,
    ...strategy,
    // Adjust based on priority
    staleTime:
      options?.priority === 'high'
        ? Math.min(strategy.staleTime || 0, 1000 * 60) // Max 1 minute for high priority
        : strategy.staleTime,
    meta: {
      source: 'shared.hooks.query.useAdaptiveQuery',
      operation: 'list',
      resource: 'adaptive-query',
      domain: 'global',
      tags: ['cache', 'adaptive'],
    },
  });
}
