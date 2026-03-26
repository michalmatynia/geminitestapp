'use client';

import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import type { KangurGameId } from '@/shared/contracts/kangur-games';
import {
  kangurLessonGameSectionsSchema,
  type KangurLessonGameSection,
  type KangurLessonGameSectionsReplacePayload,
} from '@/shared/contracts/kangur-lesson-game-sections';
import type { KangurLessonComponentId } from '@/shared/contracts/kangur-lesson-constants';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type LessonGameSectionsQueryOptions = {
  enabled?: boolean;
  enabledOnly?: boolean;
  gameId?: KangurGameId;
  lessonComponentId?: KangurLessonComponentId;
};

const fetchLessonGameSections = async (
  options?: LessonGameSectionsQueryOptions
): Promise<KangurLessonGameSection[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurLessonGameSections',
      action: 'fetch-sections',
      description: 'Loads persisted Kangur lesson game sections from the API.',
      context: {
        enabledOnly: options?.enabledOnly ?? null,
        gameId: options?.gameId ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
      },
    }),
    async () => {
      const params: Record<string, string | boolean | undefined> = {
        enabledOnly: options?.enabledOnly,
        gameId: options?.gameId,
        lessonComponentId: options?.lessonComponentId,
      };

      const payload = await api.get<KangurLessonGameSection[]>(
        '/api/kangur/lesson-game-sections',
        {
          params,
        }
      );

      return kangurLessonGameSectionsSchema.parse(payload);
    },
    {
      fallback: () => [],
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurLessonGameSections = (
  options?: LessonGameSectionsQueryOptions
): ListQuery<KangurLessonGameSection, KangurLessonGameSection[]> =>
  createListQueryV2<KangurLessonGameSection, KangurLessonGameSection[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.lessonGameSections(),
      {
        enabledOnly: options?.enabledOnly ?? null,
        gameId: options?.gameId ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
      },
    ],
    queryFn: async (): Promise<KangurLessonGameSection[]> =>
      await fetchLessonGameSections(options),
    enabled: options?.enabled ?? true,
    placeholderData: () => [],
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurLessonGameSections',
      operation: 'list',
      resource: 'kangur.lesson-game-sections',
      domain: 'kangur',
      tags: ['kangur', 'lesson-game-sections'],
      description: 'Loads persisted Kangur lesson hub game sections.',
    },
  });

const invalidateLessonGameSections = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.lessonGameSections() });
};

export const useReplaceKangurLessonGameSections = (): MutationResult<
  KangurLessonGameSection[],
  KangurLessonGameSectionsReplacePayload
> =>
  createUpdateMutationV2<
    KangurLessonGameSection[],
    KangurLessonGameSectionsReplacePayload
  >({
    mutationKey: [...QUERY_KEYS.kangur.lessonGameSections(), 'update'],
    mutationFn: async (
      input: KangurLessonGameSectionsReplacePayload
    ): Promise<KangurLessonGameSection[]> =>
      await api.post<KangurLessonGameSection[]>(
        '/api/kangur/lesson-game-sections',
        input
      ),
    invalidate: invalidateLessonGameSections,
    meta: {
      source: 'kangur.hooks.useReplaceKangurLessonGameSections',
      operation: 'update',
      resource: 'kangur.lesson-game-sections',
      domain: 'kangur',
      tags: ['kangur', 'lesson-game-sections', 'update'],
      description: 'Replaces persisted Kangur lesson hub game sections for one game.',
    },
  });
