import 'server-only';

import { decryptSecret } from '@/features/integrations/server';
import { playwrightStorageStateSchema } from '@/shared/contracts/integrations/session-testing';
import { type IntegrationConnectionRecord, type PlaywrightStorageState } from '@/shared/contracts/integrations';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import {
  defaultIntegrationConnectionPlaywrightSettings,
  extractIntegrationConnectionPlaywrightSettingsOverrides,
  normalizeIntegrationConnectionPlaywrightPersonaId,
  resolveIntegrationConnectionPlaywrightBrowserOverride,
} from '@/features/integrations/utils/playwright-connection-settings';

import type { BrowserContextOptions } from 'playwright';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export type PersistedStorageState = NonNullable<
  Exclude<BrowserContextOptions['storageState'], string>
>;

const tryParsePersistedStorageState = (raw: string): PersistedStorageState | null => {
  try {
    const parsed = playwrightStorageStateSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return normalizeStorageState(parsed.data);
  } catch {
    return null;
  }
  return null;
};

const toPlaywrightSameSite = (
  value: PlaywrightStorageState['cookies'][number]['sameSite']
): PersistedStorageState['cookies'][number]['sameSite'] => {
  switch (value) {
    case 'none':
      return 'None';
    case 'strict':
      return 'Strict';
    default:
      return 'Lax';
  }
};

const normalizeStorageStateCookie = (
  cookie: PlaywrightStorageState['cookies'][number]
): PersistedStorageState['cookies'][number] => {
  const {
    domain = '',
    path = '/',
    expires = -1,
    httpOnly = false,
    secure = false,
  } = cookie;

  return {
    name: cookie.name,
    value: cookie.value,
    domain,
    path,
    expires,
    httpOnly,
    secure,
    sameSite: toPlaywrightSameSite(cookie.sameSite),
  };
};

const normalizeStorageStateOrigin = (
  origin: PlaywrightStorageState['origins'][number]
): PersistedStorageState['origins'][number] => ({
  origin: origin.origin,
  localStorage: origin.localStorage.map((entry) => ({
    name: entry.name,
    value: entry.value,
  })),
});

const normalizeStorageState = (state: PlaywrightStorageState): PersistedStorageState => ({
  cookies: state.cookies.map(normalizeStorageStateCookie),
  origins: state.origins.map(normalizeStorageStateOrigin),
});

export type TraderaPlaywrightRuntimeSettings = {
  browser: 'auto' | 'brave' | 'chrome' | 'chromium';
  headless: boolean;
  slowMo: number;
  timeout: number;
  navigationTimeout: number;
  humanizeMouse: boolean;
  mouseJitter: number;
  clickDelayMin: number;
  clickDelayMax: number;
  inputDelayMin: number;
  inputDelayMax: number;
  actionDelayMin: number;
  actionDelayMax: number;
  proxyEnabled: boolean;
  proxyServer: string;
  proxyUsername: string;
  proxyPassword: string;
  emulateDevice: boolean;
  deviceName: string;
};

export type ResolvedConnectionPlaywrightSettingsProfile = {
  settings: TraderaPlaywrightRuntimeSettings;
  hasExplicitHeadlessPreference: boolean;
  hasExplicitBrowserPreference: boolean;
};

export const parsePersistedStorageState = (
  encryptedValue: string | null | undefined
): PersistedStorageState | null => {
  if (!encryptedValue) return null;
  let decryptError: unknown = null;
  try {
    const raw = decryptSecret(encryptedValue);
    const parsed = tryParsePersistedStorageState(raw);
    if (parsed) return parsed;
  } catch (error) {
    decryptError = error;
  }

  // Backward compatibility for sessions that were accidentally stored as plain JSON.
  const plaintextParsed = tryParsePersistedStorageState(encryptedValue);
  if (plaintextParsed) return plaintextParsed;

  if (decryptError) {
    void ErrorSystem.captureException(decryptError);
  }
  return null;
};

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toFiniteNumber = (value: unknown, fallback: number, min = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(min, Math.floor(value));
  }
  return fallback;
};

const toTrimmedString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const findPersonaSettings = (raw: unknown, personaId: string): Record<string, unknown> | null => {
  if (!Array.isArray(raw)) return null;
  for (const persona of raw) {
    if (!persona || typeof persona !== 'object') continue;
    const id = (persona as { id?: unknown }).id;
    if (typeof id !== 'string' || id !== personaId) continue;
    const settings = (persona as { settings?: unknown }).settings;
    if (!settings || typeof settings !== 'object') return null;
    return settings as Record<string, unknown>;
  }
  return null;
};

export const resolveConnectionPlaywrightSettingsProfile = async (
  connection: IntegrationConnectionRecord
): Promise<ResolvedConnectionPlaywrightSettingsProfile> => {
  const personaId = normalizeIntegrationConnectionPlaywrightPersonaId(
    connection.playwrightPersonaId
  );
  const connectionOverrides = extractIntegrationConnectionPlaywrightSettingsOverrides(connection);
  const connectionBrowser = resolveIntegrationConnectionPlaywrightBrowserOverride(connection);
  const connectionProxyPassword = connection.playwrightProxyPassword
    ? decryptSecret(connection.playwrightProxyPassword)
    : undefined;

  let browser: TraderaPlaywrightRuntimeSettings['browser'] = 'auto';
  let personaProvidesHeadlessPreference = false;
  let personaProvidesBrowserPreference = false;
  let settings = {
    ...defaultIntegrationConnectionPlaywrightSettings,
    proxyServer: toTrimmedString(defaultIntegrationConnectionPlaywrightSettings.proxyServer, ''),
    proxyUsername: toTrimmedString(defaultIntegrationConnectionPlaywrightSettings.proxyUsername, ''),
    proxyPassword: '',
    deviceName: toTrimmedString(
      defaultIntegrationConnectionPlaywrightSettings.deviceName,
      defaultIntegrationConnectionPlaywrightSettings.deviceName
    ),
  };

  if (personaId) {
    const raw = await getSettingValue(PLAYWRIGHT_PERSONA_SETTINGS_KEY);
    const parsed = parseJsonSetting<unknown>(raw, null);
    const personaSettings = findPersonaSettings(parsed, personaId);
    if (personaSettings) {
      const personaProxyPassword = toTrimmedString(personaSettings['proxyPassword'], '');
      const personaBrowser = toTrimmedString(personaSettings['browser'], '');
      personaProvidesHeadlessPreference = typeof personaSettings['headless'] === 'boolean';
      personaProvidesBrowserPreference =
        personaBrowser === 'auto' ||
        personaBrowser === 'brave' ||
        personaBrowser === 'chrome' ||
        personaBrowser === 'chromium';
      browser =
        personaBrowser === 'brave' || personaBrowser === 'chrome' || personaBrowser === 'chromium'
          ? personaBrowser
          : browser;
      settings = {
        ...settings,
        headless: toBoolean(personaSettings['headless'], settings.headless),
        slowMo: toFiniteNumber(personaSettings['slowMo'], settings.slowMo, 0),
        timeout: toFiniteNumber(personaSettings['timeout'], settings.timeout, 1000),
        navigationTimeout: toFiniteNumber(
          personaSettings['navigationTimeout'],
          settings.navigationTimeout,
          1000
        ),
        humanizeMouse: toBoolean(personaSettings['humanizeMouse'], settings.humanizeMouse),
        mouseJitter: toFiniteNumber(personaSettings['mouseJitter'], settings.mouseJitter, 0),
        clickDelayMin: toFiniteNumber(
          personaSettings['clickDelayMin'],
          settings.clickDelayMin,
          0
        ),
        clickDelayMax: toFiniteNumber(
          personaSettings['clickDelayMax'],
          settings.clickDelayMax,
          0
        ),
        inputDelayMin: toFiniteNumber(
          personaSettings['inputDelayMin'],
          settings.inputDelayMin,
          0
        ),
        inputDelayMax: toFiniteNumber(
          personaSettings['inputDelayMax'],
          settings.inputDelayMax,
          0
        ),
        actionDelayMin: toFiniteNumber(
          personaSettings['actionDelayMin'],
          settings.actionDelayMin,
          0
        ),
        actionDelayMax: toFiniteNumber(
          personaSettings['actionDelayMax'],
          settings.actionDelayMax,
          0
        ),
        proxyEnabled: toBoolean(personaSettings['proxyEnabled'], settings.proxyEnabled),
        proxyServer: toTrimmedString(personaSettings['proxyServer'], settings.proxyServer),
        proxyUsername: toTrimmedString(personaSettings['proxyUsername'], settings.proxyUsername),
        proxyPassword: personaProxyPassword || settings.proxyPassword,
        emulateDevice: toBoolean(personaSettings['emulateDevice'], settings.emulateDevice),
        deviceName: toTrimmedString(personaSettings['deviceName'], settings.deviceName),
      };
    }
  }

  const nextProxyServer =
    'proxyServer' in connectionOverrides
      ? toTrimmedString(connectionOverrides.proxyServer, '')
      : settings.proxyServer;
  const nextProxyUsername =
    'proxyUsername' in connectionOverrides
      ? toTrimmedString(connectionOverrides.proxyUsername, '')
      : settings.proxyUsername;
  const nextDeviceName =
    'deviceName' in connectionOverrides
      ? toTrimmedString(
          connectionOverrides.deviceName,
          defaultIntegrationConnectionPlaywrightSettings.deviceName
        )
      : settings.deviceName;

  return {
    hasExplicitHeadlessPreference:
      'headless' in connectionOverrides || personaProvidesHeadlessPreference,
    hasExplicitBrowserPreference:
      typeof connectionBrowser !== 'undefined' || personaProvidesBrowserPreference,
    settings: {
      browser: connectionBrowser ?? browser,
      ...settings,
      ...connectionOverrides,
      proxyServer: nextProxyServer,
      proxyUsername: nextProxyUsername,
      proxyPassword:
        typeof connectionProxyPassword === 'string'
          ? connectionProxyPassword
          : settings.proxyPassword,
      deviceName: nextDeviceName || defaultIntegrationConnectionPlaywrightSettings.deviceName,
    },
  };
};

export const resolveConnectionPlaywrightSettings = async (
  connection: IntegrationConnectionRecord
): Promise<TraderaPlaywrightRuntimeSettings> => {
  const profile = await resolveConnectionPlaywrightSettingsProfile(connection);
  return profile.settings;
};
