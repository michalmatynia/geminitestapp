import 'server-only';

import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  parseKangurAiTutorContent,
  type KangurAiTutorContent,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';


type KangurAiTutorContentDoc = {
  locale: string;
  content: KangurAiTutorContent;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION_NAME = 'kangur_ai_tutor_content';

let indexesEnsured: Promise<void> | null = null;

const buildDefaultContent = (locale: string): KangurAiTutorContent => ({
  ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
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
    const collection = db.collection<KangurAiTutorContentDoc>(COLLECTION_NAME);
    await Promise.all([
      collection.createIndex({ locale: 1 }, { unique: true }),
      collection.createIndex({ updatedAt: -1 }),
    ]);
  })();

  return indexesEnsured;
};

const readCollection = async () => {
  const db = await getMongoDb();
  return db.collection<KangurAiTutorContentDoc>(COLLECTION_NAME);
};

export async function getKangurAiTutorContent(locale = 'pl'): Promise<KangurAiTutorContent> {
  const fallback = buildDefaultContent(locale);

  if (!process.env['MONGODB_URI']) {
    return fallback;
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
          content: fallback,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
    return fallback;
  }

  try {
    const repaired = parseKangurAiTutorContent(repairKangurPolishCopy(existing.content));

    if (JSON.stringify(repaired) !== JSON.stringify(existing.content)) {
      await collection.updateOne(
        { locale },
        {
          $set: {
            content: repaired,
            updatedAt: new Date(),
          },
        }
      );
    }

    return repaired;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await collection.updateOne(
      { locale },
      {
        $set: {
          content: fallback,
          updatedAt: new Date(),
        },
      }
    );
    return fallback;
  }
}

export async function upsertKangurAiTutorContent(
  content: KangurAiTutorContent
): Promise<KangurAiTutorContent> {
  const parsed = parseKangurAiTutorContent(repairKangurPolishCopy(content));

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
        content: parsed,
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
