import 'server-only';

import { ObjectId } from 'mongodb';
import { cache } from 'react';

import {
  CMS_DOMAIN_SETTINGS_KEY,
  normalizeCmsDomainSettings,
  type CmsDomainSettings,
} from '@/shared/contracts/cms';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting } from '@/shared/utils/settings-json';

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord<string | ObjectId>>('settings')
    .findOne({ $or: [{ _id: toMongoId(key) }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => readMongoSetting(key);

export const getCmsDomainSettings = cache(async (): Promise<CmsDomainSettings> => {
  const stored = await readSettingValue(CMS_DOMAIN_SETTINGS_KEY);
  const parsed = parseJsonSetting<Partial<CmsDomainSettings> | null>(stored, null);
  return normalizeCmsDomainSettings(parsed);
});
