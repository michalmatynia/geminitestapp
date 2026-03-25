'use client';

import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  createKangurGameCatalogEntries,
  filterKangurGameCatalogEntries,
  type KangurGameCatalogEntry,
  type KangurGameCatalogFilter,
} from '@/features/kangur/games';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type { ListQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  kangurGameCatalogEntriesSchema,
  type KangurGameEngineId,
  type KangurGameMechanic,
  type KangurGameStatus,
  type KangurGameSurface,
} from '@/shared/contracts/kangur-games';

type GameCatalogQueryOptions = KangurGameCatalogFilter & {
  enabled?: boolean;
};

const buildGameCatalogFallback = (
  options?: GameCatalogQueryOptions
): KangurGameCatalogEntry[] =>
  filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), options);

const fetchGameCatalog = async (
  options?: GameCatalogQueryOptions
): Promise<KangurGameCatalogEntry[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameCatalog',
      action: 'fetch-game-catalog',
      description: 'Loads the joined Kangur game catalog from games and engine APIs.',
      context: {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        gameStatus: options?.gameStatus ?? null,
        surface: options?.surface ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
        mechanic: options?.mechanic ?? null,
        engineId: options?.engineId ?? null,
        launchableOnly: options?.launchableOnly ?? false,
      },
    }),
    async () => {
      const params: Record<string, string | boolean | undefined> = {
        subject: options?.subject,
        ageGroup: options?.ageGroup,
        gameStatus: options?.gameStatus,
        surface: options?.surface,
        lessonComponentId: options?.lessonComponentId,
        mechanic: options?.mechanic,
        engineId: options?.engineId,
        launchableOnly: options?.launchableOnly,
      };
      const payload = await api.get<KangurGameCatalogEntry[]>('/api/kangur/game-catalog', {
        params,
      });
      return kangurGameCatalogEntriesSchema.parse(payload);
    },
    {
      fallback: () => buildGameCatalogFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameCatalog = (
  options?: GameCatalogQueryOptions
): ListQuery<KangurGameCatalogEntry, KangurGameCatalogEntry[]> =>
  createListQueryV2<KangurGameCatalogEntry, KangurGameCatalogEntry[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameCatalog(),
      {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        gameStatus: options?.gameStatus ?? null,
        surface: options?.surface ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
        mechanic: options?.mechanic ?? null,
        engineId: options?.engineId ?? null,
        launchableOnly: options?.launchableOnly ?? false,
      },
    ],
    queryFn: async (): Promise<KangurGameCatalogEntry[]> => await fetchGameCatalog(options),
    placeholderData: () => buildGameCatalogFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameCatalog',
      operation: 'list',
      resource: 'kangur.game-catalog',
      domain: 'kangur',
      tags: ['kangur', 'games', 'catalog'],
      description: 'Loads the joined Kangur game catalog.',
    },
  });

export type {
  GameCatalogQueryOptions as UseKangurGameCatalogOptions,
  KangurGameCatalogEntry,
};

export type {
  KangurGameCatalogFilter,
  KangurGameEngineId,
  KangurGameMechanic,
  KangurGameStatus,
  KangurGameSurface,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
};
