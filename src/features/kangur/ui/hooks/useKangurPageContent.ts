'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  buildDefaultKangurPageContentStore,
  DEFAULT_KANGUR_PAGE_CONTENT_STORE,
} from '@/features/kangur/page-content-catalog';
import {
  parseKangurPageContentStore,
  type KangurPageContentEntry,
  type KangurPageContentStore,
} from '@/features/kangur/shared/contracts/kangur-page-content';
import { api } from '@/shared/lib/api-client';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const KANGUR_PAGE_CONTENT_STALE_TIME_MS = 60_000;

const createKangurPageContentQueryKey = (locale: string) =>
  ['kangur', 'page-content', { locale }] as const;

export const useKangurPageContentStore = (
  locale?: string | null
): UseQueryResult<KangurPageContentStore, Error> => {
  const routeLocale = useLocale();
  const resolvedLocale = normalizeSiteLocale(locale ?? routeLocale);
  const initialData = useMemo(
    () =>
      resolvedLocale === 'pl'
        ? DEFAULT_KANGUR_PAGE_CONTENT_STORE
        : buildDefaultKangurPageContentStore(resolvedLocale),
    [resolvedLocale]
  );

  return useQuery<KangurPageContentStore, Error>({
    queryKey: createKangurPageContentQueryKey(resolvedLocale),
    queryFn: async () =>
      parseKangurPageContentStore(
        await api.get<KangurPageContentStore>(
          `/api/kangur/ai-tutor/page-content?locale=${encodeURIComponent(resolvedLocale)}`,
          {
            cache: 'no-store',
          }
        )
      ),
    initialData,
    staleTime: KANGUR_PAGE_CONTENT_STALE_TIME_MS,
    retry: false,
  });
};

export const useKangurPageContentEntry = (
  entryId: string | null | undefined,
  locale?: string | null
): UseQueryResult<KangurPageContentStore, Error> & {
  entry: KangurPageContentEntry | null;
} => {
  const query = useKangurPageContentStore(locale);
  const entry = useMemo(
    () => (entryId ? query.data?.entries.find((candidate) => candidate.id === entryId) ?? null : null),
    [entryId, query.data]
  );

  return {
    ...query,
    entry,
  };
};
