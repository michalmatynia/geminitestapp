import 'server-only';

import type { PlaywrightConnectionSettingsOverridesInput } from '@/features/playwright/server/connection-runtime';
import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/playwright/server/connection-settings-shared';

import { normalizeErrorMessage, readOptionalString } from './product-scans-service.helpers';

export const SCANNER_1688_MISSING_PROFILE_MESSAGE =
  'No 1688 browser profile is configured. Create or select a 1688 connection before scanning.';
export const SCANNER_1688_MANUAL_VERIFICATION_MESSAGE =
  '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';
export const SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE =
  'No local product image file available for 1688 supplier reverse image scan.';
export const SCANNER_1688_UNUSABLE_IMAGE_INPUT_PATTERN =
  /Product image candidate did not include a usable filepath or URL for 1688 scanning/i;
export const SCANNER_1688_DEFAULT_LOCALE = 'zh-CN';
export const SCANNER_1688_DEFAULT_TIMEZONE_ID = 'Asia/Shanghai';
export const SCANNER_1688_DEFAULT_SLOW_MO_MS = 140;

type NumericSettingArgs = {
  value: unknown;
  fallback: number;
  minimum?: number;
  minimumInclusive?: boolean;
};

const resolveVisibilityOverrides = (
  forceVisible: boolean
): Partial<PlaywrightConnectionSettingsOverridesInput> =>
  forceVisible ? { headless: false } : {};

const resolveNumericSetting = (args: NumericSettingArgs): number => {
  if (typeof args.value !== 'number' || !Number.isFinite(args.value)) return args.fallback;
  const minimum = args.minimum ?? Number.NEGATIVE_INFINITY;
  if (args.minimumInclusive === true) {
    return args.value >= minimum ? args.value : args.fallback;
  }
  return args.value > minimum ? args.value : args.fallback;
};

const resolveBooleanSetting = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const resolveBrowserSetting = (
  value: unknown
): PlaywrightConnectionSettingsOverridesInput['browser'] => {
  if (value === 'auto' || value === 'brave' || value === 'chrome' || value === 'chromium') {
    return value;
  }
  return 'auto';
};

const resolveIdentityProfileSetting = (
  value: unknown
): PlaywrightConnectionSettingsOverridesInput['identityProfile'] => {
  if (value === 'search' || value === 'marketplace') return value;
  return defaultIntegrationConnectionPlaywrightSettings.identityProfile;
};

const resolveProxySessionModeSetting = (
  value: unknown
): PlaywrightConnectionSettingsOverridesInput['proxySessionMode'] => {
  if (value === 'rotate') return value;
  return defaultIntegrationConnectionPlaywrightSettings.proxySessionMode;
};

const resolveProxyProviderPresetSetting = (
  value: unknown
): PlaywrightConnectionSettingsOverridesInput['proxyProviderPreset'] => {
  if (value === 'brightdata' || value === 'oxylabs' || value === 'decodo') return value;
  return defaultIntegrationConnectionPlaywrightSettings.proxyProviderPreset;
};

const resolveStringSetting = (value: unknown, fallback: string): string =>
  readOptionalString(value) ?? fallback;

export const resolve1688ManualVerificationMessage = (
  value: unknown,
  fallback?: unknown
): string => {
  const normalized =
    readOptionalString(value) ??
    readOptionalString(fallback) ??
    SCANNER_1688_MANUAL_VERIFICATION_MESSAGE;
  if (/continue automatically/i.test(normalized)) return normalized;
  if (/requested login/i.test(normalized)) return normalized;
  return SCANNER_1688_MANUAL_VERIFICATION_MESSAGE;
};

export const normalize1688ScanFailureMessage = (value: unknown, fallback: string): string => {
  const normalized = normalizeErrorMessage(value, fallback);
  return SCANNER_1688_UNUSABLE_IMAGE_INPUT_PATTERN.test(normalized)
    ? SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE
    : normalized;
};

export const resolve1688ConnectionEngineSettings = (
  settings: Record<string, unknown>,
  options: { forceVisible: boolean }
): PlaywrightConnectionSettingsOverridesInput => {
  const defaults = defaultIntegrationConnectionPlaywrightSettings;
  const overrides: PlaywrightConnectionSettingsOverridesInput = {
    browser: resolveBrowserSetting(settings['browser']),
    identityProfile: resolveIdentityProfileSetting(settings['identityProfile']),
    headless: resolveBooleanSetting(settings['headless'], defaults.headless),
    locale: readOptionalString(settings['locale']) ?? SCANNER_1688_DEFAULT_LOCALE,
    timezoneId: readOptionalString(settings['timezoneId']) ?? SCANNER_1688_DEFAULT_TIMEZONE_ID,
    humanizeMouse: resolveBooleanSetting(settings['humanizeMouse'], true),
    mouseJitter: resolveNumericSetting({
      value: settings['mouseJitter'],
      fallback: 5,
      minimum: 0,
      minimumInclusive: true,
    }),
    slowMo: resolveNumericSetting({
      value: settings['slowMo'],
      fallback: SCANNER_1688_DEFAULT_SLOW_MO_MS,
      minimum: 0,
    }),
    timeout: resolveNumericSetting({
      value: settings['timeout'],
      fallback: defaults.timeout,
      minimum: 1000,
      minimumInclusive: true,
    }),
    navigationTimeout: resolveNumericSetting({
      value: settings['navigationTimeout'],
      fallback: defaults.navigationTimeout,
      minimum: 1000,
      minimumInclusive: true,
    }),
    clickDelayMin: resolveNumericSetting({ value: settings['clickDelayMin'], fallback: 80 }),
    clickDelayMax: resolveNumericSetting({ value: settings['clickDelayMax'], fallback: 220 }),
    inputDelayMin: resolveNumericSetting({ value: settings['inputDelayMin'], fallback: 50 }),
    inputDelayMax: resolveNumericSetting({ value: settings['inputDelayMax'], fallback: 160 }),
    actionDelayMin: resolveNumericSetting({ value: settings['actionDelayMin'], fallback: 250 }),
    actionDelayMax: resolveNumericSetting({ value: settings['actionDelayMax'], fallback: 900 }),
    proxyEnabled: resolveBooleanSetting(settings['proxyEnabled'], defaults.proxyEnabled),
    proxyServer: resolveStringSetting(settings['proxyServer'], defaults.proxyServer ?? ''),
    proxyUsername: resolveStringSetting(settings['proxyUsername'], defaults.proxyUsername ?? ''),
    proxyPassword: resolveStringSetting(settings['proxyPassword'], defaults.proxyPassword ?? ''),
    proxySessionAffinity: resolveBooleanSetting(
      settings['proxySessionAffinity'],
      defaults.proxySessionAffinity
    ),
    proxySessionMode: resolveProxySessionModeSetting(settings['proxySessionMode']),
    proxyProviderPreset: resolveProxyProviderPresetSetting(settings['proxyProviderPreset']),
    emulateDevice: resolveBooleanSetting(settings['emulateDevice'], defaults.emulateDevice),
    deviceName: resolveStringSetting(settings['deviceName'], defaults.deviceName ?? 'Desktop Chrome'),
    ...resolveVisibilityOverrides(options.forceVisible),
  };

  return overrides;
};
