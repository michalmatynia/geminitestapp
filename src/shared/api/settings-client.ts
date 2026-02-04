"use client";

export type SettingRecord = {
  key: string;
  value: string;
};

type SettingsCache = {
  data: SettingRecord[];
  fetchedAt: number;
};

const SETTINGS_CACHE_TTL_MS = 30_000;
let settingsCache: SettingsCache | null = null;
let settingsInflight: Promise<SettingRecord[]> | null = null;

async function fetchSettingsFromApi(
  bypassCache: boolean,
): Promise<SettingRecord[]> {
  try {
    const res = await fetch("/api/settings", {
      cache: bypassCache ? "no-store" : "default",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch settings (${res.status})`);
    }
    return (await res.json()) as SettingRecord[];
  } catch (error) {
    if (settingsCache) {
      console.warn("[settings-client] Failed to fetch settings, using cached data.", error);
      return settingsCache.data;
    }
    console.warn("[settings-client] Failed to fetch settings, returning empty list.", error);
    return [];
  }
}

export async function fetchSettingsCached(options?: {
  bypassCache?: boolean;
}): Promise<SettingRecord[]> {
  const bypassCache = options?.bypassCache === true;
  if (bypassCache) {
    const data = await fetchSettingsFromApi(true);
    settingsCache = { data, fetchedAt: Date.now() };
    settingsInflight = null;
    return data;
  }

  const now = Date.now();
  if (settingsCache && now - settingsCache.fetchedAt < SETTINGS_CACHE_TTL_MS) {
    return settingsCache.data;
  }
  if (settingsInflight) {
    return settingsInflight;
  }

  settingsInflight = fetchSettingsFromApi(false)
    .then((data: SettingRecord[]) => {
      settingsCache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      settingsInflight = null;
    });
  return settingsInflight;
}

export async function fetchSettingsMap(options?: {
  bypassCache?: boolean;
}): Promise<Map<string, string>> {
  const data = await fetchSettingsCached(options);
  return new Map(data.map((item: SettingRecord) => [item.key, item.value]));
}

export function invalidateSettingsCache(): void {
  settingsCache = null;
  settingsInflight = null;
}
