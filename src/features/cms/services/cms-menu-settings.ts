import 'server-only';

import { ObjectId } from 'mongodb';

import { isDomainZoningEnabled } from '@/features/cms/services/cms-domain';
import {
  CMS_MENU_SETTINGS_KEY,
  DEFAULT_MENU_SETTINGS,
  getCmsMenuSettingsKey,
  normalizeMenuSettings,
  type MenuSettings,
} from '@/features/cms/types/menu-settings';
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

export const getCmsMenuSettings = async (domainId?: string | null): Promise<MenuSettings> => {
  const zoningEnabled = await isDomainZoningEnabled();
  const scopedKey = getCmsMenuSettingsKey(zoningEnabled ? domainId ?? null : null);
  const stored = await readSettingValue(scopedKey);
  const parsed = parseJsonSetting<Partial<MenuSettings> | null>(stored, null);
  if (stored) {
    return normalizeMenuSettings(parsed);
  }
  if (scopedKey !== CMS_MENU_SETTINGS_KEY) {
    const fallback = await readSettingValue(CMS_MENU_SETTINGS_KEY);
    const fallbackParsed = parseJsonSetting<Partial<MenuSettings> | null>(fallback, null);
    if (fallback) {
      return normalizeMenuSettings(fallbackParsed);
    }
  }
  return DEFAULT_MENU_SETTINGS;
};
