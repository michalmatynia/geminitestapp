'use client';

import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  createKangurGameVariantCatalogEntries,
  filterKangurGameVariantCatalogEntries,
  type KangurGameVariantCatalogEntry,
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
  kangurGameVariantCatalogEntriesSchema,
  type KangurGameEngineCategory,
  type KangurGameEngineId,
  type KangurGameMechanic,
  type KangurGameStatus,
  type KangurGameSurface,
  type KangurGameVariantSurface,
} from '@/shared/contracts/kangur-games';

type GameVariantsQueryOptions = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  gameStatus?: KangurGameStatus;
  surface?: KangurGameSurface;
  lessonComponentId?: KangurLessonComponentId;
  mechanic?: KangurGameMechanic;
  engineId?: KangurGameEngineId;
  engineCategory?: KangurGameEngineCategory;
  variantSurface?: KangurGameVariantSurface;
  variantStatus?: KangurGameStatus;
  launchableOnly?: boolean;
  enabled?: boolean;
};

const buildGameVariantsFallback = (
  options?: GameVariantsQueryOptions
): KangurGameVariantCatalogEntry[] =>
  filterKangurGameVariantCatalogEntries(createKangurGameVariantCatalogEntries(), options);

const fetchGameVariants = async (
  options?: GameVariantsQueryOptions
): Promise<KangurGameVariantCatalogEntry[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameVariants',
      action: 'fetch-game-variants',
      description: 'Loads Kangur game variants from the API.',
      context: {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        gameStatus: options?.gameStatus ?? null,
        surface: options?.surface ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
        mechanic: options?.mechanic ?? null,
        engineId: options?.engineId ?? null,
        engineCategory: options?.engineCategory ?? null,
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
        variantSurface: options?.variantSurface,
        variantStatus: options?.variantStatus,
        launchableOnly: options?.launchableOnly,
      };
      const payload = await api.get<KangurGameVariantCatalogEntry[]>(
        '/api/kangur/game-variants',
        { params }
      );
      return kangurGameVariantCatalogEntriesSchema.parse(payload);
    },
    {
      fallback: () => buildGameVariantsFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameVariants = (
  options?: GameVariantsQueryOptions
): ListQuery<KangurGameVariantCatalogEntry, KangurGameVariantCatalogEntry[]> =>
  createListQueryV2<KangurGameVariantCatalogEntry, KangurGameVariantCatalogEntry[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameVariants(),
      {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        gameStatus: options?.gameStatus ?? null,
        surface: options?.surface ?? null,
        lessonComponentId: options?.lessonComponentId ?? null,
        mechanic: options?.mechanic ?? null,
        engineId: options?.engineId ?? null,
        engineCategory: options?.engineCategory ?? null,
        variantSurface: options?.variantSurface ?? null,
        variantStatus: options?.variantStatus ?? null,
        launchableOnly: options?.launchableOnly ?? false,
      },
    ],
    queryFn: async (): Promise<KangurGameVariantCatalogEntry[]> =>
      await fetchGameVariants(options),
    placeholderData: () => buildGameVariantsFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameVariants',
      operation: 'list',
      resource: 'kangur.game-variants',
      domain: 'kangur',
      tags: ['kangur', 'games', 'variants'],
      description: 'Loads first-class Kangur game variants.',
    },
  });
