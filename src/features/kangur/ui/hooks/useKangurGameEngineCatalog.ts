'use client';

import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  createDefaultKangurGameEngineImplementations,
  createKangurGameCatalogEntries,
  createKangurGameEngineCatalogEntries,
  createKangurGameVariantCatalogEntries,
  filterKangurGameCatalogEntries,
  filterKangurGameVariantCatalogEntries,
  type KangurGameCatalogFilter,
  type KangurGameEngineCatalogEntry,
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
  kangurGameEngineCatalogEntriesSchema,
  type KangurGameEngineCategory,
  type KangurGameEngineId,
  type KangurGameEngineImplementationOwnership,
  type KangurGameMechanic,
  type KangurGameStatus,
  type KangurGameSurface,
  type KangurGameVariantSurface,
} from '@/shared/contracts/kangur-games';

type GameEngineCatalogQueryOptions = KangurGameCatalogFilter & {
  enabled?: boolean;
};

const buildGameEngineCatalogFallback = (
  options?: GameEngineCatalogQueryOptions
): KangurGameEngineCatalogEntry[] => {
  const catalogEntries = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), options);
  const variantEntries = filterKangurGameVariantCatalogEntries(
    createKangurGameVariantCatalogEntries(catalogEntries),
    options
  );

  return createKangurGameEngineCatalogEntries({
    catalogEntries,
    variantEntries,
    implementations: createDefaultKangurGameEngineImplementations(),
  });
};

const fetchGameEngineCatalog = async (
  options?: GameEngineCatalogQueryOptions
): Promise<KangurGameEngineCatalogEntry[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameEngineCatalog',
      action: 'fetch-game-engine-catalog',
      description: 'Loads Kangur game engine catalog entries from the API.',
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
      const payload = await api.get<KangurGameEngineCatalogEntry[]>(
        '/api/kangur/game-engine-catalog',
        {
          params,
        }
      );
      return kangurGameEngineCatalogEntriesSchema.parse(payload);
    },
    {
      fallback: () => buildGameEngineCatalogFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameEngineCatalog = (
  options?: GameEngineCatalogQueryOptions
): ListQuery<KangurGameEngineCatalogEntry, KangurGameEngineCatalogEntry[]> =>
  createListQueryV2<KangurGameEngineCatalogEntry, KangurGameEngineCatalogEntry[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameEngineCatalog(),
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
    queryFn: async (): Promise<KangurGameEngineCatalogEntry[]> =>
      await fetchGameEngineCatalog(options),
    placeholderData: () => buildGameEngineCatalogFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameEngineCatalog',
      operation: 'list',
      resource: 'kangur.game-engine-catalog',
      domain: 'kangur',
      tags: ['kangur', 'games', 'engines', 'catalog'],
      description: 'Loads engine-first Kangur game catalog entries.',
    },
  });

export type {
  GameEngineCatalogQueryOptions as UseKangurGameEngineCatalogOptions,
  KangurGameCatalogFilter,
  KangurGameEngineCatalogEntry,
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
