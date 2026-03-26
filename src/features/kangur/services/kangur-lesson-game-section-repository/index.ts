import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurLessonGameSectionRepository } from './mongo-kangur-lesson-game-section-repository';
import type {
  KangurLessonGameSectionListInput,
  KangurLessonGameSectionRepository,
} from './types';

export type {
  KangurLessonGameSectionListInput,
  KangurLessonGameSectionRepository,
} from './types';

const SERVICE = 'kangur.lesson-game-section-repository';

export const getKangurLessonGameSectionRepository =
  async (): Promise<KangurLessonGameSectionRepository> => {
    const provider = 'mongodb';
    const repository = mongoKangurLessonGameSectionRepository;

    return {
      listSections: async (input?: KangurLessonGameSectionListInput) => {
        try {
          return await repository.listSections(input);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'listSections',
            provider,
            gameId: input?.gameId ?? null,
            lessonComponentId: input?.lessonComponentId ?? null,
            enabledOnly: input?.enabledOnly ?? null,
          });
          throw error;
        }
      },
      replaceSectionsForGame: async (gameId, sections) => {
        try {
          return await repository.replaceSectionsForGame(gameId, sections);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'replaceSectionsForGame',
            provider,
            gameId,
            count: sections.length,
          });
          throw error;
        }
      },
    };
  };
