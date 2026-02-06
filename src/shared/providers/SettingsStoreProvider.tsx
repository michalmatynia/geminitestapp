'use client';

import React, { createContext, useContext, useMemo } from 'react';

import { useLiteSettingsMap, useSettingsMap } from '@/shared/hooks/use-settings';

type SettingsStoreValue = {
  map: Map<string, string>;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  get: (key: string) => string | undefined;
  getBoolean: (key: string, fallback?: boolean) => boolean;
  getNumber: (key: string, fallback?: number) => number | undefined;
  refetch: () => void;
};

const SettingsStoreContext = createContext<SettingsStoreValue | null>(null);
const emptyMap = new Map<string, string>();
const fallbackStore: SettingsStoreValue = {
  map: emptyMap,
  isLoading: false,
  isFetching: false,
  error: null,
  get: (key: string): string | undefined => emptyMap.get(key),
  getBoolean: (_key: string, fallback: boolean = false): boolean => fallback,
  getNumber: (_key: string, fallback?: number): number | undefined => fallback,
  refetch: (): void => {
    // no-op
  },
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const parseNumber = (value: string | undefined, fallback?: number): number | undefined => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function SettingsStoreProvider({
  children,
  mode = 'lite',
}: {
  children: React.ReactNode;
  mode?: 'admin' | 'lite';
}): React.JSX.Element {
  const useAdmin = mode === 'admin';
  const adminQuery = useSettingsMap({ scope: 'light', enabled: useAdmin });
  const liteQuery = useLiteSettingsMap({ enabled: !useAdmin });
  const settingsQuery = useAdmin ? adminQuery : liteQuery;

  const value = useMemo<SettingsStoreValue>(() => {
    const map = settingsQuery.data ?? new Map<string, string>();
    return {
      map,
      isLoading: settingsQuery.isLoading,
      isFetching: settingsQuery.isFetching,
      error: settingsQuery.error ?? null,
      get: (key: string): string | undefined => map.get(key),
      getBoolean: (key: string, fallback: boolean = false): boolean =>
        parseBoolean(map.get(key), fallback),
      getNumber: (key: string, fallback?: number): number | undefined =>
        parseNumber(map.get(key), fallback),
      refetch: (): void => {
        void settingsQuery.refetch();
      },
    };
  }, [settingsQuery]);

  return (
    <SettingsStoreContext.Provider value={value}>
      {children}
    </SettingsStoreContext.Provider>
  );
}

export function useSettingsStore(): SettingsStoreValue {
  const context = useContext(SettingsStoreContext);
  if (!context) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[settings-store] Missing provider; returning defaults.');
    }
    return fallbackStore;
  }
  return context;
}
