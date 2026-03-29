'use client';

import type { QueryClient } from '@tanstack/react-query';

import type {
  KangurLesson,
  KangurLessonCollectionFilterDto,
  KangurLessonsCatalog,
} from '@/shared/contracts/kangur';
import {
  kangurLessonsCatalogSchema,
} from '@/shared/contracts/kangur';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
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

const filterLessons = (
  lessons: KangurLesson[],
  options?: LessonsCatalogQueryOptions
): KangurLesson[] => {
  let next = lessons;
  if (options?.enabledOnly) {
    next = next.filter((lesson) => lesson.enabled);
  }
  if (options?.subject) {
    next = next.filter((lesson) => lesson.subject === options.subject);
  }
  if (options?.ageGroup) {
    next = next.filter((lesson) => lesson.ageGroup === options.ageGroup);
  }
  return next;
};

const filterSections = (
  sections: KangurLessonSection[],
  options?: LessonsCatalogQueryOptions
): KangurLessonSection[] => {
  let next = sections;
  if (options?.enabledOnly) {
    next = next.filter((section) => section.enabled);
  }
  if (options?.subject) {
    next = next.filter((section) => section.subject === options.subject);
  }
  if (options?.ageGroup) {
    next = next.filter((section) => section.ageGroup === options.ageGroup);
  }
  return next;
};

const filterLessonsCatalog = (
  catalog: KangurLessonsCatalog,
  options?: LessonsCatalogQueryOptions
): KangurLessonsCatalog => ({
  lessons: filterLessons(catalog.lessons, options),
  sections: filterSections(catalog.sections, options),
});

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
