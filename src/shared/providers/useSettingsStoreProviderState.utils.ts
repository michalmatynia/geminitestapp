/**
 * Settings Store Provider State Utilities
 * 
 * Utilities for managing settings store state and provider configuration.
 * Provides:
 * - Settings mode resolution (admin vs lite)
 * - Provider flag determination
 * - Settings map comparison and merging
 * - Pathname resolution for routing context
 * - Query-like interface abstraction
 * 
 * Client-side utilities for settings provider state management
 */

'use client';

import {
  emptySettingsMap,
  type SettingsStoreValue,
} from '@/shared/providers/SettingsStoreProvider.shared';

/**
 * Settings access mode
 * - admin: Full settings with admin access
 * - lite: Limited settings for public/user access
 */
export type SettingsMode = 'admin' | 'lite';

/**
 * Query-like interface for async data fetching
 * Abstracts TanStack Query or similar patterns
 */
export type SettingsQueryLike = {
  /** Query result data */
  data: unknown;
  /** Whether query is loading initial data */
  isLoading: boolean;
  /** Whether query is currently fetching */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Function to manually refetch data */
  refetch: () => Promise<unknown>;
};

/**
 * Flags determining provider behavior and data source
 */
export type ProviderFlags = {
  /** Whether to use seeded lite store from props */
  shouldUseSeededLiteStore: boolean;
  /** Whether to reuse parent provider's lite store */
  shouldReuseParentLiteStore: boolean;
  /** Whether to skip admin settings query */
  shouldSuppressAdminQuery: boolean;
  /** Whether to skip lite settings query */
  shouldSuppressLiteQuery: boolean;
  /** Whether to use admin settings (vs lite) */
  shouldUseAdminSettings: boolean;
};

/**
 * Resolves current pathname from window or fallback
 * Handles SSR and client-side routing contexts
 * 
 * @param pathname - Fallback pathname
 * @returns Current pathname or fallback
 */
const resolveCurrentPathname = (pathname: string | null): string => {
  if (typeof window !== 'undefined' && typeof window.location.pathname === 'string') {
    return window.location.pathname;
  }
  return pathname ?? '';
};

/**
 * Compares two settings maps for equality
 * Checks size and all key-value pairs
 * 
 * @param left - First settings map
 * @param right - Second settings map
 * @returns true if maps are equal
 */
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

/**
 * Merges two settings maps with override taking precedence
 * Creates new map to avoid mutations
 * 
 * @param base - Base settings map
 * @param override - Override settings map
 * @returns Merged settings map
 */
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

/**
 * Resolves provider behavior flags based on configuration
 * Determines which settings source to use and which queries to suppress
 * 
 * @param config - Provider configuration
 * @returns Flags determining provider behavior
 */
export const resolveProviderFlags = ({
  canReadAdminSettings,
  hasInitialLiteStore,
  mode,
  parentStore,
  pathname,
  suppressOwnQuery,
}: {
  /** Whether user can read admin settings */
  canReadAdminSettings?: boolean;
  /** Whether initial lite store was provided */
  hasInitialLiteStore: boolean;
  /** Settings access mode (admin or lite) */
  mode: SettingsMode;
  /** Parent provider's settings store */
  parentStore: SettingsStoreValue | null;
  /** Current pathname for routing context */
  pathname: string | null;
  /** Whether to suppress own query */
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
