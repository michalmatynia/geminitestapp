import type { PlaywrightPersona, PlaywrightSettings } from '@/shared/contracts/playwright';
import type {
  ProductScannerCaptchaBehavior,
  ProductScannerPlaywrightBrowser,
  ProductScannerSettings,
} from '@/shared/contracts/products/scanner-settings';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import {
  DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER,
  buildIntegrationConnectionPlaywrightSettings,
  normalizeIntegrationConnectionPlaywrightPersonaId,
  resolveIntegrationPlaywrightPersonaSettings,
  type IntegrationConnectionPlaywrightBrowser,
} from '@/features/integrations/public';

export const PRODUCT_SCANNER_SETTINGS_KEY = 'product_scanner_settings_v1';
export const PRODUCT_SCANNER_SETTINGS_HREF = '/admin/settings/scanner';
export const DEFAULT_PRODUCT_SCANNER_CAPTCHA_BEHAVIOR = 'auto_show_browser' as const;
export const DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS = 240_000;

export type ProductScannerSettingsDraft = {
  playwrightPersonaId: string | null;
  playwrightBrowser: ProductScannerPlaywrightBrowser;
  captchaBehavior: ProductScannerCaptchaBehavior;
  manualVerificationTimeoutMs: number;
  playwrightSettings: PlaywrightSettings;
};

type PersonaSettingsSource = ReadonlyArray<Pick<PlaywrightPersona, 'id' | 'settings'>>;

const BOOLEAN_PLAYWRIGHT_SETTING_KEYS = [
  'headless',
  'humanizeMouse',
  'proxyEnabled',
  'emulateDevice',
] as const satisfies ReadonlyArray<keyof PlaywrightSettings>;

const NUMBER_PLAYWRIGHT_SETTING_KEYS = [
  'slowMo',
  'timeout',
  'navigationTimeout',
  'mouseJitter',
  'clickDelayMin',
  'clickDelayMax',
  'inputDelayMin',
  'inputDelayMax',
  'actionDelayMin',
  'actionDelayMax',
] as const satisfies ReadonlyArray<keyof PlaywrightSettings>;

const STRING_PLAYWRIGHT_SETTING_KEYS = [
  'proxyServer',
  'proxyUsername',
  'proxyPassword',
  'deviceName',
] as const satisfies ReadonlyArray<keyof PlaywrightSettings>;

export const PRODUCT_SCANNER_BROWSER_OPTIONS: ReadonlyArray<{
  value: ProductScannerPlaywrightBrowser;
  label: string;
}> = [
  { value: 'auto', label: 'Auto (Brave -> Chrome -> Chromium)' },
  { value: 'brave', label: 'Brave' },
  { value: 'chrome', label: 'Chrome' },
  { value: 'chromium', label: 'Chromium (bundled)' },
];

export const PRODUCT_SCANNER_CAPTCHA_BEHAVIOR_OPTIONS: ReadonlyArray<{
  value: ProductScannerCaptchaBehavior;
  label: string;
}> = [
  { value: 'auto_show_browser', label: 'Show browser and continue' },
  { value: 'fail', label: 'Fail scan on captcha' },
];

export const createDefaultProductScannerSettings = (): ProductScannerSettings => ({
  playwrightPersonaId: null,
  playwrightBrowser: DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER,
  captchaBehavior: DEFAULT_PRODUCT_SCANNER_CAPTCHA_BEHAVIOR,
  manualVerificationTimeoutMs: DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
  playwrightSettingsOverrides: {},
});

const normalizeProductScannerBrowser = (
  value: unknown
): IntegrationConnectionPlaywrightBrowser => {
  return value === 'auto' ||
    value === 'brave' ||
    value === 'chrome' ||
    value === 'chromium'
    ? value
    : DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER;
};

const normalizeProductScannerCaptchaBehavior = (
  value: unknown
): ProductScannerCaptchaBehavior =>
  value === 'fail' ? 'fail' : DEFAULT_PRODUCT_SCANNER_CAPTCHA_BEHAVIOR;

const normalizeProductScannerManualVerificationTimeoutMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS;
  }

  return Math.min(normalized, 900_000);
};

const normalizeProductScannerSettingsOverrides = (
  value: unknown
): Partial<PlaywrightSettings> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const normalized: Partial<PlaywrightSettings> = {};

  for (const key of BOOLEAN_PLAYWRIGHT_SETTING_KEYS) {
    if (typeof record[key] === 'boolean') {
      normalized[key] = record[key];
    }
  }

  for (const key of NUMBER_PLAYWRIGHT_SETTING_KEYS) {
    if (typeof record[key] === 'number' && Number.isFinite(record[key])) {
      normalized[key] = record[key];
    }
  }

  for (const key of STRING_PLAYWRIGHT_SETTING_KEYS) {
    if (typeof record[key] === 'string') {
      normalized[key] = record[key];
    }
  }

  return normalized;
};

export const normalizeProductScannerSettings = (
  value: unknown
): ProductScannerSettings => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultProductScannerSettings();
  }

  const record = value as Record<string, unknown>;
  const normalizedOverrides = normalizeProductScannerSettingsOverrides(
    record['playwrightSettingsOverrides']
  );
  const normalizedLegacySettings = normalizeProductScannerSettingsOverrides(
    record['playwrightSettings']
  );

  return {
    playwrightPersonaId: normalizeIntegrationConnectionPlaywrightPersonaId(
      record['playwrightPersonaId'] as string | null | undefined
    ),
    playwrightBrowser: normalizeProductScannerBrowser(record['playwrightBrowser']),
    captchaBehavior: normalizeProductScannerCaptchaBehavior(record['captchaBehavior']),
    manualVerificationTimeoutMs: normalizeProductScannerManualVerificationTimeoutMs(
      record['manualVerificationTimeoutMs']
    ),
    playwrightSettingsOverrides:
      Object.keys(normalizedOverrides).length > 0
        ? normalizedOverrides
        : normalizedLegacySettings,
  };
};

export const parseProductScannerSettings = (
  raw: string | null | undefined
): ProductScannerSettings =>
  normalizeProductScannerSettings(parseJsonSetting<unknown>(raw, null));

export const serializeProductScannerSettings = (
  settings: ProductScannerSettings
): string => serializeSetting(normalizeProductScannerSettings(settings));

export const resolveProductScannerSettingsBaseline = (
  personas: PersonaSettingsSource | null | undefined,
  personaId: string | null | undefined
): PlaywrightSettings =>
  buildIntegrationConnectionPlaywrightSettings(
    resolveIntegrationPlaywrightPersonaSettings(personas, personaId)
  );

export const buildProductScannerSettingsDraft = (
  settings: ProductScannerSettings,
  personas: PersonaSettingsSource | null | undefined
): ProductScannerSettingsDraft => {
  const baseline = resolveProductScannerSettingsBaseline(
    personas,
    settings.playwrightPersonaId
  );

  return {
    playwrightPersonaId: settings.playwrightPersonaId,
    playwrightBrowser: settings.playwrightBrowser,
    captchaBehavior: settings.captchaBehavior,
    manualVerificationTimeoutMs: settings.manualVerificationTimeoutMs,
    playwrightSettings: {
      ...baseline,
      ...settings.playwrightSettingsOverrides,
    },
  };
};

const buildPlaywrightSettingsOverrides = (
  baseline: PlaywrightSettings,
  next: PlaywrightSettings
): Partial<PlaywrightSettings> => {
  const overrides: Partial<PlaywrightSettings> = {};

  for (const key of BOOLEAN_PLAYWRIGHT_SETTING_KEYS) {
    if (next[key] !== baseline[key]) {
      overrides[key] = next[key];
    }
  }

  for (const key of NUMBER_PLAYWRIGHT_SETTING_KEYS) {
    if (next[key] !== baseline[key]) {
      overrides[key] = next[key];
    }
  }

  for (const key of STRING_PLAYWRIGHT_SETTING_KEYS) {
    if (next[key] !== baseline[key]) {
      overrides[key] = next[key];
    }
  }

  return overrides;
};

export const buildPersistedProductScannerSettings = (
  draft: ProductScannerSettingsDraft,
  personas: PersonaSettingsSource | null | undefined
): ProductScannerSettings => {
  const baseline = resolveProductScannerSettingsBaseline(personas, draft.playwrightPersonaId);

  return {
    playwrightPersonaId: normalizeIntegrationConnectionPlaywrightPersonaId(
      draft.playwrightPersonaId
    ),
    playwrightBrowser: normalizeProductScannerBrowser(draft.playwrightBrowser),
    captchaBehavior: normalizeProductScannerCaptchaBehavior(draft.captchaBehavior),
    manualVerificationTimeoutMs: normalizeProductScannerManualVerificationTimeoutMs(
      draft.manualVerificationTimeoutMs
    ),
    playwrightSettingsOverrides: buildPlaywrightSettingsOverrides(
      baseline,
      buildIntegrationConnectionPlaywrightSettings(draft.playwrightSettings)
    ),
  };
};
