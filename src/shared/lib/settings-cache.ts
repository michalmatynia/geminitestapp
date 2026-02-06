import 'server-only';

import { LRUCache } from 'lru-cache';

export type SettingRecord = { key: string; value: string };
export type SettingsScope = 'all' | 'light' | 'heavy';

const SETTINGS_CACHE_TTL_MS = 120_000;
const SETTINGS_CACHE_STALE_TTL_MS = 10 * 60_000;
const settingsLru = new LRUCache<string, SettingRecord[]>({
  max: 5,
  ttl: SETTINGS_CACHE_TTL_MS,
  updateAgeOnGet: true,
});

let settingsCacheHits = 0;
let settingsCacheMisses = 0;
const settingsInflight = new Map<string, Promise<SettingRecord[]>>();
const lastKnownSettings = new Map<string, { data: SettingRecord[]; fetchedAt: number }>();

const normalizeScope = (scope?: SettingsScope | null): SettingsScope =>
  scope === 'heavy' || scope === 'light' || scope === 'all' ? scope : 'all';

const cacheKey = (scope?: SettingsScope | null): string =>
  `settings:${normalizeScope(scope)}`;

export const isSettingsCacheDebugEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production' || process.env.DEBUG_SETTINGS === 'true';

interface SettingsCacheStats {
  size: number;
  ttlMs: number;
  staleTtlMs: number;
  hits: number;
  misses: number;
  inflight: string[];
  staleAgeMs: Record<string, number>;
}

export const getSettingsCacheStats = (): SettingsCacheStats => ({
  size: settingsLru.size,
  ttlMs: SETTINGS_CACHE_TTL_MS,
  staleTtlMs: SETTINGS_CACHE_STALE_TTL_MS,
  hits: settingsCacheHits,
  misses: settingsCacheMisses,
  inflight: Array.from(settingsInflight.keys()),
  staleAgeMs: Array.from(lastKnownSettings.entries()).reduce<Record<string, number>>(
    (acc: Record<string, number>, [scope, entry]: [string, { data: SettingRecord[]; fetchedAt: number }]): Record<string, number> => {
      acc[scope] = Date.now() - entry.fetchedAt;
      return acc;
    },
    {}
  ),
});

export const getCachedSettings = (scope?: SettingsScope | null): SettingRecord[] | null => {
  const cached = settingsLru.get(cacheKey(scope));
  if (cached) {
    settingsCacheHits += 1;
    return cached;
  }
  settingsCacheMisses += 1;
  return null;
};

export const setCachedSettings = (settings: SettingRecord[], scope?: SettingsScope | null): void => {
  const key = cacheKey(scope);
  settingsLru.set(key, settings);
  lastKnownSettings.set(key, { data: settings, fetchedAt: Date.now() });
};

export const clearSettingsCache = (scope?: SettingsScope | null): void => {
  if (scope) {
    const key = cacheKey(scope);
    settingsLru.delete(key);
    lastKnownSettings.delete(key);
    settingsInflight.delete(key);
  } else {
    settingsLru.clear();
    lastKnownSettings.clear();
    settingsInflight.clear();
  }
  settingsCacheHits = 0;
  settingsCacheMisses = 0;
};

export const getSettingsInflight = (scope?: SettingsScope | null): Promise<SettingRecord[]> | null =>
  settingsInflight.get(cacheKey(scope)) ?? null;

export const setSettingsInflight = (
  inflight: Promise<SettingRecord[]> | null,
  scope?: SettingsScope | null
): void => {
  const key = cacheKey(scope);
  if (inflight) {
    settingsInflight.set(key, inflight);
  } else {
    settingsInflight.delete(key);
  }
};

export const getStaleSettings = (scope?: SettingsScope | null): SettingRecord[] | null => {
  const entry = lastKnownSettings.get(cacheKey(scope));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > SETTINGS_CACHE_STALE_TTL_MS) return null;
  return entry.data;
};
