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
import {
  commitFrontPageSettingSnapshot,
  getFrontPageSelectionRuntimeSnapshot,
  primeFrontPageSettingRuntime,
  setFrontPageSettingFallbackReason,
  startFrontPageSettingRetryCooldown,
  type FrontPageSelectionSource,
} from '@/shared/lib/front-page-selection-runtime';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { Session } from 'next-auth';


const FRONT_PAGE_SETTING_KEY = 'front_page_app';
const FRONT_PAGE_SELECTION_LOG_TTL_MS = 60_000;
export { FRONT_PAGE_ALLOWED };
export { primeFrontPageSettingRuntime };
export type { FrontPageSelectionSource };

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
  return explicit ?? true;
};

const isDevelopmentEnvironment = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env['NODE_ENV'] === 'development';

const frontPageSelectionRecoveryLogCooldownKeys = new Set<string>();
const frontPageSelectionRecoveryLogCooldownTimers = new Map<
  string,
  NodeJS.Timeout
>();

const scheduleFrontPageSelectionRecoveryLogCooldown = (key: string): void => {
  const existingTimer = frontPageSelectionRecoveryLogCooldownTimers.get(key);
  if (existingTimer !== undefined) clearTimeout(existingTimer);

  frontPageSelectionRecoveryLogCooldownKeys.add(key);
  const timer = setTimeout(() => {
    frontPageSelectionRecoveryLogCooldownKeys.delete(key);
    frontPageSelectionRecoveryLogCooldownTimers.delete(key);
  }, FRONT_PAGE_SELECTION_LOG_TTL_MS) as NodeJS.Timeout;

  timer.unref();
  frontPageSelectionRecoveryLogCooldownTimers.set(key, timer);
};

const readPersistedFrontPageFallback = async (
  fallbackReason: string
): Promise<FrontPageSelectableApp | null> => {
  const { lastKnownFrontPageSetting } = getFrontPageSelectionRuntimeSnapshot();
  if (lastKnownFrontPageSetting !== null) {
    setFrontPageSettingFallbackReason(fallbackReason);
    return lastKnownFrontPageSetting;
  }

  const devSnapshot = await readFrontPageDevSnapshot();
  if (devSnapshot === null) {
    setFrontPageSettingFallbackReason(fallbackReason);
    return null;
  }

  const resolvedSnapshot = commitFrontPageSettingSnapshot(devSnapshot, 'dev-snapshot');
  setFrontPageSettingFallbackReason(fallbackReason);
  return resolvedSnapshot;
};

const isAdminSession = isElevatedSession;

export const canPreviewDrafts = async (session: Session | null): Promise<boolean> => {
  if (!isAdminSession(session)) return false;
  const userId = session?.user?.id;
  if (typeof userId !== 'string' || userId === '') return false;
  try {
    const prefs = await getUserPreferences(userId);
    return prefs.cmsPreviewEnabled === true;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'frontend.home-helpers',
      source: 'frontend.home-helpers',
      action: 'canPreviewDrafts',
      userId,
    });
    return false;
  }
};

export const shouldApplyFrontPageAppSelection = (): boolean => {
  const value = (process.env['ENABLE_FRONT_PAGE_APP_REDIRECT'] ?? '').trim().toLowerCase();
  return value !== 'false' && value !== '0';
};

const readBootstrappedFrontPageSetting = async (): Promise<FrontPageSelectableApp | null> => {
  try {
    const liteSettings = await getLiteSettingsForHydration();
    const setting = liteSettings.find((s) => s.key === FRONT_PAGE_SETTING_KEY);
    return setting !== undefined ? commitFrontPageSettingSnapshot(setting.value, 'lite') : null;
  } catch {
    return null;
  }
};

async function lookupMongoFrontPageSetting(): Promise<FrontPageSelectableApp | null> {
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string>>('settings')
      .findOne({ _id: FRONT_PAGE_SETTING_KEY });
    const normalizedSetting = commitFrontPageSettingSnapshot(doc?.value, 'mongo');
    if (normalizedSetting !== null) return normalizedSetting;

    const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
    await logSystemEvent({
      level: 'warn',
      message: 'No "front_page_app" setting found in MongoDB — defaulting to CMS.',
      service: 'frontend.home-helpers',
      source: 'frontend.home-helpers',
    });
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
      startFrontPageSettingRetryCooldown();
      return readPersistedFrontPageFallback('transient-mongo-error');
    }
    await ErrorSystem.captureException(error, {
      service: 'frontend.home-helpers',
      source: 'frontend.home-helpers',
      action: 'readMongoFrontPageSetting',
      settingKey: FRONT_PAGE_SETTING_KEY,
    });
    return readPersistedFrontPageFallback('unexpected-mongo-error');
  }
  return null;
}

const readMongoFrontPageSettingInternal = async (): Promise<FrontPageSelectableApp | null> => {
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri === '' || !shouldReadFrontPageSettingFromStorage()) {
    return readPersistedFrontPageFallback('storage-unavailable');
  }

  if (getFrontPageSelectionRuntimeSnapshot().frontPageSettingRetryBlocked) {
    return readPersistedFrontPageFallback('transient-mongo-cooldown');
  }

  return lookupMongoFrontPageSetting();
};

async function resolveDevSnapshot(): Promise<FrontPageSelectableApp | null> {
  if (!isDevelopmentEnvironment()) return null;
  const devSnapshot = await readFrontPageDevSnapshot();
  return devSnapshot !== null
    ? commitFrontPageSettingSnapshot(devSnapshot, 'dev-snapshot')
    : null;
}

const readMongoFrontPageSettingFull = async (): Promise<FrontPageSelectableApp | null> => {
  const devSnapshot = await resolveDevSnapshot();
  if (devSnapshot !== null) return devSnapshot;

  const bootstrapped = await readBootstrappedFrontPageSetting();
  if (bootstrapped !== null) return bootstrapped;

  return readMongoFrontPageSettingInternal();
};

const readMongoFrontPageSetting = async (): Promise<FrontPageSelectableApp | null> => {
  const snapshot = getFrontPageSelectionRuntimeSnapshot();
  if (
    snapshot.hasResolvedFrontPageSettingSnapshot &&
    (isDevelopmentEnvironment() || snapshot.frontPageSettingSnapshotIsFresh)
  ) {
    return snapshot.lastKnownFrontPageSetting;
  }

  return readMongoFrontPageSettingFull();
};

export const getFrontPageSetting = cache(async (): Promise<string | null> => readMongoFrontPageSetting());

const logFrontPageSelectionRecovery = async (
  resolution: FrontPageSelectionResolution
): Promise<void> => {
  const key = [
    resolution.source,
    resolution.fallbackReason ?? 'none',
    resolution.setting ?? 'null',
    resolution.publicOwner,
  ].join('|');
  if (frontPageSelectionRecoveryLogCooldownKeys.has(key)) return;

  const level = resolution.setting !== null ? 'warn' : 'error';
  const message = resolution.setting !== null
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
  scheduleFrontPageSelectionRecoveryLogCooldown(key);
};

export const resolveFrontPageSelection = async (): Promise<FrontPageSelectionResolution> => {
  if (!shouldApplyFrontPageAppSelection()) {
    return { enabled: false, setting: null, publicOwner: 'cms', redirectPath: null, source: 'disabled', fallbackReason: null };
  }

  const setting = normalizeFrontPageApp(await getFrontPageSetting());
  const snapshot = getFrontPageSelectionRuntimeSnapshot();
  const resolution: FrontPageSelectionResolution = {
    enabled: true,
    setting,
    publicOwner: getFrontPagePublicOwner(setting),
    redirectPath: getFrontPageRedirectPath(setting),
    source: snapshot.lastKnownFrontPageSettingSource,
    fallbackReason: snapshot.lastKnownFrontPageSettingFallbackReason,
  };

  if (resolution.fallbackReason !== null) await logFrontPageSelectionRecovery(resolution);

  return resolution;
};
