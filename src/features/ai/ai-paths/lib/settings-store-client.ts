'use client';

import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

export type AiPathsSettingRecord = {
  key: string;
  value: string;
};

const AI_PATHS_SETTINGS_STALE_MS = 10_000;

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

const fetchAiPathsSettingsFromApi = async (): Promise<AiPathsSettingRecord[]> => {
  const res = await fetch('/api/ai-paths/settings', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load AI Paths settings (${res.status})`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
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
  const data = (await res.json()) as unknown;
  if (!data || typeof data !== 'object') return { key, value };
  const nextKey = (data as { key?: unknown }).key;
  const nextValue = (data as { value?: unknown }).value;
  return {
    key: typeof nextKey === 'string' ? nextKey : key,
    value: typeof nextValue === 'string' ? nextValue : value,
  };
};

