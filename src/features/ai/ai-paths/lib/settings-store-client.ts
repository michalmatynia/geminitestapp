'use client';

import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

export type AiPathsSettingRecord = {
  key: string;
  value: string;
};

const AI_PATHS_SETTINGS_STALE_MS = 10_000;
const AI_PATHS_SETTINGS_BACKUP_KEY = 'ai_paths_settings_backup_v1';
const AI_PATHS_SETTINGS_RETRY_DELAYS_MS = [250, 750, 1500, 3000];

let aiPathsSettingsCache: AiPathsSettingRecord[] | null = null;
let aiPathsSettingsFetchedAt = 0;
let aiPathsSettingsInflight: Promise<AiPathsSettingRecord[]> | null = null;

const isFreshCache = (): boolean =>
  Boolean(aiPathsSettingsCache) &&
  Date.now() - aiPathsSettingsFetchedAt < AI_PATHS_SETTINGS_STALE_MS;

export const invalidateAiPathsSettingsCache = (): void => {
  aiPathsSettingsCache = null;
  aiPathsSettingsFetchedAt = 0;
  aiPathsSettingsInflight = null;
};

const readBackupSettings = (): AiPathsSettingRecord[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AI_PATHS_SETTINGS_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const normalized = parsed
      .map((item: unknown): AiPathsSettingRecord | null => {
        if (!item || typeof item !== 'object') return null;
        const key = (item as { key?: unknown }).key;
        const value = (item as { value?: unknown }).value;
        if (typeof key !== 'string' || typeof value !== 'string') return null;
        return { key, value };
      })
      .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
};

const writeBackupSettings = (records: AiPathsSettingRecord[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AI_PATHS_SETTINGS_BACKUP_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage failures in private mode/quota conditions.
  }
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const shouldRetrySettingsFetch = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('load failed')
  );
};

const fetchAiPathsSettingsResponse = async (): Promise<Response> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= AI_PATHS_SETTINGS_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch('/api/ai-paths/settings', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.ok) return response;
      if (response.status >= 500 && attempt < AI_PATHS_SETTINGS_RETRY_DELAYS_MS.length) {
        await sleep(AI_PATHS_SETTINGS_RETRY_DELAYS_MS[attempt] ?? 250);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (!shouldRetrySettingsFetch(error) || attempt >= AI_PATHS_SETTINGS_RETRY_DELAYS_MS.length) {
        break;
      }
      await sleep(AI_PATHS_SETTINGS_RETRY_DELAYS_MS[attempt] ?? 250);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to fetch AI Paths settings.');
};

const fetchAiPathsSettingsFromApi = async (): Promise<AiPathsSettingRecord[]> => {
  const res = await fetchAiPathsSettingsResponse();
  if (!res.ok) {
    throw new Error(`Failed to load AI Paths settings (${res.status})`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  const normalized = data
    .map((item: unknown): AiPathsSettingRecord | null => {
      if (!item || typeof item !== 'object') return null;
      const key = (item as { key?: unknown }).key;
      const value = (item as { value?: unknown }).value;
      if (typeof key !== 'string' || typeof value !== 'string') return null;
      return { key, value };
    })
    .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
  if (normalized.length > 0) {
    writeBackupSettings(normalized);
  }
  return normalized;
};

export const fetchAiPathsSettingsCached = async (
  options?: { bypassCache?: boolean | undefined }
): Promise<AiPathsSettingRecord[]> => {
  if (!options?.bypassCache && isFreshCache() && aiPathsSettingsCache) {
    return aiPathsSettingsCache;
  }
  if (!options?.bypassCache && aiPathsSettingsInflight) {
    return await aiPathsSettingsInflight;
  }

  const request = fetchAiPathsSettingsFromApi()
    .then((records: AiPathsSettingRecord[]) => {
      aiPathsSettingsCache = records;
      aiPathsSettingsFetchedAt = Date.now();
      return records;
    })
    .catch((error: unknown) => {
      if (aiPathsSettingsCache) {
        console.warn('[ai-paths-settings] GET failed; using stale cache.', error);
        return aiPathsSettingsCache;
      }
      const backup = readBackupSettings();
      if (backup && backup.length > 0) {
        console.warn('[ai-paths-settings] GET failed; using local backup cache.', error);
        aiPathsSettingsCache = backup;
        aiPathsSettingsFetchedAt = Date.now();
        return backup;
      }
      throw error;
    })
    .finally(() => {
      aiPathsSettingsInflight = null;
    });

  aiPathsSettingsInflight = request;
  return await request;
};

export const updateAiPathsSettingsBulk = async (
  items: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  const payload = items.filter(
    (item): item is AiPathsSettingRecord =>
      Boolean(item) &&
      typeof item.key === 'string' &&
      item.key.startsWith('ai_paths_') &&
      typeof item.value === 'string'
  );
  if (payload.length === 0) return [];

  const res = await fetch('/api/ai-paths/settings', {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ items: payload }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update AI Paths settings (${res.status})`);
  }
  invalidateAiPathsSettingsCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ai-paths:settings:updated', { detail: { scope: 'ai-paths' } })
    );
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return payload;
  return data
    .map((item: unknown): AiPathsSettingRecord | null => {
      if (!item || typeof item !== 'object') return null;
      const key = (item as { key?: unknown }).key;
      const value = (item as { value?: unknown }).value;
      if (typeof key !== 'string' || typeof value !== 'string') return null;
      return { key, value };
    })
    .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
};

export const updateAiPathsSetting = async (
  key: string,
  value: string
): Promise<AiPathsSettingRecord> => {
  const res = await fetch('/api/ai-paths/settings', {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update AI Paths setting (${res.status})`);
  }
  invalidateAiPathsSettingsCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ai-paths:settings:updated', { detail: { scope: 'ai-paths' } })
    );
  }
  const data = (await res.json()) as unknown;
  if (!data || typeof data !== 'object') return { key, value };
  const nextKey = (data as { key?: unknown }).key;
  const nextValue = (data as { value?: unknown }).value;
  return {
    key: typeof nextKey === 'string' ? nextKey : key,
    value: typeof nextValue === 'string' ? nextValue : value,
  };
};
