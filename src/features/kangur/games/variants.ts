import type {
  KangurGameEngineCategory,
  KangurGameMechanic,
  KangurGameStatus,
  KangurGameVariant,
  KangurGameVariantSurface,
  KangurLessonActivityRuntimeSpec,
  KangurLessonStageGameRuntimeSpec,
  KangurLaunchableGameRuntimeSpec,
  KangurLaunchableGameScreen,
  KangurGameEngineId,
  KangurGameEngineDefinition,
  KangurGameDefinition,
  KangurGameEngineImplementationOwnership,
  KangurGameSurface,
} from '@/shared/contracts/kangur-games';
import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

import {
  createKangurGameCatalogEntries,
  type KangurGameCatalogEntry,
} from './catalog';
import { getOptionalKangurGameEngineImplementation } from './engine-implementations';

export type KangurGameVariantCatalogEntry = {
  game: KangurGameDefinition;
  engine: KangurGameEngineDefinition | null;
  variant: KangurGameVariant;
  lessonActivityRuntime: KangurLessonActivityRuntimeSpec | null;
  lessonStageRuntime: KangurLessonStageGameRuntimeSpec | null;
  launchableScreen: KangurLaunchableGameScreen | null;
  launchableRuntime: KangurLaunchableGameRuntimeSpec | null;
  isDefaultVariant: boolean;
  isLessonVariant: boolean;
  isLibraryPreviewVariant: boolean;
  isGameScreenVariant: boolean;
};

export type KangurGameVariantCatalogFilter = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  gameStatus?: KangurGameStatus;
  surface?: KangurGameSurface;
  lessonComponentId?: KangurLessonComponentId;
  mechanic?: KangurGameMechanic;
  engineId?: KangurGameEngineId;
  engineCategory?: KangurGameEngineCategory;
  implementationOwnership?: KangurGameEngineImplementationOwnership;
  variantSurface?: KangurGameVariantSurface;
  variantStatus?: KangurGameStatus;
  launchableOnly?: boolean;
};

const sortVariants = (left: KangurGameVariant, right: KangurGameVariant): number =>
  left.sortOrder - right.sortOrder || left.title.localeCompare(right.title);

const createVariantCatalogEntry = (
  entry: KangurGameCatalogEntry,
  variant: KangurGameVariant
): KangurGameVariantCatalogEntry => ({
  game: entry.game,
  engine: entry.engine,
  variant,
  lessonActivityRuntime:
    entry.lessonVariant?.id === variant.id ? entry.lessonActivityRuntime : null,
  lessonStageRuntime:
    variant.surface === 'lesson_stage' ? entry.lessonStageRuntime : null,
  launchableScreen:
    entry.gameScreenVariant?.id === variant.id ? entry.launchableScreen : null,
  launchableRuntime:
    entry.gameScreenVariant?.id === variant.id ? entry.launchableRuntime : null,
  isDefaultVariant: entry.defaultVariant?.id === variant.id,
  isLessonVariant: entry.lessonVariant?.id === variant.id,
  isLibraryPreviewVariant: entry.libraryPreviewVariant?.id === variant.id,
  isGameScreenVariant: entry.gameScreenVariant?.id === variant.id,
});

export const createKangurGameVariantCatalogEntries = (
  catalogEntries: KangurGameCatalogEntry[] = createKangurGameCatalogEntries()
): KangurGameVariantCatalogEntry[] =>
  catalogEntries.flatMap((entry) =>
    entry.game.variants
      .slice()
      .sort(sortVariants)
      .map((variant) => createVariantCatalogEntry(entry, variant))
  );

export const filterKangurGameVariantCatalogEntries = (
  entries: KangurGameVariantCatalogEntry[],
  filter?: KangurGameVariantCatalogFilter
): KangurGameVariantCatalogEntry[] => {
  let next = entries;
  const subject = filter?.subject;
  const ageGroup = filter?.ageGroup;
  const gameStatus = filter?.gameStatus;
  const surface = filter?.surface;
  const lessonComponentId = filter?.lessonComponentId;
  const mechanic = filter?.mechanic;
  const engineId = filter?.engineId;
  const variantSurface = filter?.variantSurface;
  const variantStatus = filter?.variantStatus;
  const launchableOnly = filter?.launchableOnly;

  if (subject) {
    next = next.filter((entry) => entry.game.subject === subject);
  }

  if (ageGroup) {
    next = next.filter((entry) => entry.game.ageGroup === ageGroup);
  }

  if (gameStatus) {
    next = next.filter((entry) => entry.game.status === gameStatus);
  }

  if (surface) {
    next = next.filter((entry) => entry.game.surfaces.includes(surface));
  }

  if (lessonComponentId) {
    next = next.filter((entry) =>
      entry.game.lessonComponentIds.includes(lessonComponentId)
    );
  }

  if (mechanic) {
    next = next.filter((entry) =>
      (entry.engine?.mechanics ?? [entry.game.mechanic]).includes(mechanic)
    );
  }

  if (engineId) {
    next = next.filter((entry) => entry.game.engineId === engineId);
  }

  if (filter?.engineCategory) {
    next = next.filter((entry) => entry.engine?.category === filter.engineCategory);
  }

  if (filter?.implementationOwnership) {
    next = next.filter(
      (entry) =>
        getOptionalKangurGameEngineImplementation(entry.game.engineId)?.ownership ===
        filter.implementationOwnership
    );
  }

  if (variantSurface) {
    next = next.filter((entry) => entry.variant.surface === variantSurface);
  }

  if (variantStatus) {
    next = next.filter((entry) => entry.variant.status === variantStatus);
  }

  if (launchableOnly) {
    next = next.filter(
      (entry) => entry.variant.surface === 'game_screen' && Boolean(entry.launchableScreen)
    );
  }

  return next;
};
