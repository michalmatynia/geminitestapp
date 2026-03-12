import 'server-only';

import type { AnyBulkWriteOperation } from 'mongodb';

import { buildDefaultKangurPageContentStore } from '@/features/kangur/page-content-catalog';
import {
  KANGUR_PAGE_CONTENT_COLLECTION,
  mergeKangurPageContentStore,
  parseKangurPageContentStore,
  type KangurPageContentEntry,
  type KangurPageContentStore,
} from '@/shared/contracts/kangur-page-content';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

type KangurPageContentDoc = KangurPageContentEntry & {
  locale: string;
  createdAt: Date;
  updatedAt: Date;
};

let indexesEnsured: Promise<void> | null = null;

const ensureIndexes = async (): Promise<void> => {
  if (!process.env['MONGODB_URI']) {
    return;
  }

  if (indexesEnsured) {
    return indexesEnsured;
  }

  indexesEnsured = (async () => {
    const db = await getMongoDb();
    const collection = db.collection<KangurPageContentDoc>(KANGUR_PAGE_CONTENT_COLLECTION);
    await Promise.all([
      collection.createIndex({ locale: 1, id: 1 }, { unique: true }),
      collection.createIndex({ locale: 1, pageKey: 1, screenKey: 1, sortOrder: 1 }),
      collection.createIndex({ locale: 1, anchorIdPrefix: 1 }),
      collection.createIndex({ locale: 1, contentIdPrefixes: 1 }),
      collection.createIndex({ locale: 1, nativeGuideIds: 1 }),
      collection.createIndex({ locale: 1, updatedAt: -1 }),
    ]);
  })();

  return indexesEnsured;
};

const readCollection = async () => {
  const db = await getMongoDb();
  return db.collection<KangurPageContentDoc>(KANGUR_PAGE_CONTENT_COLLECTION);
};

const toStoreFromDocs = (
  docs: KangurPageContentDoc[],
  locale: string,
  version: number
): KangurPageContentStore =>
  parseKangurPageContentStore({
    locale,
    version,
    entries: docs
      .map(({ locale: _locale, createdAt: _createdAt, updatedAt: _updatedAt, ...entry }) => entry)
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return left.id.localeCompare(right.id);
      }),
  });

const persistStore = async (store: KangurPageContentStore): Promise<void> => {
  const collection = await readCollection();
  const now = new Date();
  const operations: AnyBulkWriteOperation<KangurPageContentDoc>[] = store.entries.map((entry) => ({
    updateOne: {
      filter: { locale: store.locale, id: entry.id },
      update: {
        $set: {
          ...entry,
          locale: store.locale,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await collection.bulkWrite(operations, { ordered: false });
  }

  await collection.deleteMany({
    locale: store.locale,
    ...(store.entries.length > 0
      ? { id: { $nin: store.entries.map((entry) => entry.id) } }
      : {}),
  });
};

const storesDiffer = (left: KangurPageContentStore, right: KangurPageContentStore): boolean =>
  JSON.stringify(left) !== JSON.stringify(right);

export async function getKangurPageContentStore(locale = 'pl'): Promise<KangurPageContentStore> {
  const defaults = buildDefaultKangurPageContentStore(locale);

  if (!process.env['MONGODB_URI']) {
    return defaults;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const docs = await collection.find({ locale }).sort({ sortOrder: 1, id: 1 }).toArray();

  if (docs.length === 0) {
    await persistStore(defaults);
    return defaults;
  }

  const existing = toStoreFromDocs(docs, locale, defaults.version);
  const merged = mergeKangurPageContentStore(defaults, existing);

  if (storesDiffer(existing, merged)) {
    await persistStore(merged);
  }

  return merged;
}

export async function upsertKangurPageContentStore(
  store: KangurPageContentStore
): Promise<KangurPageContentStore> {
  const parsed = parseKangurPageContentStore(store);

  if (!process.env['MONGODB_URI']) {
    return parsed;
  }

  await ensureIndexes();
  await persistStore(parsed);
  return parsed;
}

export async function getKangurPageContentEntry(
  id: string,
  locale = 'pl'
): Promise<KangurPageContentEntry | null> {
  const store = await getKangurPageContentStore(locale);
  return store.entries.find((entry) => entry.id === id) ?? null;
}
