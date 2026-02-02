/* eslint-disable */
"use client";

import { QueryClient, QueryClientProvider, type Query } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { setupOfflineSupport, isOfflineQuery } from "@/shared/lib/offline-support";
import { useGlobalQueryErrorHandler } from "@/shared/hooks/query/useQueryErrorHandling";
import { usePerformanceMonitor } from "@/shared/hooks/useQueryAnalytics";
import { useQueryPersistence } from "@/shared/hooks/query/useQueryPersistence";
import { useQueryMiddleware, developmentMiddlewares, productionMiddlewares } from "@/shared/hooks/query/useQueryMiddleware";
import { useSmartCache, useCacheWarming } from "@/shared/hooks/query/useSmartCache";
import { useQueryLifecycle } from "@/shared/hooks/query/useQueryLifecycle";
import { useQueryBatching } from "@/shared/hooks/query/useQueryBatching";

type QueryProviderProps = {
  children: React.ReactNode;
};

function QueryProviderInner({ children }: QueryProviderProps): React.JSX.Element {
  // Global error handling
  useGlobalQueryErrorHandler({
    showToast: true,
    logErrors: true,
    retryOnError: true,
  });

  // Performance monitoring in development
  usePerformanceMonitor();

  // Query middleware system
  useQueryMiddleware(
    process.env.NODE_ENV === 'development' 
      ? developmentMiddlewares 
      : productionMiddlewares
  );

  // Smart cache management
  const { optimizeCache } = useSmartCache();
  const { warmFrequentlyAccessedData } = useCacheWarming();

  // Query lifecycle management
  const { cleanupStaleQueries, optimizeQueryPriorities } = useQueryLifecycle();

  // Query batching for performance
  useQueryBatching({ maxBatchSize: 5, batchDelay: 100 });

  // Optimize cache and lifecycle periodically
  useEffect((): (() => void) => {
    const optimizeInterval = setInterval((): void => {
      optimizeCache();
      optimizeQueryPriorities();
    }, 5 * 60 * 1000); // Every 5 minutes

    const cleanupInterval = setInterval((): void => {
      void cleanupStaleQueries();
    }, 10 * 60 * 1000); // Every 10 minutes

    return (): void => {
      clearInterval(optimizeInterval);
      clearInterval(cleanupInterval);
    };
  }, [optimizeCache, optimizeQueryPriorities, cleanupStaleQueries]);

  // Warm frequently accessed data on mount
  useEffect((): void => {
    void warmFrequentlyAccessedData();
  }, [warmFrequentlyAccessedData]);

  // Persist important queries
  useQueryPersistence({
    key: 'app-queries',
    queryKeys: [
      ['user', 'preferences'],
      ['settings'],
      ['products', 'categories'],
    ],
    ttl: 1000 * 60 * 60, // 1 hour
  });

  return <>{children}</>;
}

export const QueryProvider = ({ children }: QueryProviderProps): React.JSX.Element => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: (query: Query): number => {
              // Longer stale time for offline-cached queries
              return isOfflineQuery(query.queryKey) ? 1000 * 60 * 30 : 1000 * 60 * 5;
            },
            gcTime: 1000 * 60 * 60 * 24, // 24 hours for offline support
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchInterval: false,
            refetchIntervalInBackground: false,
            retry: (failureCount: number, error: unknown): boolean => {
              if (error instanceof Error && 'status' in error) {
                const status: number = (error as { status: number }).status;
                if (status >= 400 && status < 500) return false;
              }
              return failureCount < 2;
            },
            retryDelay: (attemptIndex: number): number => Math.min(1000 * 2 ** attemptIndex, 30000),
            networkMode: 'offlineFirst', // Use cached data when offline
          },
          mutations: {
            retry: (failureCount: number, error: unknown): boolean => {
              if (error instanceof Error && 'status' in error) {
                const status: number = (error as { status: number }).status;
                if (status >= 400 && status < 500) return false;
              }
              return failureCount < 1;
            },
            networkMode: 'online', // Only run mutations when online
            onError: (error: Error): void => {
              console.error('Mutation error:', error);
            },
            onSuccess: (): void => {
              // Trigger background sync for offline mutations
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((registration: ServiceWorkerRegistration) => {
                  const sync = (registration as any).sync;
                  if (sync && typeof sync.register === 'function') {
                    void sync.register('background-sync');
                  }
                }).catch(() => {
                  // Service worker not available
                });
              }
            },
          },
        },
      })
  );

  useEffect(() => {
    setupOfflineSupport(queryClient);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <QueryProviderInner>
        {children}
      </QueryProviderInner>
    </QueryClientProvider>
  );
};
