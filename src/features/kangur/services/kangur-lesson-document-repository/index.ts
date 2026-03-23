import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurLessonDocumentRepository } from './mongo-kangur-lesson-document-repository';
import type { KangurLessonDocumentRepository } from './types';

export type { KangurLessonDocumentRepository } from './types';

const KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE = 'kangur.lesson-document-repository';

export const getKangurLessonDocumentRepository =
  async (): Promise<KangurLessonDocumentRepository> => {
    const provider = 'mongodb';
    const repository = mongoKangurLessonDocumentRepository;

    return {
      getLessonDocument: async (lessonId) => {
        try {
          return await repository.getLessonDocument(lessonId);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'getLessonDocument',
            provider,
            lessonId,
          });
          throw error;
        }
      },
      listLessonDocuments: async () => {
        try {
          return await repository.listLessonDocuments();
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'listLessonDocuments',
            provider,
          });
          throw error;
        }
      },
      replaceLessonDocuments: async (store) => {
        try {
          return await repository.replaceLessonDocuments(store);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'replaceLessonDocuments',
            provider,
            count: Object.keys(store).length,
          });
          throw error;
        }
      },
      saveLessonDocument: async (lessonId, document) => {
        try {
          await repository.saveLessonDocument(lessonId, document);
          return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'saveLessonDocument',
            provider,
            lessonId,
          });
          throw error;
        }
      },
      removeLessonDocument: async (lessonId) => {
        try {
          await repository.removeLessonDocument(lessonId);
          return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'removeLessonDocument',
            provider,
            lessonId,
          });
          throw error;
        }
      },
    };
  };
