import type { Collection } from 'mongodb';

import type {
  MongoPersistedStringSettingDocument,
  MongoStringSettingRecord,
} from '@/shared/contracts/settings';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';
import {
  KANGUR_LEGACY_SETTINGS_COLLECTION,
  type KangurLegacySettingDocument,
} from '@/features/kangur/services/kangur-legacy-settings-store';

export const KANGUR_SETTINGS_COLLECTION = 'kangur_settings';

export type KangurSettingDoc = MongoPersistedStringSettingDocument<string>;

type KangurSettingLookupDocument = MongoStringSettingRecord<string>;

const buildSettingLookupFilter = (keys: string[]) => ({
  $or: [{ key: { $in: keys } }, { _id: { $in: keys } }],
});

const resolveStoredKey = (
  doc: KangurSettingLookupDocument | null | undefined,
  fallbackKey?: string
): string | null => {
  if (typeof doc?.key === 'string' && doc.key.trim().length > 0) {
    return doc.key;
  }
  if (typeof doc?._id === 'string' && doc._id.trim().length > 0) {
    return doc._id;
  }
  return fallbackKey ?? null;
};

export const resolveKangurStoredValue = (
  doc: KangurSettingLookupDocument | null | undefined,
  fallbackKey?: string
): string | null => {
  if (typeof doc?.value !== 'string') return null;

  const key = resolveStoredKey(doc, fallbackKey);
  return key ? decodeSettingValue(key, doc.value) : doc.value;
};

export const readKangurSettingWithLegacyFallback = async ({
  collection,
  legacyCollection,
  keys,
}: {
  collection: Collection<KangurSettingDoc>;
  legacyCollection: Collection<KangurLegacySettingDocument>;
  keys: string[];
}): Promise<string | null> => {
  if (keys.length === 0) return null;

  const currentDoc = await collection.findOne(buildSettingLookupFilter(keys), {
    projection: { _id: 1, key: 1, value: 1 },
  });
  const currentValue = resolveKangurStoredValue(currentDoc);
  if (currentValue !== null) return currentValue;

  const legacyDoc = await legacyCollection.findOne(buildSettingLookupFilter(keys), {
    projection: { _id: 1, key: 1, value: 1 },
  });
  return resolveKangurStoredValue(legacyDoc);
};

export { KANGUR_LEGACY_SETTINGS_COLLECTION, type KangurLegacySettingDocument };
