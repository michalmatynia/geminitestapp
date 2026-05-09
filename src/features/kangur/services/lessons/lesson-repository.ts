/**
 * Kangur Lesson Repository Service
 * 
 * Manages MongoDB persistence and legacy synchronization for Kangur lessons.
 */

import 'server-only';
import { type Collection, type Db, type Document, type Filter } from 'mongodb';

import type { KangurLesson } from '@kangur/contracts/kangur';
import {
  canonicalizeKangurLessons,
  createDefaultKangurLessons,
  KANGUR_LESSONS_SETTING_KEY,
  parseKangurLessons,
} from '@/features/kangur/settings';
import { readKangurSettingValue } from '@/features/kangur/services/kangur-settings-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { safeSetTimeout } from '@/shared/lib/timers';

export const COLLECTION = 'kangur_lessons';
export const SUBJECT_SORT_INDEX = 'kangur_lessons_subject_sort_idx';
export const COMPONENT_UNIQUE_INDEX = 'kangur_lessons_component_age_group_unique_idx';
export const LEGACY_COMPONENT_UNIQUE_INDEX = 'kangur_lessons_component_unique_idx';

export type MongoKangurLessonDocument = Document &
  KangurLesson & {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
  };

/**
 * Builds a query filter based on lesson list input.
 */
export const buildFilter = (input?: {
  subject?: string;
  ageGroup?: string;
  componentIds?: string[];
  enabledOnly?: boolean;
}): Filter<MongoKangurLessonDocument> => {
  if (!input) return {};
  const filter: Filter<MongoKangurLessonDocument> = {};
  if (input.subject) filter.subject = input.subject;
  if (input.ageGroup) filter.ageGroup = input.ageGroup;
  if (input.componentIds?.length) filter.componentId = { $in: input.componentIds };
  if (input.enabledOnly) filter.enabled = true;
  return filter;
};

/**
 * Transforms a MongoDB document to a KangurLesson record.
 */
export const toLesson = (doc: MongoKangurLessonDocument): KangurLesson => ({
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

/**
 * Ensures indexes are initialized in MongoDB.
 */
export const ensureIndexes = async (db: Db): Promise<void> => {
  const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
  const existingIndexes = await collection.indexes();
  if (existingIndexes.find((index) => index.name === LEGACY_COMPONENT_UNIQUE_INDEX)) {
    await collection.dropIndex(LEGACY_COMPONENT_UNIQUE_INDEX);
  }
  await Promise.all([
    collection.createIndex({ subject: 1, sortOrder: 1, id: 1 }, { name: SUBJECT_SORT_INDEX }),
    collection.createIndex({ componentId: 1, ageGroup: 1 }, { name: COMPONENT_UNIQUE_INDEX, unique: true }),
  ]);
};

/**
 * Seeds missing lessons from legacy settings or defaults.
 */
export const seedMissingLessons = async (
  collection: Collection<MongoKangurLessonDocument>,
  lessons: readonly KangurLesson[]
): Promise<boolean> => {
  if (lessons.length === 0) return false;

  const existingLessonKeys = new Set(
    (await collection.find({}, { projection: { componentId: 1, ageGroup: 1 } }).toArray())
      .map((l) => `${l.componentId}:${l.ageGroup}`)
  );
  const missingLessons = lessons.filter((l) => !existingLessonKeys.has(`${l.componentId}:${l.ageGroup}`));

  if (missingLessons.length === 0) return false;

  const now = new Date();
  await collection.bulkWrite(
    missingLessons.map((lesson) => ({
      updateOne: {
        filter: { _id: lesson.id },
        update: {
          $setOnInsert: { ...lesson, id: lesson.id, createdAt: now, updatedAt: now },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  return true;
};
