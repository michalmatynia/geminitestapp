import type {
  KangurDrawingEngineCatalogEntry,
  KangurGameCatalogEntry,
  KangurGameEngineCatalogEntry,
  KangurGameEngineCatalogImplementationGroup,
  KangurGameLibraryCoverageGroup,
  KangurGameLibraryCoverageGroupId,
  KangurGameEngineImplementation,
  KangurGameVariantCatalogEntry,
} from '@/features/kangur/games';
import {
  KANGUR_AGE_GROUPS,
  KANGUR_SUBJECTS,
} from '@/features/kangur/lessons/lesson-catalog';
import {
  createDefaultKangurGameEngineImplementations,
  createKangurDrawingEngineCatalogEntries,
  createKangurGameEngineCatalogEntries,
  createKangurGameEngineCatalogImplementationGroups,
  createKangurGameLibraryCoverageGroups,
} from '@/features/kangur/games';
import { KANGUR_GAME_VARIANT_SURFACES } from '@/shared/contracts/kangur-games';
import type {
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

export type GamesLibraryMetrics = {
  engineCount: number;
  lessonLinkedCount: number;
  variantCount: number;
  visibleGameCount: number;
};

export type GamesLibrarySubjectGroup = {
  entries: KangurGameCatalogEntry[];
  subject: (typeof KANGUR_SUBJECTS)[number];
};

export type GamesLibraryEngineGroup = KangurGameEngineCatalogEntry;

export type GamesLibraryVariantGroup = {
  entries: KangurGameVariantCatalogEntry[];
  surface: (typeof KANGUR_GAME_VARIANT_SURFACES)[number];
};

export type GamesLibraryDrawingGroup = KangurDrawingEngineCatalogEntry;

export type GamesLibraryCohortGroup = {
  ageGroup: KangurLessonAgeGroup;
  engineCount: number;
  entries: KangurGameCatalogEntry[];
  launchableCount: number;
  lessonLinkedCount: number;
  subjects: KangurLessonSubject[];
  variantCount: number;
};

export type GamesLibraryCoverageGroupId = KangurGameLibraryCoverageGroupId;

export type GamesLibraryImplementationGroup = KangurGameEngineCatalogImplementationGroup;

export type GamesLibraryCoverageGroup = KangurGameLibraryCoverageGroup;

const sortGameEntries = (left: KangurGameCatalogEntry, right: KangurGameCatalogEntry): number =>
  left.game.sortOrder - right.game.sortOrder || left.game.title.localeCompare(right.game.title);

const sortVariantEntries = (
  left: KangurGameVariantCatalogEntry,
  right: KangurGameVariantCatalogEntry
): number =>
  left.game.sortOrder - right.game.sortOrder ||
  left.variant.sortOrder - right.variant.sortOrder ||
  left.variant.title.localeCompare(right.variant.title);

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const DEFAULT_GAME_ENGINE_IMPLEMENTATIONS = createDefaultKangurGameEngineImplementations();

const getAgeGroupSortOrder = (ageGroup: KangurLessonAgeGroup): number =>
  KANGUR_AGE_GROUPS.findIndex((entry) => entry.id === ageGroup);

export const createGamesLibraryMetrics = (
  catalogEntries: KangurGameCatalogEntry[],
  variantEntries: KangurGameVariantCatalogEntry[]
): GamesLibraryMetrics => ({
  engineCount: new Set(catalogEntries.map((entry) => entry.game.engineId)).size,
  lessonLinkedCount: catalogEntries.filter((entry) => entry.game.lessonComponentIds.length > 0)
    .length,
  variantCount: variantEntries.length,
  visibleGameCount: catalogEntries.length,
});

export const createGamesLibrarySubjectGroups = (
  catalogEntries: KangurGameCatalogEntry[]
): GamesLibrarySubjectGroup[] =>
  KANGUR_SUBJECTS.map((subject) => ({
    subject,
    entries: catalogEntries
      .filter((entry) => entry.game.subject === subject.id)
      .slice()
      .sort(sortGameEntries),
  })).filter((group) => group.entries.length > 0);

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
): GamesLibraryVariantGroup[] =>
  KANGUR_GAME_VARIANT_SURFACES.map((surface) => ({
    surface,
    entries: variantEntries
      .filter((entry) => entry.variant.surface === surface)
      .slice()
      .sort(sortVariantEntries),
  })).filter((group) => group.entries.length > 0);

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
  unique(
    catalogEntries
      .map((entry) => entry.game.ageGroup)
      .filter((ageGroup): ageGroup is KangurLessonAgeGroup => Boolean(ageGroup))
  )
    .map((ageGroup) => {
      const entries = catalogEntries
        .filter((entry) => entry.game.ageGroup === ageGroup)
        .slice()
        .sort(sortGameEntries);
      const ageGroupVariants = variantEntries.filter((entry) => entry.game.ageGroup === ageGroup);

      return {
        ageGroup,
        engineCount: new Set(entries.map((entry) => entry.game.engineId)).size,
        entries,
        launchableCount: entries.filter((entry) => Boolean(entry.launchableScreen)).length,
        lessonLinkedCount: entries.filter((entry) => entry.game.lessonComponentIds.length > 0)
          .length,
        subjects: unique(entries.map((entry) => entry.game.subject)),
        variantCount: ageGroupVariants.length,
      };
    })
    .sort(
      (left, right) =>
        getAgeGroupSortOrder(left.ageGroup) - getAgeGroupSortOrder(right.ageGroup)
    );

export const createGamesLibraryCoverageGroups = (
  catalogEntries: KangurGameCatalogEntry[]
): GamesLibraryCoverageGroup[] => createKangurGameLibraryCoverageGroups(catalogEntries);
