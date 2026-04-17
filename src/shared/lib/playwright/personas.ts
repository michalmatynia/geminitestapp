import { fetchSettingsCached } from '@/shared/api/settings-client';
import {
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
  type PlaywrightPersona,
  type PlaywrightSettings,
} from '@/shared/contracts/playwright';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { defaultPlaywrightSettings } from './settings';

const normalizePlaywrightIdentityProfile = (
  value: unknown
): PlaywrightSettings['identityProfile'] | undefined =>
  value === 'default' || value === 'search' || value === 'marketplace' ? value : undefined;

const normalizePlaywrightProxySessionMode = (
  value: unknown
): PlaywrightSettings['proxySessionMode'] | undefined =>
  value === 'sticky' || value === 'rotate' ? value : undefined;

const normalizePlaywrightProxyProviderPreset = (
  value: unknown
): PlaywrightSettings['proxyProviderPreset'] | undefined =>
  value === 'custom' || value === 'brightdata' || value === 'oxylabs' || value === 'decodo'
    ? value
    : undefined;

export const createPlaywrightPersonaId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `persona-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const buildPlaywrightSettings = (
  settings?: Partial<PlaywrightSettings> | null
): PlaywrightSettings => ({
  ...defaultPlaywrightSettings,
  ...(settings ?? {}),
  identityProfile:
    normalizePlaywrightIdentityProfile(settings?.identityProfile) ??
    defaultPlaywrightSettings.identityProfile,
  proxySessionMode:
    normalizePlaywrightProxySessionMode(settings?.proxySessionMode) ??
    defaultPlaywrightSettings.proxySessionMode,
  proxyProviderPreset:
    normalizePlaywrightProxyProviderPreset(settings?.proxyProviderPreset) ??
    defaultPlaywrightSettings.proxyProviderPreset,
});

export const normalizePlaywrightPersonas = (value: unknown): PlaywrightPersona[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: unknown): PlaywrightPersona | null => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as PlaywrightPersona;
      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (!name) return null;

      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : createPlaywrightPersonaId();
      const createdAt =
        typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
      const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt;
      const settings =
        raw.settings && typeof raw.settings === 'object'
          ? buildPlaywrightSettings(raw.settings as Partial<PlaywrightSettings>)
          : buildPlaywrightSettings();
      const description = typeof raw.description === 'string' ? raw.description : null;

      return {
        id,
        name,
        description,
        settings,
        createdAt,
        updatedAt,
      } as PlaywrightPersona;
    })
    .filter((item: PlaywrightPersona | null): item is PlaywrightPersona => Boolean(item));
};

export const arePlaywrightSettingsEqual = (
  left: PlaywrightSettings,
  right: PlaywrightSettings
): boolean => {
  const proxyPasswordEqual =
    !left.proxyPassword || !right.proxyPassword ? true : left.proxyPassword === right.proxyPassword;
  return (
    left.identityProfile === right.identityProfile &&
    left.headless === right.headless &&
    left.slowMo === right.slowMo &&
    left.timeout === right.timeout &&
    left.navigationTimeout === right.navigationTimeout &&
    left.locale === right.locale &&
    left.timezoneId === right.timezoneId &&
    left.humanizeMouse === right.humanizeMouse &&
    left.mouseJitter === right.mouseJitter &&
    left.clickDelayMin === right.clickDelayMin &&
    left.clickDelayMax === right.clickDelayMax &&
    left.inputDelayMin === right.inputDelayMin &&
    left.inputDelayMax === right.inputDelayMax &&
    left.actionDelayMin === right.actionDelayMin &&
    left.actionDelayMax === right.actionDelayMax &&
    left.proxyEnabled === right.proxyEnabled &&
    left.proxyServer === right.proxyServer &&
    left.proxyUsername === right.proxyUsername &&
    proxyPasswordEqual &&
    left.proxySessionAffinity === right.proxySessionAffinity &&
    left.proxySessionMode === right.proxySessionMode &&
    left.proxyProviderPreset === right.proxyProviderPreset &&
    left.emulateDevice === right.emulateDevice &&
    left.deviceName === right.deviceName &&
    (left.launchCooldownMs ?? 0) === (right.launchCooldownMs ?? 0) &&
    (left.prewarmWaitMs ?? 0) === (right.prewarmWaitMs ?? 0) &&
    (left.postStartUrlWaitMs ?? 0) === (right.postStartUrlWaitMs ?? 0) &&
    (left.viewportJitterPx ?? 0) === (right.viewportJitterPx ?? 0) &&
    (left.postLoadNudgeEnabled ?? true) === (right.postLoadNudgeEnabled ?? true)
  );
};

export const findPlaywrightPersonaMatch = (
  settings: PlaywrightSettings,
  personas: PlaywrightPersona[]
): PlaywrightPersona | null => {
  return (
    personas.find((persona: PlaywrightPersona) =>
      arePlaywrightSettingsEqual(settings, persona.settings)
    ) ?? null
  );
};

export const fetchPlaywrightPersonas = async (): Promise<PlaywrightPersona[]> => {
  const data = await fetchSettingsCached();
  const map = new Map(data.map((item: { key: string; value: string }) => [item.key, item.value]));
  const stored = parseJsonSetting<PlaywrightPersona[]>(
    map.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY),
    []
  );
  return normalizePlaywrightPersonas(stored);
};
