import 'server-only';

import { ObjectId } from 'mongodb';
import { cache } from 'react';

import {
  CMS_THEME_SETTINGS_KEY,
  normalizeThemeSettings,
  type ThemeSettings,
} from '@/shared/contracts/cms-theme';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string | ObjectId>>('settings')
      .findOne({ $or: [{ _id: toMongoId(key) }, { key }] });
    return typeof doc?.value === 'string' ? doc.value : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const readSettingValue = async (key: string): Promise<string | null> => readMongoSetting(key);

export const getCmsThemeSettings = cache(async (): Promise<ThemeSettings> => {
  const stored = await readSettingValue(CMS_THEME_SETTINGS_KEY);
  const parsed = parseJsonSetting<Partial<ThemeSettings> | null>(stored, null);
  return normalizeThemeSettings(parsed);
});
