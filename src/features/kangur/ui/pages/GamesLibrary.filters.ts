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

type SearchParamReader = Pick<URLSearchParams, 'get'> | null | undefined;

export type GamesLibraryFilterValue<T extends string> = 'all' | T;
export type GamesLibraryTabId = 'catalog' | 'structure' | 'runtime';

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

const readSearchParam = (
  searchParams: SearchParamReader,
  key: string
): string | undefined => {
  const rawValue = searchParams?.get(key)?.trim();
  return rawValue ? rawValue : undefined;
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
  const launchableOnly = readSearchParam(searchParams, 'launchableOnly') === 'true';

  return {
    gameId:
      parseOptionalQueryValue(kangurGameIdSchema, readSearchParam(searchParams, 'gameId')) ??
      'all',
    subject:
      parseOptionalQueryValue(kangurLessonSubjectSchema, readSearchParam(searchParams, 'subject')) ??
      'all',
    ageGroup:
      parseOptionalQueryValue(
        kangurLessonAgeGroupSchema,
        readSearchParam(searchParams, 'ageGroup')
      ) ?? 'all',
    mechanic:
      parseOptionalQueryValue(
        kangurGameMechanicSchema,
        readSearchParam(searchParams, 'mechanic')
      ) ?? 'all',
    surface:
      parseOptionalQueryValue(kangurGameSurfaceSchema, readSearchParam(searchParams, 'surface')) ??
      'all',
    gameStatus:
      parseOptionalQueryValue(
        kangurGameStatusSchema,
        readSearchParam(searchParams, 'gameStatus')
      ) ?? 'all',
    variantSurface: parseVariantSurface(readSearchParam(searchParams, 'variantSurface')) ?? 'all',
    variantStatus:
      parseOptionalQueryValue(
        kangurGameStatusSchema,
        readSearchParam(searchParams, 'variantStatus')
      ) ?? 'all',
    engineId:
      parseOptionalQueryValue(
        kangurGameEngineIdSchema,
        readSearchParam(searchParams, 'engineId')
      ) ?? 'all',
    engineCategory:
      parseOptionalQueryValue(
        kangurGameEngineCategorySchema,
        readSearchParam(searchParams, 'engineCategory')
      ) ?? 'all',
    implementationOwnership:
      parseOptionalQueryValue(
        kangurGameEngineImplementationOwnershipSchema,
        readSearchParam(searchParams, 'implementationOwnership')
      ) ?? 'all',
    launchability: launchableOnly ? 'launchable' : 'all',
  };
};

export const getGamesLibrarySearchParams = (
  filters: GamesLibraryFilterState,
  tab?: GamesLibraryTabId | null
): Record<string, string | undefined> => ({
  gameId: filters.gameId === 'all' ? undefined : filters.gameId,
  subject: filters.subject === 'all' ? undefined : filters.subject,
  ageGroup: filters.ageGroup === 'all' ? undefined : filters.ageGroup,
  mechanic: filters.mechanic === 'all' ? undefined : filters.mechanic,
  surface: filters.surface === 'all' ? undefined : filters.surface,
  gameStatus: filters.gameStatus === 'all' ? undefined : filters.gameStatus,
  variantSurface: filters.variantSurface === 'all' ? undefined : filters.variantSurface,
  variantStatus: filters.variantStatus === 'all' ? undefined : filters.variantStatus,
  engineId: filters.engineId === 'all' ? undefined : filters.engineId,
  engineCategory: filters.engineCategory === 'all' ? undefined : filters.engineCategory,
  implementationOwnership:
    filters.implementationOwnership === 'all'
      ? undefined
      : filters.implementationOwnership,
  launchableOnly: filters.launchability === 'launchable' ? 'true' : undefined,
  tab: tab && tab !== 'catalog' ? tab : undefined,
});

export const buildGamesLibraryCatalogFilter = (
  filters: GamesLibraryFilterState
): KangurGameCatalogFilter => ({
  gameId: filters.gameId === 'all' ? undefined : filters.gameId,
  subject: filters.subject === 'all' ? undefined : filters.subject,
  ageGroup: filters.ageGroup === 'all' ? undefined : filters.ageGroup,
  mechanic: filters.mechanic === 'all' ? undefined : filters.mechanic,
  surface: filters.surface === 'all' ? undefined : filters.surface,
  gameStatus: filters.gameStatus === 'all' ? undefined : filters.gameStatus,
  variantSurface: filters.variantSurface === 'all' ? undefined : filters.variantSurface,
  variantStatus: filters.variantStatus === 'all' ? undefined : filters.variantStatus,
  engineId: filters.engineId === 'all' ? undefined : filters.engineId,
  engineCategory: filters.engineCategory === 'all' ? undefined : filters.engineCategory,
  implementationOwnership:
    filters.implementationOwnership === 'all'
      ? undefined
      : filters.implementationOwnership,
  launchableOnly: filters.launchability === 'launchable' ? true : undefined,
});

export const hasActiveGamesLibraryFilters = (filters: GamesLibraryFilterState): boolean =>
  Object.values(filters).some((value) => value !== 'all');

export const areGamesLibraryFiltersEqual = (
  left: GamesLibraryFilterState,
  right: GamesLibraryFilterState
): boolean =>
  left.gameId === right.gameId &&
  left.subject === right.subject &&
  left.ageGroup === right.ageGroup &&
  left.mechanic === right.mechanic &&
  left.surface === right.surface &&
  left.gameStatus === right.gameStatus &&
  left.variantSurface === right.variantSurface &&
  left.variantStatus === right.variantStatus &&
  left.engineId === right.engineId &&
  left.engineCategory === right.engineCategory &&
  left.implementationOwnership === right.implementationOwnership &&
  left.launchability === right.launchability;
