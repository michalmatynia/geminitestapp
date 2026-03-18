import 'server-only';

import type { Db, Document, Filter } from 'mongodb';

import { createDefaultKangurLessonTemplates } from '@/features/kangur/lessons/lesson-template-defaults';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import { kangurLessonTemplateSchema } from '@/shared/contracts/kangur-lesson-templates';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { KangurLessonTemplateListInput, KangurLessonTemplateRepository } from './types';

const COLLECTION = 'kangur_lesson_templates';
const SUBJECT_SORT_INDEX = 'kangur_lesson_templates_subject_sort_idx';
const COMPONENT_UNIQUE_INDEX = 'kangur_lesson_templates_componentId_unique_idx';

type MongoKangurLessonTemplateDocument = Document &
  KangurLessonTemplate & {
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
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    await Promise.all([
      collection.createIndex(
        { subject: 1, sortOrder: 1 },
        { name: SUBJECT_SORT_INDEX },
      ),
      collection.createIndex(
        { componentId: 1 },
        { name: COMPONENT_UNIQUE_INDEX, unique: true },
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

const buildFilter = (
  input?: KangurLessonTemplateListInput,
): Filter<MongoKangurLessonTemplateDocument> => {
  if (!input) return {};
  const filter: Filter<MongoKangurLessonTemplateDocument> = {};
  if (input.subject) {
    filter.subject = input.subject;
  }
  return filter;
};

const toTemplate = (doc: MongoKangurLessonTemplateDocument): KangurLessonTemplate => {
  const parsed = kangurLessonTemplateSchema.safeParse(doc);
  if (parsed.success) {
    return parsed.data;
  }
  return {
    componentId: doc.componentId,
    subject: doc.subject,
    ageGroup: doc.ageGroup,
    label: doc.label,
    title: doc.title,
    description: doc.description,
    emoji: doc.emoji,
    color: doc.color,
    activeBg: doc.activeBg,
    sortOrder: doc.sortOrder ?? 0,
  };
};

export const mongoKangurLessonTemplateRepository: KangurLessonTemplateRepository = {
  async listTemplates(input?: KangurLessonTemplateListInput): Promise<KangurLessonTemplate[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    const docs = await collection
      .find(buildFilter(input))
      .sort({ sortOrder: 1, componentId: 1 })
      .toArray();

    if (docs.length === 0) {
      const filter: Filter<MongoKangurLessonTemplateDocument> = {};
      if (input?.subject) filter.subject = input.subject;
      const existingCount = await collection.countDocuments(filter);
      if (existingCount === 0) {
        const defaults = createDefaultKangurLessonTemplates();
        if (input?.subject) {
          return defaults.filter((t) => t.subject === input.subject);
        }
        return defaults;
      }
    }

    return docs.map(toTemplate);
  },

  async replaceTemplates(templates: KangurLessonTemplate[]): Promise<KangurLessonTemplate[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    const now = new Date();

    if (templates.length === 0) {
      await collection.deleteMany({});
      return [];
    }

    const componentIds = templates.map((t) => t.componentId);
    const operations = templates.map((template) => ({
      updateOne: {
        filter: { _id: template.componentId },
        update: {
          $set: {
            ...template,
            componentId: template.componentId,
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
    await collection.deleteMany({ _id: { $nin: componentIds } });

    return templates;
  },

  async saveTemplate(template: KangurLessonTemplate): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    const now = new Date();

    await collection.updateOne(
      { _id: template.componentId },
      {
        $set: {
          ...template,
          componentId: template.componentId,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
  },

  async removeTemplate(componentId: string): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    await collection.deleteOne({ _id: componentId });
  },
};
