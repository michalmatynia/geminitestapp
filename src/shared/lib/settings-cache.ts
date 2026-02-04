import "server-only";

import { LRUCache } from "lru-cache";

export type SettingRecord = { key: string; value: string };

const SETTINGS_CACHE_TTL_MS = 30_000;
const settingsLru = new LRUCache<string, SettingRecord[]>({
  max: 5,
  ttl: SETTINGS_CACHE_TTL_MS,
  updateAgeOnGet: true,
});

let settingsCacheHits = 0;
let settingsCacheMisses = 0;
let settingsInflight: Promise<SettingRecord[]> | null = null;

export const getSettingsCacheStats = () => ({
  size: settingsLru.size,
  ttlMs: SETTINGS_CACHE_TTL_MS,
  hits: settingsCacheHits,
  misses: settingsCacheMisses,
  inflight: Boolean(settingsInflight),
});

export const isSettingsCacheDebugEnabled = () =>
  process.env.NODE_ENV !== "production" || process.env.DEBUG_SETTINGS === "true";

export const getCachedSettings = (): SettingRecord[] | null => {
  const cached = settingsLru.get("settings");
  if (cached) {
    settingsCacheHits += 1;
    return cached;
  }
  settingsCacheMisses += 1;
  return null;
};

export const setCachedSettings = (settings: SettingRecord[]): void => {
  settingsLru.set("settings", settings);
};

export const clearSettingsCache = (): void => {
  settingsLru.delete("settings");
  settingsCacheHits = 0;
  settingsCacheMisses = 0;
};

export const getSettingsInflight = (): Promise<SettingRecord[]> | null => settingsInflight;

export const setSettingsInflight = (inflight: Promise<SettingRecord[]> | null): void => {
  settingsInflight = inflight;
};
