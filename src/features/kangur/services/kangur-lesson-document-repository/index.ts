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
      getLessonDocument: async (lessonId, locale) => {
        try {
          return await repository.getLessonDocument(lessonId, locale);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'getLessonDocument',
            provider,
            lessonId,
            locale: locale ?? null,
          });
          throw error;
        }
      },
      listLessonDocuments: async (locale) => {
        try {
          return await repository.listLessonDocuments(locale);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'listLessonDocuments',
            provider,
            locale: locale ?? null,
          });
          throw error;
        }
      },
      replaceLessonDocuments: async (store, locale) => {
        try {
          return await repository.replaceLessonDocuments(store, locale);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'replaceLessonDocuments',
            provider,
            count: Object.keys(store).length,
            locale: locale ?? null,
          });
          throw error;
        }
      },
      saveLessonDocument: async (lessonId, document, locale) => {
        try {
          await repository.saveLessonDocument(lessonId, document, locale);
          return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'saveLessonDocument',
            provider,
            lessonId,
            locale: locale ?? null,
          });
          throw error;
        }
      },
      removeLessonDocument: async (lessonId, locale) => {
        try {
          await repository.removeLessonDocument(lessonId, locale);
          return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE,
            action: 'removeLessonDocument',
            provider,
            lessonId,
            locale: locale ?? null,
          });
          throw error;
        }
      },
    };
  };
