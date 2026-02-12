import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { getProductListQueryKey } from '@/shared/lib/product-query-keys';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface BackgroundSyncOptions {
  queryKey: unknown[];
  interval?: number; // milliseconds
  enabled?: boolean;
  onUpdate?: (data: unknown) => void;
}

export function useBackgroundSync({
  queryKey,
  interval = 30000, // 30 seconds default
  enabled = true,
  onUpdate,
}: BackgroundSyncOptions): { forceSync: () => Promise<void> } {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const previousDataRef = useRef<unknown>(undefined);

  useEffect(() => {
    if (!enabled) return;

    const syncData = async (): Promise<void> => {
      try {
        await queryClient.refetchQueries({ queryKey });
        const currentData = queryClient.getQueryData(queryKey);
        
        if (currentData !== previousDataRef.current) {
          onUpdate?.(currentData);
          previousDataRef.current = currentData;
        }
      } catch (error: unknown) {
        logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useBackgroundSync', action: 'backgroundSyncFailed', level: 'warn' } });
      }
    };

    intervalRef.current = setInterval(() => {
      void syncData();
    }, interval);

    return (): void => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryKey, interval, enabled, onUpdate, queryClient]);

  return {
    forceSync: async (): Promise<void> => {
      await queryClient.refetchQueries({ queryKey });
    },
  };
}

// Hook for real-time job status updates
export function useJobStatusSync(jobId: string, enabled: boolean = true): { forceSync: () => Promise<void> } {
  return useBackgroundSync({
    queryKey: QUERY_KEYS.jobs.status(jobId) as unknown[],
    interval: 5000, // 5 seconds for jobs
    enabled: enabled && !!jobId,
  });
}

// Hook for product list updates
export function useProductListSync(filters: Record<string, unknown>, enabled: boolean = true): { forceSync: () => Promise<void> } {
  return useBackgroundSync({
    queryKey: getProductListQueryKey(filters) as unknown[],
    interval: 60000, // 1 minute for products
    enabled,
  });
}
