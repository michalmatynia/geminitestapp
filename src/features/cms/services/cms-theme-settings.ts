import 'server-only';

import { ObjectId } from 'mongodb';

import {
  CMS_THEME_SETTINGS_KEY,
  normalizeThemeSettings,
  type ThemeSettings,
} from '@/shared/contracts/cms/theme-settings';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { parseJsonSetting } from '@/shared/utils/settings-json';

type SettingRecord = { _id?: string | ObjectId; key?: string; value?: string };

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch {
    return null;
  }
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingRecord>('settings')
    .findOne({ $or: [{ _id: toMongoId(key) }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    return readMongoSetting(key);
  }
  return readPrismaSetting(key);
};

export const getCmsThemeSettings = async (): Promise<ThemeSettings> => {
  const stored = await readSettingValue(CMS_THEME_SETTINGS_KEY);
  const parsed = parseJsonSetting<Partial<ThemeSettings> | null>(stored, null);
  return normalizeThemeSettings(parsed);
};
