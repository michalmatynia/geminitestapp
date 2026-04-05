import type { KangurLesson } from '@kangur/contracts/kangur';
import type { KangurLessonAgeGroup, KangurLessonComponentId, KangurLessonSubject } from '@kangur/contracts/kangur-lesson-constants';

export type KangurLessonListInput = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  componentIds?: KangurLessonComponentId[];
  enabledOnly?: boolean;
};

export type KangurLessonRepository = {
  listLessons: (input?: KangurLessonListInput) => Promise<KangurLesson[]>;
  replaceLessons: (lessons: KangurLesson[]) => Promise<KangurLesson[]>;
};
