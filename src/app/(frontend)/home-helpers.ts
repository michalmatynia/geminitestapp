import { cache } from 'react';

import { getUserPreferences } from '@/features/auth/server';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  FRONT_PAGE_ALLOWED,
  normalizeFrontPageApp,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { Session } from 'next-auth';


const FRONT_PAGE_SETTING_KEY = 'front_page_app';
const FRONT_PAGE_SETTING_RETRY_COOLDOWN_MS = 30_000;
export { FRONT_PAGE_ALLOWED };

let frontPageSettingRetryBlockedUntil = 0;
let lastKnownFrontPageSetting: FrontPageSelectableApp | null = null;

export const primeFrontPageSettingRuntime = (
  value: string | null | undefined
): FrontPageSelectableApp | null => {
  const normalizedSetting = normalizeFrontPageApp(value);
  lastKnownFrontPageSetting = normalizedSetting;
  frontPageSettingRetryBlockedUntil = 0;
  return normalizedSetting;
};

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
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'frontend.home-helpers',
      source: 'frontend.home-helpers',
      action: 'canPreviewDrafts',
      userId,
    });
    return false;
  }
};

export const shouldApplyFrontPageAppSelection = (): boolean => {
  const value = process.env['ENABLE_FRONT_PAGE_APP_REDIRECT']?.trim().toLowerCase();
  return value !== 'false' && value !== '0';
};

const isTransientMongoFrontPageReadError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const constructorName = error.constructor?.name ?? '';
  const normalized = `${constructorName} ${error.name} ${error.message}`.toLowerCase();

  return (
    constructorName === 'MongoServerSelectionError' ||
    constructorName === 'MongoNetworkError' ||
    constructorName === 'MongoTopologyClosedError' ||
    constructorName === 'MongoServerClosedError' ||
    normalized.includes('server selection') ||
    normalized.includes('topology closed') ||
    normalized.includes('econn') ||
    normalized.includes('connection refused') ||
    normalized.includes('connection closed') ||
    (normalized.includes('connection') && normalized.includes('timed out'))
  );
};

const readMongoFrontPageSetting = async (): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return lastKnownFrontPageSetting;
  if (Date.now() < frontPageSettingRetryBlockedUntil) return lastKnownFrontPageSetting;

  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string>>('settings')
      .findOne({ _id: FRONT_PAGE_SETTING_KEY });
    const normalizedSetting = primeFrontPageSettingRuntime(doc?.value);
    if (normalizedSetting) {
      return normalizedSetting;
    }
    console.warn(
      '[home-helpers] No "front_page_app" setting found in MongoDB — defaulting to CMS. ' +
        'Set the setting via Admin Settings to change the front page app.'
    );
  } catch (error) {
    if (isTransientMongoFrontPageReadError(error)) {
      frontPageSettingRetryBlockedUntil = Date.now() + FRONT_PAGE_SETTING_RETRY_COOLDOWN_MS;
      return lastKnownFrontPageSetting;
    }

    void ErrorSystem.captureException(error, {
      service: 'frontend.home-helpers',
      source: 'frontend.home-helpers',
      action: 'readMongoFrontPageSetting',
      settingKey: FRONT_PAGE_SETTING_KEY,
    });

    return lastKnownFrontPageSetting;
  }
  return null;
};

export const getFrontPageSetting = cache(async (): Promise<string | null> => {
  return readMongoFrontPageSetting();
});
