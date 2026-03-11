import { getUserPreferences } from '@/features/auth/server';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { FRONT_PAGE_ALLOWED } from '@/shared/lib/front-page-app';

import type { Session } from 'next-auth';

const FRONT_PAGE_SETTING_KEY = 'front_page_app';
export { FRONT_PAGE_ALLOWED };

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

export const shouldApplyFrontPageAppSelection = (): boolean => {
  const value = process.env['ENABLE_FRONT_PAGE_APP_REDIRECT']?.trim().toLowerCase();
  return value !== 'false' && value !== '0';
};

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

export const getFrontPageSetting = async (): Promise<string | null> => {
  return readMongoFrontPageSetting();
};
