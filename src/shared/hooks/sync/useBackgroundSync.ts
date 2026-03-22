import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { getProductListQueryKey } from '@/shared/lib/product-query-keys';
import { safeSetInterval, safeClearInterval, type SafeTimerId } from '@/shared/lib/timers';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

interface BackgroundSyncOptions {
  queryKey: QueryKey;
  interval?: number; // milliseconds
  enabled?: boolean;
  onUpdate?: (data: unknown) => void;
}

// Minimum time (ms) between visibility-triggered syncs to avoid tab-switch storms.
const VISIBILITY_SYNC_DEBOUNCE_MS = 5_000;

export function useBackgroundSync({
  queryKey,
  interval = 30000, // 30 seconds default
  enabled = true,
  onUpdate,
}: BackgroundSyncOptions): { forceSync: () => Promise<void> } {
  const queryClient = useQueryClient();
  const intervalRef = useRef<SafeTimerId | undefined>(undefined);
  const previousDataRef = useRef<unknown>(undefined);
  const isVisibleRef = useRef(true);
  const lastSyncAtRef = useRef<number>(0);
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const syncData = useCallback(async (): Promise<void> => {
    if (!isVisibleRef.current || !enabled) return;

    try {
      await queryClient.refetchQueries({ queryKey: queryKeyRef.current });
      lastSyncAtRef.current = Date.now();
      const currentData = queryClient.getQueryData(queryKeyRef.current);

      if (currentData !== previousDataRef.current) {
        onUpdateRef.current?.(currentData);
        previousDataRef.current = currentData;
      }
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'useBackgroundSync',
        action: 'backgroundSyncFailed',
        level: 'warn',
      });
    }
  }, [enabled, queryClient]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = (): void => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (isVisibleRef.current && enabled) {
        // Only sync if enough time has passed since the last sync
        const elapsed = Date.now() - lastSyncAtRef.current;
        if (elapsed >= VISIBILITY_SYNC_DEBOUNCE_MS) {
          void syncData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, syncData]);

  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = safeSetInterval(() => {
      void syncData();
    }, interval);

    return (): void => {
      if (intervalRef.current) {
        safeClearInterval(intervalRef.current);
      }
    };
  }, [interval, enabled, syncData]);

  return {
    forceSync: async (): Promise<void> => {
      await queryClient.refetchQueries({ queryKey: queryKeyRef.current });
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
