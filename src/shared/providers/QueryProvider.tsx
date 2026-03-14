'use client';

import { QueryClientContext, QueryClientProvider, type QueryClient } from '@tanstack/react-query';
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
import { setupOfflineSupport } from '@/shared/lib/offline-support';
import { createQueryClient } from '@/shared/lib/query-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type QueryProviderProps = {
  children: React.ReactNode;
};

const isDevelopment = process.env['NODE_ENV'] === 'development';
const enableAdvancedRuntime =
  isDevelopment && process.env['NEXT_PUBLIC_QUERY_ADVANCED_RUNTIME'] === 'true';
const enableWarmup = process.env['NEXT_PUBLIC_QUERY_WARMUP'] === 'true';

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
    const optimizeInterval = setInterval(
      (): void => {
        optimizeCache();
        optimizeQueryPriorities();
      },
      5 * 60 * 1000
    );

    const cleanupInterval = setInterval(
      (): void => {
        cleanupStaleQueries();
      },
      10 * 60 * 1000
    );

    return (): void => {
      clearInterval(optimizeInterval);
      clearInterval(cleanupInterval);
    };
  }, [cleanupStaleQueries, optimizeCache, optimizeQueryPriorities]);

  useEffect((): void => {
    if (!shouldWarmup) return;
    void warmFrequentlyAccessedData();
  }, [shouldWarmup, warmFrequentlyAccessedData]);

  return null;
}

function QueryProviderInner({ children }: QueryProviderProps): React.JSX.Element {
  useGlobalQueryErrorHandler({
    showToast: true,
    logErrors: false,
    retryOnError: false,
    toastDedupeWindowMs: 20000,
  });

  useQueryPersistence({
    key: 'app-queries',
    queryKeys: [[...QUERY_KEYS.userPreferences.all]],
    ttl: 1000 * 60 * 60,
    maxItemBytes: 16 * 1024,
  });

  useQueryPersistence({
    key: 'app-queries',
    queryKeys: [[...QUERY_KEYS.settings.scope('lite')]],
    ttl: 1000 * 60 * 60,
    maxItemBytes: 16 * 1024,
    revalidateOnLoad: true,
  });

  return (
    <>
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
