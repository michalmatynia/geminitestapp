"use client";

export type SettingRecord = {
  key: string;
  value: string;
};

export type SettingsScope = "all" | "light" | "heavy";

type SettingsCache = {
  data: SettingRecord[];
  fetchedAt: number;
};

const SETTINGS_CACHE_TTL_MS = 120_000;
const settingsCache = new Map<SettingsScope, SettingsCache>();
const settingsInflight = new Map<SettingsScope, Promise<SettingRecord[]>>();

const normalizeScope = (scope?: SettingsScope): SettingsScope =>
  scope === "heavy" || scope === "light" || scope === "all" ? scope : "light";

async function fetchSettingsFromApi(
  bypassCache: boolean,
  scope?: SettingsScope
): Promise<SettingRecord[]> {
  try {
    const scopeValue = normalizeScope(scope);
    const url = scopeValue === "all" ? "/api/settings?scope=all" : `/api/settings?scope=${scopeValue}`;
    const res = await fetch(url, {
      cache: bypassCache ? "no-store" : "default",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch settings (${res.status})`);
    }
    return (await res.json()) as SettingRecord[];
  } catch (error) {
    const scopeValue = normalizeScope(scope);
    const cached = settingsCache.get(scopeValue);
    if (cached) {
      console.warn("[settings-client] Failed to fetch settings, using cached data.", error);
      return cached.data;
    }
    console.warn("[settings-client] Failed to fetch settings, returning empty list.", error);
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
    return;
  }
  settingsCache.clear();
  settingsInflight.clear();
}
