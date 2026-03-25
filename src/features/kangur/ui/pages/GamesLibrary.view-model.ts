import type {
  KangurGameCatalogEntry,
  KangurGameVariantCatalogEntry,
} from '@/features/kangur/games';
import {
  KANGUR_AGE_GROUPS,
  KANGUR_SUBJECTS,
} from '@/features/kangur/lessons/lesson-catalog';
import {
  KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_OPERATION_SELECTOR_FALLBACK_LESSON_COMPONENT_IDS,
} from '@/features/kangur/games';
import {
  KANGUR_GAME_ENGINE_CATEGORIES,
  KANGUR_GAME_VARIANT_SURFACES,
} from '@/shared/contracts/kangur-games';
import type {
  KangurGameEngineCategory,
  KangurGameMechanic,
  KangurGameSurface,
} from '@/shared/contracts/kangur-games';
import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
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

export type GamesLibraryEngineGroup = {
  category: KangurGameEngineCategory | null;
  engine: KangurGameCatalogEntry['engine'];
  engineId: string;
  entries: KangurGameCatalogEntry[];
  mechanics: KangurGameMechanic[];
  subjects: KangurLessonSubject[];
  surfaces: KangurGameSurface[];
};

export type GamesLibraryVariantGroup = {
  entries: KangurGameVariantCatalogEntry[];
  surface: (typeof KANGUR_GAME_VARIANT_SURFACES)[number];
};

export type GamesLibraryDrawingGroup = {
  ageGroups: KangurLessonAgeGroup[];
  category: KangurGameEngineCategory | null;
  engine: KangurGameCatalogEntry['engine'];
  engineId: string;
  entries: KangurGameCatalogEntry[];
  lessonComponentIds: KangurLessonComponentId[];
  subjects: KangurLessonSubject[];
  variantCount: number;
};

export type GamesLibraryCohortGroup = {
  ageGroup: KangurLessonAgeGroup;
  engineCount: number;
  entries: KangurGameCatalogEntry[];
  launchableCount: number;
  lessonLinkedCount: number;
  subjects: KangurLessonSubject[];
  variantCount: number;
};

export type GamesLibraryCoverageGroupId =
  | 'library_backed'
  | 'launchable'
  | 'selector_fallback';

export type GamesLibraryCoverageGroup = {
  ageGroups: KangurLessonAgeGroup[];
  componentIds: KangurLessonComponentId[];
  coveredComponentIds: KangurLessonComponentId[];
  entries: KangurGameCatalogEntry[];
  id: GamesLibraryCoverageGroupId;
  subjects: KangurLessonSubject[];
  uncoveredComponentIds: KangurLessonComponentId[];
};

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

const getAgeGroupSortOrder = (ageGroup: KangurLessonAgeGroup): number =>
  KANGUR_AGE_GROUPS.findIndex((entry) => entry.id === ageGroup);

const getSubjectSortOrder = (subject: KangurLessonSubject): number =>
  KANGUR_SUBJECTS.findIndex((entry) => entry.id === subject);

const getEngineCategorySortOrder = (category: KangurGameEngineCategory | null): number =>
  category ? KANGUR_GAME_ENGINE_CATEGORIES.findIndex((entry) => entry === category) : 999;

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
  catalogEntries: KangurGameCatalogEntry[]
): GamesLibraryEngineGroup[] =>
  Array.from(
    catalogEntries.reduce((groups, entry) => {
      const existing = groups.get(entry.game.engineId);
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(entry.game.engineId, [entry]);
      }

      return groups;
    }, new Map<string, KangurGameCatalogEntry[]>())
  )
    .map(([engineId, entries]) => ({
      engineId,
      entries: entries.slice().sort(sortGameEntries),
      engine: entries[0]?.engine ?? null,
      category: entries[0]?.engine?.category ?? null,
      mechanics: unique(
        entries.flatMap((entry) => entry.engine?.mechanics ?? [entry.game.mechanic])
      ),
      subjects: unique(entries.map((entry) => entry.game.subject)),
      surfaces: unique(
        entries.flatMap((entry) => entry.engine?.surfaces ?? entry.game.surfaces)
      ),
    }))
    .sort((left, right) => {
      const leftEngine = left.engine;
      const rightEngine = right.engine;

      if (left.category !== right.category) {
        return (
          getEngineCategorySortOrder(left.category) - getEngineCategorySortOrder(right.category)
        );
      }

      if (leftEngine && rightEngine && leftEngine.sortOrder !== rightEngine.sortOrder) {
        return leftEngine.sortOrder - rightEngine.sortOrder;
      }

      return (
        right.entries.length - left.entries.length ||
        left.engineId.localeCompare(right.engineId)
      );
    });

export const createGamesLibraryDrawingGroups = (
  catalogEntries: KangurGameCatalogEntry[],
  variantEntries: KangurGameVariantCatalogEntry[]
): GamesLibraryDrawingGroup[] =>
  createGamesLibraryEngineGroups(
    catalogEntries.filter((entry) =>
      (entry.engine?.mechanics ?? [entry.game.mechanic]).includes('drawing')
    )
  ).map((group) => ({
    engineId: group.engineId,
    engine: group.engine,
    category: group.category,
    entries: group.entries,
    variantCount: variantEntries.filter((entry) => entry.game.engineId === group.engineId).length,
    ageGroups: unique(
      group.entries
        .map((entry) => entry.game.ageGroup)
        .filter((ageGroup): ageGroup is KangurLessonAgeGroup => Boolean(ageGroup))
    ).sort((left, right) => getAgeGroupSortOrder(left) - getAgeGroupSortOrder(right)),
    subjects: unique(group.entries.map((entry) => entry.game.subject)).sort(
      (left, right) => getSubjectSortOrder(left) - getSubjectSortOrder(right)
    ),
    lessonComponentIds: unique(group.entries.flatMap((entry) => entry.game.lessonComponentIds)),
  }));

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

const createGamesLibraryCoverageGroup = (
  id: GamesLibraryCoverageGroupId,
  componentIds: readonly KangurLessonComponentId[],
  catalogEntries: KangurGameCatalogEntry[]
): GamesLibraryCoverageGroup => {
  const componentIdSet = new Set<KangurLessonComponentId>(componentIds);
  const entries = catalogEntries
    .filter((entry) =>
      entry.game.lessonComponentIds.some((componentId) => componentIdSet.has(componentId))
    )
    .slice()
    .sort(sortGameEntries);
  const coveredComponentIdSet = new Set(
    entries.flatMap((entry) =>
      entry.game.lessonComponentIds.filter((componentId) => componentIdSet.has(componentId))
    )
  );
  const coveredComponentIds = componentIds.filter((componentId) =>
    coveredComponentIdSet.has(componentId)
  );

  return {
    id,
    componentIds: [...componentIds],
    coveredComponentIds,
    uncoveredComponentIds: componentIds.filter(
      (componentId) => !coveredComponentIdSet.has(componentId)
    ),
    entries,
    ageGroups: unique(
      entries
        .map((entry) => entry.game.ageGroup)
        .filter((ageGroup): ageGroup is KangurLessonAgeGroup => Boolean(ageGroup))
    ).sort((left, right) => getAgeGroupSortOrder(left) - getAgeGroupSortOrder(right)),
    subjects: unique(entries.map((entry) => entry.game.subject)).sort(
      (left, right) => getSubjectSortOrder(left) - getSubjectSortOrder(right)
    ),
  };
};

export const createGamesLibraryCoverageGroups = (
  catalogEntries: KangurGameCatalogEntry[]
): GamesLibraryCoverageGroup[] => [
  createGamesLibraryCoverageGroup(
    'library_backed',
    KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS,
    catalogEntries
  ),
  createGamesLibraryCoverageGroup(
    'launchable',
    KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS,
    catalogEntries
  ),
  createGamesLibraryCoverageGroup(
    'selector_fallback',
    KANGUR_OPERATION_SELECTOR_FALLBACK_LESSON_COMPONENT_IDS,
    catalogEntries
  ),
];
