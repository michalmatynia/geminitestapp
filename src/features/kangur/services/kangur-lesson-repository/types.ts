import type { KangurLesson, KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';

export type KangurLessonListInput = {
  subject?: KangurLessonSubject;
  enabledOnly?: boolean;
};

export type KangurLessonRepository = {
  listLessons: (input?: KangurLessonListInput) => Promise<KangurLesson[]>;
  replaceLessons: (lessons: KangurLesson[]) => Promise<KangurLesson[]>;
};
