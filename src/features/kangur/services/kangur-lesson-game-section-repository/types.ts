import type { KangurGameId } from '@/shared/contracts/kangur-games';
import type { KangurLessonComponentId } from '@/shared/contracts/kangur-lesson-constants';
import type { KangurLessonGameSection } from '@/shared/contracts/kangur-lesson-game-sections';

export type KangurLessonGameSectionListInput = {
  enabledOnly?: boolean;
  gameId?: KangurGameId;
  lessonComponentId?: KangurLessonComponentId;
};

export type KangurLessonGameSectionRepository = {
  listSections: (
    input?: KangurLessonGameSectionListInput
  ) => Promise<KangurLessonGameSection[]>;
  replaceSectionsForGame: (
    gameId: KangurGameId,
    sections: KangurLessonGameSection[]
  ) => Promise<KangurLessonGameSection[]>;
};
