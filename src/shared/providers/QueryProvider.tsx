'use client';

import {
  QueryClientContext,
  QueryClientProvider,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';

import { useQueryBatching } from '@/shared/hooks/query/useQueryBatching';
import { useGlobalQueryErrorHandler } from '@/shared/hooks/query/useQueryErrorHandling';
import { useQueryLifecycle } from '@/shared/hooks/query/useQueryLifecycle';
import {
  useQueryMiddleware,
  developmentMiddlewares,
  productionMiddlewares,
} from '@/shared/hooks/query/useQueryMiddleware';
import { useQueryPersistence } from '@/shared/hooks/query/useQueryPersistence';
import { useSmartCache, useCacheWarming } from '@/shared/hooks/query/useSmartCache';
import { usePerformanceMonitor } from '@/shared/hooks/useQueryAnalytics';
import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';
import { setupOfflineSupport } from '@/shared/lib/offline-support';
import { createQueryClient } from '@/shared/lib/query-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type QueryProviderProps = {
  children: React.ReactNode;
};

const isDevelopment = process.env['NODE_ENV'] === 'development';
const enableAdvancedRuntime =
  process.env['NEXT_PUBLIC_QUERY_ADVANCED_RUNTIME'] === 'true' || !isDevelopment;
const enableWarmup = process.env['NEXT_PUBLIC_QUERY_WARMUP'] === 'true' || !isDevelopment;

let browserQueryClient: QueryClient | null = null;

const getQueryClient = (): QueryClient => {
  if (typeof window === 'undefined') {
    return createQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
};

function QueryProviderAdvancedRuntime({ shouldWarmup }: { shouldWarmup: boolean }): null {
  usePerformanceMonitor();
  useQueryMiddleware(isDevelopment ? developmentMiddlewares : productionMiddlewares);

  const { optimizeCache } = useSmartCache();
  const { warmFrequentlyAccessedData } = useCacheWarming();
  const { cleanupStaleQueries, optimizeQueryPriorities } = useQueryLifecycle();
  useQueryBatching({ maxBatchSize: 5, batchDelay: 100 });

  useEffect((): (() => void) => {
    const optimizeInterval = safeSetInterval(
      (): void => {
        optimizeCache();
        optimizeQueryPriorities();
      },
      5 * 60 * 1000
    );

    const cleanupInterval = safeSetInterval(
      (): void => {
        cleanupStaleQueries();
      },
      10 * 60 * 1000
    );

    return (): void => {
      safeClearInterval(optimizeInterval);
      safeClearInterval(cleanupInterval);
    };
  }, [cleanupStaleQueries, optimizeCache, optimizeQueryPriorities]);

  useEffect((): void => {
    if (!shouldWarmup) return;
    void warmFrequentlyAccessedData();
  }, [shouldWarmup, warmFrequentlyAccessedData]);

  return null;
}

// Stable query key arrays for persistence — avoids re-running effects on every render.
const PERSISTED_PREFERENCES_KEYS = [[...QUERY_KEYS.userPreferences.all]];
const PERSISTED_SETTINGS_KEYS = [[...QUERY_KEYS.settings.scope('lite')]];

// Deferred persistence — mounts useQueryPersistence after the initial render
// to keep localStorage reads off the critical hydration path.
function DeferredQueryPersistence(): null {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true));
      return () => window.cancelIdleCallback(id);
    }
    const timeoutId = window.setTimeout(() => setReady(true), 1);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useQueryPersistence(
    ready
      ? {
          key: 'app-queries',
          queryKeys: PERSISTED_PREFERENCES_KEYS,
          ttl: 1000 * 60 * 60,
          maxItemBytes: 16 * 1024,
        }
      : { key: 'app-queries', queryKeys: [], ttl: 0, maxItemBytes: 0 }
  );

  useQueryPersistence(
    ready
      ? {
          key: 'app-queries',
          queryKeys: PERSISTED_SETTINGS_KEYS,
          ttl: 1000 * 60 * 60,
          maxItemBytes: 16 * 1024,
        }
      : { key: 'app-queries', queryKeys: [], ttl: 0, maxItemBytes: 0 }
  );

  return null;
}

function QueryProviderInner({ children }: QueryProviderProps): React.JSX.Element {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initialSettings = (window as unknown as { __LITE_SETTINGS__?: unknown[] }).__LITE_SETTINGS__;
    if (Array.isArray(initialSettings) && initialSettings.length > 0) {
      const queryKey = QUERY_KEYS.settings.scope('lite');
      if (!queryClient.getQueryData(queryKey)) {
        queryClient.setQueryData(queryKey, initialSettings);
      }
    }
  }, [queryClient]);

  useGlobalQueryErrorHandler({
    showToast: true,
    logErrors: false,
    retryOnError: false,
    toastDedupeWindowMs: 20000,
  });

  return (
    <>
      <DeferredQueryPersistence />
      {enableAdvancedRuntime ? <QueryProviderAdvancedRuntime shouldWarmup={enableWarmup} /> : null}
      {children}
    </>
  );
}

export const QueryProvider = ({ children }: QueryProviderProps): React.JSX.Element => {
  const existingQueryClient = React.useContext(QueryClientContext);
  const isNestedProvider = existingQueryClient !== undefined;
  const [queryClient] = useState(getQueryClient);

  useEffect(() => {
    if (isNestedProvider) return;
    setupOfflineSupport(queryClient);
  }, [isNestedProvider, queryClient]);

  if (isNestedProvider) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <QueryProviderInner>{children}</QueryProviderInner>
    </QueryClientProvider>
  );
};
