/**
 * Kangur Lesson Document Service
 * 
 * Manages the persistence, retrieval, and legacy-sync operations for 
 * Kangur platform lesson documents in MongoDB.
 */

import 'server-only';
import { type Collection, type Db, type Document, type Filter } from 'mongodb';
import { randomUUID } from 'crypto';

import type { KangurLessonDocument, KangurLessonDocumentStore } from '@kangur/contracts/kangur';
import {
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  createStarterKangurLessonDocument,
  normalizeKangurLessonDocument,
  parseKangurLessonDocumentStore,
} from '@/features/kangur/lesson-documents';
import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { readKangurSettingValue } from '@/features/kangur/services/kangur-settings-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export const COLLECTION = 'kangur_lesson_documents';

/**
 * MongoDB document representation for a lesson document.
 */
export type MongoKangurLessonDocument = Document & {
  _id: string;
  lessonId: string;
  locale?: string;
  document: KangurLessonDocument;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Normalizes a locale string.
 */
export const normalizeLessonDocumentLocale = (locale?: string | null): string => normalizeSiteLocale(locale);

/**
 * Builds a localized document ID.
 */
export const buildLocalizedLessonDocumentId = (lessonId: string, locale?: string | null): string => {
  const normalizedLocale = normalizeLessonDocumentLocale(locale);
  return normalizedLocale === 'pl' ? lessonId : `${normalizedLocale}:${lessonId}`;
};

/**
 * Builds a query filter for lesson documents based on locale.
 */
export const buildLessonDocumentFilter = (locale?: string | null): Filter<MongoKangurLessonDocument> => {
  const normalizedLocale = normalizeLessonDocumentLocale(locale);
  return normalizedLocale === 'pl' 
    ? { $or: [{ locale: normalizedLocale }, { locale: { $exists: false } }] } 
    : { locale: normalizedLocale };
};

/**
 * Seeds missing lesson documents from legacy settings.
 */
export const seedMissingLessonDocumentsFromLegacySettings = async (
  collection: Collection<MongoKangurLessonDocument>,
  locale?: string | null
): Promise<boolean> => {
  const normalizedLocale = normalizeLessonDocumentLocale(locale);
  if (normalizedLocale !== 'pl') return false;

  const rawDocuments = await readKangurSettingValue(KANGUR_LESSON_DOCUMENTS_SETTING_KEY);
  const legacyStore = parseKangurLessonDocumentStore(rawDocuments);
  const mergedStore = { ...legacyStore };

  for (const lesson of createDefaultKangurLessons()) {
    if (!mergedStore[lesson.id]) {
      mergedStore[lesson.id] = createStarterKangurLessonDocument(lesson.componentId);
    }
  }

  const entries = Object.entries(mergedStore);
  if (entries.length === 0) return false;

  const now = new Date();
  await collection.bulkWrite(
    entries.map(([lessonId, document]) => ({
      updateOne: {
        filter: { _id: buildLocalizedLessonDocumentId(lessonId, normalizedLocale) },
        update: {
          $setOnInsert: {
            lessonId,
            locale: normalizedLocale,
            document: normalizeKangurLessonDocument(document),
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return true;
};
