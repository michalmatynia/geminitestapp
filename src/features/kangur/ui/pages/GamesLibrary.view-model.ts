import type {
  KangurDrawingEngineCatalogEntry,
  KangurGameCatalogEntry,
  KangurGameEngineCatalogEntry,
  KangurGameEngineCatalogImplementationGroup,
  KangurGameLibraryCoverageGroup,
  KangurGameLibraryCoverageGroupId,
  KangurGameEngineImplementation,
  KangurGamesLibraryCohortGroup,
  KangurGamesLibraryMetrics,
  KangurGamesLibrarySubjectGroup,
  KangurGamesLibraryVariantGroup,
  KangurGameVariantCatalogEntry,
} from '@/features/kangur/games';
import {
  createDefaultKangurGameEngineImplementations,
  createKangurDrawingEngineCatalogEntries,
  createKangurGameEngineCatalogEntries,
  createKangurGameEngineCatalogImplementationGroups,
  createKangurGameLibraryCoverageGroups,
  createKangurGamesLibraryCohortGroups,
  createKangurGamesLibraryMetrics,
  createKangurGamesLibrarySubjectGroups,
  createKangurGamesLibraryVariantGroups,
} from '@/features/kangur/games';
export type GamesLibraryMetrics = KangurGamesLibraryMetrics;

export type GamesLibrarySubjectGroup = KangurGamesLibrarySubjectGroup;

export type GamesLibraryEngineGroup = KangurGameEngineCatalogEntry;

export type GamesLibraryVariantGroup = KangurGamesLibraryVariantGroup;

export type GamesLibraryDrawingGroup = KangurDrawingEngineCatalogEntry;

export type GamesLibraryCohortGroup = KangurGamesLibraryCohortGroup;

export type GamesLibraryCoverageGroupId = KangurGameLibraryCoverageGroupId;

export type GamesLibraryImplementationGroup = KangurGameEngineCatalogImplementationGroup;

export type GamesLibraryCoverageGroup = KangurGameLibraryCoverageGroup;

const DEFAULT_GAME_ENGINE_IMPLEMENTATIONS = createDefaultKangurGameEngineImplementations();

export const createGamesLibraryMetrics = (
  catalogEntries: KangurGameCatalogEntry[],
  variantEntries: KangurGameVariantCatalogEntry[]
): GamesLibraryMetrics => createKangurGamesLibraryMetrics(catalogEntries, variantEntries);

export const createGamesLibrarySubjectGroups = (
  catalogEntries: KangurGameCatalogEntry[]
): GamesLibrarySubjectGroup[] => createKangurGamesLibrarySubjectGroups(catalogEntries);

export const createGamesLibraryEngineGroups = (
  catalogEntries: KangurGameCatalogEntry[],
  implementations: readonly KangurGameEngineImplementation[] = DEFAULT_GAME_ENGINE_IMPLEMENTATIONS
): GamesLibraryEngineGroup[] =>
  createKangurGameEngineCatalogEntries({
    catalogEntries,
    implementations,
  });

export const createGamesLibraryDrawingGroups = (
  catalogEntries: KangurGameCatalogEntry[],
  variantEntries: KangurGameVariantCatalogEntry[],
  implementations: readonly KangurGameEngineImplementation[] = DEFAULT_GAME_ENGINE_IMPLEMENTATIONS
): GamesLibraryDrawingGroup[] =>
  createGamesLibraryDrawingGroupsFromEngineGroups(
    createKangurGameEngineCatalogEntries({
      catalogEntries,
      variantEntries,
      implementations,
    })
  );

export const createGamesLibraryDrawingGroupsFromEngineGroups = (
  engineGroups: GamesLibraryEngineGroup[]
): GamesLibraryDrawingGroup[] =>
  createKangurDrawingEngineCatalogEntries(engineGroups);

export const createGamesLibraryVariantGroups = (
  variantEntries: KangurGameVariantCatalogEntry[]
): GamesLibraryVariantGroup[] => createKangurGamesLibraryVariantGroups(variantEntries);

export const createGamesLibraryImplementationGroups = (
  catalogEntries: KangurGameCatalogEntry[],
  implementations: readonly KangurGameEngineImplementation[] = DEFAULT_GAME_ENGINE_IMPLEMENTATIONS
): GamesLibraryImplementationGroup[] =>
  createGamesLibraryImplementationGroupsFromEngineGroups(
    createKangurGameEngineCatalogEntries({
      catalogEntries,
      implementations,
    })
  );

export const createGamesLibraryImplementationGroupsFromEngineGroups = (
  engineGroups: GamesLibraryEngineGroup[]
): GamesLibraryImplementationGroup[] =>
  createKangurGameEngineCatalogImplementationGroups(engineGroups);

export const createGamesLibraryCohortGroups = (
  catalogEntries: KangurGameCatalogEntry[],
  variantEntries: KangurGameVariantCatalogEntry[]
): GamesLibraryCohortGroup[] =>
  createKangurGamesLibraryCohortGroups(catalogEntries, variantEntries);

export const createGamesLibraryCoverageGroups = (
  catalogEntries: KangurGameCatalogEntry[]
): GamesLibraryCoverageGroup[] => createKangurGameLibraryCoverageGroups(catalogEntries);
