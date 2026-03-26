import type {
  KangurGameEngineCategory,
  KangurGameEngineDefinition,
  KangurGameEngineId,
  KangurGameEngineImplementation,
  KangurGameMechanic,
  KangurGameSurface,
} from '@/shared/contracts/kangur-games';
import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  KANGUR_AGE_GROUPS,
  KANGUR_SUBJECTS,
} from '@/features/kangur/lessons/lesson-catalog';

import {
  createKangurGameCatalogEntries,
  type KangurGameCatalogEntry,
} from './catalog';
import {
  createDefaultKangurGameEngineImplementations,
} from './engine-implementations';
import {
  createKangurGameVariantCatalogEntries,
  type KangurGameVariantCatalogEntry,
} from './variants';

export type KangurGameEngineCatalogEntry = {
  ageGroups: KangurLessonAgeGroup[];
  category: KangurGameEngineCategory | null;
  engine: KangurGameEngineDefinition | null;
  engineId: KangurGameEngineId;
  entries: KangurGameCatalogEntry[];
  implementation: KangurGameEngineImplementation | null;
  launchableCount: number;
  lessonComponentIds: KangurLessonComponentId[];
  mechanics: KangurGameMechanic[];
  subjects: KangurLessonSubject[];
  surfaces: KangurGameSurface[];
  variants: KangurGameVariantCatalogEntry[];
};

export type CreateKangurGameEngineCatalogInput = {
  catalogEntries?: KangurGameCatalogEntry[];
  implementations?: readonly KangurGameEngineImplementation[];
  variantEntries?: KangurGameVariantCatalogEntry[];
};

export type KangurDrawingEngineCatalogEntry = {
  ageGroups: KangurLessonAgeGroup[];
  category: KangurGameEngineCategory | null;
  engine: KangurGameEngineDefinition | null;
  engineId: KangurGameEngineId;
  entries: KangurGameCatalogEntry[];
  implementation: KangurGameEngineImplementation | null;
  lessonComponentIds: KangurLessonComponentId[];
  subjects: KangurLessonSubject[];
  variantCount: number;
};

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const getAgeGroupSortOrder = (ageGroup: KangurLessonAgeGroup): number =>
  KANGUR_AGE_GROUPS.findIndex((entry) => entry.id === ageGroup);

const getSubjectSortOrder = (subject: KangurLessonSubject): number =>
  KANGUR_SUBJECTS.findIndex((entry) => entry.id === subject);

const getImplementationOwnershipSortOrder = (
  ownership: KangurGameEngineImplementation['ownership']
): number => {
  switch (ownership) {
    case 'shared_runtime':
      return 0;
    case 'mixed_runtime':
      return 1;
    case 'lesson_embedded':
    default:
      return 2;
  }
};

export const createKangurGameEngineCatalogEntries = (
  input?: CreateKangurGameEngineCatalogInput
): KangurGameEngineCatalogEntry[] => {
  const catalogEntries = input?.catalogEntries ?? createKangurGameCatalogEntries();
  const variantEntries =
    input?.variantEntries ?? createKangurGameVariantCatalogEntries(catalogEntries);
  const implementations =
    input?.implementations ?? createDefaultKangurGameEngineImplementations();
  const implementationLookup = new Map(
    implementations.map((implementation) => [implementation.engineId, implementation])
  );

  return Array.from(
    catalogEntries.reduce((groups, entry) => {
      const existing = groups.get(entry.game.engineId);
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(entry.game.engineId, [entry]);
      }

      return groups;
    }, new Map<KangurGameEngineId, KangurGameCatalogEntry[]>())
  )
    .map(([engineId, entries]) => ({
      engineId,
      engine: entries[0]?.engine ?? null,
      category: entries[0]?.engine?.category ?? null,
      entries: entries
        .slice()
        .sort(
          (left, right) =>
            left.game.sortOrder - right.game.sortOrder ||
            left.game.title.localeCompare(right.game.title)
        ),
      implementation: implementationLookup.get(engineId) ?? null,
      mechanics: unique(
        entries.flatMap((entry) => entry.engine?.mechanics ?? [entry.game.mechanic])
      ),
      subjects: unique(entries.map((entry) => entry.game.subject)),
      ageGroups: unique(
        entries
          .map((entry) => entry.game.ageGroup)
          .filter((ageGroup): ageGroup is KangurLessonAgeGroup => Boolean(ageGroup))
      ),
      surfaces: unique(
        entries.flatMap((entry) => entry.engine?.surfaces ?? entry.game.surfaces)
      ),
      lessonComponentIds: unique(entries.flatMap((entry) => entry.game.lessonComponentIds)),
      variants: variantEntries
        .filter((entry) => entry.game.engineId === engineId)
        .slice()
        .sort(
          (left, right) =>
            left.game.sortOrder - right.game.sortOrder ||
            left.variant.sortOrder - right.variant.sortOrder ||
            left.variant.title.localeCompare(right.variant.title)
        ),
      launchableCount: entries.filter((entry) => Boolean(entry.launchableScreen)).length,
    }))
    .sort((left, right) => {
      if (left.category !== right.category) {
        const leftCategoryOrder = left.category
          ? ['foundational', 'early_learning', 'adult_learning'].indexOf(left.category)
          : 999;
        const rightCategoryOrder = right.category
          ? ['foundational', 'early_learning', 'adult_learning'].indexOf(right.category)
          : 999;
        return leftCategoryOrder - rightCategoryOrder;
      }

      if (left.engine && right.engine && left.engine.sortOrder !== right.engine.sortOrder) {
        return left.engine.sortOrder - right.engine.sortOrder;
      }

      return right.entries.length - left.entries.length || left.engineId.localeCompare(right.engineId);
    });
};

export const getKangurDrawingEngineCatalogEntries = (
  entries: readonly KangurGameEngineCatalogEntry[]
): KangurGameEngineCatalogEntry[] =>
  entries.filter((entry) => entry.mechanics.includes('drawing'));

export const createKangurDrawingEngineCatalogEntries = (
  entries: readonly KangurGameEngineCatalogEntry[]
): KangurDrawingEngineCatalogEntry[] =>
  getKangurDrawingEngineCatalogEntries(entries).map((entry) => ({
    engineId: entry.engineId,
    engine: entry.engine,
    category: entry.category,
    entries: entry.entries,
    implementation: entry.implementation,
    variantCount: entry.variants.length,
    ageGroups: unique(entry.ageGroups).sort(
      (left, right) => getAgeGroupSortOrder(left) - getAgeGroupSortOrder(right)
    ),
    subjects: unique(entry.subjects).sort(
      (left, right) => getSubjectSortOrder(left) - getSubjectSortOrder(right)
    ),
    lessonComponentIds: unique(entry.entries.flatMap((catalogEntry) => catalogEntry.game.lessonComponentIds)),
  }));

export type KangurGameEngineCatalogOwnershipGroup = {
  engineEntries: KangurGameEngineCatalogEntry[];
  ownership: KangurGameEngineImplementation['ownership'];
};

export type KangurGameEngineCatalogImplementationGroup = {
  engineGroups: KangurGameEngineCatalogEntry[];
  gameCount: number;
  lessonComponentIds: KangurLessonComponentId[];
  ownership: KangurGameEngineImplementation['ownership'];
  runtimeIds: string[];
};

export type KangurGameEngineCatalogFacets = {
  ageGroups: KangurLessonAgeGroup[];
  drawingEngineCount: number;
  engineCategories: KangurGameEngineCategory[];
  engineCount: number;
  engineIds: KangurGameEngineId[];
  engines: KangurGameEngineDefinition[];
  implementationOwnerships: KangurGameEngineImplementation['ownership'][];
  launchableEngineCount: number;
  lessonLinkedEngineCount: number;
  mechanics: KangurGameMechanic[];
  subjects: KangurLessonSubject[];
  surfaces: KangurGameSurface[];
};

export const groupKangurGameEngineCatalogEntriesByImplementationOwnership = (
  entries: readonly KangurGameEngineCatalogEntry[]
): KangurGameEngineCatalogOwnershipGroup[] =>
  Array.from(
    entries.reduce((groups, entry) => {
      const ownership = entry.implementation?.ownership;

      if (!ownership) {
        return groups;
      }

      const existing = groups.get(ownership);
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(ownership, [entry]);
      }

      return groups;
    }, new Map<KangurGameEngineImplementation['ownership'], KangurGameEngineCatalogEntry[]>())
  )
    .map(([ownership, engineEntries]) => ({ ownership, engineEntries }))
    .sort(
      (left, right) =>
        getImplementationOwnershipSortOrder(left.ownership) -
        getImplementationOwnershipSortOrder(right.ownership)
    );

export const createKangurGameEngineCatalogImplementationGroups = (
  entries: readonly KangurGameEngineCatalogEntry[]
): KangurGameEngineCatalogImplementationGroup[] =>
  groupKangurGameEngineCatalogEntriesByImplementationOwnership(entries).map(
    ({ ownership, engineEntries: engineGroups }) => ({
      ownership,
      engineGroups,
      gameCount: engineGroups.reduce((count, group) => count + group.entries.length, 0),
      lessonComponentIds: unique(
        engineGroups.flatMap((group) => group.entries.flatMap((entry) => entry.game.lessonComponentIds))
      ),
      runtimeIds: unique(
        engineGroups.flatMap((group) => group.implementation?.runtimeIds ?? [])
      ),
    })
  );

export const getKangurGameEngineCatalogFacets = (
  entries: readonly KangurGameEngineCatalogEntry[]
): KangurGameEngineCatalogFacets => ({
  engineCount: entries.length,
  launchableEngineCount: entries.filter((entry) => entry.launchableCount > 0).length,
  drawingEngineCount: entries.filter((entry) => entry.mechanics.includes('drawing')).length,
  lessonLinkedEngineCount: entries.filter((entry) => entry.lessonComponentIds.length > 0).length,
  ageGroups: unique(entries.flatMap((entry) => entry.ageGroups)),
  subjects: unique(entries.flatMap((entry) => entry.subjects)),
  mechanics: unique(entries.flatMap((entry) => entry.mechanics)),
  surfaces: unique(entries.flatMap((entry) => entry.surfaces)),
  engineIds: entries.map((entry) => entry.engineId),
  engineCategories: unique(
    entries
      .map((entry) => entry.category)
      .filter((category): category is KangurGameEngineCategory => Boolean(category))
  ),
  implementationOwnerships: unique(
    entries
      .map((entry) => entry.implementation?.ownership)
      .filter(
        (ownership): ownership is KangurGameEngineImplementation['ownership'] => Boolean(ownership)
      )
  ),
  engines: entries
    .map((entry) => entry.engine)
    .filter((engine): engine is KangurGameEngineDefinition => Boolean(engine)),
});
