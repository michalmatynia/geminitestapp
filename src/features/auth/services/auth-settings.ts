import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import {
  DEFAULT_AUTH_USER_PAGE_SETTINGS,
  type AuthUserPageSettings,
} from '@/features/auth/utils/auth-user-pages';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { MongoSettingRecord } from '@/shared/types/core/base-types';
import { parseJsonSetting } from '@/shared/utils/settings-json';

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
    .collection<MongoSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  if (process.env['MONGODB_URI']) {
    return readMongoSetting(key);
  }
  return readPrismaSetting(key);
};

export const getAuthUserPageSettings = async (): Promise<AuthUserPageSettings> => {
  const stored = await readSettingValue(AUTH_SETTINGS_KEYS.userPages);
  if (!stored) return DEFAULT_AUTH_USER_PAGE_SETTINGS;
  return parseJsonSetting<AuthUserPageSettings>(
    stored,
    DEFAULT_AUTH_USER_PAGE_SETTINGS
  );
};
