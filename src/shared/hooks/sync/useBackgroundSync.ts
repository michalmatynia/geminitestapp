import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { logger } from '@/shared/utils/logger';

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
        logger.warn('Background sync failed', { error: error instanceof Error ? error.message : String(error) });
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
    queryKey: ['job', jobId],
    interval: 5000, // 5 seconds for jobs
    enabled: enabled && !!jobId,
  });
}

// Hook for product list updates
export function useProductListSync(filters: Record<string, unknown>, enabled: boolean = true): { forceSync: () => Promise<void> } {
  return useBackgroundSync({
    queryKey: ['products', filters],
    interval: 60000, // 1 minute for products
    enabled,
  });
}