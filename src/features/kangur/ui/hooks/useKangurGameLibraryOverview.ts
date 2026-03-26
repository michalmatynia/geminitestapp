'use client';

import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  createKangurGameCatalogEntries,
  createKangurGameVariantCatalogEntries,
  createKangurGamesLibraryOverview,
  filterKangurGameCatalogEntries,
  filterKangurGameVariantCatalogEntries,
  type KangurGameCatalogFilter,
  type KangurGamesLibraryOverview,
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
  kangurGamesLibraryOverviewSchema,
  type KangurGameEngineCategory,
  type KangurGameEngineId,
  type KangurGameEngineImplementationOwnership,
  type KangurGameMechanic,
  type KangurGameStatus,
  type KangurGameSurface,
  type KangurGameVariantSurface,
} from '@/shared/contracts/kangur-games';

type GameLibraryOverviewQueryOptions = KangurGameCatalogFilter & {
  enabled?: boolean;
};

const buildGameLibraryOverviewFallback = (
  options?: GameLibraryOverviewQueryOptions
): KangurGamesLibraryOverview => {
  const catalogEntries = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), options);
  const variantEntries = filterKangurGameVariantCatalogEntries(
    createKangurGameVariantCatalogEntries(catalogEntries),
    options
  );

  return createKangurGamesLibraryOverview(catalogEntries, variantEntries);
};

const fetchGameLibraryOverview = async (
  options?: GameLibraryOverviewQueryOptions
): Promise<KangurGamesLibraryOverview> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameLibraryOverview',
      action: 'fetch-game-library-overview',
      description: 'Loads Kangur games library overview data from the API.',
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
      const payload = await api.get<KangurGamesLibraryOverview>(
        '/api/kangur/game-library-overview',
        {
          params,
        }
      );
      return kangurGamesLibraryOverviewSchema.parse(payload);
    },
    {
      fallback: () => buildGameLibraryOverviewFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameLibraryOverview = (
  options?: GameLibraryOverviewQueryOptions
): ListQuery<KangurGamesLibraryOverview, KangurGamesLibraryOverview> =>
  createListQueryV2<KangurGamesLibraryOverview, KangurGamesLibraryOverview>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameLibraryOverview(),
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
    queryFn: async (): Promise<KangurGamesLibraryOverview> =>
      await fetchGameLibraryOverview(options),
    placeholderData: () => buildGameLibraryOverviewFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameLibraryOverview',
      operation: 'list',
      resource: 'kangur.game-library-overview',
      domain: 'kangur',
      tags: ['kangur', 'games', 'library', 'overview'],
      description: 'Loads the filtered Kangur games library overview.',
    },
  });

export type {
  GameLibraryOverviewQueryOptions as UseKangurGameLibraryOverviewOptions,
  KangurGameCatalogFilter,
  KangurGamesLibraryOverview,
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
