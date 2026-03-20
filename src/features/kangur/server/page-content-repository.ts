import 'server-only';

import { LRUCache } from 'lru-cache';
import type { AnyBulkWriteOperation } from 'mongodb';

import { buildDefaultKangurPageContentStore } from '@/features/kangur/page-content-catalog';
import {
  KANGUR_PAGE_CONTENT_COLLECTION,
  mergeKangurPageContentStore,
  parseKangurPageContentStore,
  type KangurPageContentEntry,
  type KangurPageContentStore,
} from '@/features/kangur/shared/contracts/kangur-page-content';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurPageContentDoc = KangurPageContentEntry & {
  locale: string;
  createdAt: Date;
  updatedAt: Date;
};

const PAGE_CONTENT_SERVER_CACHE_TTL_MS = 90_000;
const pageContentServerCache = new LRUCache<string, KangurPageContentStore>({
  max: 6,
  ttl: PAGE_CONTENT_SERVER_CACHE_TTL_MS,
  updateAgeOnGet: true,
});
const pageContentInflight = new Map<string, Promise<KangurPageContentStore>>();

let indexesEnsured: Promise<void> | null = null;

const getPageContentCacheKey = (locale: string): string =>
  `kangur-page-content:${normalizeSiteLocale(locale)}`;

const getCachedPageContentStore = (locale: string): KangurPageContentStore | null =>
  pageContentServerCache.get(getPageContentCacheKey(locale)) ?? null;

const setCachedPageContentStore = (store: KangurPageContentStore): void => {
  pageContentServerCache.set(getPageContentCacheKey(store.locale), store);
};

const clearCachedPageContentStore = (locale?: string | null): void => {
  if (locale) {
    const cacheKey = getPageContentCacheKey(locale);
    pageContentServerCache.delete(cacheKey);
    pageContentInflight.delete(cacheKey);
    return;
  }

  pageContentServerCache.clear();
  pageContentInflight.clear();
};

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
  const normalizedLocale = normalizeSiteLocale(locale);
  const defaults = buildDefaultKangurPageContentStore(normalizedLocale);

  if (!process.env['MONGODB_URI']) {
    return defaults;
  }

  const cached = getCachedPageContentStore(normalizedLocale);
  if (cached) {
    return cached;
  }

  const cacheKey = getPageContentCacheKey(normalizedLocale);
  const inflight = pageContentInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const loadPromise = (async (): Promise<KangurPageContentStore> => {
    await ensureIndexes();
    const collection = await readCollection();
    const docs = await collection.find({ locale: normalizedLocale }).sort({ sortOrder: 1, id: 1 }).toArray();

    if (docs.length === 0) {
      await persistStore(defaults);
      setCachedPageContentStore(defaults);
      return defaults;
    }

    const existing = toStoreFromDocs(docs, normalizedLocale, defaults.version);
    const merged = mergeKangurPageContentStore(defaults, repairKangurPolishCopy(existing));

    if (storesDiffer(existing, merged)) {
      await persistStore(merged);
    }

    setCachedPageContentStore(merged);
    return merged;
  })().finally(() => {
    pageContentInflight.delete(cacheKey);
  });

  pageContentInflight.set(cacheKey, loadPromise);
  return loadPromise;
}

export async function upsertKangurPageContentStore(
  store: KangurPageContentStore
): Promise<KangurPageContentStore> {
  const parsed = parseKangurPageContentStore(repairKangurPolishCopy(store));

  if (!process.env['MONGODB_URI']) {
    return parsed;
  }

  await ensureIndexes();
  await persistStore(parsed);
  setCachedPageContentStore(parsed);
  return parsed;
}

export async function getKangurPageContentEntry(
  id: string,
  locale = 'pl'
): Promise<KangurPageContentEntry | null> {
  const store = await getKangurPageContentStore(locale);
  return store.entries.find((entry) => entry.id === id) ?? null;
}

export async function getLatestKangurPageContentUpdateAt(locale = 'pl'): Promise<Date | null> {
  if (!process.env['MONGODB_URI']) {
    return null;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const latest = await collection.find({ locale }).sort({ updatedAt: -1 }).limit(1).next();
  return latest?.updatedAt instanceof Date ? latest.updatedAt : null;
}

export const clearKangurPageContentServerCache = (locale?: string | null): void => {
  clearCachedPageContentStore(locale);
};
