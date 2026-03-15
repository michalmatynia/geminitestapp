import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { getProductListQueryKey } from '@/shared/lib/product-query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface BackgroundSyncOptions {
  queryKey: QueryKey;
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
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = (): void => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (isVisibleRef.current && enabled) {
        // Immediate sync when tab becomes visible after being hidden
        void syncData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  const syncData = async (): Promise<void> => {
    if (!isVisibleRef.current || !enabled) return;

    try {
      await queryClient.refetchQueries({ queryKey });
      const currentData = queryClient.getQueryData(queryKey);

      if (currentData !== previousDataRef.current) {
        onUpdate?.(currentData);
        previousDataRef.current = currentData;
      }
    } catch (error: unknown) {
      logClientError(error);
      logClientError(error instanceof Error ? error : new Error(String(error)), {
        context: { source: 'useBackgroundSync', action: 'backgroundSyncFailed', level: 'warn' },
      });
    }
  };

  useEffect(() => {
    if (!enabled) return;

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

// Hook for product list updates
export function useProductListSync(
  filters: Record<string, unknown>,
  enabled: boolean = true
): { forceSync: () => Promise<void> } {
  return useBackgroundSync({
    queryKey: getProductListQueryKey(filters),
    interval: 60000, // 1 minute for products
    enabled,
  });
}
