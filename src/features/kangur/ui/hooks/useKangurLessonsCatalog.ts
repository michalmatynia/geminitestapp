'use client';

import type { QueryClient } from '@tanstack/react-query';

import type {
  KangurLessonCollectionFilterDto,
  KangurLessonsCatalog,
} from '@/shared/contracts/kangur';
import {
  kangurLessonsCatalogSchema,
} from '@/shared/contracts/kangur';
import type { ListQuery } from '@/shared/contracts/ui';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type LessonsCatalogQueryOptions = KangurLessonCollectionFilterDto & {
  enabled?: boolean;
};

const resolveLessonsCatalogFilters = (options?: LessonsCatalogQueryOptions) => ({
  ageGroup: options?.ageGroup ?? null,
  enabledOnly: options?.enabledOnly ?? null,
  subject: options?.subject ?? null,
});

export const createKangurLessonsCatalogQueryKey = (options?: LessonsCatalogQueryOptions) =>
  [
    ...QUERY_KEYS.kangur.lessonsCatalog(),
    resolveLessonsCatalogFilters(options),
  ] as const;

export const fetchKangurLessonsCatalog = async (
  options?: LessonsCatalogQueryOptions
): Promise<KangurLessonsCatalog> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurLessonsCatalog',
      action: 'fetch-lessons-catalog',
      description: 'Loads the Kangur lessons catalog and sections from the API.',
      context: {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        enabledOnly: options?.enabledOnly ?? null,
      },
    }),
    async () => {
      const params: Record<string, string | boolean | undefined> = {
        subject: options?.subject,
        ageGroup: options?.ageGroup,
        enabledOnly: options?.enabledOnly,
      };
      const payload = await api.get<KangurLessonsCatalog>('/api/kangur/lessons-catalog', {
        params,
      });
      return kangurLessonsCatalogSchema.parse(payload);
    },
    {
      fallback: () => ({
        lessons: [],
        sections: [],
      }),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const prefetchKangurLessonsCatalog = async (
  queryClient: QueryClient | null | undefined,
  options?: LessonsCatalogQueryOptions
): Promise<void> => {
  if (!queryClient) {
    return;
  }

  await prefetchQueryV2(queryClient, {
    queryKey: createKangurLessonsCatalogQueryKey(options),
    queryFn: () => fetchKangurLessonsCatalog(options),
    staleTime: 1000 * 60 * 5,
    meta: {
      source: 'kangur.hooks.prefetchKangurLessonsCatalog',
      operation: 'list',
      resource: 'kangur.lessons-catalog',
      domain: 'kangur',
      tags: ['kangur', 'lessons', 'sections', 'catalog'],
      description: 'Prefetches the combined Kangur lessons catalog payload.',
    },
  })();
};

export const useKangurLessonsCatalog = (
  options?: LessonsCatalogQueryOptions
): ListQuery<KangurLessonsCatalog, KangurLessonsCatalog> =>
  createListQueryV2<KangurLessonsCatalog, KangurLessonsCatalog>({
    queryKey: createKangurLessonsCatalogQueryKey(options),
    queryFn: async (): Promise<KangurLessonsCatalog> => await fetchKangurLessonsCatalog(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurLessonsCatalog',
      operation: 'list',
      resource: 'kangur.lessons-catalog',
      domain: 'kangur',
      tags: ['kangur', 'lessons', 'sections', 'catalog'],
      description: 'Loads the combined Kangur lessons catalog payload.',
    },
  });

export type { LessonsCatalogQueryOptions as UseKangurLessonsCatalogOptions };
