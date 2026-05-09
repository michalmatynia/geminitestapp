import 'server-only';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import {
  COLLECTION,
  buildLocalizedLessonDocumentId,
  buildLessonDocumentFilter,
  seedMissingLessonDocumentsFromLegacySettings,
  type MongoKangurLessonDocument,
} from '@/features/kangur/services/lessons/lesson-document-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { normalizeKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { type KangurLessonDocumentRepository } from './types';

export type { KangurLessonDocumentRepository } from './types';

const KANGUR_LESSON_DOCUMENT_REPOSITORY_SERVICE = 'kangur.lesson-document-repository';
const provider = 'mongodb';

export const getKangurLessonDocumentRepository = async (): Promise<KangurLessonDocumentRepository> => {
  return {
    getLessonDocument: async (lessonId, locale) => {
      try {
        const db = await getMongoDb();
        const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
        let doc = await collection.findOne({ _id: buildLocalizedLessonDocumentId(lessonId, locale) });
        if (!doc) {
          await seedMissingLessonDocumentsFromLegacySettings(collection, locale);
          doc = await collection.findOne({ _id: buildLocalizedLessonDocumentId(lessonId, locale) });
        }
        return doc ? normalizeKangurLessonDocument(doc.document) : null;
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
        const db = await getMongoDb();
        const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
        let docs = await collection.find(buildLessonDocumentFilter(locale)).toArray();
        if (docs.length === 0) {
          await seedMissingLessonDocumentsFromLegacySettings(collection, locale);
          docs = await collection.find(buildLessonDocumentFilter(locale)).toArray();
        }
        return Object.fromEntries(
          docs.filter(d => d.lessonId).map(d => [d.lessonId, normalizeKangurLessonDocument(d.document)])
        );
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
        const db = await getMongoDb();
        const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
        const entries = Object.entries(store);
        const now = new Date();
        const normalizedLocale = buildLocalizedLessonDocumentId('', locale); // Reuse ID builder logic
        const localeOnly = normalizedLocale.includes(':') ? normalizedLocale.split(':')[0] : 'pl';

        if (entries.length === 0) {
          await collection.deleteMany(buildLessonDocumentFilter(locale));
          return {};
        }

        await collection.bulkWrite(
          entries.map(([lessonId, document]) => ({
            updateOne: {
              filter: { _id: buildLocalizedLessonDocumentId(lessonId, locale) },
              update: {
                $set: {
                  lessonId,
                  locale: localeOnly,
                  document: normalizeKangurLessonDocument(document),
                  updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
              },
              upsert: true,
            },
          })),
          { ordered: false }
        );

        await collection.deleteMany({
          ...buildLessonDocumentFilter(locale),
          _id: { $nin: entries.map(([lessonId]) => buildLocalizedLessonDocumentId(lessonId, locale)) },
        });

        return Object.fromEntries(
          entries.map(([lessonId, document]) => [lessonId, normalizeKangurLessonDocument(document)])
        );
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
        const db = await getMongoDb();
        const now = new Date();
        const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
        await collection.updateOne(
          { _id: buildLocalizedLessonDocumentId(lessonId, locale) },
          {
            $set: {
              lessonId,
              locale: buildLocalizedLessonDocumentId('', locale).split(':')[0] || 'pl',
              document: normalizeKangurLessonDocument(document),
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true }
        );
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
        const db = await getMongoDb();
        await db.collection<MongoKangurLessonDocument>(COLLECTION).deleteOne({
          _id: buildLocalizedLessonDocumentId(lessonId, locale),
        });
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
