import 'server-only';

import type { Collection, Db, Document, Filter } from 'mongodb';

import { createDefaultKangurLessonTemplates } from '@/features/kangur/lessons/lesson-template-defaults';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import type { KangurLessonTemplateListInput, KangurLessonTemplateRepository } from './types';
import { normalizeKangurLessonTemplate } from './normalize-kangur-lesson-template';

const COLLECTION = 'kangur_lesson_templates';
const SUBJECT_SORT_INDEX = 'kangur_lesson_templates_subject_sort_idx';
const COMPONENT_LOCALE_UNIQUE_INDEX = 'kangur_lesson_templates_componentId_locale_unique_idx';
const LEGACY_COMPONENT_UNIQUE_INDEX = 'kangur_lesson_templates_componentId_unique_idx';

type MongoKangurLessonTemplateDocument = Document &
  KangurLessonTemplate & {
    _id: string;
    locale?: string;
    createdAt: Date;
    updatedAt: Date;
  };

const normalizeTemplateLocale = (locale?: string | null): string => normalizeSiteLocale(locale);

const buildLocalizedTemplateId = (componentId: string, locale?: string | null): string => {
  const normalizedLocale = normalizeTemplateLocale(locale);
  return normalizedLocale === 'pl' ? componentId : `${normalizedLocale}:${componentId}`;
};

let indexesInitialized = false;
let indexesInFlight: Promise<void> | null = null;
const defaultsInitializedForLocale = new Set<string>();
const defaultsInFlightByLocale = new Map<string, Promise<void>>();

const hasExpectedIndexShape = (
  index: { key?: Document } | undefined,
  expectedKey: Document
): boolean => JSON.stringify(index?.key ?? {}) === JSON.stringify(expectedKey);

const ensureIndexes = async (db: Db): Promise<void> => {
  if (indexesInitialized) return;
  if (indexesInFlight) {
    await indexesInFlight;
    return;
  }
  indexesInFlight = (async (): Promise<void> => {
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    const existingIndexes = await collection.indexes();
    const existingSubjectSortIndex = existingIndexes.find(
      (index) => index.name === SUBJECT_SORT_INDEX
    );
    if (
      existingSubjectSortIndex &&
      !hasExpectedIndexShape(existingSubjectSortIndex, { locale: 1, subject: 1, sortOrder: 1 })
    ) {
      await collection.dropIndex(SUBJECT_SORT_INDEX);
    }
    const legacyComponentUniqueIndex = existingIndexes.find(
      (index) =>
        index.name === LEGACY_COMPONENT_UNIQUE_INDEX ||
        (index.name !== COMPONENT_LOCALE_UNIQUE_INDEX &&
          hasExpectedIndexShape(index, { componentId: 1 }))
    );
    if (legacyComponentUniqueIndex) {
      const legacyIndexName = legacyComponentUniqueIndex.name;
      if (typeof legacyIndexName === 'string' && legacyIndexName.length > 0) {
        await collection.dropIndex(legacyIndexName);
      }
    }
    await Promise.all([
      collection.createIndex(
        { locale: 1, subject: 1, sortOrder: 1 },
        { name: SUBJECT_SORT_INDEX },
      ),
      collection.createIndex(
        { componentId: 1, locale: 1 },
        { name: COMPONENT_LOCALE_UNIQUE_INDEX, unique: true },
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
  const normalizedLocale = normalizeTemplateLocale(input?.locale);
  const componentId = input?.componentId;
  const subject = input?.subject;
  const ageGroup = input?.ageGroup;
  const filter =
    normalizedLocale === 'pl'
      ? {
          $or: [{ locale: normalizedLocale }, { locale: { $exists: false } }],
        }
      : { locale: normalizedLocale };
  if (!componentId && !subject && !ageGroup) {
    return filter;
  }

  return {
    ...filter,
    ...(componentId ? { componentId } : {}),
    ...(subject ? { subject } : {}),
    ...(ageGroup ? { ageGroup } : {}),
  };
};

const toTemplate = (doc: MongoKangurLessonTemplateDocument): KangurLessonTemplate => {
  return normalizeKangurLessonTemplate(doc);
};

const buildTemplateUpdate = (
  template: KangurLessonTemplate,
  locale: string,
  now: Date
) => {
  const normalizedTemplate = normalizeKangurLessonTemplate(template);
  const unset: Record<string, ''> = {};

  if (typeof normalizedTemplate.ageGroup !== 'string') {
    unset['ageGroup'] = '';
  }
  if (typeof normalizedTemplate.componentContent !== 'object') {
    unset['componentContent'] = '';
  }

  return {
    filter: { _id: buildLocalizedTemplateId(normalizedTemplate.componentId, locale) },
    update: {
      $set: {
        ...normalizedTemplate,
        componentId: normalizedTemplate.componentId,
        locale,
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

const seedMissingTemplatesForLocale = async (
  collection: Collection<MongoKangurLessonTemplateDocument>,
  locale?: string | null
): Promise<boolean> => {
  const normalizedLocale = normalizeTemplateLocale(locale);
  const defaults = createDefaultKangurLessonTemplates(normalizedLocale);

  if (defaults.length === 0) {
    return false;
  }

  const now = new Date();
  await collection.bulkWrite(
    defaults.map((template) => {
      const normalizedTemplate = normalizeKangurLessonTemplate(template);
      return {
        updateOne: {
          filter: { _id: buildLocalizedTemplateId(normalizedTemplate.componentId, normalizedLocale) },
          update: {
            $setOnInsert: {
              ...normalizedTemplate,
              componentId: normalizedTemplate.componentId,
              locale: normalizedLocale,
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

const ensureTemplatesForLocale = async (
  collection: Collection<MongoKangurLessonTemplateDocument>,
  locale?: string | null
): Promise<void> => {
  const normalizedLocale = normalizeTemplateLocale(locale);

  if (defaultsInitializedForLocale.has(normalizedLocale)) {
    return;
  }

  const inFlight = defaultsInFlightByLocale.get(normalizedLocale);
  if (inFlight) {
    await inFlight;
    return;
  }

  const promise = (async (): Promise<void> => {
    await seedMissingTemplatesForLocale(collection, normalizedLocale);
    defaultsInitializedForLocale.add(normalizedLocale);
  })();

  defaultsInFlightByLocale.set(normalizedLocale, promise);

  try {
    await promise;
  } finally {
    defaultsInFlightByLocale.delete(normalizedLocale);
  }
};

export const mongoKangurLessonTemplateRepository: KangurLessonTemplateRepository = {
  async listTemplates(input?: KangurLessonTemplateListInput): Promise<KangurLessonTemplate[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    await ensureTemplatesForLocale(collection, input?.locale);

    const docs = await collection
      .find(buildFilter(input))
      .sort({ sortOrder: 1, componentId: 1 })
      .toArray();

    if (docs.length === 0) {
      const filter = buildFilter(input);
      const existingCount = await collection.countDocuments(filter);
      if (existingCount === 0) {
        const defaults = createDefaultKangurLessonTemplates(normalizeTemplateLocale(input?.locale));
        return defaults.filter((template) => {
          if (input?.componentId && template.componentId !== input.componentId) {
            return false;
          }
          if (input?.subject && template.subject !== input.subject) {
            return false;
          }
          if (input?.ageGroup && template.ageGroup !== input.ageGroup) {
            return false;
          }
          return true;
        });
      }
    }

    return docs.map(toTemplate);
  },

  async replaceTemplates(
    templates: KangurLessonTemplate[],
    locale?: string
  ): Promise<KangurLessonTemplate[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    const now = new Date();
    const normalizedLocale = normalizeTemplateLocale(locale);

    if (templates.length === 0) {
      await collection.deleteMany(buildFilter({ locale: normalizedLocale }));
      return [];
    }

    const localizedIds = templates.map((template) =>
      buildLocalizedTemplateId(template.componentId, normalizedLocale)
    );
    const operations = templates.map((template) => ({
      updateOne: {
        ...buildTemplateUpdate(template, normalizedLocale, now),
      },
    }));

    await collection.bulkWrite(operations, { ordered: false });
    await collection.deleteMany({
      ...buildFilter({ locale: normalizedLocale }),
      _id: { $nin: localizedIds },
    });

    return templates;
  },

  async saveTemplate(template: KangurLessonTemplate, locale?: string): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    const now = new Date();
    const normalizedLocale = normalizeTemplateLocale(locale);
    const update = buildTemplateUpdate(template, normalizedLocale, now);

    await collection.updateOne(
      update.filter,
      update.update,
      { upsert: true },
    );
  },

  async removeTemplate(componentId: string, locale?: string): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const collection = db.collection<MongoKangurLessonTemplateDocument>(COLLECTION);
    await collection.deleteOne({
      _id: buildLocalizedTemplateId(componentId, normalizeTemplateLocale(locale)),
    });
  },
};
