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
import type { ListQuery } from '@/shared/contracts/ui/ui/queries';
import { ApiError, api } from '@/shared/lib/api-client';
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

const resolveGameLibraryPageCoreFilters = (options?: GameLibraryPageQueryOptions) => {
  const {
    ageGroup = null,
    gameId = null,
    gameStatus = null,
    launchableOnly = false,
    lessonComponentId = null,
  } = options ?? {};
  return {
    ageGroup,
    gameId,
    gameStatus,
    launchableOnly,
    lessonComponentId,
  };
};

const resolveGameLibraryPageCatalogFilters = (options?: GameLibraryPageQueryOptions) => {
  const {
    mechanic = null,
    subject = null,
  } = options ?? {};
  return {
    mechanic,
    subject,
  };
};

const resolveGameLibraryPageSecondaryFilters = (options?: GameLibraryPageQueryOptions) => {
  const {
    engineCategory = null,
    engineId = null,
    implementationOwnership = null,
    surface = null,
    variantStatus = null,
    variantSurface = null,
  } = options ?? {};
  return {
    engineCategory,
    engineId,
    implementationOwnership,
    surface,
    variantStatus,
    variantSurface,
  };
};

const resolveGameLibraryPageFilters = (
  options?: GameLibraryPageQueryOptions
): {
  ageGroup: KangurLessonAgeGroup | null;
  engineCategory: KangurGameEngineCategory | null;
  engineId: KangurGameEngineId | null;
  gameId: string | null;
  gameStatus: KangurGameStatus | null;
  implementationOwnership: KangurGameEngineImplementationOwnership | null;
  launchableOnly: boolean;
  lessonComponentId: KangurLessonComponentId | null;
  mechanic: KangurGameMechanic | null;
  subject: KangurLessonSubject | null;
  surface: KangurGameSurface | null;
  variantStatus: KangurGameStatus | null;
  variantSurface: KangurGameVariantSurface | null;
} => ({
  ...resolveGameLibraryPageCoreFilters(options),
  ...resolveGameLibraryPageCatalogFilters(options),
  ...resolveGameLibraryPageSecondaryFilters(options),
});

const resolveGameLibraryPageParams = (
  options?: GameLibraryPageQueryOptions
): Record<string, string | boolean | undefined> => {
  const {
    ageGroup,
    engineCategory,
    engineId,
    gameId,
    gameStatus,
    implementationOwnership,
    launchableOnly,
    lessonComponentId,
    mechanic,
    subject,
    surface,
    variantStatus,
    variantSurface,
  } = options ?? {};
  return {
    ageGroup,
    engineCategory,
    engineId,
    gameId,
    gameStatus,
    implementationOwnership,
    launchableOnly,
    lessonComponentId,
    mechanic,
    subject,
    surface,
    variantStatus,
    variantSurface,
  };
};

const isGameLibraryPageQueryEnabled = (
  options?: GameLibraryPageQueryOptions
): boolean => options?.enabled ?? true;

const buildGameLibraryPageFallback = (
  options?: GameLibraryPageQueryOptions
): KangurGameLibraryPageData => createKangurGameLibraryPageDataFromGames({ filter: options });

const isGameLibraryPageAccessDeniedError = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.status === 401 || error.status === 403 || error.status === 404);

const fetchGameLibraryPage = async (
  options?: GameLibraryPageQueryOptions
): Promise<KangurGameLibraryPageData> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameLibraryPage',
      action: 'fetch-game-library-page',
      description: 'Loads consolidated Kangur games library page data from the API.',
      context: resolveGameLibraryPageFilters(options),
    }),
    async () => {
      const payload = await api.get<KangurGameLibraryPageData>(
        '/api/kangur/game-library-page',
        {
          params: resolveGameLibraryPageParams(options),
        }
      );
      return kangurGameLibraryPageDataSchema.parse(payload);
    },
    {
      fallback: () => buildGameLibraryPageFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
      shouldRethrow: isGameLibraryPageAccessDeniedError,
    }
  );

const createKangurGameLibraryPageQuery = (
  options?: GameLibraryPageQueryOptions
): ListQuery<KangurGameLibraryPageData, KangurGameLibraryPageData> =>
  createListQueryV2<KangurGameLibraryPageData, KangurGameLibraryPageData>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameLibraryPage(),
      resolveGameLibraryPageFilters(options),
    ],
    queryFn: async (): Promise<KangurGameLibraryPageData> =>
      await fetchGameLibraryPage(options),
    enabled: isGameLibraryPageQueryEnabled(options),
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

export const useKangurGameLibraryPage = (
  options?: GameLibraryPageQueryOptions
): ListQuery<KangurGameLibraryPageData, KangurGameLibraryPageData> =>
  createKangurGameLibraryPageQuery(options);

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
