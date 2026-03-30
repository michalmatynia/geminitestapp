import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@kangur/contracts';

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
