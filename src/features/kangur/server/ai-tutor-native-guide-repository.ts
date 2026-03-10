import 'server-only';

import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  parseKangurAiTutorNativeGuideStore,
  type KangurAiTutorNativeGuideEntry,
  type KangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

type KangurAiTutorNativeGuideDoc = {
  locale: string;
  store: KangurAiTutorNativeGuideStore;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION_NAME = 'kangur_ai_tutor_native_guides';

let indexesEnsured: Promise<void> | null = null;

const buildDefaultStore = (locale: string): KangurAiTutorNativeGuideStore =>
  parseKangurAiTutorNativeGuideStore({
    ...DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
    locale,
  });

const mergeStores = (
  existing: KangurAiTutorNativeGuideStore,
  defaults: KangurAiTutorNativeGuideStore
): {
  merged: KangurAiTutorNativeGuideStore;
  changed: boolean;
} => {
  const existingById = new Map<string, KangurAiTutorNativeGuideEntry>(
    existing.entries.map((entry) => [entry.id, entry])
  );
  let changed = existing.version !== defaults.version;

  const mergedEntries = defaults.entries.map((defaultEntry) => {
    const current = existingById.get(defaultEntry.id);
    if (!current) {
      changed = true;
      return defaultEntry;
    }
    return current;
  });

  for (const entry of existing.entries) {
    if (!mergedEntries.some((candidate) => candidate.id === entry.id)) {
      mergedEntries.push(entry);
    }
  }

  return {
    merged: parseKangurAiTutorNativeGuideStore({
      locale: existing.locale || defaults.locale,
      version: Math.max(existing.version, defaults.version),
      entries: mergedEntries,
    }),
    changed,
  };
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
    const collection = db.collection<KangurAiTutorNativeGuideDoc>(COLLECTION_NAME);
    await Promise.all([
      collection.createIndex({ locale: 1 }, { unique: true }),
      collection.createIndex({ updatedAt: -1 }),
    ]);
  })();

  return indexesEnsured;
};

const readCollection = async () => {
  const db = await getMongoDb();
  return db.collection<KangurAiTutorNativeGuideDoc>(COLLECTION_NAME);
};

export async function getKangurAiTutorNativeGuideStore(
  locale = 'pl'
): Promise<KangurAiTutorNativeGuideStore> {
  const defaults = buildDefaultStore(locale);

  if (!process.env['MONGODB_URI']) {
    return defaults;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const existing = await collection.findOne({ locale });
  if (!existing) {
    const now = new Date();
    await collection.updateOne(
      { locale },
      {
        $setOnInsert: {
          locale,
          store: defaults,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
    return defaults;
  }

  try {
    const parsed = parseKangurAiTutorNativeGuideStore(existing.store);
    const { merged, changed } = mergeStores(parsed, defaults);
    if (changed) {
      await collection.updateOne(
        { locale },
        {
          $set: {
            store: merged,
            updatedAt: new Date(),
          },
        }
      );
    }
    return merged;
  } catch {
    return defaults;
  }
}

export async function upsertKangurAiTutorNativeGuideStore(
  store: KangurAiTutorNativeGuideStore
): Promise<KangurAiTutorNativeGuideStore> {
  const parsed = parseKangurAiTutorNativeGuideStore(store);

  if (!process.env['MONGODB_URI']) {
    return parsed;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const now = new Date();

  await collection.updateOne(
    { locale: parsed.locale },
    {
      $set: {
        store: parsed,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return parsed;
}
