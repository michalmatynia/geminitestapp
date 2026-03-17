import 'dotenv/config';

import type { Collection, Document } from 'mongodb';

import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';
import { ALPHABET_LESSON_COMPONENT_ORDER } from '@/features/kangur/lessons/subjects/alphabet/catalog';
import {
  appendMissingKangurLessonsByComponent,
  canonicalizeKangurLessons,
  getKangurLessonTemplate,
} from '@/features/kangur/settings';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION = 'kangur_lessons';

type MongoKangurLessonDocument = Document &
  KangurLesson & {
    _id: string;
    createdAt?: Date;
    updatedAt?: Date;
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
});

const resolveTemplateAgeGroup = (lesson: KangurLesson): KangurLesson['ageGroup'] => {
  const template = getKangurLessonTemplate(lesson.componentId);
  return template?.ageGroup ?? DEFAULT_KANGUR_AGE_GROUP;
};

const replaceLessons = async (
  collection: Collection<MongoKangurLessonDocument>,
  lessons: KangurLesson[]
): Promise<KangurLesson[]> => {
  const normalized = canonicalizeKangurLessons(lessons);
  const ids = normalized.map((lesson) => lesson.id);
  const now = new Date();

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
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to repair Kangur lessons.');
  }

  const mongoClient = await getMongoClient();

  try {
    const db = await getMongoDb();
    const collection = db.collection<MongoKangurLessonDocument>(COLLECTION);
    const docs = await collection.find({}).toArray();

    if (docs.length === 0) {
      process.stdout.write(
        `${JSON.stringify({ ok: true, updated: false, reason: 'no lessons' })}\n`
      );
      return;
    }

    const lessons = docs.map(toLesson);
    let ageGroupChanges = 0;
    const alignedLessons = lessons.map((lesson) => {
      const desiredAgeGroup = resolveTemplateAgeGroup(lesson);
      if (lesson.ageGroup === desiredAgeGroup) return lesson;
      ageGroupChanges += 1;
      return { ...lesson, ageGroup: desiredAgeGroup };
    });

    const { lessons: finalLessons, addedCount } = appendMissingKangurLessonsByComponent(
      alignedLessons,
      ALPHABET_LESSON_COMPONENT_ORDER,
      ['six_year_old']
    );

    const removedCount = lessons.length + addedCount - finalLessons.length;
    const shouldPersist = ageGroupChanges > 0 || addedCount > 0 || removedCount > 0;

    if (!shouldPersist) {
      process.stdout.write(
        `${JSON.stringify({ ok: true, updated: false, reason: 'no changes' })}\n`
      );
      return;
    }

    const persistedLessons = await replaceLessons(collection, finalLessons);

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        updated: true,
        ageGroupChanges,
        addedAlphabetLessons: addedCount,
        removedDuplicates: removedCount,
        total: persistedLessons.length,
      })}\n`
    );
  } finally {
    await mongoClient.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
