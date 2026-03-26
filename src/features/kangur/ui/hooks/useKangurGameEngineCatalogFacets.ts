'use client';

import {
  createDefaultKangurGameEngineImplementations,
  createKangurGameCatalogEntries,
  createKangurGameEngineCatalogEntries,
  createKangurGameVariantCatalogEntries,
  filterKangurGameCatalogEntries,
  filterKangurGameVariantCatalogEntries,
  getKangurGameEngineCatalogFacets,
  type KangurGameCatalogFilter,
  type KangurGameEngineCatalogFacets,
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
  kangurGameEngineCatalogFacetsSchema,
  type KangurGameEngineCategory,
  type KangurGameEngineId,
  type KangurGameEngineImplementationOwnership,
  type KangurGameMechanic,
  type KangurGameStatus,
  type KangurGameSurface,
  type KangurGameVariantSurface,
} from '@/shared/contracts/kangur-games';
import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

type GameEngineCatalogFacetsQueryOptions = KangurGameCatalogFilter & {
  enabled?: boolean;
};

const buildGameEngineCatalogFacetsFallback = (
  options?: GameEngineCatalogFacetsQueryOptions
): KangurGameEngineCatalogFacets => {
  const catalogEntries = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), options);
  const variantEntries = filterKangurGameVariantCatalogEntries(
    createKangurGameVariantCatalogEntries(catalogEntries),
    options
  );

  return getKangurGameEngineCatalogFacets(
    createKangurGameEngineCatalogEntries({
      catalogEntries,
      variantEntries,
      implementations: createDefaultKangurGameEngineImplementations(),
    })
  );
};

const fetchGameEngineCatalogFacets = async (
  options?: GameEngineCatalogFacetsQueryOptions
): Promise<KangurGameEngineCatalogFacets> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameEngineCatalogFacets',
      action: 'fetch-game-engine-catalog-facets',
      description: 'Loads Kangur game engine catalog facets from the API.',
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
      const payload = await api.get<KangurGameEngineCatalogFacets>(
        '/api/kangur/game-engine-catalog-facets',
        {
          params,
        }
      );
      return kangurGameEngineCatalogFacetsSchema.parse(payload);
    },
    {
      fallback: () => buildGameEngineCatalogFacetsFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameEngineCatalogFacets = (
  options?: GameEngineCatalogFacetsQueryOptions
): ListQuery<KangurGameEngineCatalogFacets, KangurGameEngineCatalogFacets> =>
  createListQueryV2<KangurGameEngineCatalogFacets, KangurGameEngineCatalogFacets>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameEngineCatalogFacets(),
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
    queryFn: async (): Promise<KangurGameEngineCatalogFacets> =>
      await fetchGameEngineCatalogFacets(options),
    placeholderData: () => buildGameEngineCatalogFacetsFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameEngineCatalogFacets',
      operation: 'list',
      resource: 'kangur.game-engine-catalog-facets',
      domain: 'kangur',
      tags: ['kangur', 'games', 'engines', 'catalog', 'facets'],
      description: 'Loads engine-first Kangur catalog facets.',
    },
  });

export type {
  GameEngineCatalogFacetsQueryOptions as UseKangurGameEngineCatalogFacetsOptions,
  KangurGameCatalogFilter,
  KangurGameEngineCatalogFacets,
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
