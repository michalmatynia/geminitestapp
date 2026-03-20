import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@kangur/contracts';

export type KangurLessonListInput = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  enabledOnly?: boolean;
};

export type KangurLessonRepository = {
  listLessons: (input?: KangurLessonListInput) => Promise<KangurLesson[]>;
  replaceLessons: (lessons: KangurLesson[]) => Promise<KangurLesson[]>;
};
