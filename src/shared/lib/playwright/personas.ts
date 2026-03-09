import { fetchSettingsCached } from '@/shared/api/settings-client';
import {
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
  type PlaywrightPersona,
  type PlaywrightSettings,
} from '@/shared/contracts/playwright';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { defaultPlaywrightSettings } from './settings';

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
    left.headless === right.headless &&
    left.slowMo === right.slowMo &&
    left.timeout === right.timeout &&
    left.navigationTimeout === right.navigationTimeout &&
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
    left.emulateDevice === right.emulateDevice &&
    left.deviceName === right.deviceName
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
