import 'server-only';

import type { Db, Document } from 'mongodb';

import type {
  KangurLessonDocument,
  KangurLessonDocumentStore,
} from '@kangur/contracts';
import { normalizeKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { KangurLessonDocumentRepository } from './types';

const COLLECTION = 'kangur_lesson_documents';
const UPDATED_AT_INDEX = 'kangur_lesson_documents_updated_idx';

type MongoKangurLessonDocument = Document & {
  _id: string;
  lessonId: string;
  document: KangurLessonDocument;
  createdAt: Date;
  updatedAt: Date;
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

export const mongoKangurLessonDocumentRepository: KangurLessonDocumentRepository = {
  async getLessonDocument(lessonId: string): Promise<KangurLessonDocument | null> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const doc = await db
      .collection<MongoKangurLessonDocument>(COLLECTION)
      .findOne({ _id: lessonId });
    return doc ? toNormalizedDocument(doc.document) : null;
  },

  async listLessonDocuments(): Promise<KangurLessonDocumentStore> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const docs = await db
      .collection<MongoKangurLessonDocument>(COLLECTION)
      .find({})
      .toArray();
    const store: KangurLessonDocumentStore = {};
    docs.forEach((doc) => {
      if (!doc.lessonId) return;
      store[doc.lessonId] = toNormalizedDocument(doc.document);
    });
    return store;
  },

  async replaceLessonDocuments(store: KangurLessonDocumentStore): Promise<KangurLessonDocumentStore> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
    const entries = Object.entries(store);
    const now = new Date();

    if (entries.length === 0) {
      await collection.deleteMany({});
      return {};
    }

    const operations = entries.map(([lessonId, document]) => ({
      updateOne: {
        filter: { _id: lessonId },
        update: {
          $set: {
            lessonId,
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
    await collection.deleteMany({ _id: { $nin: entries.map(([lessonId]) => lessonId) } });

    return Object.fromEntries(
      entries.map(([lessonId, document]) => [lessonId, toNormalizedDocument(document)])
    );
  },

  async saveLessonDocument(lessonId: string, document: KangurLessonDocument): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
    const now = new Date();
    await collection.updateOne(
      { _id: lessonId },
      {
        $set: {
          lessonId,
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

  async removeLessonDocument(lessonId: string): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    await db.collection<MongoKangurLessonDocument>(COLLECTION).deleteOne({ _id: lessonId });
  },
};
