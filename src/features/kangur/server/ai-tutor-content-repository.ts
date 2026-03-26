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
const AI_TUTOR_CONTENT_CACHE_TTL_MS = 5 * 60_000;

let indexesEnsured: Promise<void> | null = null;
const aiTutorContentCache = new Map<
  string,
  { content: KangurAiTutorContent; fetchedAt: number }
>();
const aiTutorContentInflight = new Map<string, Promise<KangurAiTutorContent>>();

const buildDefaultContent = (locale: string): KangurAiTutorContent => ({
  ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  locale,
});

const cloneKangurAiTutorContent = (content: KangurAiTutorContent): KangurAiTutorContent =>
  structuredClone(content);

export const clearKangurAiTutorContentCache = (): void => {
  aiTutorContentCache.clear();
  aiTutorContentInflight.clear();
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
  const cached = aiTutorContentCache.get(locale);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < AI_TUTOR_CONTENT_CACHE_TTL_MS) {
    return cloneKangurAiTutorContent(cached.content);
  }

  const inflight = aiTutorContentInflight.get(locale);
  if (inflight) {
    return cloneKangurAiTutorContent(await inflight);
  }

  const inflightPromise = (async (): Promise<KangurAiTutorContent> => {
    if (!process.env['MONGODB_URI']) {
      aiTutorContentCache.set(locale, {
        content: cloneKangurAiTutorContent(fallback),
        fetchedAt: Date.now(),
      });
      return fallback;
    }

    try {
      await ensureIndexes();
      const collection = await readCollection();
      const existing = await collection.findOne({ locale });
      if (!existing) {
        const nowDate = new Date();
        await collection.updateOne(
          { locale },
          {
            $setOnInsert: {
              locale,
              content: fallback,
              createdAt: nowDate,
              updatedAt: nowDate,
            },
          },
          { upsert: true }
        );
        aiTutorContentCache.set(locale, {
          content: cloneKangurAiTutorContent(fallback),
          fetchedAt: Date.now(),
        });
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

        aiTutorContentCache.set(locale, {
          content: cloneKangurAiTutorContent(repaired),
          fetchedAt: Date.now(),
        });
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
        aiTutorContentCache.set(locale, {
          content: cloneKangurAiTutorContent(fallback),
          fetchedAt: Date.now(),
        });
        return fallback;
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
      aiTutorContentCache.set(locale, {
        content: cloneKangurAiTutorContent(fallback),
        fetchedAt: Date.now(),
      });
      return fallback;
    }
  })().finally(() => {
    aiTutorContentInflight.delete(locale);
  });

  aiTutorContentInflight.set(locale, inflightPromise);
  return cloneKangurAiTutorContent(await inflightPromise);
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

  aiTutorContentCache.set(parsed.locale, {
    content: cloneKangurAiTutorContent(parsed),
    fetchedAt: Date.now(),
  });
  aiTutorContentInflight.delete(parsed.locale);

  return parsed;
}
