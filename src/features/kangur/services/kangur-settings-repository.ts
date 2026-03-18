import 'server-only';

import type {
  MongoPersistedStringSettingRecord,
  MongoStringSettingRecord,
  SettingRecord,
} from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const KANGUR_SETTINGS_COLLECTION = 'kangur_settings';
const LEGACY_SETTINGS_COLLECTION = 'settings';
const KANGUR_SETTINGS_KEY_PREFIX = 'kangur_';
const KANGUR_SETTINGS_KEY_INDEX = 'kangur_settings_key';

type KangurSettingDocument = MongoPersistedStringSettingRecord<string, Date>;

type LegacySettingDocument = MongoStringSettingRecord<string>;

let kangurSettingsIndexesEnsured: Promise<void> | null = null;

export const isKangurSettingKey = (key: string): boolean =>
  key.trim().startsWith(KANGUR_SETTINGS_KEY_PREFIX);

const ensureKangurSettingsIndexes = async (): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  if (!kangurSettingsIndexesEnsured) {
    kangurSettingsIndexesEnsured = (async (): Promise<void> => {
      try {
        const mongo = await getMongoDb();
        await mongo
          .collection<KangurSettingDocument>(KANGUR_SETTINGS_COLLECTION)
          .createIndex({ key: 1 }, { name: KANGUR_SETTINGS_KEY_INDEX, unique: true });
      } catch (error) {
        void ErrorSystem.captureException(error);
        await ErrorSystem.logWarning('[kangur-settings] Failed to ensure settings indexes.', {
          service: 'kangur.settings',
          error,
        });
      }
    })();
  }
  await kangurSettingsIndexesEnsured;
};

const resolveDocKey = (doc: { key?: unknown; _id?: unknown }): string | null => {
  if (typeof doc.key === 'string' && doc.key.trim().length > 0) {
    return doc.key;
  }
  if (typeof doc._id === 'string' && doc._id.trim().length > 0) {
    return doc._id;
  }
  return null;
};

const resolveDocValue = (doc: { value?: unknown }): string | null =>
  typeof doc.value === 'string' ? doc.value : null;

const toSettingRecord = (
  doc: { key?: unknown; _id?: unknown; value?: unknown }
): SettingRecord | null => {
  const key = resolveDocKey(doc);
  const value = resolveDocValue(doc);
  if (!key || value === null) return null;
  return { key, value: decodeSettingValue(key, value) };
};

const readLegacySettingsByKeys = async (keys: string[]): Promise<SettingRecord[]> => {
  if (!process.env['MONGODB_URI']) return [];
  if (keys.length === 0) return [];
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<LegacySettingDocument>(LEGACY_SETTINGS_COLLECTION)
    .find(
      { $or: [{ key: { $in: keys } }, { _id: { $in: keys } }] },
      { projection: { _id: 1, key: 1, value: 1 } }
    )
    .toArray();

  return docs
    .map((doc: LegacySettingDocument) => toSettingRecord(doc))
    .filter((item: SettingRecord | null): item is SettingRecord => Boolean(item));
};

const readLegacySettingValue = async (key: string): Promise<string | null> => {
  const records = await readLegacySettingsByKeys([key]);
  return records.length > 0 ? records[0]!.value : null;
};

const backfillKangurSettingValue = async (key: string, value: string): Promise<void> => {
  try {
    await upsertKangurSettingValue(key, value);
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.logWarning('[kangur-settings] Failed to backfill legacy setting.', {
      service: 'kangur.settings',
      key,
      error,
    });
  }
};

export const readKangurSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  await ensureKangurSettingsIndexes();
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<KangurSettingDocument>(KANGUR_SETTINGS_COLLECTION)
    .findOne({ $or: [{ _id: key }, { key }] }, { projection: { _id: 1, key: 1, value: 1 } });
  const record = doc ? toSettingRecord(doc) : null;
  if (record) {
    return record.value;
  }

  const legacyValue = await readLegacySettingValue(key);
  if (legacyValue !== null) {
    void backfillKangurSettingValue(key, legacyValue);
  }
  return legacyValue;
};

export const listKangurSettings = async (): Promise<SettingRecord[]> => {
  if (!process.env['MONGODB_URI']) return [];
  await ensureKangurSettingsIndexes();
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<KangurSettingDocument>(KANGUR_SETTINGS_COLLECTION)
    .find({}, { projection: { _id: 1, key: 1, value: 1 } })
    .toArray();

  return docs
    .map((doc: KangurSettingDocument) => toSettingRecord(doc))
    .filter((item: SettingRecord | null): item is SettingRecord => Boolean(item));
};

export const listKangurSettingsByKeys = async (keys: string[]): Promise<SettingRecord[]> => {
  const kangurKeys = keys.filter(isKangurSettingKey);
  if (!process.env['MONGODB_URI']) return [];
  if (kangurKeys.length === 0) return [];
  await ensureKangurSettingsIndexes();
  const mongo = await getMongoDb();
  const [legacyDocs, kangurDocs] = await Promise.all([
    mongo
      .collection<LegacySettingDocument>(LEGACY_SETTINGS_COLLECTION)
      .find(
        { $or: [{ key: { $in: kangurKeys } }, { _id: { $in: kangurKeys } }] },
        { projection: { _id: 1, key: 1, value: 1 } }
      )
      .toArray(),
    mongo
      .collection<KangurSettingDocument>(KANGUR_SETTINGS_COLLECTION)
      .find(
        { $or: [{ key: { $in: kangurKeys } }, { _id: { $in: kangurKeys } }] },
        { projection: { _id: 1, key: 1, value: 1 } }
      )
      .toArray(),
  ]);

  const merged = new Map<string, string>();
  legacyDocs.forEach((doc: LegacySettingDocument) => {
    const record = toSettingRecord(doc);
    if (record) merged.set(record.key, record.value);
  });
  kangurDocs.forEach((doc: KangurSettingDocument) => {
    const record = toSettingRecord(doc);
    if (record) merged.set(record.key, record.value);
  });

  return Array.from(merged.entries()).map(([key, value]) => ({ key, value }));
};

export const upsertKangurSettingValue = async (
  key: string,
  value: string
): Promise<SettingRecord | null> => {
  if (!process.env['MONGODB_URI']) return null;
  await ensureKangurSettingsIndexes();
  const mongo = await getMongoDb();
  const now = new Date();
  const encodedValue = encodeSettingValue(key, value);
  await mongo.collection<KangurSettingDocument>(KANGUR_SETTINGS_COLLECTION).updateOne(
    { $or: [{ _id: key }, { key }] },
    {
      $set: { key, value: encodedValue, updatedAt: now },
      $setOnInsert: { _id: key, createdAt: now },
    },
    { upsert: true }
  );
  return { key, value: encodedValue };
};

export const deleteKangurSettingValue = async (key: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  const mongo = await getMongoDb();
  await Promise.all([
    mongo
      .collection<KangurSettingDocument>(KANGUR_SETTINGS_COLLECTION)
      .deleteOne({ $or: [{ _id: key }, { key }] }),
    mongo
      .collection<LegacySettingDocument>(LEGACY_SETTINGS_COLLECTION)
      .deleteOne({ $or: [{ _id: key }, { key }] }),
  ]);
  return true;
};
