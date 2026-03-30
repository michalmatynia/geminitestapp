import 'server-only';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { findProviderForKey } from '@/shared/lib/db/settings-registry';
import { encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { clearLiteSettingsServerCache } from '@/shared/lib/settings-lite-server-cache';

const SETTINGS_COLLECTION = 'settings';

const invalidateSettingsCaches = (): void => {
  clearSettingsCache();
  clearLiteSettingsServerCache();
};

export const readFilemakerCampaignSettingValue = async (
  key: string
): Promise<string | null> => {
  const provider = await findProviderForKey(key);
  if (provider) {
    return await provider.readValue(key);
  }
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>(SETTINGS_COLLECTION)
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

export const upsertFilemakerCampaignSettingValue = async (
  key: string,
  value: string
): Promise<boolean> => {
  const provider = await findProviderForKey(key);
  if (provider) {
    const persisted = await provider.upsertValue(key, value);
    if (persisted) {
      invalidateSettingsCaches();
    }
    return persisted;
  }
  if (!process.env['MONGODB_URI']) return false;
  const mongo = await getMongoDb();
  const now = new Date();
  const encodedValue = encodeSettingValue(key, value);
  await mongo.collection<MongoStringSettingRecord>(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: { value: encodedValue, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  invalidateSettingsCaches();
  return true;
};

export const __testOnly = {
  invalidateSettingsCaches,
};
