'use client';

import { useCallback, useEffect, useRef } from 'react';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { type SafeTimeout } from '@/shared/lib/runtime/timeout';
import { useQueryClient } from '@tanstack/react-query';


interface QueryBatchConfig {
  maxBatchSize?: number;
  batchDelay?: number;
  enabled?: boolean;
}

// Hook for batching multiple queries into single requests
export function useQueryBatching(config: QueryBatchConfig = {}): {
  batchQuery: <TData = unknown>(
    queryKey: unknown[],
    queryFn: () => Promise<TData>
  ) => Promise<TData>;
} {
  const queryClient = useQueryClient();
  const batchQueue = useRef<
    Map<
      string,
      {
        queryKey: unknown[];
        queryFn: () => Promise<unknown>;
        resolve: (data: unknown) => void;
        reject: (error: Error) => void;
          }
          >
          >(new Map());
  const batchTimeout = useRef<SafeTimeout | null>(null);

  const maxBatchSize = config.maxBatchSize || 10;
  const batchDelay = config.batchDelay || 50;

  const processBatch = useCallback(async (): Promise<void> => {
    if (batchQueue.current.size === 0) return;

    const batch = Array.from(batchQueue.current.values());
    batchQueue.current.clear();

    // Group by similar query patterns
    const groups = batch.reduce(
      (acc: Record<string, typeof batch>, item) => {
        const pattern = JSON.stringify(item.queryKey).replace(/["'][^"']*["']/g, '""');
        if (!acc[pattern]) acc[pattern] = [];
        acc[pattern].push(item);
        return acc;
      },
      {} as Record<string, typeof batch>
    );

    // Process each group
    await Promise.all(
      Object.values(groups).map(async (group: typeof batch) => {
        try {
          // For similar queries, batch them into a single request
          if (group.length > 1) {
            const ids = group
              .map((item) => String(item.queryKey[item.queryKey.length - 1]))
              .filter((id) => id && id !== 'undefined');

            const type = group[0]?.queryKey[0];

            if (ids.length > 0 && type) {
              // Batch request
              const res = await fetch('/api/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, type }),
              });
              const batchResult = (await res.json()) as Record<string, unknown>;

              // Resolve individual queries
              group.forEach((item, index) => {
                const id = ids[index];
                if (id) {
                  const data = batchResult[id];
                  if (data !== undefined) {
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
          logClientCatch(error, {
            source: 'useQueryBatching',
            action: 'processBatchGroup',
            groupSize: group.length,
            level: 'warn',
          });
          group.forEach((item) => item.reject(error as Error));
        }
      })
    );
  }, [queryClient]);

  const batchQuery = useCallback(
    <TData = unknown>(queryKey: unknown[], queryFn: () => Promise<TData>): Promise<TData> => {
      return new Promise<TData>((resolve, reject) => {
        const key = JSON.stringify(queryKey);
        batchQueue.current.set(key, {
          queryKey,
          queryFn,
          resolve: resolve as (data: unknown) => void,
          reject,
        });

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
          }, batchDelay) as SafeTimeout;
        }
      });
    },
    [processBatch, maxBatchSize, batchDelay]
  );

  useEffect((): (() => void) => {
    return (): void => {
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
    };
  }, []);

  return { batchQuery };
}
