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
  onSyncEvent?: (event: BackgroundSyncEvent) => void;
}

export interface BackgroundSyncEvent {
  reason: 'interval' | 'visibility' | 'force';
  status: 'skipped' | 'completed' | 'error';
  enabled: boolean;
  isVisible: boolean;
  dataChanged?: boolean;
  queryKey: QueryKey;
  errorMessage?: string;
}

// Minimum time (ms) between visibility-triggered syncs to avoid tab-switch storms.
const VISIBILITY_SYNC_DEBOUNCE_MS = 5_000;

export function useBackgroundSync({
  queryKey,
  interval = 30000, // 30 seconds default
  enabled = true,
  onUpdate,
  onSyncEvent,
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
  const onSyncEventRef = useRef(onSyncEvent);
  onSyncEventRef.current = onSyncEvent;

  const emitSyncEvent = useCallback(
    (event: BackgroundSyncEvent): void => {
      try {
        onSyncEventRef.current?.(event);
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'useBackgroundSync',
          action: 'emitSyncEvent',
          level: 'warn',
        });
      }
    },
    []
  );

  const syncData = useCallback(
    async (
      reason: BackgroundSyncEvent['reason'],
      options?: { ignoreVisibility?: boolean; ignoreEnabled?: boolean }
    ): Promise<void> => {
      const shouldSkipForVisibility = !options?.ignoreVisibility && !isVisibleRef.current;
      const shouldSkipForEnabled = !options?.ignoreEnabled && !enabled;

      if (shouldSkipForVisibility || shouldSkipForEnabled) {
        emitSyncEvent({
          reason,
          status: 'skipped',
          enabled,
          isVisible: isVisibleRef.current,
          queryKey: queryKeyRef.current,
        });
        return;
      }

      try {
        await queryClient.refetchQueries({ queryKey: queryKeyRef.current });
        lastSyncAtRef.current = Date.now();
        const currentData = queryClient.getQueryData(queryKeyRef.current);
        const dataChanged = currentData !== previousDataRef.current;

        if (dataChanged) {
          onUpdateRef.current?.(currentData);
          previousDataRef.current = currentData;
        }

        emitSyncEvent({
          reason,
          status: 'completed',
          enabled,
          isVisible: isVisibleRef.current,
          dataChanged,
          queryKey: queryKeyRef.current,
        });
      } catch (error: unknown) {
        emitSyncEvent({
          reason,
          status: 'error',
          enabled,
          isVisible: isVisibleRef.current,
          queryKey: queryKeyRef.current,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        logClientCatch(error, {
          source: 'useBackgroundSync',
          action: 'backgroundSyncFailed',
          level: 'warn',
        });
      }
    },
    [emitSyncEvent, enabled, queryClient]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = (): void => {
      try {
        isVisibleRef.current = document.visibilityState === 'visible';
        if (isVisibleRef.current && enabled) {
          // Only sync if enough time has passed since the last sync
          const elapsed = Date.now() - lastSyncAtRef.current;
          if (elapsed >= VISIBILITY_SYNC_DEBOUNCE_MS) {
            void syncData('visibility');
          }
        }
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'useBackgroundSync',
          action: 'handleVisibilityChange',
          level: 'warn',
        });
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
      void syncData('interval');
    }, interval);

    return (): void => {
      if (intervalRef.current) {
        safeClearInterval(intervalRef.current);
      }
    };
  }, [interval, enabled, syncData]);

  return {
    forceSync: async (): Promise<void> => {
      await syncData('force', { ignoreVisibility: true, ignoreEnabled: true });
    },
  };
}

// Hook for product list updates
export function useProductListSync(
  filters: Record<string, unknown>,
  enabled: boolean = true,
  options?: Pick<BackgroundSyncOptions, 'onSyncEvent'>
): { forceSync: () => Promise<void> } {
  return useBackgroundSync({
    queryKey: getProductListQueryKey(filters),
    interval: 60000, // 1 minute for products
    enabled,
    onSyncEvent: options?.onSyncEvent,
  });
}
