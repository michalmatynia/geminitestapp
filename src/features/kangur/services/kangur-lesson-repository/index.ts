import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurLessonRepository } from './mongo-kangur-lesson-repository';
import type { KangurLessonRepository, KangurLessonListInput } from './types';

export type { KangurLessonRepository, KangurLessonListInput } from './types';

const KANGUR_LESSON_REPOSITORY_SERVICE = 'kangur.lesson-repository';

export const getKangurLessonRepository = async (): Promise<KangurLessonRepository> => {
  const provider = 'mongodb';
  const repository = mongoKangurLessonRepository;

  return {
    listLessons: async (input?: KangurLessonListInput) => {
      try {
        return await repository.listLessons(input);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: KANGUR_LESSON_REPOSITORY_SERVICE,
          action: 'listLessons',
          provider,
          subject: input?.subject ?? null,
          ageGroup: input?.ageGroup ?? null,
          enabledOnly: input?.enabledOnly ?? null,
        });
        throw error;
      }
    },
    replaceLessons: async (lessons) => {
      try {
        return await repository.replaceLessons(lessons);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: KANGUR_LESSON_REPOSITORY_SERVICE,
          action: 'replaceLessons',
          provider,
          count: lessons.length,
        });
        throw error;
      }
    },
  };
};
