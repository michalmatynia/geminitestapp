import { cache } from 'react';

import { getUserPreferences } from '@/features/auth/server';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { isElevatedSession } from '@/shared/lib/auth/elevated-session-user';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';
import {
  FRONT_PAGE_ALLOWED,
  normalizeFrontPageApp,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { Session } from 'next-auth';


const FRONT_PAGE_SETTING_KEY = 'front_page_app';
const FRONT_PAGE_SETTING_CACHE_TTL_MS = 30_000;
const FRONT_PAGE_SETTING_RETRY_COOLDOWN_MS = 30_000;
export { FRONT_PAGE_ALLOWED };

const parseEnvBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
};

const shouldReadFrontPageSettingFromStorage = (
  env: NodeJS.ProcessEnv = process.env
): boolean => {
  const explicit = parseEnvBoolean(env['ENABLE_DEV_FRONT_PAGE_SETTING_LOOKUP']);
  if (explicit !== null) {
    return explicit;
  }

  return true;
};

let frontPageSettingRetryBlockedUntil = 0;
let lastKnownFrontPageSetting: FrontPageSelectableApp | null = null;
let hasResolvedFrontPageSettingSnapshot = false;
let frontPageSettingSnapshotReadAt = 0;

const commitFrontPageSettingSnapshot = (
  value: string | null | undefined
): FrontPageSelectableApp | null => {
  const normalizedSetting = normalizeFrontPageApp(value);
  lastKnownFrontPageSetting = normalizedSetting;
  hasResolvedFrontPageSettingSnapshot = true;
  frontPageSettingSnapshotReadAt = Date.now();
  frontPageSettingRetryBlockedUntil = 0;
  return normalizedSetting;
};

export const primeFrontPageSettingRuntime = (
  value: string | null | undefined
): FrontPageSelectableApp | null => {
  return commitFrontPageSettingSnapshot(value);
};

const isAdminSession = isElevatedSession;

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

const readMongoFrontPageSetting = async (): Promise<string | null> => {
  if (!process.env['MONGODB_URI'] || !shouldReadFrontPageSettingFromStorage()) {
    return lastKnownFrontPageSetting;
  }
  const now = Date.now();

  if (
    hasResolvedFrontPageSettingSnapshot &&
    now - frontPageSettingSnapshotReadAt < FRONT_PAGE_SETTING_CACHE_TTL_MS
  ) {
    return lastKnownFrontPageSetting;
  }

  if (now < frontPageSettingRetryBlockedUntil) return lastKnownFrontPageSetting;

  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string>>('settings')
      .findOne({ _id: FRONT_PAGE_SETTING_KEY });
    const normalizedSetting = commitFrontPageSettingSnapshot(doc?.value);
    if (normalizedSetting) {
      return normalizedSetting;
    }
    void import('@/shared/lib/observability/system-logger').then(({ logSystemEvent }) =>
      logSystemEvent({
        level: 'warn',
        message:
          'No "front_page_app" setting found in MongoDB — defaulting to CMS. Set the setting via Admin Settings to change the front page app.',
        service: 'frontend.home-helpers',
        source: 'frontend.home-helpers',
      })
    );
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
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
