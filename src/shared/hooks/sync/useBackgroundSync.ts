'use client';
'use no memo';

import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

import { productsListsQueryKey } from '@/shared/lib/product-query-keys';
import { safeSetInterval, safeClearInterval, type SafeTimerId } from '@/shared/lib/timers';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

// This sync helper relies on ref-backed callbacks and effect wiring that is
// stable at runtime, but has been tripping React Compiler dev cache sizing on
// /admin/products. Keep it on the plain hook runtime for now.

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

type SyncDataOptions = {
  ignoreEnabled?: boolean | undefined;
  ignoreVisibility?: boolean | undefined;
};

type SyncData = (
  reason: BackgroundSyncEvent['reason'],
  options?: SyncDataOptions
) => Promise<void>;

type BackgroundSyncExecutor = {
  enabledRef: MutableRefObject<boolean>;
  isVisibleRef: MutableRefObject<boolean>;
  lastSyncAtRef: MutableRefObject<number>;
  syncData: SyncData;
};

type ExecuteBackgroundQuerySyncInput = {
  currentQueryKey: QueryKey;
  emitSyncEvent: (event: BackgroundSyncEvent) => void;
  enabledValue: boolean;
  onUpdateRef: MutableRefObject<BackgroundSyncOptions['onUpdate']>;
  previousDataRef: MutableRefObject<unknown>;
  queryClient: QueryClient;
  reason: BackgroundSyncEvent['reason'];
  setLastSyncAt: (value: number) => void;
  visibleValue: boolean;
};

const noopSyncData: SyncData = () => Promise.resolve();

const shouldSkipSync = (input: {
  enabled: boolean;
  isVisible: boolean;
  options?: SyncDataOptions | undefined;
}): boolean => {
  const shouldCheckVisibility = input.options?.ignoreVisibility !== true;
  const shouldCheckEnabled = input.options?.ignoreEnabled !== true;
  return (shouldCheckVisibility && !input.isVisible) || (shouldCheckEnabled && !input.enabled);
};

function useBackgroundSyncEmitter(
  onSyncEvent: BackgroundSyncOptions['onSyncEvent']
): (event: BackgroundSyncEvent) => void {
  const onSyncEventRef = useRef(onSyncEvent);
  onSyncEventRef.current = onSyncEvent;

  return useCallback((event: BackgroundSyncEvent): void => {
    try {
      onSyncEventRef.current?.(event);
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'useBackgroundSync',
        action: 'emitSyncEvent',
        level: 'warn',
      });
    }
  }, []);
}

async function executeBackgroundQuerySync(input: ExecuteBackgroundQuerySyncInput): Promise<void> {
  const previousDataRef = input.previousDataRef;

  try {
    await input.queryClient.refetchQueries({ queryKey: input.currentQueryKey });
    input.setLastSyncAt(Date.now());
    const currentData = input.queryClient.getQueryData(input.currentQueryKey);
    const dataChanged = currentData !== previousDataRef.current;

    if (dataChanged) {
      input.onUpdateRef.current?.(currentData);
      previousDataRef.current = currentData;
    }

    input.emitSyncEvent({
      reason: input.reason,
      status: 'completed',
      enabled: input.enabledValue,
      isVisible: input.visibleValue,
      dataChanged,
      queryKey: input.currentQueryKey,
    });
  } catch (error: unknown) {
    input.emitSyncEvent({
      reason: input.reason,
      status: 'error',
      enabled: input.enabledValue,
      isVisible: input.visibleValue,
      queryKey: input.currentQueryKey,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    logClientCatch(error, {
      source: 'useBackgroundSync',
      action: 'backgroundSyncFailed',
      level: 'warn',
    });
  }
}

function useBackgroundSyncExecutor({
  enabled,
  onSyncEvent,
  onUpdate,
  queryKey,
}: Pick<
  BackgroundSyncOptions,
  'enabled' | 'onSyncEvent' | 'onUpdate' | 'queryKey'
>): BackgroundSyncExecutor {
  const queryClient = useQueryClient();
  const previousDataRef = useRef<unknown>(undefined);
  const isVisibleRef = useRef(true);
  const lastSyncAtRef = useRef<number>(0);
  const enabledRef = useRef(enabled ?? true);
  enabledRef.current = enabled ?? true;
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const emitSyncEvent = useBackgroundSyncEmitter(onSyncEvent);

  const syncData = useCallback<SyncData>(async (reason, options): Promise<void> => {
    const enabledValue = enabledRef.current;
    const visibleValue = isVisibleRef.current;
    const currentQueryKey = queryKeyRef.current;

    if (shouldSkipSync({ enabled: enabledValue, isVisible: visibleValue, options })) {
      emitSyncEvent({
        reason,
        status: 'skipped',
        enabled: enabledValue,
        isVisible: visibleValue,
        queryKey: currentQueryKey,
      });
      return;
    }

    await executeBackgroundQuerySync({
      currentQueryKey,
      emitSyncEvent,
      enabledValue,
      onUpdateRef,
      previousDataRef,
      queryClient,
      reason,
      setLastSyncAt: (value: number): void => {
        lastSyncAtRef.current = value;
      },
      visibleValue,
    });
  }, [emitSyncEvent, queryClient]);

  return { enabledRef, isVisibleRef, lastSyncAtRef, syncData };
}

function useBackgroundSyncVisibilityEffect({
  enabledRef,
  isVisibleRef,
  lastSyncAtRef,
  syncData,
}: BackgroundSyncExecutor): void {
  const visibleRef = isVisibleRef;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = (): void => {
      try {
        visibleRef.current = document.visibilityState === 'visible';
        if (visibleRef.current && enabledRef.current) {
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
    return (): void => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabledRef, isVisibleRef, lastSyncAtRef, syncData]);
}

function useBackgroundSyncIntervalEffect(
  syncData: SyncData,
  interval: number,
  enabled: boolean
): void {
  useEffect(() => {
    if (enabled !== true) return undefined;

    const intervalId: SafeTimerId = safeSetInterval(() => {
      void syncData('interval');
    }, interval);

    return (): void => {
      safeClearInterval(intervalId);
    };
  }, [interval, enabled, syncData]);
}

export function useBackgroundSync({
  queryKey,
  interval = 30000, // 30 seconds default
  enabled = true,
  onUpdate,
  onSyncEvent,
}: BackgroundSyncOptions): { forceSync: () => Promise<void> } {
  const executor = useBackgroundSyncExecutor({ enabled, onSyncEvent, onUpdate, queryKey });
  const syncDataRef = useRef<SyncData>(noopSyncData);
  syncDataRef.current = executor.syncData;

  useBackgroundSyncVisibilityEffect(executor);
  useBackgroundSyncIntervalEffect(executor.syncData, interval, enabled);

  return {
    forceSync: useCallback(async (): Promise<void> => {
      await syncDataRef.current('force', { ignoreVisibility: true, ignoreEnabled: true });
    }, []),
  };
}

// Hook for product list updates
export function useProductListSync(
  filters: Record<string, unknown>,
  enabled: boolean = true,
  options?: Pick<BackgroundSyncOptions, 'onSyncEvent'>
): { forceSync: () => Promise<void> } {
  void filters;

  return useBackgroundSync({
    queryKey: productsListsQueryKey,
    interval: 10000,
    enabled,
    onSyncEvent: options?.onSyncEvent,
  });
}
