import type { KangurGameCatalogFilter } from '@/features/kangur/games';
import type {
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  KANGUR_GAME_VARIANT_SURFACES,
  kangurGameEngineCategorySchema,
  kangurGameEngineIdSchema,
  kangurGameEngineImplementationOwnershipSchema,
  kangurGameIdSchema,
  kangurGameMechanicSchema,
  kangurGameStatusSchema,
  kangurGameSurfaceSchema,
  type KangurGameEngineCategory,
  type KangurGameEngineId,
  type KangurGameEngineImplementationOwnership,
  type KangurGameId,
  type KangurGameMechanic,
  type KangurGameStatus,
  type KangurGameSurface,
  type KangurGameVariantSurface,
} from '@/shared/contracts/kangur-games';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur-lesson-constants';
import type { ZodType } from 'zod';

type SearchParamReader = Pick<URLSearchParams, 'get' | 'getAll'> | null | undefined;

export type GamesLibraryFilterValue<T extends string> = 'all' | T;
export type GamesLibraryTabId = 'catalog' | 'structure' | 'runtime';

const GAMES_LIBRARY_QUERY_PARAM_KEYS = [
  'gameId',
  'subject',
  'ageGroup',
  'lessonComponentId',
  'mechanic',
  'surface',
  'gameStatus',
  'variantSurface',
  'variantStatus',
  'engineId',
  'engineCategory',
  'implementationOwnership',
  'launchableOnly',
  'tab',
] as const;

const GAMES_LIBRARY_TAB_IDS: readonly GamesLibraryTabId[] = [
  'catalog',
  'structure',
  'runtime',
] as const;

export type GamesLibraryFilterState = {
  gameId: GamesLibraryFilterValue<KangurGameId>;
  subject: GamesLibraryFilterValue<KangurLessonSubject>;
  ageGroup: GamesLibraryFilterValue<KangurLessonAgeGroup>;
  mechanic: GamesLibraryFilterValue<KangurGameMechanic>;
  surface: GamesLibraryFilterValue<KangurGameSurface>;
  gameStatus: GamesLibraryFilterValue<KangurGameStatus>;
  variantSurface: GamesLibraryFilterValue<KangurGameVariantSurface>;
  variantStatus: GamesLibraryFilterValue<KangurGameStatus>;
  engineId: GamesLibraryFilterValue<KangurGameEngineId>;
  engineCategory: GamesLibraryFilterValue<KangurGameEngineCategory>;
  implementationOwnership: GamesLibraryFilterValue<KangurGameEngineImplementationOwnership>;
  launchability: 'all' | 'launchable';
};

export const DEFAULT_GAMES_LIBRARY_FILTERS: GamesLibraryFilterState = {
  gameId: 'all',
  subject: 'all',
  ageGroup: 'all',
  mechanic: 'all',
  surface: 'all',
  gameStatus: 'all',
  variantSurface: 'all',
  variantStatus: 'all',
  engineId: 'all',
  engineCategory: 'all',
  implementationOwnership: 'all',
  launchability: 'all',
};

const GAMES_LIBRARY_FILTER_KEYS = [
  'gameId',
  'subject',
  'ageGroup',
  'mechanic',
  'surface',
  'gameStatus',
  'variantSurface',
  'variantStatus',
  'engineId',
  'engineCategory',
  'implementationOwnership',
  'launchability',
] as const satisfies readonly (keyof GamesLibraryFilterState)[];

const readSearchParam = (
  searchParams: SearchParamReader,
  key: string
): string | undefined => {
  const rawValue = searchParams?.get(key)?.trim();
  return rawValue ? rawValue : undefined;
};

const readSearchParamValues = (
  searchParams: SearchParamReader,
  key: string
): string[] => {
  if (!searchParams) {
    return [];
  }

  if (typeof searchParams.getAll === 'function') {
    return searchParams.getAll(key);
  }

  const value = searchParams.get(key);
  return value === null ? [] : [value];
};

const parseOptionalQueryValue = <T extends string>(
  schema: ZodType<T>,
  value: string | undefined
): T | undefined => {
  if (!value) {
    return undefined;
  }

  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
};

const parseVariantSurface = (value: string | undefined): KangurGameVariantSurface | undefined => {
  if (!value) {
    return undefined;
  }

  return KANGUR_GAME_VARIANT_SURFACES.find((surface) => surface === value);
};

const readGamesLibraryFilterValue = <T extends string>(
  searchParams: SearchParamReader,
  key: string,
  schema: ZodType<T>
): GamesLibraryFilterValue<T> =>
  parseOptionalQueryValue(schema, readSearchParam(searchParams, key)) ?? 'all';

const readGamesLibraryVariantSurfaceFilter = (
  searchParams: SearchParamReader
): GamesLibraryFilterValue<KangurGameVariantSurface> =>
  parseVariantSurface(readSearchParam(searchParams, 'variantSurface')) ?? 'all';

const resolveGamesLibrarySearchParamValue = <T extends string>(
  value: GamesLibraryFilterValue<T>
): T | undefined => (value === 'all' ? undefined : value);

const resolveGamesLibraryLaunchableOnlySearchParam = (
  launchability: GamesLibraryFilterState['launchability']
): 'true' | undefined => (launchability === 'launchable' ? 'true' : undefined);

const resolveGamesLibraryCatalogLaunchableOnly = (
  launchability: GamesLibraryFilterState['launchability']
): true | undefined => (launchability === 'launchable' ? true : undefined);

const resolveGamesLibraryTabSearchParam = (
  tab?: GamesLibraryTabId | null
): GamesLibraryTabId | undefined => (tab && tab !== 'catalog' ? tab : undefined);

export const readGamesLibraryTabFromSearchParams = (
  searchParams: SearchParamReader
): GamesLibraryTabId | null => {
  const value = readSearchParam(searchParams, 'tab');
  return value && GAMES_LIBRARY_TAB_IDS.includes(value as GamesLibraryTabId)
    ? (value as GamesLibraryTabId)
    : null;
};

export const readGamesLibraryFiltersFromSearchParams = (
  searchParams: SearchParamReader
): GamesLibraryFilterState => {
  return {
    gameId: readGamesLibraryFilterValue(searchParams, 'gameId', kangurGameIdSchema),
    subject: readGamesLibraryFilterValue(searchParams, 'subject', kangurLessonSubjectSchema),
    ageGroup: readGamesLibraryFilterValue(searchParams, 'ageGroup', kangurLessonAgeGroupSchema),
    mechanic: readGamesLibraryFilterValue(searchParams, 'mechanic', kangurGameMechanicSchema),
    surface: readGamesLibraryFilterValue(searchParams, 'surface', kangurGameSurfaceSchema),
    gameStatus: readGamesLibraryFilterValue(searchParams, 'gameStatus', kangurGameStatusSchema),
    variantSurface: readGamesLibraryVariantSurfaceFilter(searchParams),
    variantStatus: readGamesLibraryFilterValue(
      searchParams,
      'variantStatus',
      kangurGameStatusSchema
    ),
    engineId: readGamesLibraryFilterValue(searchParams, 'engineId', kangurGameEngineIdSchema),
    engineCategory: readGamesLibraryFilterValue(
      searchParams,
      'engineCategory',
      kangurGameEngineCategorySchema
    ),
    implementationOwnership: readGamesLibraryFilterValue(
      searchParams,
      'implementationOwnership',
      kangurGameEngineImplementationOwnershipSchema
    ),
    launchability: readSearchParam(searchParams, 'launchableOnly') === 'true' ? 'launchable' : 'all',
  };
};

export const getGamesLibrarySearchParams = (
  filters: GamesLibraryFilterState,
  tab?: GamesLibraryTabId | null
): Record<string, string | undefined> => ({
  gameId: resolveGamesLibrarySearchParamValue(filters.gameId),
  subject: resolveGamesLibrarySearchParamValue(filters.subject),
  ageGroup: resolveGamesLibrarySearchParamValue(filters.ageGroup),
  lessonComponentId: undefined,
  mechanic: resolveGamesLibrarySearchParamValue(filters.mechanic),
  surface: resolveGamesLibrarySearchParamValue(filters.surface),
  gameStatus: resolveGamesLibrarySearchParamValue(filters.gameStatus),
  variantSurface: resolveGamesLibrarySearchParamValue(filters.variantSurface),
  variantStatus: resolveGamesLibrarySearchParamValue(filters.variantStatus),
  engineId: resolveGamesLibrarySearchParamValue(filters.engineId),
  engineCategory: resolveGamesLibrarySearchParamValue(filters.engineCategory),
  implementationOwnership: resolveGamesLibrarySearchParamValue(filters.implementationOwnership),
  launchableOnly: resolveGamesLibraryLaunchableOnlySearchParam(filters.launchability),
  tab: resolveGamesLibraryTabSearchParam(tab),
});

export const areGamesLibrarySearchParamsCanonical = (
  searchParams: SearchParamReader,
  filters: GamesLibraryFilterState,
  tab?: GamesLibraryTabId | null
): boolean => {
  const expectedParams = getGamesLibrarySearchParams(filters, tab);

  return GAMES_LIBRARY_QUERY_PARAM_KEYS.every((key) => {
    const rawValues = readSearchParamValues(searchParams, key);
    const expectedValue = expectedParams[key];

    if (expectedValue === undefined) {
      return rawValues.length === 0;
    }

    return rawValues.length === 1 && rawValues[0] === expectedValue;
  });
};

export const buildGamesLibraryCatalogFilter = (
  filters: GamesLibraryFilterState
): KangurGameCatalogFilter => ({
  gameId: resolveGamesLibrarySearchParamValue(filters.gameId),
  subject: resolveGamesLibrarySearchParamValue(filters.subject),
  ageGroup: resolveGamesLibrarySearchParamValue(filters.ageGroup),
  mechanic: resolveGamesLibrarySearchParamValue(filters.mechanic),
  surface: resolveGamesLibrarySearchParamValue(filters.surface),
  gameStatus: resolveGamesLibrarySearchParamValue(filters.gameStatus),
  variantSurface: resolveGamesLibrarySearchParamValue(filters.variantSurface),
  variantStatus: resolveGamesLibrarySearchParamValue(filters.variantStatus),
  engineId: resolveGamesLibrarySearchParamValue(filters.engineId),
  engineCategory: resolveGamesLibrarySearchParamValue(filters.engineCategory),
  implementationOwnership: resolveGamesLibrarySearchParamValue(filters.implementationOwnership),
  launchableOnly: resolveGamesLibraryCatalogLaunchableOnly(filters.launchability),
});

export const hasActiveGamesLibraryFilters = (filters: GamesLibraryFilterState): boolean =>
  Object.values(filters).some((value) => value !== 'all');

export const areGamesLibraryFiltersEqual = (
  left: GamesLibraryFilterState,
  right: GamesLibraryFilterState
): boolean => GAMES_LIBRARY_FILTER_KEYS.every((key) => left[key] === right[key]);
