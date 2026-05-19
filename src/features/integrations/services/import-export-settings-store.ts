import 'server-only';

import type { WithId } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/integration-mongo-client';

export const IMPORT_EXPORT_SETTINGS_COLLECTION = 'import_export_settings';

export const IMPORT_EXPORT_SETTINGS_KEYS = [
  'base_import_templates',
  'base_import_sample_product_id',
  'base_import_sample_inventory_id',
  'base_import_last_template_id',
  'base_import_active_template_id',
  'base_import_parameter_cache',
  'base_import_parameter_link_map',
  'base_export_warehouse_by_inventory',
  'base_export_templates',
  'base_export_active_template_id',
  'base_export_default_inventory_id',
  'base_export_default_connection_id',
  'base_export_stock_fallback_enabled',
  'base_export_image_retry_presets',
] as const;

export type ImportExportSettingsKey = (typeof IMPORT_EXPORT_SETTINGS_KEYS)[number];

const IMPORT_EXPORT_SETTINGS_KEY_SET = new Set<string>(IMPORT_EXPORT_SETTINGS_KEYS);

type ImportExportSettingDocument = {
  _id: string;
  key: string;
  schemaVersion?: number;
  value: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type LegacySettingDocument = {
  _id?: string;
  key?: string;
  value?: string;
};

export const isImportExportSettingKey = (key: string): key is ImportExportSettingsKey =>
  IMPORT_EXPORT_SETTINGS_KEY_SET.has(key);

const readLegacySettingValue = async (key: string): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo.collection<LegacySettingDocument>('settings').findOne(
    {
      $or: [{ _id: key }, { key }],
    },
    { projection: { value: 1 } }
  );
  return typeof doc?.value === 'string' ? doc.value : null;
};

export const readImportExportSettingValue = async (key: string): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<ImportExportSettingDocument>(IMPORT_EXPORT_SETTINGS_COLLECTION)
    .findOne({ _id: key }, { projection: { value: 1 } });
  if (typeof doc?.value === 'string') return doc.value;
  return readLegacySettingValue(key);
};

export const writeImportExportSettingValue = async (
  key: string,
  value: string
): Promise<void> => {
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<ImportExportSettingDocument>(IMPORT_EXPORT_SETTINGS_COLLECTION).updateOne(
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

export const deleteImportExportSettingValue = async (key: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo.collection<ImportExportSettingDocument>(IMPORT_EXPORT_SETTINGS_COLLECTION).deleteOne({
    _id: key,
  });
};

export const listImportExportSettingValues = async (
  keys: readonly string[] = IMPORT_EXPORT_SETTINGS_KEYS
): Promise<Map<string, string>> => {
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<ImportExportSettingDocument>(IMPORT_EXPORT_SETTINGS_COLLECTION)
    .find({ _id: { $in: [...keys] } }, { projection: { _id: 1, value: 1 } })
    .toArray();
  const values = docs.reduce((map: Map<string, string>, doc: WithId<ImportExportSettingDocument>) => {
    if (typeof doc.value === 'string') {
      map.set(String(doc._id), doc.value);
    }
    return map;
  }, new Map<string, string>());
  await Promise.all(
    keys.map(async (key) => {
      if (values.has(key)) return;
      const legacyValue = await readLegacySettingValue(key);
      if (legacyValue !== null) values.set(key, legacyValue);
    })
  );
  return values;
};
