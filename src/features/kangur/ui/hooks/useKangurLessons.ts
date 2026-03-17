'use client';

import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonDocumentStore,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  kangurLessonsSchema,
  kangurLessonDocumentStoreSchema,
} from '@/features/kangur/shared/contracts/kangur';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { normalizeKangurLessonDocumentStore } from '@/features/kangur/lesson-documents';
import { withKangurClientError } from '@/features/kangur/observability/client';

type LessonsQueryOptions = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  enabledOnly?: boolean;
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
    { fallback: () => buildLessonsFallback(options) }
  );

const fetchLessonDocuments = async (): Promise<KangurLessonDocumentStore> =>
  await withKangurClientError(
    {
      source: 'kangur.hooks.useKangurLessonDocuments',
      action: 'fetch-documents',
      description: 'Loads Kangur lesson documents from the API.',
    },
    async () => {
      const payload = await api.get<KangurLessonDocumentStore>('/api/kangur/lesson-documents');
      const parsed = kangurLessonDocumentStoreSchema.parse(payload);
      return normalizeKangurLessonDocumentStore(parsed);
    },
    { fallback: () => ({}) }
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

export const useKangurLessonDocuments = (options?: { enabled?: boolean }): ListQuery<
  KangurLessonDocumentStore,
  KangurLessonDocumentStore
> =>
  createListQueryV2<KangurLessonDocumentStore, KangurLessonDocumentStore>({
    queryKey: QUERY_KEYS.kangur.lessonDocuments(),
    queryFn: fetchLessonDocuments,
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

export const useUpdateKangurLessonDocuments = (): MutationResult<
  KangurLessonDocumentStore,
  KangurLessonDocumentStore
> =>
  createUpdateMutationV2<KangurLessonDocumentStore, KangurLessonDocumentStore>({
    mutationKey: [...QUERY_KEYS.kangur.lessonDocuments(), 'update'],
    mutationFn: async (
      documents: KangurLessonDocumentStore
    ): Promise<KangurLessonDocumentStore> =>
      await api.post<KangurLessonDocumentStore>('/api/kangur/lesson-documents', {
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
