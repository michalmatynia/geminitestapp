'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface PersistenceConfig {
  key: string;
  queryKeys: unknown[][];
  storage?: Storage;
  ttl?: number; // Time to live in milliseconds
  maxItemBytes?: number;
}

const DEFAULT_MAX_ITEM_BYTES = 64 * 1024;
const quotaErrorNames = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']);
const mutedQuotaKeys = new Set<string>();

const isQuotaExceededError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' && quotaErrorNames.has(name);
};

interface PersistedItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl?: number;
}

// Hook for persisting query data to localStorage/sessionStorage
export function useQueryPersistence(config: PersistenceConfig): { clearPersisted: () => void } {
  const queryClient = useQueryClient();
  const storage = typeof window !== 'undefined' ? config.storage || localStorage : null;
  const maxItemBytes = config.maxItemBytes ?? DEFAULT_MAX_ITEM_BYTES;

  const saveToStorage = useCallback(
    (queryKey: unknown[], data: unknown): void => {
      if (!storage) return;
      const key = `${config.key}-${JSON.stringify(queryKey)}`;
      try {
        const item: PersistedItem = {
          data,
          timestamp: Date.now(),
          ttl: config.ttl,
        };
        const serialized = JSON.stringify(item);
        if (serialized.length > maxItemBytes) {
          storage.removeItem(key);
          return;
        }
        storage.setItem(key, serialized);
        mutedQuotaKeys.delete(key);
      } catch (error) {
        if (isQuotaExceededError(error)) {
          storage.removeItem(key);
          if (mutedQuotaKeys.has(key)) return;
          mutedQuotaKeys.add(key);
        }
        logClientError(error instanceof Error ? error : new Error(String(error)), {
          context: {
            source: 'useQueryPersistence',
            action: 'saveQueryToStorage',
            level: 'warn',
            storageKey: key,
          },
        });
      }
    },
    [config.key, config.ttl, maxItemBytes, storage]
  );

  const loadFromStorage = useCallback(
    (queryKey: unknown[]): unknown | null => {
      if (!storage) return null;
      try {
        const key = `${config.key}-${JSON.stringify(queryKey)}`;
        const item = storage.getItem(key);
        if (!item) return null;

        const parsed = JSON.parse(item) as PersistedItem;

        // Check TTL
        if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
          storage.removeItem(key);
          return null;
        }

        return parsed.data;
      } catch (error) {
        logClientError(error instanceof Error ? error : new Error(String(error)), {
          context: { source: 'useQueryPersistence', action: 'loadQueryFromStorage', level: 'warn' },
        });
        return null;
      }
    },
    [config.key, storage]
  );

  // Load persisted data on mount
  useEffect((): void => {
    config.queryKeys.forEach((queryKey: unknown[]): void => {
      const data = loadFromStorage(queryKey);
      if (data) {
        queryClient.setQueryData(queryKey, data);
      }
    });
  }, [config.queryKeys, loadFromStorage, queryClient]);

  // Save data when queries update
  useEffect((): (() => void) => {
    const unsubscribes = config.queryKeys.map((queryKey: unknown[]) => {
      return queryClient.getQueryCache().subscribe((event): void => {
        if (
          event.type === 'updated' &&
          JSON.stringify(event.query.queryKey) === JSON.stringify(queryKey)
        ) {
          const data = queryClient.getQueryData(queryKey);
          if (data) {
            saveToStorage(queryKey, data);
          }
        }
      });
    });

    return (): void => {
      unsubscribes.forEach((unsubscribe: () => void) => unsubscribe());
    };
  }, [config.queryKeys, queryClient, saveToStorage]);

  const clearPersisted = useCallback((): void => {
    if (!storage) return;
    config.queryKeys.forEach((queryKey: unknown[]): void => {
      const key = `${config.key}-${JSON.stringify(queryKey)}`;
      storage.removeItem(key);
    });
  }, [config.key, config.queryKeys, storage]);

  return { clearPersisted };
}

// Hook for form state persistence
export function useFormPersistence<T>(
  formKey: string,
  defaultValues: T,
  options?: { ttl?: number; storage?: Storage }
): {
  saveForm: (values: T) => void;
  loadForm: () => T;
  clearForm: () => void;
} {
  const storage = typeof window !== 'undefined' ? options?.storage || sessionStorage : null;
  const key = `form-${formKey}`;

  const saveForm = useCallback(
    (values: T): void => {
      if (!storage) return;
      try {
        const item: PersistedItem<T> = {
          data: values,
          timestamp: Date.now(),
          ttl: options?.ttl,
        };
        storage.setItem(key, JSON.stringify(item));
      } catch (error) {
        logClientError(error instanceof Error ? error : new Error(String(error)), {
          context: { source: 'useFormPersistence', action: 'saveFormState', level: 'warn' },
        });
      }
    },
    [key, options?.ttl, storage]
  );

  const loadForm = useCallback((): T => {
    if (!storage) return defaultValues;
    try {
      const item = storage.getItem(key);
      if (!item) return defaultValues;

      const parsed = JSON.parse(item) as PersistedItem<T>;

      // Check TTL
      if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
        storage.removeItem(key);
        return defaultValues;
      }

      return { ...defaultValues, ...parsed.data };
    } catch (error) {
      logClientError(error instanceof Error ? error : new Error(String(error)), {
        context: { source: 'useFormPersistence', action: 'loadFormState', level: 'warn' },
      });
      return defaultValues;
    }
  }, [key, defaultValues, storage]);

  const clearForm = useCallback((): void => {
    if (!storage) return;
    storage.removeItem(key);
  }, [key, storage]);

  return { saveForm, loadForm, clearForm };
}
