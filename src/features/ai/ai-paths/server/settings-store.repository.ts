import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  AI_PATHS_SETTINGS_COLLECTION,
  MONGO_INDEX_NAME,
  type AiPathsSettingRecord,
  type MongoAiPathsSettingDoc,
} from './settings-store.constants';
import { assertMongoConfigured, withMongoOperationTimeout } from './settings-store.helpers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


let mongoIndexesEnsured: Promise<void> | null = null;

export const ensureMongoIndexes = async (timeoutMs: number): Promise<void> => {
  assertMongoConfigured();
  if (!mongoIndexesEnsured) {
    mongoIndexesEnsured = (async (): Promise<void> => {
      const mongo = await getMongoDb();
      await mongo
        .collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION)
        .createIndex({ key: 1 }, { unique: true, name: MONGO_INDEX_NAME });
    })();
  }
  try {
    await withMongoOperationTimeout(mongoIndexesEnsured, timeoutMs);
  } catch (error) {
    void ErrorSystem.captureException(error);
    mongoIndexesEnsured = null;
    throw error;
  }
};

export const listMongoAiPathsSettings = async (
  timeoutMs: number
): Promise<AiPathsSettingRecord[]> => {
  const mongo = await withMongoOperationTimeout(getMongoDb(), timeoutMs);
  const docs = await withMongoOperationTimeout(
    mongo
      .collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION)
      .find({}, { projection: { key: 1, value: 1 } })
      .toArray(),
    timeoutMs
  );

  return docs
    .map((doc: MongoAiPathsSettingDoc): AiPathsSettingRecord | null => {
      const key = typeof doc.key === 'string' ? doc.key : null;
      const value = typeof doc.value === 'string' ? doc.value : null;
      if (!key || value === null) return null;
      return { key, value };
    })
    .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
};

export const upsertMongoAiPathsSetting = async (
  key: string,
  value: string,
  timeoutMs: number
): Promise<AiPathsSettingRecord> => {
  await ensureMongoIndexes(timeoutMs);
  const mongo = await withMongoOperationTimeout(getMongoDb(), timeoutMs);
  const now = new Date();
  await withMongoOperationTimeout(
    mongo.collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION).updateOne(
      { key },
      {
        $set: { key, value, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    ),
    timeoutMs
  );
  return { key, value };
};

export const fetchMongoAiPathsSettings = async (
  keys: string[],
  timeoutMs: number
): Promise<AiPathsSettingRecord[]> => {
  if (keys.length === 0) return [];
  const mongo = await withMongoOperationTimeout(getMongoDb(), timeoutMs);
  const docs = await withMongoOperationTimeout(
    mongo
      .collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION)
      .find({ key: { $in: keys } }, { projection: { key: 1, value: 1 } })
      .toArray(),
    timeoutMs
  );

  return docs
    .map((doc: MongoAiPathsSettingDoc): AiPathsSettingRecord | null => {
      const key = typeof doc.key === 'string' ? doc.key : null;
      const value = typeof doc.value === 'string' ? doc.value : null;
      if (!key || value === null) return null;
      return { key, value };
    })
    .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
};

export const upsertMongoAiPathsSettings = async (
  items: AiPathsSettingRecord[],
  timeoutMs: number
): Promise<void> => {
  if (items.length === 0) return;
  await ensureMongoIndexes(timeoutMs);
  const mongo = await withMongoOperationTimeout(getMongoDb(), timeoutMs);
  const now = new Date();
  const collection = mongo.collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION);
  await withMongoOperationTimeout(
    Promise.all(
      items.map((item: AiPathsSettingRecord) =>
        collection.updateOne(
          { key: item.key },
          {
            $set: { key: item.key, value: item.value, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true }
        )
      )
    ),
    timeoutMs
  );
};

export const deleteMongoAiPathsSettings = async (
  keys: string[],
  timeoutMs: number
): Promise<void> => {
  if (keys.length === 0) return;
  await ensureMongoIndexes(timeoutMs);
  const mongo = await withMongoOperationTimeout(getMongoDb(), timeoutMs);
  await withMongoOperationTimeout(
    mongo.collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION).deleteMany({
      key: { $in: keys },
    }),
    timeoutMs
  );
};
