import 'server-only';

import type { PlaywrightConnectionSettingsOverridesInput } from '@/features/playwright/server/connection-runtime';

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
  const overrides: PlaywrightConnectionSettingsOverridesInput = {
    ...settings,
    ...resolveVisibilityOverrides(options.forceVisible),
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
    clickDelayMin: resolveNumericSetting({ value: settings['clickDelayMin'], fallback: 80 }),
    clickDelayMax: resolveNumericSetting({ value: settings['clickDelayMax'], fallback: 220 }),
    inputDelayMin: resolveNumericSetting({ value: settings['inputDelayMin'], fallback: 50 }),
    inputDelayMax: resolveNumericSetting({ value: settings['inputDelayMax'], fallback: 160 }),
    actionDelayMin: resolveNumericSetting({ value: settings['actionDelayMin'], fallback: 250 }),
    actionDelayMax: resolveNumericSetting({ value: settings['actionDelayMax'], fallback: 900 }),
  };

  return overrides;
};
