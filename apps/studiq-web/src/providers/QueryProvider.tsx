'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { ReactNode } from 'react';

let browserQueryClient: QueryClient | null = null;
type WindowLiteSettingsHydration = typeof globalThis & { __LITE_SETTINGS__?: unknown[] };

const hydrateLiteSettingsQueryCache = (queryClient: QueryClient): void => {
  if (typeof globalThis === 'undefined') {
    return;
  }

  const initialSettings = (globalThis as WindowLiteSettingsHydration).__LITE_SETTINGS__;
  if (!Array.isArray(initialSettings) || initialSettings.length === 0) {
    return;
  }

  const queryKey = QUERY_KEYS.settings.scope('lite');
  if (queryClient.getQueryData(queryKey) === undefined) {
    queryClient.setQueryData(queryKey, initialSettings);
  }
};

const getQueryClient = (): QueryClient => {
  if (typeof window === 'undefined') {
    return new QueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient();
    hydrateLiteSettingsQueryCache(browserQueryClient);
  }
  return browserQueryClient;
};

export function StudiqQueryProvider({ children }: { children: ReactNode }): ReactNode {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
