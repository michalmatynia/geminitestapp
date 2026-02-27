 
'use client';

import { useQueryClient, type Query } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';

interface QueryMetadata {
  priority: number;
  lastAccessed: number;
  accessCount: number;
  dataSize: number;
  errorCount: number;
}

// Hook for intelligent query lifecycle management
export function useQueryLifecycle(): {
  cleanupStaleQueries: () => void;
  optimizeQueryPriorities: () => void;
  getQueryStats: () => { totalQueries: number; activeQueries: number; highPriorityQueries: number; totalMemoryUsage: number; avgAccessCount: number };
  } {
  const queryClient = useQueryClient();
  const queryMetadata = useRef<Map<string, QueryMetadata>>(new Map());

  const updateMetadata = useCallback((queryKey: readonly unknown[], type: 'access' | 'error' | 'success'): void => {
    const key = JSON.stringify(queryKey);
    const existing = queryMetadata.current.get(key) || {
      priority: 1,
      lastAccessed: Date.now(),
      accessCount: 0,
      dataSize: 0,
      errorCount: 0,
    };

    switch (type) {
      case 'access':
        existing.accessCount++;
        existing.lastAccessed = Date.now();
        existing.priority = Math.min(existing.priority + 0.1, 10);
        break;
      case 'error':
        existing.errorCount++;
        existing.priority = Math.max(existing.priority - 0.5, 0.1);
        break;
      case 'success': {
        existing.priority = Math.min(existing.priority + 0.2, 10);
        const query = queryClient.getQueryCache().find({ queryKey });
        if (query?.state.data) {
          existing.dataSize = JSON.stringify(query.state.data).length;
        }
        break;
      }
    }

    queryMetadata.current.set(key, existing);
  }, [queryClient]);

  const cleanupStaleQueries = useCallback((): void => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    queries.forEach((query: Query): void => {
      const key = JSON.stringify(query.queryKey);
      const metadata = queryMetadata.current.get(key);
      
      if (metadata && 
          query.getObserversCount() === 0 && 
          now - metadata.lastAccessed > staleThreshold &&
          metadata.priority < 2) {
        cache.remove(query);
        queryMetadata.current.delete(key);
      }
    });
  }, [queryClient]);

  const optimizeQueryPriorities = useCallback((): void => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    queries.forEach((query: Query): void => {
      const key = JSON.stringify(query.queryKey);
      const metadata = queryMetadata.current.get(key);
      
      if (metadata) {
        // Adjust stale time based on priority and access patterns
        const baseStaleTime = 5 * 60 * 1000; // 5 minutes
        const adjustedStaleTime = baseStaleTime * (metadata.priority / 5);
        
        // Use type-safe check for setOptions if it exists on the instance
        const queryWithSetOptions = query as Query & { setOptions?: (options: any) => void };
        if (typeof queryWithSetOptions.setOptions === 'function') {
          queryWithSetOptions.setOptions({
            staleTime: Math.max(adjustedStaleTime, 30 * 1000), // Min 30 seconds
            gcTime: adjustedStaleTime * 6, // 6x stale time
          });
        }
      }
    });
  }, [queryClient]);

  // Monitor query events
  useEffect((): (() => void) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event): void => {
      if (event.type === 'updated') {
        const query = event.query;
        
        if (query.state.status === 'success') {
          updateMetadata(query.queryKey, 'success');
        } else if (query.state.status === 'error') {
          updateMetadata(query.queryKey, 'error');
        }
        
        if (query.getObserversCount() > 0) {
          updateMetadata(query.queryKey, 'access');
        }
      }
    });

    return (): void => unsubscribe();
  }, [queryClient, updateMetadata]);

  // Periodic cleanup and optimization
  useEffect((): (() => void) => {
    const cleanupInterval = setInterval(cleanupStaleQueries, 10 * 60 * 1000); // 10 minutes
    const optimizeInterval = setInterval(optimizeQueryPriorities, 5 * 60 * 1000); // 5 minutes

    return (): void => {
      clearInterval(cleanupInterval);
      clearInterval(optimizeInterval);
    };
  }, [cleanupStaleQueries, optimizeQueryPriorities]);

  const getQueryStats = useCallback((): {
    totalQueries: number;
    activeQueries: number;
    highPriorityQueries: number;
    totalMemoryUsage: number;
    avgAccessCount: number;
  } => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter((q: Query) => q.getObserversCount() > 0).length,
      highPriorityQueries: Array.from(queryMetadata.current.values())
        .filter((m: QueryMetadata) => m.priority > 7).length,
      totalMemoryUsage: Array.from(queryMetadata.current.values())
        .reduce((sum: number, m: QueryMetadata) => sum + m.dataSize, 0),
      avgAccessCount: Array.from(queryMetadata.current.values())
        .reduce((sum: number, m: QueryMetadata) => sum + m.accessCount, 0) / (queryMetadata.current.size || 1),
    };
  }, [queryClient]);

  return {
    cleanupStaleQueries,
    optimizeQueryPriorities,
    getQueryStats,
  };
}
