import type {
  KangurLessonCollectionFilterDto,
  KangurLesson,
} from '@kangur/contracts';

export type KangurLessonListInput = KangurLessonCollectionFilterDto;

export type KangurLessonRepository = {
  listLessons: (input?: KangurLessonListInput) => Promise<KangurLesson[]>;
  replaceLessons: (lessons: KangurLesson[]) => Promise<KangurLesson[]>;
};
