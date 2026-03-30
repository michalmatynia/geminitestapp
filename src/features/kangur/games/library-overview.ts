import {
  KANGUR_AGE_GROUPS,
  KANGUR_SUBJECTS,
} from '@/features/kangur/lessons/lesson-catalog';
import type {
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurGameVariantSurface } from '@/shared/contracts/kangur-games';

import type { KangurGameCatalogEntry } from './catalog';
import type { KangurGameVariantCatalogEntry } from './variants';

export type KangurGamesLibraryMetrics = {
  engineCount: number;
  lessonLinkedCount: number;
  variantCount: number;
  visibleGameCount: number;
};

export type KangurGamesLibrarySubjectDefinition = {
  ageGroups: KangurLessonAgeGroup[];
  default?: boolean;
  id: KangurLessonSubject;
  label: string;
  shortLabel: string;
  sortOrder: number;
};

export type KangurGamesLibrarySubjectGroup = {
  entries: KangurGameCatalogEntry[];
  subject: KangurGamesLibrarySubjectDefinition;
};

export type KangurGamesLibraryVariantGroup = {
  entries: KangurGameVariantCatalogEntry[];
  surface: KangurGamesLibraryVariantGroupSurface;
};

export type KangurGamesLibraryCohortGroup = {
  ageGroup: KangurLessonAgeGroup;
  engineCount: number;
  entries: KangurGameCatalogEntry[];
  launchableCount: number;
  lessonLinkedCount: number;
  subjects: KangurLessonSubject[];
  variantCount: number;
};

export type KangurGamesLibraryOverview = {
  cohortGroups: KangurGamesLibraryCohortGroup[];
  metrics: KangurGamesLibraryMetrics;
  subjectGroups: KangurGamesLibrarySubjectGroup[];
  variantGroups: KangurGamesLibraryVariantGroup[];
};

export type KangurGamesLibraryVariantGroupSurface =
  | 'lesson'
  | Exclude<KangurGameVariantSurface, 'lesson_stage' | 'lesson_inline'>;

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

const KANGUR_GAMES_LIBRARY_VARIANT_GROUP_SURFACES: readonly KangurGamesLibraryVariantGroupSurface[] =
  ['lesson', 'library_preview', 'game_screen'];

const matchesVariantGroupSurface = (
  entry: KangurGameVariantCatalogEntry,
  surface: KangurGamesLibraryVariantGroupSurface
): boolean => {
  if (surface === 'lesson') {
    return entry.variant.surface === 'lesson_inline' || entry.variant.surface === 'lesson_stage';
  }

  return entry.variant.surface === surface;
};

const getAgeGroupSortOrder = (ageGroup: KangurLessonAgeGroup): number =>
  KANGUR_AGE_GROUPS.findIndex((entry) => entry.id === ageGroup);

export const createKangurGamesLibraryMetrics = (
  catalogEntries: KangurGameCatalogEntry[],
  variantEntries: KangurGameVariantCatalogEntry[]
): KangurGamesLibraryMetrics => ({
  engineCount: new Set(catalogEntries.map((entry) => entry.game.engineId)).size,
  lessonLinkedCount: catalogEntries.filter((entry) => entry.game.lessonComponentIds.length > 0)
    .length,
  variantCount: variantEntries.length,
  visibleGameCount: catalogEntries.length,
});

export const createKangurGamesLibrarySubjectGroups = (
  catalogEntries: KangurGameCatalogEntry[]
): KangurGamesLibrarySubjectGroup[] =>
  KANGUR_SUBJECTS.map((subject) => ({
    subject: {
      id: subject.id,
      label: subject.label,
      shortLabel: subject.shortLabel,
      sortOrder: subject.sortOrder,
      ...(typeof subject.default === 'boolean' ? { default: subject.default } : {}),
      ageGroups: [...(subject.ageGroups ?? [])],
    },
    entries: catalogEntries
      .filter((entry) => entry.game.subject === subject.id)
      .slice()
      .sort(sortGameEntries),
  })).filter((group) => group.entries.length > 0);

export const createKangurGamesLibraryVariantGroups = (
  variantEntries: KangurGameVariantCatalogEntry[]
): KangurGamesLibraryVariantGroup[] =>
  KANGUR_GAMES_LIBRARY_VARIANT_GROUP_SURFACES.map((surface) => ({
    surface,
    entries: variantEntries
      .filter((entry) => matchesVariantGroupSurface(entry, surface))
      .slice()
      .sort(sortVariantEntries),
  })).filter((group) => group.entries.length > 0);

export const createKangurGamesLibraryCohortGroups = (
  catalogEntries: KangurGameCatalogEntry[],
  variantEntries: KangurGameVariantCatalogEntry[]
): KangurGamesLibraryCohortGroup[] =>
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

export const createKangurGamesLibraryOverview = (
  catalogEntries: KangurGameCatalogEntry[],
  variantEntries: KangurGameVariantCatalogEntry[]
): KangurGamesLibraryOverview => ({
  metrics: createKangurGamesLibraryMetrics(catalogEntries, variantEntries),
  subjectGroups: createKangurGamesLibrarySubjectGroups(catalogEntries),
  cohortGroups: createKangurGamesLibraryCohortGroups(catalogEntries, variantEntries),
  variantGroups: createKangurGamesLibraryVariantGroups(variantEntries),
});
