import 'server-only';

import { decryptSecret } from '@/features/integrations/server';
import {
  playwrightStorageStateSchema,
  type IntegrationConnectionRecord,
  type PlaywrightStorageState,
} from '@/shared/contracts/integrations';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import type { BrowserContextOptions } from 'playwright';

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

const normalizeStorageState = (state: PlaywrightStorageState): PersistedStorageState => ({
  cookies: state.cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain ?? '',
    path: cookie.path ?? '/',
    expires: cookie.expires ?? -1,
    httpOnly: cookie.httpOnly ?? false,
    secure: cookie.secure ?? false,
    sameSite: toPlaywrightSameSite(cookie.sameSite),
  })),
  origins: state.origins.map((origin) => ({
    origin: origin.origin,
    localStorage: origin.localStorage.map((entry) => ({
      name: entry.name,
      value: entry.value,
    })),
  })),
});

export type TraderaPlaywrightRuntimeSettings = {
  headless: boolean;
  slowMo: number;
  timeout: number;
  navigationTimeout: number;
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
  } catch {
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
    proxyEnabled: toBoolean(personaSettings['proxyEnabled'], base.proxyEnabled),
    proxyServer: toTrimmedString(personaSettings['proxyServer'], base.proxyServer),
    proxyUsername: toTrimmedString(personaSettings['proxyUsername'], base.proxyUsername),
    proxyPassword: personaProxyPassword || base.proxyPassword,
    emulateDevice: toBoolean(personaSettings['emulateDevice'], base.emulateDevice),
    deviceName: toTrimmedString(personaSettings['deviceName'], base.deviceName),
  };
};
