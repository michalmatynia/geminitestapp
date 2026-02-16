'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface SyncConfig {
  queryKey: readonly unknown[];
  interval?: number;
  enabled?: boolean;
}

// Hook for synchronizing queries across tabs/windows
export function useQuerySync(configs: SyncConfig[]): void {
  const queryClient = useQueryClient();

  const handleStorageChange = useCallback((event: StorageEvent): void => {
    if (event.key?.startsWith('tanstack-query-sync-')) {
      const storageKey = event.key.replace('tanstack-query-sync-', '');
      const matchingConfig = configs.find((config: SyncConfig) => 
        JSON.stringify(config.queryKey) === storageKey
      );
      
      if (matchingConfig && event.newValue) {
        try {
          const data = JSON.parse(event.newValue) as unknown;
          queryClient.setQueryData(matchingConfig.queryKey, data);
        } catch (error) {
          logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useQuerySync', action: 'syncQueryDataFailed', level: 'warn' } });
        }
      }
    }
  }, [configs, queryClient]);

  useEffect((): (() => void) => {
    window.addEventListener('storage', handleStorageChange);
    return (): void => window.removeEventListener('storage', handleStorageChange);
  }, [handleStorageChange]);

  // Sync data to localStorage when queries update
  useEffect((): void => {
    configs.forEach((config: SyncConfig) => {
      if (config.enabled !== false) {
        const data = queryClient.getQueryData(config.queryKey);
        if (data) {
          const key = `tanstack-query-sync-${JSON.stringify(config.queryKey)}`;
          localStorage.setItem(key, JSON.stringify(data));
        }
      }
    });
  });
}

// Hook for query dependencies - refetch dependent queries when parent changes
export function useQueryDependency(
  parentQueryKey: readonly unknown[],
  dependentQueryKeys: readonly (readonly unknown[])[],
  options?: { enabled?: boolean }
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (options?.enabled === false) return;

    const parentKeySnapshot = JSON.stringify(parentQueryKey);
    const unsubscribe = queryClient.getQueryCache().subscribe((event): void => {
      if (event.type !== 'updated') return;
      if (JSON.stringify(event.query.queryKey) !== parentKeySnapshot) return;
      if (event.query.state.data === undefined) return;

      dependentQueryKeys.forEach((queryKey: readonly unknown[]) => {
        void queryClient.invalidateQueries({ queryKey });
      });
    });

    return (): void => unsubscribe();
  }, [dependentQueryKeys, options?.enabled, parentQueryKey, queryClient]);
}
