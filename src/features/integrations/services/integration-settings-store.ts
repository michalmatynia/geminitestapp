import 'server-only';

import type { WithId } from 'mongodb';

import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';
import { getMongoDb } from '@/shared/lib/db/integration-mongo-client';
import { PRODUCT_SYNC_PROFILE_SETTINGS_KEY } from '@/shared/contracts/product-sync';

export const INTEGRATION_SETTINGS_COLLECTION = 'integration_settings';
export const BASE_SYNC_POLL_INTERVAL_MINUTES_KEY = 'base_sync_poll_interval_minutes';

export const INTEGRATION_SETTINGS_KEYS = [
  ...Object.values(TRADERA_SETTINGS_KEYS),
  'tradera_export_default_connection_id',
  'vinted_export_default_connection_id',
  'scanner_1688_default_connection_id',
  BASE_SYNC_POLL_INTERVAL_MINUTES_KEY,
  PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
] as const;

export type IntegrationSettingsKey = (typeof INTEGRATION_SETTINGS_KEYS)[number];

const INTEGRATION_SETTINGS_KEY_SET = new Set<string>(INTEGRATION_SETTINGS_KEYS);

type IntegrationSettingDocument = {
  _id: string;
  key: string;
  schemaVersion?: number;
  value: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const isIntegrationSettingKey = (key: string): key is IntegrationSettingsKey =>
  INTEGRATION_SETTINGS_KEY_SET.has(key);

export const readIntegrationSettingValue = async (key: string): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<IntegrationSettingDocument>(INTEGRATION_SETTINGS_COLLECTION)
    .findOne({ _id: key }, { projection: { value: 1 } });
  return typeof doc?.value === 'string' ? doc.value : null;
};

export const writeIntegrationSettingValue = async (
  key: string,
  value: string
): Promise<void> => {
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<IntegrationSettingDocument>(INTEGRATION_SETTINGS_COLLECTION).updateOne(
    { _id: key },
    {
      $set: {
        key,
        schemaVersion: 1,
        value,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

export const deleteIntegrationSettingValue = async (key: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo.collection<IntegrationSettingDocument>(INTEGRATION_SETTINGS_COLLECTION).deleteOne({
    _id: key,
  });
};

export const listIntegrationSettingValues = async (
  keys: readonly string[] = INTEGRATION_SETTINGS_KEYS
): Promise<Map<string, string>> => {
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<IntegrationSettingDocument>(INTEGRATION_SETTINGS_COLLECTION)
    .find({ _id: { $in: [...keys] } }, { projection: { _id: 1, value: 1 } })
    .toArray();
  return docs.reduce((map: Map<string, string>, doc: WithId<IntegrationSettingDocument>) => {
    if (typeof doc.value === 'string') {
      map.set(String(doc._id), doc.value);
    }
    return map;
  }, new Map<string, string>());
};
