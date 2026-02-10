'use client';

import { logClientError } from '@/features/observability';
import { logger } from '@/shared/utils/logger';

export type SettingRecord = {
  key: string;
  value: string;
};

export type SettingsScope = 'all' | 'light' | 'heavy';

type SettingsCache = {
  data: SettingRecord[];
  fetchedAt: number;
};

const SETTINGS_CACHE_TTL_MS = 120_000;
const LITE_SETTINGS_CACHE_TTL_MS = 120_000;
const settingsCache = new Map<SettingsScope, SettingsCache>();
const settingsInflight = new Map<SettingsScope, Promise<SettingRecord[]>>();
let liteSettingsCache: SettingsCache | null = null;
let liteSettingsInflight: Promise<SettingRecord[]> | null = null;

const normalizeScope = (scope?: SettingsScope): SettingsScope =>
  scope === 'heavy' || scope === 'light' || scope === 'all' ? scope : 'light';

async function fetchSettingsFromApi(
  bypassCache: boolean,
  scope?: SettingsScope
): Promise<SettingRecord[]> {
  try {
    const scopeValue = normalizeScope(scope);
    const url = scopeValue === 'all' ? '/api/settings?scope=all' : `/api/settings?scope=${scopeValue}`;
    // Heavy settings drive AI Paths graph/config hydration; always bypass browser HTTP cache
    // to prevent stale config on hard refresh after recent writes.
    const cacheMode: RequestCache = bypassCache || scopeValue === 'heavy' ? 'no-store' : 'default';
    const res = await fetch(url, {
      cache: cacheMode,
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch settings (${res.status})`);
    }
    return (await res.json()) as SettingRecord[];
  } catch (error) {
    const scopeValue = normalizeScope(scope);
    const cached = settingsCache.get(scopeValue);
    if (cached) {
      logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'settings-client', action: 'fetchSettingsFromApi', scope: scopeValue, message: 'Failed to fetch settings, using cached data.' } });
      return cached.data;
    }
    logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'settings-client', action: 'fetchSettingsFromApi', scope: scopeValue, message: 'Failed to fetch settings, returning empty list.' } });
    return [];
  }
}

async function fetchLiteSettingsFromApi(bypassCache: boolean): Promise<SettingRecord[]> {
  try {
    const res = await fetch('/api/settings/lite', {
      cache: bypassCache ? 'no-store' : 'default',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch lite settings (${res.status})`);
    }
    return (await res.json()) as SettingRecord[];
  } catch (error) {
    if (liteSettingsCache) {
      logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'settings-client', action: 'fetchLiteSettingsFromApi', message: 'Failed to fetch lite settings, using cached data.' } });
      return liteSettingsCache.data;
    }
    logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'settings-client', action: 'fetchLiteSettingsFromApi', message: 'Failed to fetch lite settings, returning empty list.' } });
    return [];
  }
}

export async function fetchSettingsCached(options?: {
  bypassCache?: boolean;
  scope?: SettingsScope;
}): Promise<SettingRecord[]> {
  const bypassCache = options?.bypassCache === true;
  const scope = normalizeScope(options?.scope);
  if (bypassCache) {
    const data = await fetchSettingsFromApi(true, scope);
    settingsCache.set(scope, { data, fetchedAt: Date.now() });
    settingsInflight.delete(scope);
    return data;
  }

  const now = Date.now();
  const cached = settingsCache.get(scope);
  if (cached && now - cached.fetchedAt < SETTINGS_CACHE_TTL_MS) {
    return cached.data;
  }
  const inflight = settingsInflight.get(scope);
  if (inflight) {
    return inflight;
  }

  const inflightPromise = fetchSettingsFromApi(false, scope)
    .then((data: SettingRecord[]) => {
      settingsCache.set(scope, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => {
      settingsInflight.delete(scope);
    });
  settingsInflight.set(scope, inflightPromise);
  return inflightPromise;
}

export async function fetchLiteSettingsCached(options?: {
  bypassCache?: boolean;
}): Promise<SettingRecord[]> {
  const bypassCache = options?.bypassCache === true;
  if (bypassCache) {
    const data = await fetchLiteSettingsFromApi(true);
    liteSettingsCache = { data, fetchedAt: Date.now() };
    liteSettingsInflight = null;
    return data;
  }

  const now = Date.now();
  if (liteSettingsCache && now - liteSettingsCache.fetchedAt < LITE_SETTINGS_CACHE_TTL_MS) {
    return liteSettingsCache.data;
  }
  if (liteSettingsInflight) {
    return liteSettingsInflight;
  }

  const inflightPromise = fetchLiteSettingsFromApi(false)
    .then((data: SettingRecord[]) => {
      liteSettingsCache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      liteSettingsInflight = null;
    });
  liteSettingsInflight = inflightPromise;
  return inflightPromise;
}

export async function fetchSettingsMap(options?: {
  bypassCache?: boolean;
  scope?: SettingsScope;
}): Promise<Map<string, string>> {
  const data = await fetchSettingsCached(options);
  return new Map(data.map((item: SettingRecord) => [item.key, item.value]));
}

export function invalidateSettingsCache(scope?: SettingsScope): void {
  if (scope) {
    settingsCache.delete(scope);
    settingsInflight.delete(scope);
    liteSettingsCache = null;
    liteSettingsInflight = null;
    return;
  }
  settingsCache.clear();
  settingsInflight.clear();
  liteSettingsCache = null;
  liteSettingsInflight = null;
}
