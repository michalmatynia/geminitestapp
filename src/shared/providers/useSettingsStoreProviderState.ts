'use client';

import { useMemo, useRef } from 'react';

import { useLiteSettingsMap, useSettingsMap } from '@/shared/hooks/use-settings';
import {
  emptySettingsMap,
  parseSettingsBoolean,
  parseSettingsNumber,
  type SettingsStoreValue,
} from '@/shared/providers/SettingsStoreProvider.shared';
import {
  areSettingsMapsEqual,
  createSettingsStoreRefetch,
  resolveMergedAdminMap,
  resolveProviderFlags,
  resolveSettingsStoreErrorState,
  resolveSettingsStoreFetchingState,
  resolveSettingsStoreLoadingState,
  resolveSettingsStoreMapData,
  type ProviderFlags,
  type SettingsMode,
  type SettingsQueryLike,
} from '@/shared/providers/useSettingsStoreProviderState.utils';

type UseSettingsStoreProviderStateOptions = {
  canReadAdminSettings?: boolean;
  mode: SettingsMode;
  parentFetching: boolean;
  parentStore: SettingsStoreValue | null;
  pathname: string | null;
  suppressOwnQuery: boolean;
};

type SettingsStoreQueryState = {
  error: Error | null;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => void;
};

type ResolvedSettingsStoreState = SettingsStoreQueryState & {
  mapData: ReadonlyMap<string, string>;
};

const useSettingsStoreQueries = ({
  canReadAdminSettings,
  mode,
  parentStore,
  pathname,
  suppressOwnQuery,
}: Omit<UseSettingsStoreProviderStateOptions, 'parentFetching'>): {
  adminQuery: SettingsQueryLike;
  flags: ProviderFlags;
  liteQuery: SettingsQueryLike;
  settingsQuery: SettingsQueryLike;
} => {
  const flags = resolveProviderFlags({
    canReadAdminSettings,
    mode,
    parentStore,
    pathname,
    suppressOwnQuery,
  });
  const adminQuery = useSettingsMap({
    scope: 'light',
    enabled: flags.shouldUseAdminSettings && !flags.shouldSuppressAdminQuery,
  });
  const liteQuery = useLiteSettingsMap({
    enabled: !flags.shouldSuppressLiteQuery && !flags.shouldReuseParentLiteStore,
  });

  return {
    adminQuery,
    flags,
    liteQuery,
    settingsQuery: flags.shouldUseAdminSettings ? adminQuery : liteQuery,
  };
};

const useResolvedSettingsStoreMapData = ({
  adminQuery,
  flags,
  liteQuery,
  parentStore,
  settingsQuery,
}: {
  adminQuery: SettingsQueryLike;
  flags: ProviderFlags;
  liteQuery: SettingsQueryLike;
  parentStore: SettingsStoreValue | null;
  settingsQuery: SettingsQueryLike;
}): ReadonlyMap<string, string> => {
  const mergedAdminMap = useMemo(
    () =>
      resolveMergedAdminMap({
        adminQuery,
        liteQuery,
        parentStore,
        shouldReuseParentLiteStore: flags.shouldReuseParentLiteStore,
        shouldUseAdminSettings: flags.shouldUseAdminSettings,
      }),
    [adminQuery.data, flags.shouldReuseParentLiteStore, flags.shouldUseAdminSettings, liteQuery.data, parentStore?.map]
  );

  return resolveSettingsStoreMapData({
    mergedAdminMap,
    settingsQuery,
    shouldUseAdminSettings: flags.shouldUseAdminSettings,
  });
};

const useResolvedSettingsStoreQueryState = ({
  adminQuery,
  flags,
  liteQuery,
  parentFetching,
  parentStore,
  settingsQuery,
}: {
  adminQuery: SettingsQueryLike;
  flags: ProviderFlags;
  liteQuery: SettingsQueryLike;
  parentFetching: boolean;
  parentStore: SettingsStoreValue | null;
  settingsQuery: SettingsQueryLike;
}): SettingsStoreQueryState => {
  const refetch = useMemo(
    () =>
      createSettingsStoreRefetch({
        adminQuery,
        liteQuery,
        parentStore,
        settingsQuery,
        shouldReuseParentLiteStore: flags.shouldReuseParentLiteStore,
        shouldUseAdminSettings: flags.shouldUseAdminSettings,
      }),
    [adminQuery, flags.shouldReuseParentLiteStore, flags.shouldUseAdminSettings, liteQuery, parentStore, settingsQuery]
  );

  return {
    error: resolveSettingsStoreErrorState({
      adminQuery,
      liteQuery,
      parentStore,
      settingsQuery,
      shouldReuseParentLiteStore: flags.shouldReuseParentLiteStore,
      shouldUseAdminSettings: flags.shouldUseAdminSettings,
    }),
    isFetching: resolveSettingsStoreFetchingState({
      adminQuery,
      liteQuery,
      parentFetching,
      settingsQuery,
      shouldReuseParentLiteStore: flags.shouldReuseParentLiteStore,
      shouldUseAdminSettings: flags.shouldUseAdminSettings,
    }),
    isLoading: resolveSettingsStoreLoadingState({
      adminQuery,
      liteQuery,
      parentStore,
      settingsQuery,
      shouldReuseParentLiteStore: flags.shouldReuseParentLiteStore,
      shouldSuppressAdminQuery: flags.shouldSuppressAdminQuery,
      shouldUseAdminSettings: flags.shouldUseAdminSettings,
    }),
    refetch,
  };
};

const useResolvedSettingsStoreState = ({
  adminQuery,
  flags,
  liteQuery,
  parentFetching,
  parentStore,
  settingsQuery,
}: {
  adminQuery: SettingsQueryLike;
  flags: ProviderFlags;
  liteQuery: SettingsQueryLike;
  parentFetching: boolean;
  parentStore: SettingsStoreValue | null;
  settingsQuery: SettingsQueryLike;
}): ResolvedSettingsStoreState => {
  const mapData = useResolvedSettingsStoreMapData({
    adminQuery,
    flags,
    liteQuery,
    parentStore,
    settingsQuery,
  });
  const queryState = useResolvedSettingsStoreQueryState({
    adminQuery,
    flags,
    liteQuery,
    parentFetching,
    parentStore,
    settingsQuery,
  });

  return { ...queryState, mapData };
};

const useStableSettingsMap = (mapData: ReadonlyMap<string, string>): Map<string, string> => {
  const stableMapRef = useRef<Map<string, string>>(emptySettingsMap);

  return useMemo<Map<string, string>>(() => {
    const nextMap = mapData === emptySettingsMap ? emptySettingsMap : new Map(mapData);
    if (areSettingsMapsEqual(stableMapRef.current, nextMap)) {
      return stableMapRef.current;
    }

    stableMapRef.current = nextMap;
    return nextMap;
  }, [mapData]);
};

const useSettingsStoreValue = ({
  error,
  isLoading,
  mapData,
  refetch,
}: {
  error: Error | null;
  isLoading: boolean;
  mapData: ReadonlyMap<string, string>;
  refetch: () => void;
}): SettingsStoreValue => {
  const stableMap = useStableSettingsMap(mapData);

  return useMemo<SettingsStoreValue>(() => {
    const map = stableMap;
    return {
      map,
      isLoading,
      isFetching: false,
      error,
      get: (key: string): string | undefined => map.get(key),
      getBoolean: (key: string, fallback: boolean = false): boolean =>
        parseSettingsBoolean(map.get(key), fallback),
      getNumber: (key: string, fallback?: number): number | undefined =>
        parseSettingsNumber(map.get(key), fallback),
      refetch: (): void => {
        refetch();
      },
    };
  }, [error, isLoading, refetch, stableMap]);
};

export const useSettingsStoreProviderState = ({
  canReadAdminSettings,
  mode,
  parentFetching,
  parentStore,
  pathname,
  suppressOwnQuery,
}: UseSettingsStoreProviderStateOptions): {
  isFetching: boolean;
  value: SettingsStoreValue;
} => {
  const queries = useSettingsStoreQueries({
    canReadAdminSettings,
    mode,
    parentStore,
    pathname,
    suppressOwnQuery,
  });
  const resolvedState = useResolvedSettingsStoreState({
    adminQuery: queries.adminQuery,
    flags: queries.flags,
    liteQuery: queries.liteQuery,
    parentFetching,
    parentStore,
    settingsQuery: queries.settingsQuery,
  });
  const value = useSettingsStoreValue(resolvedState);

  return { isFetching: resolvedState.isFetching, value };
};
