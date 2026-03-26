import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@kangur/contracts';
import type {
  KangurGameCatalogEntry,
  KangurGameCatalogFacets,
} from '@/features/kangur/games';
import type {
  KangurGameEngineCategory,
  KangurGameEngineId,
  KangurGameEngineImplementationOwnership,
  KangurGameMechanic,
  KangurGameStatus,
  KangurGameSurface,
  KangurGameVariantSurface,
} from '@/shared/contracts/kangur-games';

export type KangurGameCatalogListInput = {
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

export type KangurGameCatalogRepository = {
  listCatalog: (input?: KangurGameCatalogListInput) => Promise<KangurGameCatalogEntry[]>;
  listCatalogFacets: () => Promise<KangurGameCatalogFacets>;
};
