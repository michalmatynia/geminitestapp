'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { readLiteSettingsHydrationData } from '@/shared/lib/lite-settings-hydration';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { ReactNode } from 'react';
import type { SettingRecord } from '@/shared/contracts/settings';

let browserQueryClient: QueryClient | null = null;

const hydrateLiteSettingsQueryCache = (
  queryClient: QueryClient,
  initialLiteSettings?: ReadonlyArray<SettingRecord>
): void => {
  if (typeof globalThis === 'undefined') {
    return;
  }

  const initialSettings =
    initialLiteSettings && initialLiteSettings.length > 0
      ? [...initialLiteSettings]
      : readLiteSettingsHydrationData();
  if (!Array.isArray(initialSettings) || initialSettings.length === 0) {
    return;
  }

  const queryKey = QUERY_KEYS.settings.scope('lite');
  if (queryClient.getQueryData(queryKey) === undefined) {
    queryClient.setQueryData(queryKey, initialSettings);
  }
};

const getQueryClient = (
  initialLiteSettings?: ReadonlyArray<SettingRecord>
): QueryClient => {
  if (typeof window === 'undefined') {
    return new QueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient();
  }
  hydrateLiteSettingsQueryCache(browserQueryClient, initialLiteSettings);
  return browserQueryClient;
};

export function StudiqQueryProvider({
  children,
  initialLiteSettings,
}: {
  children: ReactNode;
  initialLiteSettings?: ReadonlyArray<SettingRecord>;
}): ReactNode {
  const [queryClient] = useState(() => getQueryClient(initialLiteSettings));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
