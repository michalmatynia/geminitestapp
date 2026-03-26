'use client';

import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  createKangurGameLibraryPageDataFromGames,
  type KangurGameCatalogFilter,
  type KangurGameLibraryPageData,
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
  kangurGameLibraryPageDataSchema,
  type KangurGameEngineCategory,
  type KangurGameEngineId,
  type KangurGameEngineImplementationOwnership,
  type KangurGameMechanic,
  type KangurGameStatus,
  type KangurGameSurface,
  type KangurGameVariantSurface,
} from '@/shared/contracts/kangur-games';

type GameLibraryPageQueryOptions = KangurGameCatalogFilter & {
  enabled?: boolean;
};

const buildGameLibraryPageFallback = (
  options?: GameLibraryPageQueryOptions
): KangurGameLibraryPageData => createKangurGameLibraryPageDataFromGames({ filter: options });

const fetchGameLibraryPage = async (
  options?: GameLibraryPageQueryOptions
): Promise<KangurGameLibraryPageData> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameLibraryPage',
      action: 'fetch-game-library-page',
      description: 'Loads consolidated Kangur games library page data from the API.',
      context: {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        gameStatus: options?.gameStatus ?? null,
        surface: options?.surface ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
        mechanic: options?.mechanic ?? null,
        engineId: options?.engineId ?? null,
        engineCategory: options?.engineCategory ?? null,
        implementationOwnership: options?.implementationOwnership ?? null,
        variantSurface: options?.variantSurface ?? null,
        variantStatus: options?.variantStatus ?? null,
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
        engineCategory: options?.engineCategory,
        implementationOwnership: options?.implementationOwnership,
        variantSurface: options?.variantSurface,
        variantStatus: options?.variantStatus,
        launchableOnly: options?.launchableOnly,
      };
      const payload = await api.get<KangurGameLibraryPageData>(
        '/api/kangur/game-library-page',
        {
          params,
        }
      );
      return kangurGameLibraryPageDataSchema.parse(payload);
    },
    {
      fallback: () => buildGameLibraryPageFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameLibraryPage = (
  options?: GameLibraryPageQueryOptions
): ListQuery<KangurGameLibraryPageData, KangurGameLibraryPageData> =>
  createListQueryV2<KangurGameLibraryPageData, KangurGameLibraryPageData>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameLibraryPage(),
      {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        gameStatus: options?.gameStatus ?? null,
        surface: options?.surface ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
        mechanic: options?.mechanic ?? null,
        engineId: options?.engineId ?? null,
        engineCategory: options?.engineCategory ?? null,
        implementationOwnership: options?.implementationOwnership ?? null,
        variantSurface: options?.variantSurface ?? null,
        variantStatus: options?.variantStatus ?? null,
        launchableOnly: options?.launchableOnly ?? false,
      },
    ],
    queryFn: async (): Promise<KangurGameLibraryPageData> =>
      await fetchGameLibraryPage(options),
    placeholderData: () => buildGameLibraryPageFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameLibraryPage',
      operation: 'list',
      resource: 'kangur.game-library-page',
      domain: 'kangur',
      tags: ['kangur', 'games', 'library', 'page'],
      description: 'Loads the consolidated Kangur games library page payload.',
    },
  });

export type {
  GameLibraryPageQueryOptions as UseKangurGameLibraryPageOptions,
  KangurGameCatalogFilter,
  KangurGameLibraryPageData,
  KangurGameEngineCategory,
  KangurGameEngineId,
  KangurGameEngineImplementationOwnership,
  KangurGameMechanic,
  KangurGameStatus,
  KangurGameSurface,
  KangurGameVariantSurface,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
};
