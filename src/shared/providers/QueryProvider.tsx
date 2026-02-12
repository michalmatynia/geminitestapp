/* eslint-disable */
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { setupOfflineSupport } from "@/shared/lib/offline-support";
import { createQueryClient } from "@/shared/lib/query-client";
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
    process.env["NODE_ENV"] === 'development' 
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
      ['user-preferences'],
      ['settings', 'light'],
      ['settings', 'lite'],
    ],
    ttl: 1000 * 60 * 60, // 1 hour
  });

  return <>{children}</>;
}

export const QueryProvider = ({ children }: QueryProviderProps): React.JSX.Element => {
  const [queryClient] = useState(() => createQueryClient());

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
