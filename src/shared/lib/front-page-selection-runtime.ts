import {
  normalizeFrontPageApp,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';

const FRONT_PAGE_SETTING_CACHE_TTL_MS = 30_000;
const FRONT_PAGE_SETTING_RETRY_COOLDOWN_MS = 30_000;

export type FrontPageSelectionSource =
  | 'disabled'
  | 'dev-snapshot'
  | 'lite'
  | 'mongo'
  | 'runtime'
  | 'none';

export type FrontPageSelectionRuntimeSnapshot = {
  lastKnownFrontPageSetting: FrontPageSelectableApp | null;
  lastKnownFrontPageSettingSource: Exclude<FrontPageSelectionSource, 'disabled'>;
  lastKnownFrontPageSettingFallbackReason: string | null;
  hasResolvedFrontPageSettingSnapshot: boolean;
  frontPageSettingSnapshotIsFresh: boolean;
  frontPageSettingRetryBlocked: boolean;
};

let lastKnownFrontPageSetting: FrontPageSelectableApp | null = null;
let lastKnownFrontPageSettingSource: Exclude<FrontPageSelectionSource, 'disabled'> = 'none';
let lastKnownFrontPageSettingFallbackReason: string | null = null;
let hasResolvedFrontPageSettingSnapshot = false;
let frontPageSettingSnapshotIsFresh = false;
let frontPageSettingSnapshotExpiryTimer: NodeJS.Timeout | null = null;
let frontPageSettingRetryBlocked = false;
let frontPageSettingRetryCooldownTimer: NodeJS.Timeout | null = null;

const isDevelopmentEnvironment = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env['NODE_ENV'] === 'development';

const clearFrontPageSettingSnapshotExpiryTimer = (): void => {
  if (frontPageSettingSnapshotExpiryTimer !== null) {
    clearTimeout(frontPageSettingSnapshotExpiryTimer);
    frontPageSettingSnapshotExpiryTimer = null;
  }
};

const scheduleFrontPageSettingSnapshotExpiry = (): void => {
  clearFrontPageSettingSnapshotExpiryTimer();
  frontPageSettingSnapshotIsFresh = true;

  if (isDevelopmentEnvironment()) return;

  frontPageSettingSnapshotExpiryTimer = setTimeout(() => {
    frontPageSettingSnapshotIsFresh = false;
    frontPageSettingSnapshotExpiryTimer = null;
  }, FRONT_PAGE_SETTING_CACHE_TTL_MS);
  frontPageSettingSnapshotExpiryTimer.unref();
};

const clearFrontPageSettingRetryCooldown = (): void => {
  frontPageSettingRetryBlocked = false;
  if (frontPageSettingRetryCooldownTimer !== null) {
    clearTimeout(frontPageSettingRetryCooldownTimer);
    frontPageSettingRetryCooldownTimer = null;
  }
};

export const startFrontPageSettingRetryCooldown = (): void => {
  clearFrontPageSettingRetryCooldown();
  frontPageSettingRetryBlocked = true;
  frontPageSettingRetryCooldownTimer = setTimeout(() => {
    frontPageSettingRetryBlocked = false;
    frontPageSettingRetryCooldownTimer = null;
  }, FRONT_PAGE_SETTING_RETRY_COOLDOWN_MS);
  frontPageSettingRetryCooldownTimer.unref();
};

export const commitFrontPageSettingSnapshot = (
  value: string | null | undefined,
  source: Exclude<FrontPageSelectionSource, 'disabled'>
): FrontPageSelectableApp | null => {
  const normalizedSetting = normalizeFrontPageApp(value);
  lastKnownFrontPageSetting = normalizedSetting;
  lastKnownFrontPageSettingSource = normalizedSetting !== null ? source : 'none';
  lastKnownFrontPageSettingFallbackReason = null;
  hasResolvedFrontPageSettingSnapshot = true;
  scheduleFrontPageSettingSnapshotExpiry();
  clearFrontPageSettingRetryCooldown();
  return normalizedSetting;
};

export const primeFrontPageSettingRuntime = (
  value: string | null | undefined
): FrontPageSelectableApp | null => commitFrontPageSettingSnapshot(value, 'runtime');

export const setFrontPageSettingFallbackReason = (reason: string | null): void => {
  lastKnownFrontPageSettingFallbackReason = reason;
};

export const getFrontPageSelectionRuntimeSnapshot = (): FrontPageSelectionRuntimeSnapshot => ({
  lastKnownFrontPageSetting,
  lastKnownFrontPageSettingSource,
  lastKnownFrontPageSettingFallbackReason,
  hasResolvedFrontPageSettingSnapshot,
  frontPageSettingSnapshotIsFresh,
  frontPageSettingRetryBlocked,
});

