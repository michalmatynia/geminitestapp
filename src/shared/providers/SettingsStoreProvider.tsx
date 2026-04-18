'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import {
  fallbackSettingsStore,
  type SettingsStoreValue,
} from '@/shared/providers/SettingsStoreProvider.shared';
import { useSettingsStoreProviderState } from '@/shared/providers/useSettingsStoreProviderState';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider.shared';

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
  const parentStore = useOptionalSettingsStoreContext();
  const parentFetching = useOptionalSettingsStoreFetchingContext();
  const pathname = usePathname();
  const { isFetching, value } = useSettingsStoreProviderState({
    canReadAdminSettings,
    mode,
    parentFetching: parentFetching ?? false,
    parentStore,
    pathname,
    suppressOwnQuery,
  });

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
    return fallbackSettingsStore;
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
