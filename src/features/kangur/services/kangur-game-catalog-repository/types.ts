import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@kangur/contracts';
import type {
  KangurGameCatalogEntry,
} from '@/features/kangur/games';
import type {
  KangurGameEngineId,
  KangurGameMechanic,
  KangurGameStatus,
  KangurGameSurface,
} from '@/shared/contracts/kangur-games';

export type KangurGameCatalogListInput = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  gameStatus?: KangurGameStatus;
  surface?: KangurGameSurface;
  lessonComponentId?: KangurLessonComponentId;
  mechanic?: KangurGameMechanic;
  engineId?: KangurGameEngineId;
  launchableOnly?: boolean;
};

export type KangurGameCatalogRepository = {
  listCatalog: (input?: KangurGameCatalogListInput) => Promise<KangurGameCatalogEntry[]>;
};
