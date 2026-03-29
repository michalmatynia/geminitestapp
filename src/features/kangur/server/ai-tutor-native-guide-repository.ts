import 'server-only';

import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  mergeKangurAiTutorNativeGuideStore,
  parseKangurAiTutorNativeGuideStore,
  type KangurAiTutorNativeGuideStore,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { buildKangurAiTutorNativeGuideLocaleScaffold } from './ai-tutor-native-guide-locale-scaffold';


type KangurAiTutorNativeGuideDoc = {
  locale: string;
  store: KangurAiTutorNativeGuideStore;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION_NAME = 'kangur_ai_tutor_native_guides';

let indexesEnsured: Promise<void> | null = null;

const buildDefaultStore = (locale: string): KangurAiTutorNativeGuideStore =>
  buildKangurAiTutorNativeGuideLocaleScaffold({
    locale: normalizeSiteLocale(locale),
    sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  });

const storesDiffer = (
  left: KangurAiTutorNativeGuideStore,
  right: KangurAiTutorNativeGuideStore
): boolean => JSON.stringify(left) !== JSON.stringify(right);

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
  const normalizedLocale = normalizeSiteLocale(locale);
  const defaults = buildDefaultStore(normalizedLocale);

  if (!process.env['MONGODB_URI']) {
    return defaults;
  }

  try {
    await ensureIndexes();
    const collection = await readCollection();
    const existing = await collection.findOne({ locale: normalizedLocale });
    if (!existing) {
      const now = new Date();
      await collection.updateOne(
        { locale: normalizedLocale },
        {
          $setOnInsert: {
            locale: normalizedLocale,
            store: defaults,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );
      return defaults;
    }

    const repairedExisting = repairKangurPolishCopy(existing.store);
    const merged = buildKangurAiTutorNativeGuideLocaleScaffold({
      locale: normalizedLocale,
      sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      existingStore: mergeKangurAiTutorNativeGuideStore(defaults, repairedExisting),
    });
    const parsedExisting = parseKangurAiTutorNativeGuideStore({
      ...repairedExisting,
      locale: normalizedLocale,
    });

    if (storesDiffer(parsedExisting, merged)) {
      await collection.updateOne(
        { locale: normalizedLocale },
        {
          $set: {
            store: merged,
            updatedAt: new Date(),
          },
        }
      );
    }
    return merged;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return defaults;
  }
}

export async function upsertKangurAiTutorNativeGuideStore(
  store: KangurAiTutorNativeGuideStore
): Promise<KangurAiTutorNativeGuideStore> {
  const parsed = parseKangurAiTutorNativeGuideStore(repairKangurPolishCopy(store));

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

export async function getLatestKangurAiTutorNativeGuideUpdateAt(
  locale = 'pl'
): Promise<Date | null> {
  if (!process.env['MONGODB_URI']) {
    return null;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const existing = await collection.findOne(
    { locale },
    {
      projection: {
        updatedAt: 1,
      },
    }
  );
  return existing?.updatedAt instanceof Date ? existing.updatedAt : null;
}
