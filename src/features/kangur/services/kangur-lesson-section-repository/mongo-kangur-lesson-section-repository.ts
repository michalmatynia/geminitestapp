import 'server-only';

import type { Collection, Db, Document, Filter } from 'mongodb';

import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { KangurLessonSectionListInput, KangurLessonSectionRepository } from './types';
import { normalizeKangurLessonSection } from './normalize-kangur-lesson-section';

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
const READ_BOOTSTRAP_SOFT_TIMEOUT_MS = 250;

const waitForBootstrapIfFast = async (task: Promise<void>): Promise<void> => {
  const guardedTask = task.catch(() => undefined);
  await Promise.race([
    guardedTask,
    new Promise((resolve) => setTimeout(resolve, READ_BOOTSTRAP_SOFT_TIMEOUT_MS)),
  ]);
};

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
  return normalizeKangurLessonSection(doc);
};

const buildSectionUpdate = (section: KangurLessonSection, now: Date) => {
  const normalizedSection = normalizeKangurLessonSection(section);
  const unset: Record<string, ''> = {};

  if (typeof normalizedSection.shortLabel !== 'string') {
    unset['shortLabel'] = '';
  }
  if (typeof normalizedSection.emoji !== 'string') {
    unset['emoji'] = '';
  }

  return {
    filter: { _id: normalizedSection.id },
    update: {
      $set: {
        ...normalizedSection,
        id: normalizedSection.id,
        updatedAt: now,
      },
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      $setOnInsert: {
        createdAt: now,
      },
    },
    upsert: true,
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
    defaults.map((section) => {
      const normalizedSection = normalizeKangurLessonSection(section);
      return {
        updateOne: {
          filter: { _id: normalizedSection.id },
          update: {
            $setOnInsert: {
              ...normalizedSection,
              id: normalizedSection.id,
              createdAt: now,
              updatedAt: now,
            },
          },
          upsert: true,
        },
      };
    }),
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
    const collection = db.collection<MongoKangurLessonSectionDocument>(COLLECTION);
    await waitForBootstrapIfFast(ensureIndexes(db));
    await waitForBootstrapIfFast(ensureDefaultSections(collection));
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
        ...buildSectionUpdate(section, now),
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
    const update = buildSectionUpdate(section, now);

    await collection.updateOne(
      update.filter,
      update.update,
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
