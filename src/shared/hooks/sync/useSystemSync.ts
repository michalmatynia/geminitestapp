import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { useOfflineSync } from '../offline/useOfflineMutation';

interface SystemSyncOptions {
  enabled?: boolean;
  interval?: number;
}

export function useSystemSync({ enabled = true, interval = 60000 }: SystemSyncOptions = {}): {
  isOnline: boolean;
  lastSync: Date | null;
  forceSync: () => void;
} {
  const queryClient = useQueryClient();
  const { processQueue } = useOfflineSync();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const performSync = useCallback(async (): Promise<void> => {
    await queryClient.refetchQueries({
      predicate: (query: { queryKey: unknown; isStale: () => boolean; options?: { queryFn?: unknown } }) =>
        Array.isArray(query.queryKey) &&
        query.isStale() &&
        typeof query.options?.queryFn === 'function',
    });
    if (isOnline) {
      await processQueue();
    }
    setLastSync(new Date());
  }, [isOnline, queryClient, processQueue]);

  // Monitor online/offline status
  useEffect((): () => void => {
    const handleOnline = (): void => setIsOnline(true);
    const handleOffline = (): void => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return (): void => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && enabled) {
      const timer = setTimeout(() => {
        void performSync();
      }, 0);
      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, enabled, performSync]);

  // Periodic sync for critical data
  useEffect((): () => void => {
    if (!enabled || !isOnline) return (): void => {};

    const syncCriticalData = (): void => {
      const canRefetch = (query: { queryKey: unknown; options?: { queryFn?: unknown }; isStale?: () => boolean }): boolean =>
        Array.isArray(query.queryKey) &&
        typeof query.options?.queryFn === 'function' &&
        (typeof query.isStale !== 'function' || query.isStale());

      // Sync job statuses
      void queryClient.refetchQueries({
        predicate: (query: { queryKey: unknown; options?: { queryFn?: unknown }; isStale?: () => boolean }) =>
          canRefetch(query) && Array.isArray(query.queryKey) && query.queryKey[0] === 'jobs',
      });
      // Sync user preferences
      void queryClient.refetchQueries({
        predicate: (query: { queryKey: unknown; options?: { queryFn?: unknown }; isStale?: () => boolean }) =>
          canRefetch(query) &&
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === QUERY_KEYS.userPreferences[0],
      });
      // Sync settings
      void queryClient.refetchQueries({
        predicate: (query: { queryKey: unknown; options?: { queryFn?: unknown }; isStale?: () => boolean }) =>
          canRefetch(query) && Array.isArray(query.queryKey) && query.queryKey[0] === 'settings',
      });
      
      setLastSync(new Date());
    };

    const intervalId = setInterval(syncCriticalData, interval);
    return (): void => clearInterval(intervalId);
  }, [enabled, isOnline, interval, queryClient]);

  return {
    isOnline,
    lastSync,
    forceSync: (): void => {
      void performSync();
    },
  };
}
