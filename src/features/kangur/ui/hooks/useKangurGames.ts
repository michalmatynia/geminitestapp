'use client';

import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  createDefaultKangurGames,
} from '@/features/kangur/games';
import {
  kangurGamesSchema,
  type KangurGameDefinition,
  type KangurGameStatus,
  type KangurGameSurface,
} from '@/shared/contracts/kangur-games';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type GamesQueryOptions = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  status?: KangurGameStatus;
  surface?: KangurGameSurface;
  lessonComponentId?: KangurLessonComponentId;
  enabled?: boolean;
};

const filterGames = (
  games: KangurGameDefinition[],
  options?: GamesQueryOptions
): KangurGameDefinition[] => {
  let next = games;
  const subject = options?.subject;
  const ageGroup = options?.ageGroup;
  const status = options?.status;
  const surface = options?.surface;
  const lessonComponentId = options?.lessonComponentId;

  if (subject) {
    next = next.filter((game) => game.subject === subject);
  }
  if (ageGroup) {
    next = next.filter((game) => game.ageGroup === ageGroup);
  }
  if (status) {
    next = next.filter((game) => game.status === status);
  }
  if (surface) {
    next = next.filter((game) => game.surfaces.includes(surface));
  }
  if (lessonComponentId) {
    next = next.filter((game) => game.lessonComponentIds.includes(lessonComponentId));
  }

  return next;
};

const buildGamesFallback = (options?: GamesQueryOptions): KangurGameDefinition[] =>
  filterGames(createDefaultKangurGames(), options);

const fetchGames = async (options?: GamesQueryOptions): Promise<KangurGameDefinition[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGames',
      action: 'fetch-games',
      description: 'Loads Kangur games from the API.',
      context: {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        status: options?.status ?? null,
        surface: options?.surface ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
      },
    }),
    async () => {
      const params: Record<string, string | undefined> = {
        subject: options?.subject,
        ageGroup: options?.ageGroup,
        status: options?.status,
        surface: options?.surface,
        lessonComponentId: options?.lessonComponentId,
      };
      const payload = await api.get<KangurGameDefinition[]>('/api/kangur/games', { params });
      return kangurGamesSchema.parse(payload);
    },
    {
      fallback: () => buildGamesFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGames = (
  options?: GamesQueryOptions
): ListQuery<KangurGameDefinition, KangurGameDefinition[]> =>
  createListQueryV2<KangurGameDefinition, KangurGameDefinition[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.games(),
      {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        status: options?.status ?? null,
        surface: options?.surface ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
      },
    ],
    queryFn: async (): Promise<KangurGameDefinition[]> => await fetchGames(options),
    select: (games) => filterGames(games, options),
    placeholderData: () => buildGamesFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGames',
      operation: 'list',
      resource: 'kangur.games',
      domain: 'kangur',
      tags: ['kangur', 'games'],
      description: 'Loads Kangur games from Mongo.',
    },
  });

const invalidateKangurGames = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.games() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.gameCatalog() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.gameCatalogFacets() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.gameVariants() });
};

export const useUpdateKangurGames = (): MutationResult<
  KangurGameDefinition[],
  KangurGameDefinition[]
> =>
  createUpdateMutationV2<KangurGameDefinition[], KangurGameDefinition[]>({
    mutationKey: [...QUERY_KEYS.kangur.games(), 'update'],
    mutationFn: async (games: KangurGameDefinition[]): Promise<KangurGameDefinition[]> =>
      await api.post<KangurGameDefinition[]>('/api/kangur/games', { games }),
    invalidate: invalidateKangurGames,
    meta: {
      source: 'kangur.hooks.useUpdateKangurGames',
      operation: 'update',
      resource: 'kangur.games',
      domain: 'kangur',
      tags: ['kangur', 'games', 'update'],
      description: 'Replaces Kangur games in Mongo.',
    },
  });
