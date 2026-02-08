 
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

interface QueryBatchConfig {
  maxBatchSize?: number;
  batchDelay?: number;
  enabled?: boolean;
}

// Hook for batching multiple queries into single requests
export function useQueryBatching(config: QueryBatchConfig = {}): {
  batchQuery: (queryKey: unknown[], queryFn: () => Promise<unknown>) => Promise<unknown>;
} {
  const queryClient = useQueryClient();
  const batchQueue = useRef<Map<string, {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
      }>>(new Map());
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const maxBatchSize = config.maxBatchSize || 10;
  const batchDelay = config.batchDelay || 50;

  const processBatch = useCallback(async (): Promise<void> => {
    if (batchQueue.current.size === 0) return;

    const batch = Array.from(batchQueue.current.values());
    batchQueue.current.clear();

    // Group by similar query patterns
    const groups = batch.reduce((acc: Record<string, typeof batch>, item) => {
      const pattern = JSON.stringify(item.queryKey).replace(/["'][^"']*["']/g, '""');
      if (!acc[pattern]) acc[pattern] = [];
      acc[pattern].push(item);
      return acc;
    }, {} as Record<string, typeof batch>);

    // Process each group
    await Promise.all(
      Object.values(groups).map(async (group: typeof batch) => {
        try {
          // For similar queries, batch them into a single request
          if (group.length > 1) {
            const ids = group.map(item => 
              String(item.queryKey[item.queryKey.length - 1])
            ).filter(id => id && id !== 'undefined');

            const type = group[0]?.queryKey[0];

            if (ids.length > 0 && type) {
              // Batch request
              const res = await fetch('/api/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, type }),
              });
              const batchResult = await res.json() as Record<string, any>;

              // Resolve individual queries
              group.forEach((item, index) => {
                const id = ids[index];
                if (id) {
                  const data = batchResult[id];
                  if (data) {
                    queryClient.setQueryData(item.queryKey, data);
                    item.resolve(data);
                  } else {
                    item.reject(new Error('Data not found in batch'));
                  }
                }
              });
            }
          } else {
            // Single query
            const item = group[0];
            if (item) {
              const data = await item.queryFn();
              queryClient.setQueryData(item.queryKey, data);
              item.resolve(data);
            }
          }
        } catch (error) {
          group.forEach(item => item.reject(error as Error));
        }
      })
    );
  }, [queryClient]);

  const batchQuery = useCallback((
    queryKey: unknown[],
    queryFn: () => Promise<unknown>
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const key = JSON.stringify(queryKey);
      batchQueue.current.set(key, { queryKey, queryFn, resolve, reject });

      // Clear existing timeout
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }

      // Process batch when full or after delay
      if (batchQueue.current.size >= maxBatchSize) {
        void processBatch();
      } else {
        batchTimeout.current = setTimeout(() => {
          void processBatch();
        }, batchDelay);
      }
    });
  }, [processBatch, maxBatchSize, batchDelay]);

  useEffect((): (() => void) => {
    return (): void => {
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
    };
  }, []);

  return { batchQuery };
}

// Hook for query deduplication
export function useQueryDeduplication(): {
  deduplicatedQuery: (queryKey: unknown[], queryFn: () => Promise<unknown>) => Promise<unknown>;
  } {
  const activeQueries = useRef<Map<string, Promise<unknown>>>(new Map());

  const deduplicatedQuery = useCallback(async (
    queryKey: unknown[],
    queryFn: () => Promise<unknown>
  ): Promise<unknown> => {
    const key = JSON.stringify(queryKey);
    
    // Return existing promise if query is already running
    const existing = activeQueries.current.get(key);
    if (existing) {
      return existing;
    }

    // Create new promise and store it
    const promise = queryFn().finally(() => {
      activeQueries.current.delete(key);
    });

    activeQueries.current.set(key, promise);
    return promise;
  }, []);

  return { deduplicatedQuery };
}
