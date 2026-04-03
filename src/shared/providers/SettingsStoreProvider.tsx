'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useLiteSettingsMap, useSettingsMap } from '@/shared/hooks/use-settings';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type SettingsStoreValue = {
  map: Map<string, string>;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  get: (key: string) => string | undefined;
  getBoolean: (key: string, fallback?: boolean) => boolean;
  getNumber: (key: string, fallback?: number) => number | undefined;
  refetch: () => void;
};

// Stable context — only changes when map data, error, or loading state changes.
// Does NOT change when isFetching toggles during background re-validation.
const { Context: SettingsStoreContext, useOptionalContext: useOptionalSettingsStoreContext } =
  createStrictContext<SettingsStoreValue>({
    hookName: 'useSettingsStore',
    providerName: 'SettingsStoreProvider',
    displayName: 'SettingsStoreContext',
  });

// Volatile context — changes on every fetch cycle. Only subscribe if you need
// real-time fetching state (e.g. a "refreshing" spinner).
const {
  Context: SettingsStoreFetchingContext,
  useOptionalContext: useOptionalSettingsStoreFetchingContext,
} = createStrictContext<boolean>({
  hookName: 'useSettingsStoreFetching',
  providerName: 'SettingsStoreProvider',
  displayName: 'SettingsStoreFetchingContext',
});

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

const scheduleDeferredAdminSettingsHydration = (onReady: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    onReady();
    return (): void => {
      // no-op
    };
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleHandle = window.requestIdleCallback(() => {
      onReady();
    });
    return (): void => {
      window.cancelIdleCallback(idleHandle);
    };
  }

  const timeoutHandle = window.setTimeout(() => {
    onReady();
  }, 1);
  return (): void => {
    window.clearTimeout(timeoutHandle);
  };
};

const resolveCurrentPathname = (pathname: string | null): string => {
  if (typeof window !== 'undefined' && typeof window.location.pathname === 'string') {
    return window.location.pathname;
  }
  return pathname ?? '';
};

const areSettingsMapsEqual = (
  left: ReadonlyMap<string, string>,
  right: ReadonlyMap<string, string>
): boolean => {
  if (left === right) return true;
  if (left.size !== right.size) return false;

  for (const [key, value] of right) {
    if (left.get(key) !== value) return false;
  }

  return true;
};

const mergeSettingsMaps = (
  base: ReadonlyMap<string, string>,
  override: ReadonlyMap<string, string>
): Map<string, string> => {
  if (base.size === 0) return new Map(override);
  if (override.size === 0) return new Map(base);

  const merged = new Map(base);
  override.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
};

export function SettingsStoreProvider({
  children,
  mode = 'lite',
  suppressOwnQuery = false,
  canReadAdminSettings,
}: {
  children: React.ReactNode;
  mode?: 'admin' | 'lite';
  suppressOwnQuery?: boolean;
  canReadAdminSettings?: boolean;
}): React.JSX.Element {
  const pathname = usePathname();
  const currentPathname = resolveCurrentPathname(pathname);
  const useAdmin = mode === 'admin';
  const allowAdminSettings = canReadAdminSettings ?? true;
  const shouldUseAdminSettings = useAdmin && allowAdminSettings;
  const isAdminRoute = currentPathname.startsWith('/admin');
  const shouldSuppressLiteQuery = suppressOwnQuery || (!useAdmin && isAdminRoute);
  const shouldSuppressAdminQuery = suppressOwnQuery;
  const [shouldHydrateAdminSettings, setShouldHydrateAdminSettings] = useState(false);

  useEffect(() => {
    if (!shouldUseAdminSettings || shouldSuppressAdminQuery) {
      if (shouldHydrateAdminSettings) {
        setShouldHydrateAdminSettings(false);
      }
      return;
    }
    if (shouldHydrateAdminSettings) return;

    return scheduleDeferredAdminSettingsHydration(() => {
      setShouldHydrateAdminSettings(true);
    });
  }, [
    shouldHydrateAdminSettings,
    shouldSuppressAdminQuery,
    shouldUseAdminSettings,
  ]);

  const adminQuery = useSettingsMap({
    scope: 'light',
    enabled: shouldUseAdminSettings && !shouldSuppressAdminQuery && shouldHydrateAdminSettings,
  });
  const liteQuery = useLiteSettingsMap({
    enabled: !shouldSuppressLiteQuery,
  });

  const settingsQuery = shouldUseAdminSettings ? adminQuery : liteQuery;
  const mergedAdminMap = useMemo(() => {
    if (!shouldUseAdminSettings) return emptyMap;

    const liteMap = liteQuery.data instanceof Map ? liteQuery.data : emptyMap;
    const fullMap = adminQuery.data instanceof Map ? adminQuery.data : emptyMap;
    return mergeSettingsMaps(liteMap, fullMap);
  }, [adminQuery.data, liteQuery.data, shouldUseAdminSettings]);

  const mapData = shouldUseAdminSettings ? mergedAdminMap : settingsQuery.data;
  const isLoading = shouldUseAdminSettings
    ? liteQuery.isLoading && mergedAdminMap.size === 0
    : settingsQuery.isLoading;
  const isFetching = shouldUseAdminSettings
    ? liteQuery.isFetching || adminQuery.isFetching
    : settingsQuery.isFetching;
  const error = shouldUseAdminSettings
    ? liteQuery.error ?? (mergedAdminMap.size === 0 ? adminQuery.error : null) ?? null
    : settingsQuery.error ?? null;
  const refetch = useMemo(
    () => () => {
      if (shouldUseAdminSettings) {
        if (!shouldHydrateAdminSettings) {
          setShouldHydrateAdminSettings(true);
        }
        void liteQuery.refetch();
        void adminQuery.refetch();
        return;
      }
      void settingsQuery.refetch();
    },
    [
      adminQuery,
      liteQuery,
      settingsQuery,
      shouldHydrateAdminSettings,
      shouldUseAdminSettings,
    ]
  );
  const stableMapRef = useRef<Map<string, string>>(emptyMap);
  const stableMap = useMemo(() => {
    const nextMap = mapData instanceof Map ? mapData : emptyMap;
    if (areSettingsMapsEqual(stableMapRef.current, nextMap)) {
      return stableMapRef.current;
    }

    stableMapRef.current = nextMap;
    return nextMap;
  }, [mapData]);

  // Stable value — excludes isFetching so background re-validation doesn't
  // trigger re-renders in the ~50+ consumers that only read settings data.
  const value = useMemo<SettingsStoreValue>(() => {
    const map = stableMap;
    return {
      map,
      isLoading,
      // isFetching is included for type compatibility but reads from the
      // snapshot at memo-creation time. Consumers needing live isFetching
      // should use useSettingsStoreFetching() instead.
      isFetching: false,
      error,
      get: (key: string): string | undefined => map.get(key),
      getBoolean: (key: string, fallback: boolean = false): boolean =>
        parseBoolean(map.get(key), fallback),
      getNumber: (key: string, fallback?: number): number | undefined =>
        parseNumber(map.get(key), fallback),
      refetch: (): void => {
        refetch();
      },
    };
  }, [error, isLoading, refetch, stableMap]);

  return (
    <SettingsStoreFetchingContext.Provider value={isFetching}>
      <SettingsStoreContext.Provider value={value}>{children}</SettingsStoreContext.Provider>
    </SettingsStoreFetchingContext.Provider>
  );
}

export function useSettingsStore(): SettingsStoreValue {
  const context = useOptionalSettingsStoreContext();
  if (!context) {
    if (process.env['NODE_ENV'] === 'development') {
      logClientError(new Error('Missing SettingsStoreProvider context; returning defaults.'), {
        context: { source: 'useSettingsStore', level: 'warn' },
      });
    }
    return fallbackStore;
  }
  return context;
}

/**
 * Subscribe to real-time fetching state. Only use this if you need to show
 * a "refreshing" indicator — most consumers should use useSettingsStore() instead.
 */
export function useSettingsStoreFetching(): boolean {
  return useOptionalSettingsStoreFetchingContext() ?? false;
}
