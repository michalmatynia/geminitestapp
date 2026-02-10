"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { logger } from "@/shared/utils/logger";

interface PersistenceConfig {
  key: string;
  queryKeys: unknown[][];
  storage?: Storage;
  ttl?: number; // Time to live in milliseconds
}

// Hook for persisting query data to localStorage/sessionStorage
export function useQueryPersistence(config: PersistenceConfig) {
  const queryClient = useQueryClient();
  const storage = typeof window !== 'undefined' ? (config.storage || localStorage) : null;

  const saveToStorage = useCallback((queryKey: unknown[], data: unknown) => {
    if (!storage) return;
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl: config.ttl,
      };
      const key = `${config.key}-${JSON.stringify(queryKey)}`;
      storage.setItem(key, JSON.stringify(item));
    } catch (error) {
      logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useQueryPersistence', action: 'saveQueryToStorage', level: 'warn' } });
    }
  }, [config.key, config.ttl, storage]);

  const loadFromStorage = useCallback((queryKey: unknown[]) => {
    if (!storage) return null;
    try {
      const key = `${config.key}-${JSON.stringify(queryKey)}`;
      const item = storage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Check TTL
      if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
        storage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useQueryPersistence', action: 'loadQueryFromStorage', level: 'warn' } });
      return null;
    }
  }, [config.key, storage]);

  // Load persisted data on mount
  useEffect(() => {
    config.queryKeys.forEach(queryKey => {
      const data = loadFromStorage(queryKey);
      if (data) {
        queryClient.setQueryData(queryKey, data);
      }
    });
  }, [config.queryKeys, loadFromStorage, queryClient]);

  // Save data when queries update
  useEffect(() => {
    const unsubscribes = config.queryKeys.map(queryKey => {
      return queryClient.getQueryCache().subscribe(event => {
        if (event.type === 'updated' && 
            JSON.stringify(event.query.queryKey) === JSON.stringify(queryKey)) {
          const data = queryClient.getQueryData(queryKey);
          if (data) {
            saveToStorage(queryKey, data);
          }
        }
      });
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [config.queryKeys, queryClient, saveToStorage]);

  const clearPersisted = useCallback(() => {
    if (!storage) return;
    config.queryKeys.forEach(queryKey => {
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
) {
  const storage = typeof window !== 'undefined' ? (options?.storage || sessionStorage) : null;
  const key = `form-${formKey}`;

  const saveForm = useCallback((values: T) => {
    if (!storage) return;
    try {
      const item = {
        data: values,
        timestamp: Date.now(),
        ttl: options?.ttl,
      };
      storage.setItem(key, JSON.stringify(item));
    } catch (error) {
      logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useFormPersistence', action: 'saveFormState', level: 'warn' } });
    }
  }, [key, options?.ttl, storage]);

  const loadForm = useCallback((): T => {
    if (!storage) return defaultValues;
    try {
      const item = storage.getItem(key);
      if (!item) return defaultValues;

      const parsed = JSON.parse(item);
      
      // Check TTL
      if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
        storage.removeItem(key);
        return defaultValues;
      }

      return { ...defaultValues, ...parsed.data };
    } catch (error) {
      logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useFormPersistence', action: 'loadFormState', level: 'warn' } });
      return defaultValues;
    }
  }, [key, defaultValues, storage]);

  const clearForm = useCallback(() => {
    if (!storage) return;
    storage.removeItem(key);
  }, [key, storage]);

  return { saveForm, loadForm, clearForm };
}
