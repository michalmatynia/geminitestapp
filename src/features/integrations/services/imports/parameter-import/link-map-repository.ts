import 'server-only';

import { ObjectId } from 'mongodb';

import {
  buildParameterLinkScopeKey,
  parseScopedCatalogParameterLinkMap,
  stringifyScopedCatalogParameterLinkMap,
  normalizeParameterLinkEntries,
} from '@/features/integrations/services/imports/parameter-import/link-map-preference';
import type { MongoTimestampedStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Filter } from 'mongodb';

type SettingDoc = MongoTimestampedStringSettingRecord<string | ObjectId, Date>;

const SETTINGS_KEY = 'base_import_parameter_link_map';

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const readSettingsValue = async (): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo.collection<SettingDoc>('settings').findOne({
    $or: [{ _id: toMongoId(SETTINGS_KEY) }, { key: SETTINGS_KEY }],
  });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const writeSettingsValue = async (value: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo.collection<SettingDoc>('settings').updateOne(
    { $or: [{ _id: toMongoId(SETTINGS_KEY) }, { key: SETTINGS_KEY }] } as Filter<SettingDoc>,
    {
      $set: {
        key: SETTINGS_KEY,
        value,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        _id: SETTINGS_KEY,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
};

export const getCatalogParameterLinks = async (input: {
  catalogId: string;
  connectionId?: string | null;
  inventoryId?: string | null;
}): Promise<Record<string, string>> => {
  const normalizedCatalogId = input.catalogId.trim();
  if (!normalizedCatalogId) return {};
  const all = parseScopedCatalogParameterLinkMap(await readSettingsValue());
  const scopeKey = buildParameterLinkScopeKey(input);
  if (scopeKey) {
    const scopedLinks = all.byScope[scopeKey]?.[normalizedCatalogId];
    if (scopedLinks) return scopedLinks;
  }
  return all.defaultByCatalog[normalizedCatalogId] ?? {};
};

export const mergeCatalogParameterLinks = async (input: {
  catalogId: string;
  connectionId?: string | null;
  inventoryId?: string | null;
  links: Record<string, string>;
}): Promise<void> => {
  const normalizedCatalogId = input.catalogId.trim();
  if (!normalizedCatalogId) return;
  const nextEntries = normalizeParameterLinkEntries(input.links);
  if (Object.keys(nextEntries).length === 0) return;

  const all = parseScopedCatalogParameterLinkMap(await readSettingsValue());
  const scopeKey = buildParameterLinkScopeKey(input);

  if (scopeKey) {
    if (!all.byScope[scopeKey]) {
      all.byScope[scopeKey] = {};
    }
    const previous = all.byScope[scopeKey]?.[normalizedCatalogId] ?? {};
    all.byScope[scopeKey] = {
      ...(all.byScope[scopeKey] ?? {}),
      [normalizedCatalogId]: { ...previous, ...nextEntries },
    };
  } else {
    const previous = all.defaultByCatalog[normalizedCatalogId] ?? {};
    all.defaultByCatalog[normalizedCatalogId] = { ...previous, ...nextEntries };
  }

  await writeSettingsValue(stringifyScopedCatalogParameterLinkMap(all));
};
