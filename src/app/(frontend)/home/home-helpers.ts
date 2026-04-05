import { cache } from 'react';

import { getUserPreferences } from '@/features/auth/server';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { isElevatedSession } from '@/shared/lib/auth/elevated-session-user';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';
import {
  FRONT_PAGE_ALLOWED,
  getFrontPagePublicOwner,
  getFrontPageRedirectPath,
  normalizeFrontPageApp,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';
import { readFrontPageDevSnapshot } from '@/shared/lib/front-page-dev-snapshot';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { Session } from 'next-auth';


const FRONT_PAGE_SETTING_KEY = 'front_page_app';
const FRONT_PAGE_SETTING_CACHE_TTL_MS = 30_000;
const FRONT_PAGE_SETTING_RETRY_COOLDOWN_MS = 30_000;
const FRONT_PAGE_SELECTION_LOG_TTL_MS = 60_000;
export { FRONT_PAGE_ALLOWED };

export type FrontPageSelectionSource =
  | 'disabled'
  | 'dev-snapshot'
  | 'lite'
  | 'mongo'
  | 'runtime'
  | 'none';

export type FrontPageSelectionResolution = {
  enabled: boolean;
  setting: FrontPageSelectableApp | null;
  publicOwner: ReturnType<typeof getFrontPagePublicOwner>;
  redirectPath: string | null;
  source: FrontPageSelectionSource;
  fallbackReason: string | null;
};

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

const isDevelopmentEnvironment = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env['NODE_ENV'] === 'development';

let frontPageSettingRetryBlockedUntil = 0;
let lastKnownFrontPageSetting: FrontPageSelectableApp | null = null;
let lastKnownFrontPageSettingSource: Exclude<FrontPageSelectionSource, 'disabled'> = 'none';
let lastKnownFrontPageSettingFallbackReason: string | null = null;
let hasResolvedFrontPageSettingSnapshot = false;
let frontPageSettingSnapshotReadAt = 0;
let lastLoggedFrontPageSelectionKey: string | null = null;
let lastLoggedFrontPageSelectionAt = 0;

const commitFrontPageSettingSnapshot = (
  value: string | null | undefined,
  source: Exclude<FrontPageSelectionSource, 'disabled'>
): FrontPageSelectableApp | null => {
  const normalizedSetting = normalizeFrontPageApp(value);
  lastKnownFrontPageSetting = normalizedSetting;
  lastKnownFrontPageSettingSource = normalizedSetting ? source : 'none';
  lastKnownFrontPageSettingFallbackReason = null;
  hasResolvedFrontPageSettingSnapshot = true;
  frontPageSettingSnapshotReadAt = Date.now();
  frontPageSettingRetryBlockedUntil = 0;
  return normalizedSetting;
};

const reuseLastKnownFrontPageSetting = (fallbackReason: string): FrontPageSelectableApp | null => {
  lastKnownFrontPageSettingFallbackReason = fallbackReason;
  return lastKnownFrontPageSetting;
};

const readPersistedFrontPageFallback = async (
  fallbackReason: string
): Promise<FrontPageSelectableApp | null> => {
  if (lastKnownFrontPageSetting) {
    return reuseLastKnownFrontPageSetting(fallbackReason);
  }

  const devSnapshot = await readFrontPageDevSnapshot();
  if (!devSnapshot) {
    lastKnownFrontPageSettingFallbackReason = fallbackReason;
    return null;
  }

  const resolvedSnapshot = commitFrontPageSettingSnapshot(devSnapshot, 'dev-snapshot');
  lastKnownFrontPageSettingFallbackReason = fallbackReason;
  return resolvedSnapshot;
};

export const primeFrontPageSettingRuntime = (
  value: string | null | undefined
): FrontPageSelectableApp | null => {
  return commitFrontPageSettingSnapshot(value, 'runtime');
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

const readBootstrappedFrontPageSetting = async (): Promise<FrontPageSelectableApp | null> => {
  try {
    const liteSettings = await getLiteSettingsForHydration();
    const frontPageSetting = liteSettings.find((setting) => setting.key === FRONT_PAGE_SETTING_KEY);
    if (!frontPageSetting) {
      return null;
    }
    return commitFrontPageSettingSnapshot(frontPageSetting.value, 'lite');
  } catch {
    return null;
  }
};

const readDevelopmentFrontPageSettingSnapshot = async (): Promise<FrontPageSelectableApp | null> => {
  if (!isDevelopmentEnvironment()) {
    return null;
  }

  const devSnapshot = await readFrontPageDevSnapshot();
  if (!devSnapshot) {
    return null;
  }

  return commitFrontPageSettingSnapshot(devSnapshot, 'dev-snapshot');
};

const readMongoFrontPageSetting = async (): Promise<string | null> => {
  const now = Date.now();

  if (hasResolvedFrontPageSettingSnapshot && isDevelopmentEnvironment()) {
    return lastKnownFrontPageSetting;
  }

  if (
    hasResolvedFrontPageSettingSnapshot &&
    now - frontPageSettingSnapshotReadAt < FRONT_PAGE_SETTING_CACHE_TTL_MS
  ) {
    return lastKnownFrontPageSetting;
  }

  const developmentSnapshot = await readDevelopmentFrontPageSettingSnapshot();
  if (developmentSnapshot) {
    return developmentSnapshot;
  }

  const bootstrappedSetting = await readBootstrappedFrontPageSetting();
  if (bootstrappedSetting) {
    return bootstrappedSetting;
  }

  if (!process.env['MONGODB_URI'] || !shouldReadFrontPageSettingFromStorage()) {
    return readPersistedFrontPageFallback('storage-unavailable');
  }

  if (now < frontPageSettingRetryBlockedUntil) {
    return readPersistedFrontPageFallback('transient-mongo-cooldown');
  }

  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string>>('settings')
      .findOne({ _id: FRONT_PAGE_SETTING_KEY });
    const normalizedSetting = commitFrontPageSettingSnapshot(doc?.value, 'mongo');
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
      return readPersistedFrontPageFallback('transient-mongo-error');
    }

    void ErrorSystem.captureException(error, {
      service: 'frontend.home-helpers',
      source: 'frontend.home-helpers',
      action: 'readMongoFrontPageSetting',
      settingKey: FRONT_PAGE_SETTING_KEY,
    });

    return readPersistedFrontPageFallback('unexpected-mongo-error');
  }
  return null;
};

export const getFrontPageSetting = cache(async (): Promise<string | null> => {
  return readMongoFrontPageSetting();
});

const logFrontPageSelectionRecovery = async (
  resolution: FrontPageSelectionResolution
): Promise<void> => {
  const key = [
    resolution.source,
    resolution.fallbackReason ?? 'none',
    resolution.setting ?? 'null',
    resolution.publicOwner,
  ].join('|');
  const now = Date.now();

  if (
    lastLoggedFrontPageSelectionKey === key &&
    now - lastLoggedFrontPageSelectionAt < FRONT_PAGE_SELECTION_LOG_TTL_MS
  ) {
    return;
  }

  lastLoggedFrontPageSelectionKey = key;
  lastLoggedFrontPageSelectionAt = now;

  const level = resolution.setting ? 'warn' : 'error';
  const message = resolution.setting
    ? 'Front page selection recovered via fallback path.'
    : 'Front page selection lookup fell back to CMS without a recovered saved owner.';

  const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
  await logSystemEvent({
    level,
    message,
    service: 'frontend.home-helpers',
    source: 'frontend.home-helpers',
    context: {
      settingKey: FRONT_PAGE_SETTING_KEY,
      selectionSource: resolution.source,
      fallbackReason: resolution.fallbackReason,
      setting: resolution.setting,
      publicOwner: resolution.publicOwner,
      redirectPath: resolution.redirectPath,
    },
  });
};

export const resolveFrontPageSelection = async (): Promise<FrontPageSelectionResolution> => {
  if (!shouldApplyFrontPageAppSelection()) {
    return {
      enabled: false,
      setting: null,
      publicOwner: 'cms',
      redirectPath: null,
      source: 'disabled',
      fallbackReason: null,
    };
  }

  const setting = normalizeFrontPageApp(await getFrontPageSetting());

  const resolution: FrontPageSelectionResolution = {
    enabled: true,
    setting,
    publicOwner: getFrontPagePublicOwner(setting),
    redirectPath: getFrontPageRedirectPath(setting),
    source: lastKnownFrontPageSettingSource,
    fallbackReason: lastKnownFrontPageSettingFallbackReason,
  };

  if (resolution.fallbackReason !== null) {
    void logFrontPageSelectionRecovery(resolution);
  }

  return resolution;
};
