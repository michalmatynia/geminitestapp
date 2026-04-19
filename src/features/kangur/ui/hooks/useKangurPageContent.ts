'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query';

import {
  parseKangurPageContentStore,
  type KangurPageContentEntry,
  type KangurPageContentStore,
} from '@/features/kangur/shared/contracts/kangur-page-content';
import {
  attachTanstackFactoryMeta,
  resolveTanstackFactoryMeta,
} from '@/shared/lib/observability/tanstack-telemetry';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { isRecoverableKangurClientFetchError } from '@/features/kangur/observability/client';
import { api } from '@/shared/lib/api-client';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const KANGUR_PAGE_CONTENT_STALE_TIME_MS = 5 * 60_000;
const KANGUR_PAGE_CONTENT_GC_TIME_MS = 30 * 60_000;
const KANGUR_PAGE_CONTENT_REQUEST_TIMEOUT_MS =
  process.env.NODE_ENV === 'production' ? 8_000 : 45_000;
const KANGUR_PAGE_CONTENT_RECOVERABLE_RETRY_DELAY_MS = 1_000;
type KangurPageContentQueryOptions = {
  enabled?: boolean;
};

const resolveKangurPageContentLocale = (locale?: string | null, routeLocale?: string | null): string =>
  normalizeSiteLocale(locale ?? routeLocale);

export const createKangurPageContentQueryKey = (locale: string) =>
  ['kangur', 'page-content', { locale }] as const;

const createKangurPageContentQueryMeta = (locale: string): {
  description: string;
  domain: 'kangur';
  errorPresentation: 'silent';
  operation: 'list';
  queryKey: ReturnType<typeof createKangurPageContentQueryKey>;
  resource: 'kangur.page-content';
  source: string;
  tags: string[];
} => ({
  source: 'kangur.hooks.useKangurPageContentStore',
  operation: 'list' as const,
  resource: 'kangur.page-content',
  domain: 'kangur' as const,
  queryKey: createKangurPageContentQueryKey(locale),
  tags: ['kangur', 'page-content'],
  description: 'Loads Kangur page content.',
  errorPresentation: 'silent' as const,
});

export const fetchKangurPageContentStore = async (
  locale?: string | null
): Promise<KangurPageContentStore> => {
  const resolvedLocale = resolveKangurPageContentLocale(locale);

  return parseKangurPageContentStore(
    await api.get<KangurPageContentStore>(
      `/api/kangur/ai-tutor/page-content?locale=${encodeURIComponent(resolvedLocale)}`,
      {
        timeout: KANGUR_PAGE_CONTENT_REQUEST_TIMEOUT_MS,
      }
    )
  );
};

export const prefetchKangurPageContentStore = async (
  queryClient: QueryClient | null | undefined,
  locale?: string | null
): Promise<boolean> => {
  if (!queryClient) {
    return false;
  }

  const resolvedLocale = resolveKangurPageContentLocale(locale);
  const queryKey = createKangurPageContentQueryKey(resolvedLocale);

  await prefetchQueryV2(queryClient, {
    queryKey,
    queryFn: () => fetchKangurPageContentStore(resolvedLocale),
    staleTime: KANGUR_PAGE_CONTENT_STALE_TIME_MS,
    meta: {
      ...createKangurPageContentQueryMeta(resolvedLocale),
      source: 'kangur.hooks.prefetchKangurPageContentStore',
      description: 'Prefetches Kangur page content.',
    },
  })();

  return queryClient.getQueryState(queryKey)?.status === 'success';
};

export const useKangurPageContentStore = (
  locale?: string | null,
  options: KangurPageContentQueryOptions = {}
): UseQueryResult<KangurPageContentStore, Error> => {
  const routeLocale = useLocale();
  const resolvedLocale = resolveKangurPageContentLocale(locale, routeLocale);

  return useQuery<KangurPageContentStore, Error>({
    queryKey: createKangurPageContentQueryKey(resolvedLocale),
    queryFn: () => fetchKangurPageContentStore(resolvedLocale),
    gcTime: KANGUR_PAGE_CONTENT_GC_TIME_MS,
    meta: attachTanstackFactoryMeta(
      resolveTanstackFactoryMeta(createKangurPageContentQueryMeta(resolvedLocale))
    ),
    staleTime: KANGUR_PAGE_CONTENT_STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: options.enabled ?? true,
    retry: (failureCount, error) =>
      isRecoverableKangurClientFetchError(error) && failureCount < 2,
    retryDelay: KANGUR_PAGE_CONTENT_RECOVERABLE_RETRY_DELAY_MS,
  });
};

export const useKangurPageContentEntry = (
  entryId: string | null | undefined,
  locale?: string | null,
  options: KangurPageContentQueryOptions = {}
): UseQueryResult<KangurPageContentStore, Error> & {
  entry: KangurPageContentEntry | null;
} => {
  const query = useKangurPageContentStore(locale, options);
  const entry = useMemo(
    () =>
      entryId !== null && entryId !== undefined
        ? query.data?.entries.find((candidate) => candidate.id === entryId) ?? null
        : null,
    [entryId, query.data]
  );

  return {
    ...query,
    entry,
  };
};
