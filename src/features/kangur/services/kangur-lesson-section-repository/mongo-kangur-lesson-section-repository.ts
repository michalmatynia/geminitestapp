import 'server-only';

import type { Collection, Db, Document, Filter } from 'mongodb';

import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
import { kangurLessonSectionSchema } from '@/shared/contracts/kangur-lesson-sections';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { KangurLessonSectionListInput, KangurLessonSectionRepository } from './types';

const COLLECTION = 'kangur_lesson_sections';
const SUBJECT_SORT_INDEX = 'kangur_lesson_sections_subject_sort_idx';
const ID_UNIQUE_INDEX = 'kangur_lesson_sections_id_unique_idx';

type MongoKangurLessonSectionDocument = Document &
  KangurLessonSection & {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
  };

let indexesInitialized = false;
let indexesInFlight: Promise<void> | null = null;
let defaultsInitialized = false;
let defaultsInFlight: Promise<void> | null = null;

const ensureIndexes = async (db: Db): Promise<void> => {
  if (indexesInitialized) return;
  if (indexesInFlight) {
    await indexesInFlight;
    return;
  }
  indexesInFlight = (async (): Promise<void> => {
    const collection = db.collection<MongoKangurLessonSectionDocument>(COLLECTION);
    await Promise.all([
      collection.createIndex(
        { subject: 1, ageGroup: 1, sortOrder: 1 },
        { name: SUBJECT_SORT_INDEX }
      ),
      collection.createIndex({ id: 1 }, { name: ID_UNIQUE_INDEX, unique: true }),
    ]);
    indexesInitialized = true;
  })();
  try {
    await indexesInFlight;
  } finally {
    indexesInFlight = null;
  }
};

const buildFilter = (
  input?: KangurLessonSectionListInput
): Filter<MongoKangurLessonSectionDocument> => {
  if (!input) return {};
  const filter: Filter<MongoKangurLessonSectionDocument> = {};
  if (input.subject) {
    filter['subject'] = input.subject;
  }
  if (input.ageGroup) {
    filter['ageGroup'] = input.ageGroup;
  }
  if (input.enabledOnly) {
    filter['enabled'] = true;
  }
  return filter;
};

const toSection = (doc: MongoKangurLessonSectionDocument): KangurLessonSection => {
  const parsed = kangurLessonSectionSchema.safeParse(doc);
  if (parsed.success) {
    return parsed.data;
  }
  return {
    id: doc.id,
    subject: doc.subject,
    ageGroup: doc.ageGroup,
    label: doc.label,
    shortLabel: doc.shortLabel,
    typeLabel: doc.typeLabel ?? 'Section',
    emoji: doc.emoji,
    sortOrder: doc.sortOrder,
    enabled: doc.enabled ?? true,
    componentIds: Array.isArray(doc.componentIds) ? doc.componentIds : [],
    subsections: Array.isArray(doc.subsections) ? doc.subsections : [],
  };
};

const seedMissingSections = async (
  collection: Collection<MongoKangurLessonSectionDocument>
): Promise<boolean> => {
  const defaults = createDefaultKangurSections();
  if (defaults.length === 0) {
    return false;
  }

  const now = new Date();
  await collection.bulkWrite(
    defaults.map((section) => ({
      updateOne: {
        filter: { _id: section.id },
        update: {
          $setOnInsert: {
            ...section,
            id: section.id,
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

const ensureDefaultSections = async (
  collection: Collection<MongoKangurLessonSectionDocument>
): Promise<void> => {
  if (defaultsInitialized) return;
  if (defaultsInFlight) {
    await defaultsInFlight;
    return;
  }

  defaultsInFlight = (async (): Promise<void> => {
    await seedMissingSections(collection);
    defaultsInitialized = true;
  })();

  try {
    await defaultsInFlight;
  } finally {
    defaultsInFlight = null;
  }
};

export const mongoKangurLessonSectionRepository: KangurLessonSectionRepository = {
  async listSections(input?: KangurLessonSectionListInput): Promise<KangurLessonSection[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonSectionDocument>(COLLECTION);
    await ensureDefaultSections(collection);
    const docs = await collection
      .find(buildFilter(input))
      .sort({ sortOrder: 1, id: 1 })
      .toArray();

    if (docs.length === 0) {
      const fallbackFilter: Filter<MongoKangurLessonSectionDocument> = {};
      if (input?.subject) fallbackFilter['subject'] = input.subject;
      if (input?.ageGroup) fallbackFilter['ageGroup'] = input.ageGroup;
      const existingCount = await collection.countDocuments(fallbackFilter);
      if (existingCount === 0) {
        const defaults = createDefaultKangurSections();
        const scopedDefaults = defaults.filter((section) => {
          if (input?.subject && section.subject !== input.subject) return false;
          if (input?.ageGroup && section.ageGroup !== input.ageGroup) return false;
          return true;
        });
        return input?.enabledOnly
          ? scopedDefaults.filter((section) => section.enabled)
          : scopedDefaults;
      }
    }

    return docs.map(toSection);
  },

  async replaceSections(sections: KangurLessonSection[]): Promise<KangurLessonSection[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonSectionDocument>(COLLECTION);
    const now = new Date();

    if (sections.length === 0) {
      await collection.deleteMany({});
      return [];
    }

    const ids = sections.map((s) => s.id);
    const operations = sections.map((section) => ({
      updateOne: {
        filter: { _id: section.id },
        update: {
          $set: {
            ...section,
            id: section.id,
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

    return sections;
  },

  async saveSection(section: KangurLessonSection): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonSectionDocument>(COLLECTION);
    const now = new Date();

    await collection.updateOne(
      { _id: section.id },
      {
        $set: {
          ...section,
          id: section.id,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  },

  async removeSection(sectionId: string): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonSectionDocument>(COLLECTION);
    await collection.deleteOne({ _id: sectionId });
  },
};
