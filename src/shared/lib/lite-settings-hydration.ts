import type { SettingRecord } from '@/shared/contracts/settings';

export const LITE_SETTINGS_HYDRATION_ELEMENT_ID = '__LITE_SETTINGS__';

export function serializeLiteSettingsHydrationData(
  settings: ReadonlyArray<SettingRecord>
): string {
  return JSON.stringify(settings)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const normalizeLiteSettingsHydrationData = (value: unknown): SettingRecord[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const records = value.flatMap((entry): SettingRecord[] => {
    if (typeof entry !== 'object' || entry === null) {
      return [];
    }

    const candidate = entry as { key?: unknown; value?: unknown };
    return typeof candidate.key === 'string' && typeof candidate.value === 'string'
      ? [{ key: candidate.key, value: candidate.value }]
      : [];
  });

  return records.length > 0 ? records : null;
};

export function readLiteSettingsHydrationData(): SettingRecord[] | null {
  if (typeof globalThis !== 'undefined') {
    const globalData = (
      globalThis as typeof globalThis & { __LITE_SETTINGS__?: unknown }
    ).__LITE_SETTINGS__;
    const normalizedGlobalData = normalizeLiteSettingsHydrationData(globalData);
    if (normalizedGlobalData !== null) {
      return normalizedGlobalData;
    }
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const element = document.getElementById(LITE_SETTINGS_HYDRATION_ELEMENT_ID);
  if (element === null) {
    return null;
  }

  try {
    return normalizeLiteSettingsHydrationData(JSON.parse(element.textContent ?? 'null'));
  } catch {
    return null;
  }
}
