'use client';

import type { SettingRecord, SettingsScope } from '@/shared/contracts/settings';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type { SettingRecord, SettingsScope } from '@/shared/contracts/settings';

type SettingsCache = {
  data: SettingRecord[];
  fetchedAt: number;
};

const SETTINGS_CACHE_TTL_MS = 120_000;
const LITE_SETTINGS_CACHE_TTL_MS = 120_000;
const SETTINGS_FETCH_RETRY_DELAY_MS = 250;
const SETTINGS_FETCH_ERROR_LOG_COOLDOWN_MS = 15_000;
const settingsCache = new Map<SettingsScope, SettingsCache>();
const settingsInflight = new Map<SettingsScope, Promise<SettingRecord[]>>();
let liteSettingsCache: SettingsCache | null = null;
let liteSettingsInflight: Promise<SettingRecord[]> | null = null;
const settingsSnapshotByScope = new Map<SettingsScope, SettingsCache>();
let settingsSnapshotAny: SettingsCache | null = null;
let liteSettingsSnapshot: SettingsCache | null = null;
const settingsFetchErrorLoggedAt = new Map<string, number>();

const normalizeScope = (scope?: SettingsScope): SettingsScope =>
  scope === 'heavy' || scope === 'light' || scope === 'all' ? scope : 'light';

const cloneSettings = (data: SettingRecord[]): SettingRecord[] =>
  data.map((item: SettingRecord) => ({ ...item }));

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });

const isTransientFetchError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  const message = error.message.trim().toLowerCase();
  if (message === 'failed to fetch' || message.includes('networkerror')) return true;
  return false;
};

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (!isTransientFetchError(error)) throw error;
    await delay(SETTINGS_FETCH_RETRY_DELAY_MS);
    return fetch(url, init);
  }
}

function logSettingsFetchError(
  action: 'fetchSettingsFromApi' | 'fetchLiteSettingsFromApi',
  message: string,
  error: Error,
  extra?: Record<string, unknown>
): void {
  const fingerprint = `${action}:${message}:${error.name}:${error.message}`;
  const lastLoggedAt = settingsFetchErrorLoggedAt.get(fingerprint) ?? 0;
  const now = Date.now();
  if (now - lastLoggedAt < SETTINGS_FETCH_ERROR_LOG_COOLDOWN_MS) return;
  settingsFetchErrorLoggedAt.set(fingerprint, now);
  logClientError(error, {
    context: {
      source: 'settings-client',
      action,
      message,
      level: isTransientFetchError(error) ? 'warn' : 'error',
      ...(extra ?? {}),
    },
  });
}

function saveSettingsSnapshot(scope: SettingsScope, data: SettingRecord[]): void {
  if (data.length === 0) return;
  const snapshot: SettingsCache = {
    data: cloneSettings(data),
    fetchedAt: Date.now(),
  };
  settingsSnapshotByScope.set(scope, snapshot);
  settingsSnapshotAny = snapshot;
}

function saveLiteSettingsSnapshot(data: SettingRecord[]): void {
  if (data.length === 0) return;
  liteSettingsSnapshot = {
    data: cloneSettings(data),
    fetchedAt: Date.now(),
  };
}

function getScopeSnapshot(scope: SettingsScope): SettingRecord[] | null {
  return settingsSnapshotByScope.get(scope)?.data ?? settingsSnapshotAny?.data ?? null;
}

function getLiteSnapshot(): SettingRecord[] | null {
  return (
    liteSettingsSnapshot?.data ??
    settingsSnapshotByScope.get('light')?.data ??
    settingsSnapshotByScope.get('all')?.data ??
    settingsSnapshotAny?.data ??
    null
  );
}

async function fetchSettingsFromApi(
  bypassCache: boolean,
  scope?: SettingsScope
): Promise<SettingRecord[]> {
  try {
    const scopeValue = normalizeScope(scope);
    const url =
      scopeValue === 'all' ? '/api/settings?scope=all' : `/api/settings?scope=${scopeValue}`;
    // Heavy settings drive AI Paths graph/config hydration; always bypass browser HTTP cache
    // to prevent stale config on hard refresh after recent writes.
    const cacheMode: RequestCache = bypassCache || scopeValue === 'heavy' ? 'no-store' : 'default';
    const res = await fetchWithRetry(url, {
      cache: cacheMode,
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch settings (${res.status})`);
    }
    return (await res.json()) as SettingRecord[];
  } catch (error: unknown) {
    const normalizedError = toError(error);
    const scopeValue = normalizeScope(scope);
    const cached = settingsCache.get(scopeValue);
    if (cached) {
      logSettingsFetchError(
        'fetchSettingsFromApi',
        'Failed to fetch settings, using cached data.',
        normalizedError,
        { scope: scopeValue }
      );
      return cached.data;
    }
    const snapshot = getScopeSnapshot(scopeValue);
    if (snapshot && snapshot.length > 0) {
      logSettingsFetchError(
        'fetchSettingsFromApi',
        'Failed to fetch settings, using in-memory snapshot.',
        normalizedError,
        { scope: scopeValue }
      );
      return cloneSettings(snapshot);
    }
    logSettingsFetchError(
      'fetchSettingsFromApi',
      'Failed to fetch settings, returning empty list.',
      normalizedError,
      { scope: scopeValue }
    );
    return [];
  }
}

async function fetchLiteSettingsFromApi(bypassCache: boolean): Promise<SettingRecord[]> {
  try {
    const url = bypassCache ? '/api/settings/lite?fresh=1' : '/api/settings/lite';
    const res = await fetchWithRetry(url, {
      cache: bypassCache ? 'no-store' : 'default',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch lite settings (${res.status})`);
    }
    return (await res.json()) as SettingRecord[];
  } catch (error: unknown) {
    const normalizedError = toError(error);
    if (liteSettingsCache) {
      logSettingsFetchError(
        'fetchLiteSettingsFromApi',
        'Failed to fetch lite settings, using cached data.',
        normalizedError
      );
      return liteSettingsCache.data;
    }
    const snapshot = getLiteSnapshot();
    if (snapshot && snapshot.length > 0) {
      logSettingsFetchError(
        'fetchLiteSettingsFromApi',
        'Failed to fetch lite settings, using in-memory snapshot.',
        normalizedError
      );
      return cloneSettings(snapshot);
    }
    logSettingsFetchError(
      'fetchLiteSettingsFromApi',
      'Failed to fetch lite settings, returning empty list.',
      normalizedError
    );
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
    const data = cloneSettings(await fetchSettingsFromApi(true, scope));
    settingsCache.set(scope, { data, fetchedAt: Date.now() });
    saveSettingsSnapshot(scope, data);
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
      const safeData = cloneSettings(data);
      settingsCache.set(scope, { data: safeData, fetchedAt: Date.now() });
      saveSettingsSnapshot(scope, safeData);
      return safeData;
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
    const data = cloneSettings(await fetchLiteSettingsFromApi(true));
    liteSettingsCache = { data, fetchedAt: Date.now() };
    saveLiteSettingsSnapshot(data);
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
      const safeData = cloneSettings(data);
      liteSettingsCache = { data: safeData, fetchedAt: Date.now() };
      saveLiteSettingsSnapshot(safeData);
      return safeData;
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
