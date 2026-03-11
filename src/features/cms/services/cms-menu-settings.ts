import 'server-only';

import { ObjectId } from 'mongodb';

import {
  DEFAULT_MENU_SETTINGS,
  getCmsMenuSettingsKey,
  normalizeMenuSettings,
  type MenuSettings,
} from '@/shared/contracts/cms-menu';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { isDomainZoningEnabled } from './cms-domain';

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

export const getCmsMenuSettings = async (domainId?: string | null): Promise<MenuSettings> => {
  const zoningEnabled = await isDomainZoningEnabled();
  const scopedKey = getCmsMenuSettingsKey(zoningEnabled ? (domainId ?? null) : null);
  const stored = await readSettingValue(scopedKey);
  if (!stored) return DEFAULT_MENU_SETTINGS;
  const parsed = parseJsonSetting<unknown>(stored, null);
  return normalizeMenuSettings(parsed);
};
