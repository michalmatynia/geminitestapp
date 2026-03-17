import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

export type KangurLessonListInput = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  enabledOnly?: boolean;
};

export type KangurLessonRepository = {
  listLessons: (input?: KangurLessonListInput) => Promise<KangurLesson[]>;
  replaceLessons: (lessons: KangurLesson[]) => Promise<KangurLesson[]>;
};
