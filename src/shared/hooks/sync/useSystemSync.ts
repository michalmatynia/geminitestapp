'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';

import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';
import { logClientEvent } from '@/shared/utils/observability/client-error-logger';

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
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const performSync = useCallback(async (): Promise<void> => {
    logClientEvent({
      level: 'info',
      message: 'Starting system-wide sync (performSync)',
      context: { source: 'useSystemSync', action: 'sync-start', isOnline },
    });
    await queryClient.refetchQueries({
      predicate: (query: {
        queryKey: unknown;
        isStale: () => boolean;
        options?: { queryFn?: unknown };
      }) =>
        Array.isArray(query.queryKey) &&
        query.isStale() &&
        typeof query.options?.queryFn === 'function',
    });
    if (isOnline) {
      await processQueue();
    }
    const now = new Date();
    setLastSync(now);
    logClientEvent({
      level: 'info',
      message: 'Successfully completed system-wide sync',
      context: { source: 'useSystemSync', action: 'sync-complete', lastSync: now.toISOString() },
    });
  }, [isOnline, queryClient, processQueue]);

  // Monitor online/offline status
  useEffect((): (() => void) => {
    const handleOnline = (): void => {
      setIsOnline(true);
      logClientEvent({
        level: 'info',
        message: 'Browser reported online',
        context: { source: 'useSystemSync', action: 'network-status', online: true },
      });
    };
    const handleOffline = (): void => {
      setIsOnline(false);
      logClientEvent({
        level: 'warn',
        message: 'Browser reported offline',
        context: { source: 'useSystemSync', action: 'network-status', online: false },
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return (): void => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync when coming back online (skip initial mount — only on false→true transition)
  const wasOfflineRef = useRef(false);
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return undefined;
    }
    if (wasOfflineRef.current && enabled) {
      wasOfflineRef.current = false;
      const timer = setTimeout(() => {
        void performSync();
      }, 0);
      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, enabled, performSync]);

  // Periodic sync for critical data
  useEffect((): (() => void) => {
    if (!enabled || !isOnline) return (): void => {};

    const syncCriticalData = (): void => {
      logClientEvent({
        level: 'info',
        message: 'Syncing critical system data',
        context: { source: 'useSystemSync', action: 'periodic-sync', intervalMs: interval },
      });
      const canRefetch = (query: {
        queryKey: unknown;
        options?: { queryFn?: unknown };
        isStale?: () => boolean;
      }): boolean =>
        Array.isArray(query.queryKey) &&
        typeof query.options?.queryFn === 'function' &&
        (typeof query.isStale !== 'function' || query.isStale());

      // Sync job statuses
      void queryClient.refetchQueries({
        predicate: (query: {
          queryKey: unknown;
          options?: { queryFn?: unknown };
          isStale?: () => boolean;
        }) =>
          canRefetch(query) &&
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === QUERY_KEYS.jobs.all[0],
      });
      // Sync user preferences
      void queryClient.refetchQueries({
        predicate: (query: {
          queryKey: unknown;
          options?: { queryFn?: unknown };
          isStale?: () => boolean;
        }) =>
          canRefetch(query) &&
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === QUERY_KEYS.userPreferences.all[0],
      });
      // Sync settings
      void queryClient.refetchQueries({
        predicate: (query: {
          queryKey: unknown;
          options?: { queryFn?: unknown };
          isStale?: () => boolean;
        }) =>
          canRefetch(query) &&
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === QUERY_KEYS.settings.all[0],
      });

      setLastSync(new Date());
    };

    const intervalId = safeSetInterval(syncCriticalData, interval);
    return (): void => safeClearInterval(intervalId);
  }, [enabled, isOnline, interval, queryClient]);

  return {
    isOnline,
    lastSync,
    forceSync: (): void => {
      void performSync();
    },
  };
}
