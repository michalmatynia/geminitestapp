"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

interface CacheStrategy {
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

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
export function useSmartCache() {
  const queryClient = useQueryClient();

  const optimizeCache = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    queries.forEach(query => {
      const dataSize = JSON.stringify(query.state.data || {}).length;
      const lastAccessed = query.state.dataUpdatedAt;
      const observers = query.getObserversCount();
      
      // Remove large unused queries
      if (dataSize > 100000 && observers === 0 && 
          Date.now() - lastAccessed > 1000 * 60 * 10) { // 10 minutes
        cache.remove(query);
      }
      
      // Adjust stale time based on usage
      if (observers > 0) {
        query.setOptions({
          staleTime: observers > 2 ? cacheStrategies.realtime.staleTime : 
                   cacheStrategies.standard.staleTime,
        });
      }
    });
  }, [queryClient]);

  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const totalSize = queries.reduce((sum, query) => {
      return sum + JSON.stringify(query.state.data || {}).length;
    }, 0);
    
    const activeQueries = queries.filter(q => q.getObserversCount() > 0).length;
    const staleQueries = queries.filter(q => q.isStale()).length;
    const errorQueries = queries.filter(q => q.state.status === 'error').length;
    
    return {
      totalQueries: queries.length,
      activeQueries,
      staleQueries,
      errorQueries,
      totalSize: Math.round(totalSize / 1024), // KB
      avgSize: Math.round(totalSize / queries.length / 1024), // KB
    };
  }, [queryClient]);

  const preloadCriticalData = useCallback(async (criticalQueries: Array<{
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  }>) => {
    const promises = criticalQueries.map(({ queryKey, queryFn }) =>
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: cacheStrategies.longTerm.staleTime,
      })
    );
    
    await Promise.allSettled(promises);
  }, [queryClient]);

  return {
    optimizeCache,
    getCacheStats,
    preloadCriticalData,
  };
}

// Hook for cache warming strategies
export function useCacheWarming() {
  const queryClient = useQueryClient();

  const warmUserSpecificData = useCallback(async (userId: string) => {
    const userQueries = [
      {
        queryKey: ['user', 'preferences', userId],
        queryFn: () => fetch(`/api/user/${userId}/preferences`).then(r => r.json()),
      },
      {
        queryKey: ['user', 'settings', userId],
        queryFn: () => fetch(`/api/user/${userId}/settings`).then(r => r.json()),
      },
    ];

    await Promise.allSettled(
      userQueries.map(({ queryKey, queryFn }) =>
        queryClient.prefetchQuery({ queryKey, queryFn })
      )
    );
  }, [queryClient]);

  const warmNavigationData = useCallback(async (routes: string[]) => {
    const navigationQueries = routes.map(route => ({
      queryKey: ['navigation', route],
      queryFn: () => fetch(`/api${route}`).then(r => r.json()),
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
  }, [queryClient]);

  const warmFrequentlyAccessedData = useCallback(async () => {
    const frequentQueries = [
      {
        queryKey: ['products', 'categories'],
        queryFn: () => fetch('/api/products/categories').then(r => r.json()),
      },
      {
        queryKey: ['settings', 'global'],
        queryFn: () => fetch('/api/settings').then(r => r.json()),
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
) {
  const dataType = options?.dataType || 'standard';
  const strategy = cacheStrategies[dataType];

  return useQuery({
    queryKey,
    queryFn,
    ...strategy,
    // Adjust based on priority
    staleTime: options?.priority === 'high' ? 
      Math.min(strategy.staleTime || 0, 1000 * 60) : // Max 1 minute for high priority
      strategy.staleTime,
  });
}
