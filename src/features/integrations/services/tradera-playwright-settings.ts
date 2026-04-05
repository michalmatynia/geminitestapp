import 'server-only';

import { decryptSecret } from '@/features/integrations/server';
import { playwrightStorageStateSchema } from '@/shared/contracts/integrations/session-testing';
import { type IntegrationConnectionRecord, type PlaywrightStorageState } from '@/shared/contracts/integrations';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import type { BrowserContextOptions } from 'playwright';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export type PersistedStorageState = NonNullable<
  Exclude<BrowserContextOptions['storageState'], string>
>;

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

export const parsePersistedStorageState = (
  encryptedValue: string | null | undefined
): PersistedStorageState | null => {
  if (!encryptedValue) return null;
  try {
    const raw = decryptSecret(encryptedValue);
    const parsed = playwrightStorageStateSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return normalizeStorageState(parsed.data);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
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

export const resolveConnectionPlaywrightSettings = async (
  connection: IntegrationConnectionRecord
): Promise<TraderaPlaywrightRuntimeSettings> => {
  const base: TraderaPlaywrightRuntimeSettings = {
    headless: connection.playwrightHeadless ?? defaultPlaywrightSettings.headless,
    slowMo: connection.playwrightSlowMo ?? defaultPlaywrightSettings.slowMo,
    timeout: connection.playwrightTimeout ?? defaultPlaywrightSettings.timeout,
    navigationTimeout:
      connection.playwrightNavigationTimeout ?? defaultPlaywrightSettings.navigationTimeout,
    humanizeMouse:
      connection.playwrightHumanizeMouse ?? defaultPlaywrightSettings.humanizeMouse,
    mouseJitter: connection.playwrightMouseJitter ?? defaultPlaywrightSettings.mouseJitter,
    clickDelayMin:
      connection.playwrightClickDelayMin ?? defaultPlaywrightSettings.clickDelayMin,
    clickDelayMax:
      connection.playwrightClickDelayMax ?? defaultPlaywrightSettings.clickDelayMax,
    inputDelayMin:
      connection.playwrightInputDelayMin ?? defaultPlaywrightSettings.inputDelayMin,
    inputDelayMax:
      connection.playwrightInputDelayMax ?? defaultPlaywrightSettings.inputDelayMax,
    actionDelayMin:
      connection.playwrightActionDelayMin ?? defaultPlaywrightSettings.actionDelayMin,
    actionDelayMax:
      connection.playwrightActionDelayMax ?? defaultPlaywrightSettings.actionDelayMax,
    proxyEnabled: connection.playwrightProxyEnabled ?? defaultPlaywrightSettings.proxyEnabled,
    proxyServer: connection.playwrightProxyServer?.trim() ?? '',
    proxyUsername: connection.playwrightProxyUsername?.trim() ?? '',
    proxyPassword: connection.playwrightProxyPassword
      ? decryptSecret(connection.playwrightProxyPassword)
      : '',
    emulateDevice: connection.playwrightEmulateDevice ?? defaultPlaywrightSettings.emulateDevice,
    deviceName:
      connection.playwrightDeviceName ?? defaultPlaywrightSettings.deviceName ?? 'Desktop Chrome',
  };

  const personaId = connection.playwrightPersonaId?.trim();
  if (!personaId) return base;

  const raw = await getSettingValue(PLAYWRIGHT_PERSONA_SETTINGS_KEY);
  const parsed = parseJsonSetting<unknown>(raw, null);
  const personaSettings = findPersonaSettings(parsed, personaId);
  if (!personaSettings) return base;

  const personaProxyPassword = toTrimmedString(personaSettings['proxyPassword'], '');

  return {
    headless: toBoolean(personaSettings['headless'], base.headless),
    slowMo: toFiniteNumber(personaSettings['slowMo'], base.slowMo, 0),
    timeout: toFiniteNumber(personaSettings['timeout'], base.timeout, 1000),
    navigationTimeout: toFiniteNumber(
      personaSettings['navigationTimeout'],
      base.navigationTimeout,
      1000
    ),
    humanizeMouse: toBoolean(personaSettings['humanizeMouse'], base.humanizeMouse),
    mouseJitter: toFiniteNumber(personaSettings['mouseJitter'], base.mouseJitter, 0),
    clickDelayMin: toFiniteNumber(personaSettings['clickDelayMin'], base.clickDelayMin, 0),
    clickDelayMax: toFiniteNumber(
      personaSettings['clickDelayMax'],
      base.clickDelayMax,
      0
    ),
    inputDelayMin: toFiniteNumber(personaSettings['inputDelayMin'], base.inputDelayMin, 0),
    inputDelayMax: toFiniteNumber(
      personaSettings['inputDelayMax'],
      base.inputDelayMax,
      0
    ),
    actionDelayMin: toFiniteNumber(
      personaSettings['actionDelayMin'],
      base.actionDelayMin,
      0
    ),
    actionDelayMax: toFiniteNumber(
      personaSettings['actionDelayMax'],
      base.actionDelayMax,
      0
    ),
    proxyEnabled: toBoolean(personaSettings['proxyEnabled'], base.proxyEnabled),
    proxyServer: toTrimmedString(personaSettings['proxyServer'], base.proxyServer),
    proxyUsername: toTrimmedString(personaSettings['proxyUsername'], base.proxyUsername),
    proxyPassword: personaProxyPassword || base.proxyPassword,
    emulateDevice: toBoolean(personaSettings['emulateDevice'], base.emulateDevice),
    deviceName: toTrimmedString(personaSettings['deviceName'], base.deviceName),
  };
};
