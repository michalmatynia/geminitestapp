import { getUserPreferences } from '@/features/auth/server';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { Session } from 'next-auth';

const FRONT_PAGE_SETTING_KEY = 'front_page_app';
export const FRONT_PAGE_ALLOWED = new Set(['cms', 'products', 'kangur', 'chatbot', 'notes']);

const isAdminSession = (session: Session | null): boolean => {
  if (!session?.user) return false;
  const user = session.user as Session['user'] & {
    isElevated?: boolean;
    role?: string | null;
  };
  if (user.isElevated) return true;
  const role = user.role ?? '';
  return ['admin', 'super_admin', 'superuser'].includes(role);
};

export const canPreviewDrafts = async (session: Session | null): Promise<boolean> => {
  if (!isAdminSession(session)) return false;
  const userId = session?.user?.id;
  if (!userId) return false;
  try {
    const prefs = await getUserPreferences(userId);
    return prefs.cmsPreviewEnabled === true;
  } catch {
    return false;
  }
};

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

export const shouldUseFrontPageAppRedirect = (): boolean =>
  process.env['ENABLE_FRONT_PAGE_APP_REDIRECT'] === 'true';

const readMongoFrontPageSetting = async (): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string>>('settings')
      .findOne({ _id: FRONT_PAGE_SETTING_KEY });
    if (doc?.value) return doc.value;
  } catch {
    // Mongo unavailable — ignore.
  }
  return null;
};

const readPrismaFrontPageSetting = async (): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: FRONT_PAGE_SETTING_KEY },
      select: { value: true },
    });
    if (setting?.value) return setting.value;
  } catch {
    // Prisma unavailable — ignore.
  }
  return null;
};

export const getFrontPageSetting = async (): Promise<string | null> => {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    const mongoValue = await readMongoFrontPageSetting();
    if (mongoValue) return mongoValue;
    return readPrismaFrontPageSetting();
  }

  const prismaValue = await readPrismaFrontPageSetting();
  if (prismaValue) return prismaValue;
  return readMongoFrontPageSetting();
};
