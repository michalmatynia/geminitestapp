import 'server-only';

import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  mergeKangurAiTutorNativeGuideStore,
  parseKangurAiTutorNativeGuideStore,
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
    const merged = mergeKangurAiTutorNativeGuideStore(defaults, existing.store);
    if (JSON.stringify(merged) !== JSON.stringify(existing.store)) {
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
    return parseKangurAiTutorNativeGuideStore(merged);
  } catch {
    await collection.updateOne(
      { locale },
      {
        $set: {
          store: defaults,
          updatedAt: new Date(),
        },
      }
    );
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
