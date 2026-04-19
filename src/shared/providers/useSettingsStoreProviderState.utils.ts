'use client';

import {
  emptySettingsMap,
  type SettingsStoreValue,
} from '@/shared/providers/SettingsStoreProvider.shared';

export type SettingsMode = 'admin' | 'lite';

export type SettingsQueryLike = {
  data: unknown;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};

export type ProviderFlags = {
  shouldUseSeededLiteStore: boolean;
  shouldReuseParentLiteStore: boolean;
  shouldSuppressAdminQuery: boolean;
  shouldSuppressLiteQuery: boolean;
  shouldUseAdminSettings: boolean;
};

const resolveCurrentPathname = (pathname: string | null): string => {
  if (typeof window !== 'undefined' && typeof window.location.pathname === 'string') {
    return window.location.pathname;
  }
  return pathname ?? '';
};

export const areSettingsMapsEqual = (
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

export const resolveProviderFlags = ({
  canReadAdminSettings,
  hasInitialLiteStore,
  mode,
  parentStore,
  pathname,
  suppressOwnQuery,
}: {
  canReadAdminSettings?: boolean;
  hasInitialLiteStore: boolean;
  mode: SettingsMode;
  parentStore: SettingsStoreValue | null;
  pathname: string | null;
  suppressOwnQuery: boolean;
}): ProviderFlags => {
  const currentPathname = resolveCurrentPathname(pathname);
  const useAdmin = mode === 'admin';
  const shouldUseAdminSettings = useAdmin && (canReadAdminSettings ?? true);
  const shouldUseSeededLiteStore =
    !shouldUseAdminSettings && !parentStore && hasInitialLiteStore;

  return {
    shouldUseSeededLiteStore,
    shouldReuseParentLiteStore: shouldUseAdminSettings && Boolean(parentStore),
    shouldSuppressAdminQuery: suppressOwnQuery,
    shouldSuppressLiteQuery:
      suppressOwnQuery || shouldUseSeededLiteStore || (!useAdmin && currentPathname.startsWith('/admin')),
    shouldUseAdminSettings,
  };
};

const resolveAdminLiteMap = ({
  liteQuery,
  parentStore,
  shouldReuseParentLiteStore,
}: {
  liteQuery: SettingsQueryLike;
  parentStore: SettingsStoreValue | null;
  shouldReuseParentLiteStore: boolean;
}): ReadonlyMap<string, string> => {
  if (shouldReuseParentLiteStore) {
    return parentStore?.map ?? emptySettingsMap;
  }
  return liteQuery.data instanceof Map ? liteQuery.data : emptySettingsMap;
};

export const resolveMergedAdminMap = ({
  adminQuery,
  liteQuery,
  parentStore,
  shouldReuseParentLiteStore,
  shouldUseAdminSettings,
}: {
  adminQuery: SettingsQueryLike;
  liteQuery: SettingsQueryLike;
  parentStore: SettingsStoreValue | null;
  shouldReuseParentLiteStore: boolean;
  shouldUseAdminSettings: boolean;
}): ReadonlyMap<string, string> => {
  if (!shouldUseAdminSettings) {
    return emptySettingsMap;
  }

  return mergeSettingsMaps(
    resolveAdminLiteMap({ liteQuery, parentStore, shouldReuseParentLiteStore }),
    adminQuery.data instanceof Map ? adminQuery.data : emptySettingsMap
  );
};

export const resolveSettingsStoreLoadingState = ({
  adminQuery,
  initialLiteMap,
  liteQuery,
  parentStore,
  settingsQuery,
  shouldReuseParentLiteStore,
  shouldSuppressAdminQuery,
  shouldUseSeededLiteStore,
  shouldUseAdminSettings,
}: {
  adminQuery: SettingsQueryLike;
  initialLiteMap: ReadonlyMap<string, string>;
  liteQuery: SettingsQueryLike;
  parentStore: SettingsStoreValue | null;
  settingsQuery: SettingsQueryLike;
  shouldReuseParentLiteStore: boolean;
  shouldSuppressAdminQuery: boolean;
  shouldUseSeededLiteStore: boolean;
  shouldUseAdminSettings: boolean;
}): boolean => {
  if (!shouldUseAdminSettings) {
    if (shouldUseSeededLiteStore && initialLiteMap.size > 0) {
      return false;
    }
    return settingsQuery.isLoading;
  }

  const adminBaseLoading =
    shouldReuseParentLiteStore ? (parentStore?.isLoading ?? false) : liteQuery.isLoading;
  const adminScopeLoading = !shouldSuppressAdminQuery && adminQuery.isLoading;
  return adminBaseLoading || adminScopeLoading;
};

export const resolveSettingsStoreFetchingState = ({
  adminQuery,
  initialLiteMap,
  liteQuery,
  parentFetching,
  settingsQuery,
  shouldReuseParentLiteStore,
  shouldUseSeededLiteStore,
  shouldUseAdminSettings,
}: {
  adminQuery: SettingsQueryLike;
  initialLiteMap: ReadonlyMap<string, string>;
  liteQuery: SettingsQueryLike;
  parentFetching: boolean;
  settingsQuery: SettingsQueryLike;
  shouldReuseParentLiteStore: boolean;
  shouldUseSeededLiteStore: boolean;
  shouldUseAdminSettings: boolean;
}): boolean => {
  if (!shouldUseAdminSettings) {
    if (shouldUseSeededLiteStore && initialLiteMap.size > 0) {
      return false;
    }
    return settingsQuery.isFetching;
  }

  return (
    (shouldReuseParentLiteStore ? parentFetching : liteQuery.isFetching) || adminQuery.isFetching
  );
};

export const resolveSettingsStoreErrorState = ({
  adminQuery,
  initialLiteMap,
  liteQuery,
  parentStore,
  settingsQuery,
  shouldReuseParentLiteStore,
  shouldUseSeededLiteStore,
  shouldUseAdminSettings,
}: {
  adminQuery: SettingsQueryLike;
  initialLiteMap: ReadonlyMap<string, string>;
  liteQuery: SettingsQueryLike;
  parentStore: SettingsStoreValue | null;
  settingsQuery: SettingsQueryLike;
  shouldReuseParentLiteStore: boolean;
  shouldUseSeededLiteStore: boolean;
  shouldUseAdminSettings: boolean;
}): Error | null => {
  if (!shouldUseAdminSettings) {
    if (shouldUseSeededLiteStore && initialLiteMap.size > 0) {
      return null;
    }
    return settingsQuery.error ?? null;
  }

  return (
    (shouldReuseParentLiteStore ? parentStore?.error ?? null : liteQuery.error) ??
    adminQuery.error ??
    null
  );
};

export const resolveSettingsStoreMapData = ({
  initialLiteMap,
  mergedAdminMap,
  settingsQuery,
  shouldUseSeededLiteStore,
  shouldUseAdminSettings,
}: {
  initialLiteMap: ReadonlyMap<string, string>;
  mergedAdminMap: ReadonlyMap<string, string>;
  settingsQuery: SettingsQueryLike;
  shouldUseSeededLiteStore: boolean;
  shouldUseAdminSettings: boolean;
}): ReadonlyMap<string, string> => {
  if (shouldUseAdminSettings) {
    return mergedAdminMap;
  }

  if (shouldUseSeededLiteStore && initialLiteMap.size > 0) {
    return initialLiteMap;
  }

  return settingsQuery.data instanceof Map ? settingsQuery.data : emptySettingsMap;
};

const refetchQueryInBackground = (query: Pick<SettingsQueryLike, 'refetch'>): void => {
  query.refetch().catch(() => undefined);
};

export const createSettingsStoreRefetch = ({
  adminQuery,
  liteQuery,
  parentStore,
  settingsQuery,
  shouldReuseParentLiteStore,
  shouldUseAdminSettings,
}: {
  adminQuery: SettingsQueryLike;
  liteQuery: SettingsQueryLike;
  parentStore: SettingsStoreValue | null;
  settingsQuery: SettingsQueryLike;
  shouldReuseParentLiteStore: boolean;
  shouldUseAdminSettings: boolean;
}): (() => void) => {
  if (!shouldUseAdminSettings) {
    return (): void => {
      refetchQueryInBackground(settingsQuery);
    };
  }

  return (): void => {
    if (shouldReuseParentLiteStore) {
      parentStore?.refetch();
    } else {
      refetchQueryInBackground(liteQuery);
    }
    refetchQueryInBackground(adminQuery);
  };
};
