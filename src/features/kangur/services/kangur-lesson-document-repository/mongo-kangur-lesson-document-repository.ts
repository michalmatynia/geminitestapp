import 'server-only';

import type { Collection, Db, Document, Filter } from 'mongodb';

import type {
  KangurLessonDocument,
  KangurLessonDocumentStore,
} from '@kangur/contracts';
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

import type { KangurLessonDocumentRepository } from './types';

const COLLECTION = 'kangur_lesson_documents';
const UPDATED_AT_INDEX = 'kangur_lesson_documents_updated_idx';

type MongoKangurLessonDocument = Document & {
  _id: string;
  lessonId: string;
  locale?: string;
  document: KangurLessonDocument;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeLessonDocumentLocale = (locale?: string | null): string =>
  normalizeSiteLocale(locale);

const buildLocalizedLessonDocumentId = (lessonId: string, locale?: string | null): string => {
  const normalizedLocale = normalizeLessonDocumentLocale(locale);
  return normalizedLocale === 'pl' ? lessonId : `${normalizedLocale}:${lessonId}`;
};

const buildLessonDocumentFilter = (
  locale?: string | null
): Filter<MongoKangurLessonDocument> => {
  const normalizedLocale = normalizeLessonDocumentLocale(locale);
  if (normalizedLocale === 'pl') {
    return {
      $or: [{ locale: normalizedLocale }, { locale: { $exists: false } }],
    };
  }

  return { locale: normalizedLocale };
};

let indexesInitialized = false;
let indexesInFlight: Promise<void> | null = null;

const ensureIndexes = async (db: Db): Promise<void> => {
  if (indexesInitialized) return;
  if (indexesInFlight) {
    await indexesInFlight;
    return;
  }
  indexesInFlight = (async (): Promise<void> => {
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
    await collection.createIndex({ updatedAt: -1 }, { name: UPDATED_AT_INDEX });
    indexesInitialized = true;
  })();
  try {
    await indexesInFlight;
  } finally {
    indexesInFlight = null;
  }
};

const toNormalizedDocument = (document: KangurLessonDocument): KangurLessonDocument =>
  normalizeKangurLessonDocument(document);

const seedMissingLessonDocumentsFromLegacySettings = async (
  collection: Collection<MongoKangurLessonDocument>,
  locale?: string | null
): Promise<boolean> => {
  const normalizedLocale = normalizeLessonDocumentLocale(locale);
  if (normalizedLocale !== 'pl') {
    return false;
  }

  const rawDocuments = await readKangurSettingValue(KANGUR_LESSON_DOCUMENTS_SETTING_KEY);
  const legacyStore = parseKangurLessonDocumentStore(rawDocuments);
  const mergedStore = { ...legacyStore };

  for (const lesson of createDefaultKangurLessons()) {
    if (mergedStore[lesson.id]) {
      continue;
    }
    mergedStore[lesson.id] = createStarterKangurLessonDocument(lesson.componentId);
  }

  const entries = Object.entries(mergedStore);

  if (entries.length === 0) {
    return false;
  }

  const now = new Date();
  await collection.bulkWrite(
    entries.map(([lessonId, document]) => ({
      updateOne: {
        filter: { _id: buildLocalizedLessonDocumentId(lessonId, normalizedLocale) },
        update: {
          $setOnInsert: {
            lessonId,
            locale: normalizedLocale,
            document: toNormalizedDocument(document),
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

export const mongoKangurLessonDocumentRepository: KangurLessonDocumentRepository = {
  async getLessonDocument(lessonId: string, locale?: string): Promise<KangurLessonDocument | null> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
    let doc = await collection.findOne({ _id: buildLocalizedLessonDocumentId(lessonId, locale) });
    if (!doc) {
      await seedMissingLessonDocumentsFromLegacySettings(collection, locale);
      doc = await collection.findOne({ _id: buildLocalizedLessonDocumentId(lessonId, locale) });
    }
    return doc ? toNormalizedDocument(doc.document) : null;
  },

  async listLessonDocuments(locale?: string): Promise<KangurLessonDocumentStore> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
    let docs = await collection.find(buildLessonDocumentFilter(locale)).toArray();
    if (docs.length === 0) {
      await seedMissingLessonDocumentsFromLegacySettings(collection, locale);
      docs = await collection.find(buildLessonDocumentFilter(locale)).toArray();
    }
    const store: KangurLessonDocumentStore = {};
    docs.forEach((doc) => {
      if (!doc.lessonId) return;
      store[doc.lessonId] = toNormalizedDocument(doc.document);
    });
    return store;
  },

  async replaceLessonDocuments(
    store: KangurLessonDocumentStore,
    locale?: string
  ): Promise<KangurLessonDocumentStore> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
    const entries = Object.entries(store);
    const now = new Date();
    const normalizedLocale = normalizeLessonDocumentLocale(locale);

    if (entries.length === 0) {
      await collection.deleteMany(buildLessonDocumentFilter(normalizedLocale));
      return {};
    }

    const operations = entries.map(([lessonId, document]) => ({
      updateOne: {
        filter: { _id: buildLocalizedLessonDocumentId(lessonId, normalizedLocale) },
        update: {
          $set: {
            lessonId,
            locale: normalizedLocale,
            document: toNormalizedDocument(document),
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    }));

    await collection.bulkWrite(operations, { ordered: false });
    await collection.deleteMany({
      ...buildLessonDocumentFilter(normalizedLocale),
      _id: {
        $nin: entries.map(([lessonId]) =>
          buildLocalizedLessonDocumentId(lessonId, normalizedLocale)
        ),
      },
    });

    return Object.fromEntries(
      entries.map(([lessonId, document]) => [lessonId, toNormalizedDocument(document)])
    );
  },

  async saveLessonDocument(
    lessonId: string,
    document: KangurLessonDocument,
    locale?: string
  ): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
    const now = new Date();
    const normalizedLocale = normalizeLessonDocumentLocale(locale);
    await collection.updateOne(
      { _id: buildLocalizedLessonDocumentId(lessonId, normalizedLocale) },
      {
        $set: {
          lessonId,
          locale: normalizedLocale,
          document: toNormalizedDocument(document),
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  },

  async removeLessonDocument(lessonId: string, locale?: string): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    await db.collection<MongoKangurLessonDocument>(COLLECTION).deleteOne({
      _id: buildLocalizedLessonDocumentId(lessonId, normalizeLessonDocumentLocale(locale)),
    });
  },
};
