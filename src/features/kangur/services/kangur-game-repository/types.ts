import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@kangur/contracts';
import type {
  KangurGameDefinition,
  KangurGameStatus,
  KangurGameSurface,
} from '@/shared/contracts/kangur-games';

export type KangurGameListInput = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  status?: KangurGameStatus;
  surface?: KangurGameSurface;
  lessonComponentId?: KangurLessonComponentId;
};

export type KangurGameRepository = {
  listGames: (input?: KangurGameListInput) => Promise<KangurGameDefinition[]>;
  replaceGames: (games: KangurGameDefinition[]) => Promise<KangurGameDefinition[]>;
  saveGame: (game: KangurGameDefinition) => Promise<void>;
  removeGame: (gameId: string) => Promise<void>;
};
