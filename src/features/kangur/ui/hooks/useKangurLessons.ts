'use client';

import { useLocale } from 'next-intl';

import type {
  KangurLesson,
  KangurLessonDocument,
  KangurLessonCollectionFilterDto,
  KangurLessonDocumentStore,
} from '@/features/kangur/shared/contracts/kangur';
import {
  kangurLessonDocumentSchema,
  kangurLessonsSchema,
  kangurLessonDocumentStoreSchema,
} from '@/features/kangur/shared/contracts/kangur';
import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createSingleQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { normalizeKangurLessonDocumentStore } from '@/features/kangur/lesson-documents';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';

type LessonsQueryOptions = KangurLessonCollectionFilterDto & {
  enabled?: boolean;
};

const filterLessons = (
  lessons: KangurLesson[],
  options?: LessonsQueryOptions
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

const buildLessonsFallback = (options?: LessonsQueryOptions): KangurLesson[] =>
  filterLessons(createDefaultKangurLessons(), options);

const fetchLessons = async (options?: LessonsQueryOptions): Promise<KangurLesson[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurLessons',
      action: 'fetch-lessons',
      description: 'Loads Kangur lessons from the API.',
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
      const payload = await api.get<KangurLesson[]>('/api/kangur/lessons', { params });
      return kangurLessonsSchema.parse(payload);
    },
    {
      fallback: () => buildLessonsFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

const fetchLessonDocuments = async (locale?: string | null): Promise<KangurLessonDocumentStore> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurLessonDocuments',
      action: 'fetch-documents',
      description: 'Loads Kangur lesson documents from the API.',
      context: {
        locale: locale ? normalizeSiteLocale(locale) : null,
      },
    }),
    async () => {
      const resolvedLocale = normalizeSiteLocale(locale);
      const payload = await api.get<KangurLessonDocumentStore>(
        `/api/kangur/lesson-documents?locale=${encodeURIComponent(resolvedLocale)}`
      );
      const parsed = kangurLessonDocumentStoreSchema.parse(payload);
      return normalizeKangurLessonDocumentStore(parsed);
    },
    {
      fallback: () => ({}),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

const fetchLessonDocument = async (
  lessonId: string,
  locale?: string | null
): Promise<KangurLessonDocument | null> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurLessonDocument',
      action: 'fetch-document',
      description: 'Loads a single Kangur lesson document from the API.',
      context: {
        lessonId,
        locale: locale ? normalizeSiteLocale(locale) : null,
      },
    }),
    async () => {
      const resolvedLocale = normalizeSiteLocale(locale);
      const payload = await api.get<KangurLessonDocument | null>(
        `/api/kangur/lesson-documents/${encodeURIComponent(lessonId)}?locale=${encodeURIComponent(resolvedLocale)}`
      );
      return payload ? kangurLessonDocumentSchema.parse(payload) : null;
    },
    {
      fallback: () => null,
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurLessons = (
  options?: LessonsQueryOptions
): ListQuery<KangurLesson, KangurLesson[]> =>
  createListQueryV2<KangurLesson, KangurLesson[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.lessons(),
      {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        enabledOnly: options?.enabledOnly ?? null,
      },
    ],
    queryFn: async (): Promise<KangurLesson[]> => await fetchLessons(options),
    select: (lessons) => filterLessons(lessons, options),
    placeholderData: () => buildLessonsFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurLessons',
      operation: 'list',
      resource: 'kangur.lessons',
      domain: 'kangur',
      tags: ['kangur', 'lessons'],
      description: 'Loads Kangur lessons from Mongo.',
    },
  });

export const useKangurLessonDocuments = (options?: {
  enabled?: boolean;
  locale?: string | null;
}): ListQuery<
  KangurLessonDocumentStore,
  KangurLessonDocumentStore
> =>
  {
    const routeLocale = useLocale();
    const resolvedLocale = normalizeSiteLocale(options?.locale ?? routeLocale);

    return createListQueryV2<KangurLessonDocumentStore, KangurLessonDocumentStore>({
    queryKey: [...QUERY_KEYS.kangur.lessonDocuments(), { locale: resolvedLocale }],
    queryFn: async () => await fetchLessonDocuments(resolvedLocale),
    placeholderData: () => ({}),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurLessonDocuments',
      operation: 'list',
      resource: 'kangur.lesson-documents',
      domain: 'kangur',
      tags: ['kangur', 'lesson-documents'],
      description: 'Loads Kangur lesson documents from Mongo.',
    },
    });
  };

export const useKangurLessonDocument = (
  lessonId: string | null,
  options?: { enabled?: boolean; locale?: string | null }
): SingleQuery<KangurLessonDocument | null> =>
  {
    const routeLocale = useLocale();
    const resolvedLocale = normalizeSiteLocale(options?.locale ?? routeLocale);

    return createSingleQueryV2<KangurLessonDocument | null>({
    queryKey: QUERY_KEYS.kangur.lessonDocument(lessonId, resolvedLocale),
    queryFn: async (): Promise<KangurLessonDocument | null> =>
      lessonId ? await fetchLessonDocument(lessonId, resolvedLocale) : null,
    enabled: Boolean(lessonId) && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurLessonDocument',
      operation: 'detail',
      resource: 'kangur.lesson-document',
      domain: 'kangur',
      tags: ['kangur', 'lesson-document'],
      description: 'Loads a single Kangur lesson document from Mongo.',
    },
    });
  };

const invalidateKangurLessons = (queryClient: { invalidateQueries: (args: { queryKey: readonly unknown[] }) => void }): void => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.all });
};

export const useUpdateKangurLessons = (): MutationResult<KangurLesson[], KangurLesson[]> =>
  createUpdateMutationV2<KangurLesson[], KangurLesson[]>({
    mutationKey: [...QUERY_KEYS.kangur.lessons(), 'update'],
    mutationFn: async (lessons: KangurLesson[]): Promise<KangurLesson[]> =>
      await api.post<KangurLesson[]>('/api/kangur/lessons', { lessons }),
    invalidate: invalidateKangurLessons,
    meta: {
      source: 'kangur.hooks.useUpdateKangurLessons',
      operation: 'update',
      resource: 'kangur.lessons',
      domain: 'kangur',
      tags: ['kangur', 'lessons', 'update'],
      description: 'Replaces Kangur lessons in Mongo.',
    },
  });

export const useUpdateKangurLessonDocuments = (
  locale?: string | null
): MutationResult<
  KangurLessonDocumentStore,
  KangurLessonDocumentStore
> =>
  {
    const routeLocale = useLocale();
    const resolvedLocale = normalizeSiteLocale(locale ?? routeLocale);

    return createUpdateMutationV2<KangurLessonDocumentStore, KangurLessonDocumentStore>({
    mutationKey: [...QUERY_KEYS.kangur.lessonDocuments(), { locale: resolvedLocale }, 'update'],
    mutationFn: async (
      documents: KangurLessonDocumentStore
    ): Promise<KangurLessonDocumentStore> =>
      await api.post<KangurLessonDocumentStore>('/api/kangur/lesson-documents', {
        locale: resolvedLocale,
        documents,
      }),
    invalidate: invalidateKangurLessons,
    meta: {
      source: 'kangur.hooks.useUpdateKangurLessonDocuments',
      operation: 'update',
      resource: 'kangur.lesson-documents',
      domain: 'kangur',
      tags: ['kangur', 'lesson-documents', 'update'],
      description: 'Replaces Kangur lesson documents in Mongo.',
    },
    });
  };
