import 'server-only';

import type { Db, Document, Filter } from 'mongodb';

import { canonicalizeKangurLessons, createDefaultKangurLessons } from '@/features/kangur/settings';
import type { KangurLesson } from '@kangur/contracts';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { KangurLessonListInput, KangurLessonRepository } from './types';

const COLLECTION = 'kangur_lessons';
const SUBJECT_SORT_INDEX = 'kangur_lessons_subject_sort_idx';
const COMPONENT_UNIQUE_INDEX = 'kangur_lessons_component_age_group_unique_idx';
const LEGACY_COMPONENT_UNIQUE_INDEX = 'kangur_lessons_component_unique_idx';

type MongoKangurLessonDocument = Document &
  KangurLesson & {
    _id: string;
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
    const existingIndexes = await collection.indexes();
    const legacyIndex = existingIndexes.find((index) => index.name === LEGACY_COMPONENT_UNIQUE_INDEX);
    if (legacyIndex) {
      await collection.dropIndex(LEGACY_COMPONENT_UNIQUE_INDEX);
    }
    await Promise.all([
      collection.createIndex(
        { subject: 1, sortOrder: 1, id: 1 },
        { name: SUBJECT_SORT_INDEX }
      ),
      collection.createIndex(
        { componentId: 1, ageGroup: 1 },
        { name: COMPONENT_UNIQUE_INDEX, unique: true }
      ),
    ]);
    indexesInitialized = true;
  })();
  try {
    await indexesInFlight;
  } finally {
    indexesInFlight = null;
  }
};

const buildFilter = (input?: KangurLessonListInput): Filter<MongoKangurLessonDocument> => {
  if (!input) return {};
  const filter: Filter<MongoKangurLessonDocument> = {};
  if (input.subject) {
    filter.subject = input.subject;
  }
  if (input.ageGroup) {
    filter.ageGroup = input.ageGroup;
  }
  if (input.enabledOnly) {
    filter.enabled = true;
  }
  return filter;
};

const toLesson = (doc: MongoKangurLessonDocument): KangurLesson => ({
  id: doc.id,
  componentId: doc.componentId,
  contentMode: doc.contentMode,
  subject: doc.subject,
  ageGroup: doc.ageGroup,
  title: doc.title,
  description: doc.description,
  emoji: doc.emoji,
  color: doc.color,
  activeBg: doc.activeBg,
  sortOrder: doc.sortOrder,
  enabled: doc.enabled,
  ...(doc.sectionId ? { sectionId: doc.sectionId } : {}),
  ...(doc.subsectionId ? { subsectionId: doc.subsectionId } : {}),
});

export const mongoKangurLessonRepository: KangurLessonRepository = {
  async listLessons(input?: KangurLessonListInput): Promise<KangurLesson[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
    const docs = await collection.find(buildFilter(input)).sort({ sortOrder: 1, id: 1 }).toArray();
    if (docs.length === 0) {
      const fallbackFilter: Filter<MongoKangurLessonDocument> = {};
      if (input?.subject) {
        fallbackFilter.subject = input.subject;
      }
      if (input?.ageGroup) {
        fallbackFilter.ageGroup = input.ageGroup;
      }
      const existingCount = await collection.countDocuments(fallbackFilter);
      if (existingCount === 0) {
        const defaults = createDefaultKangurLessons();
        const scopedDefaults = defaults.filter((lesson) => {
          if (input?.subject && lesson.subject !== input.subject) return false;
          if (input?.ageGroup && lesson.ageGroup !== input.ageGroup) return false;
          return true;
        });
        return input?.enabledOnly
          ? scopedDefaults.filter((lesson) => lesson.enabled)
          : scopedDefaults;
      }
    }

    return docs.map(toLesson);
  },

  async replaceLessons(lessons: KangurLesson[]): Promise<KangurLesson[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const normalized = canonicalizeKangurLessons(lessons);
    const ids = normalized.map((lesson) => lesson.id);
    const now = new Date();
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);

    if (normalized.length === 0) {
      await collection.deleteMany({});
      return [];
    }

    const operations = normalized.map((lesson) => ({
      updateOne: {
        filter: { _id: lesson.id },
        update: {
          $set: {
            ...lesson,
            id: lesson.id,
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
    await collection.deleteMany({ _id: { $nin: ids } });

    return normalized;
  },
};
