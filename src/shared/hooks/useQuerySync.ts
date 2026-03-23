'use client';

import { useQueryClient, type QueryCacheNotifyEvent } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

interface SyncConfig {
  queryKey: readonly unknown[];
  interval?: number;
  enabled?: boolean;
}

// Hook for synchronizing queries across tabs/windows
export function useQuerySync(configs: SyncConfig[]): void {
  const queryClient = useQueryClient();
  const configsRef = useRef(configs);
  configsRef.current = configs;

  const handleStorageChange = useCallback(
    (event: StorageEvent): void => {
      if (event.key?.startsWith('tanstack-query-sync-')) {
        const storageKey = event.key.replace('tanstack-query-sync-', '');
        const matchingConfig = configsRef.current.find(
          (config: SyncConfig) => JSON.stringify(config.queryKey) === storageKey
        );

        if (matchingConfig && event.newValue) {
          try {
            const data = JSON.parse(event.newValue) as unknown;
            queryClient.setQueryData(matchingConfig.queryKey, data);
          } catch (error) {
            logClientCatch(error, {
              source: 'useQuerySync',
              action: 'syncQueryDataFailed',
              level: 'warn',
              storageKey,
            });
          }
        }
      }
    },
    [queryClient]
  );

  useEffect((): (() => void) => {
    window.addEventListener('storage', handleStorageChange);
    return (): void => window.removeEventListener('storage', handleStorageChange);
  }, [handleStorageChange]);

  // Sync data to localStorage when query cache changes (not on every render)
  useEffect((): (() => void) => {
    const queryCache = queryClient.getQueryCache();
    const unsubscribe = queryCache.subscribe((event: QueryCacheNotifyEvent) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      const updatedKeyStr = JSON.stringify(event.query.queryKey);
      const matchingConfig = configsRef.current.find(
        (config: SyncConfig) =>
          config.enabled !== false && JSON.stringify(config.queryKey) === updatedKeyStr
      );
      if (matchingConfig) {
        const data = queryClient.getQueryData(matchingConfig.queryKey);
        if (data) {
          const key = `tanstack-query-sync-${updatedKeyStr}`;
          localStorage.setItem(key, JSON.stringify(data));
        }
      }
    });
    return unsubscribe;
  }, [queryClient]);
}
