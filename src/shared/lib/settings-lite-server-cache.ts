import 'server-only';

import type { SettingRecord } from '@/shared/contracts/settings';

export type LiteSettingRecord = SettingRecord;
export type LiteSettingsCacheEntry = { data: LiteSettingRecord[]; ts: number };

type LiteSettingsServerCacheState = {
  cache: LiteSettingsCacheEntry | null;
  inflight: Promise<LiteSettingRecord[]> | null;
};

type LiteSettingsGlobalState = {
  __liteSettingsServerCacheState?: LiteSettingsServerCacheState;
};

const globalForLiteSettings = globalThis as typeof globalThis & LiteSettingsGlobalState;

const getState = (): LiteSettingsServerCacheState => {
  if (!globalForLiteSettings.__liteSettingsServerCacheState) {
    globalForLiteSettings.__liteSettingsServerCacheState = {
      cache: null,
      inflight: null,
    };
  }
  return globalForLiteSettings.__liteSettingsServerCacheState;
};

export const cloneLiteSettings = (rows: LiteSettingRecord[]): LiteSettingRecord[] =>
  rows.map((row: LiteSettingRecord) => ({ key: row.key, value: row.value }));

export const getLiteSettingsCache = (): LiteSettingsCacheEntry | null => getState().cache;

export const setLiteSettingsCache = (cache: LiteSettingsCacheEntry | null): void => {
  getState().cache = cache;
};

export const getLiteSettingsInflight = (): Promise<LiteSettingRecord[]> | null =>
  getState().inflight;

export const setLiteSettingsInflight = (inflight: Promise<LiteSettingRecord[]> | null): void => {
  getState().inflight = inflight;
};

export const clearLiteSettingsServerCache = (): void => {
  const state = getState();
  state.cache = null;
  state.inflight = null;
};
