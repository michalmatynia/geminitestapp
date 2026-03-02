'use client';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { SettingRecordDto } from '@/shared/contracts/settings';
import { ApiError, api } from '@/shared/lib/api-client';
import {
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  type AiPathsMaintenanceActionId,
  type AiPathsMaintenanceActionReport,
  type AiPathsMaintenanceReport,
  type AiPathsMaintenanceApplyResult,
} from '@/shared/contracts/ai-paths';

export type AiPathsSettingRecord = SettingRecordDto;
export { AI_PATHS_MAINTENANCE_ACTION_IDS };
export type {
  AiPathsMaintenanceActionId,
  AiPathsMaintenanceActionReport,
  AiPathsMaintenanceReport,
  AiPathsMaintenanceApplyResult,
};

const AI_PATHS_SETTINGS_STALE_MS = 10_000;
const AI_PATHS_SETTINGS_BACKUP_KEY = 'ai_paths_settings_backup_v1';
const AI_PATHS_SETTINGS_RETRY_DELAYS_MS = [500, 1500];
const AI_PATHS_SETTINGS_BACKUP_MAX_AGE_MS = 60_000;
const AI_PATHS_SETTINGS_REQUEST_TIMEOUT_MS = 25_000;
const AI_PATHS_SETTINGS_SELECTIVE_REQUEST_TIMEOUT_MS = 8_000;
const AI_PATHS_SETTINGS_WRITE_TIMEOUT_MS = 90_000;
const AI_PATHS_SETTINGS_MAX_QUERY_KEYS = 500;
const AI_PATHS_SETTINGS_MAX_KEY_LENGTH = 200;

let aiPathsSettingsCache: AiPathsSettingRecord[] | null = null;
let aiPathsSettingsFetchedAt = 0;
let aiPathsSettingsInflight: Promise<AiPathsSettingRecord[]> | null = null;
const aiPathsSettingsByKeysCache = new Map<
  string,
  { records: AiPathsSettingRecord[]; fetchedAt: number }
>();
const aiPathsSettingsByKeysInflight = new Map<string, Promise<AiPathsSettingRecord[]>>();

const isFreshCache = (): boolean =>
  Boolean(aiPathsSettingsCache) &&
  Date.now() - aiPathsSettingsFetchedAt < AI_PATHS_SETTINGS_STALE_MS;

export const invalidateAiPathsSettingsCache = (): void => {
  aiPathsSettingsCache = null;
  aiPathsSettingsFetchedAt = 0;
  aiPathsSettingsInflight = null;
  aiPathsSettingsByKeysCache.clear();
  aiPathsSettingsByKeysInflight.clear();
};

const dispatchAiPathsSettingsUpdatedEvent = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('ai-paths:settings:updated', { detail: { scope: 'ai-paths' } })
  );
};

const isAiPathsMaintenanceActionId = (value: unknown): value is AiPathsMaintenanceActionId =>
  typeof value === 'string' &&
  (AI_PATHS_MAINTENANCE_ACTION_IDS as readonly string[]).includes(value);

const normalizeAiPathsMaintenanceAction = (
  value: unknown
): AiPathsMaintenanceActionReport | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const id = item['id'];
  const status = item['status'];
  if (!isAiPathsMaintenanceActionId(id)) return null;
  if (status !== 'pending' && status !== 'ready') return null;
  return {
    id,
    title: typeof item['title'] === 'string' ? item['title'] : id,
    description: typeof item['description'] === 'string' ? item['description'] : '',
    blocking: item['blocking'] === true,
    status,
    affectedRecords:
      typeof item['affectedRecords'] === 'number' && Number.isFinite(item['affectedRecords'])
        ? Math.max(0, Math.trunc(item['affectedRecords']))
        : 0,
  };
};

const normalizeAiPathsMaintenanceReport = (value: unknown): AiPathsMaintenanceReport => {
  if (!value || typeof value !== 'object') {
    return {
      scannedAt: new Date().toISOString(),
      pendingActions: 0,
      blockingActions: 0,
      actions: [],
    };
  }
  const payload = value as Record<string, unknown>;
  const actionsRaw = Array.isArray(payload['actions']) ? payload['actions'] : [];
  const actions = actionsRaw
    .map((item: unknown): AiPathsMaintenanceActionReport | null =>
      normalizeAiPathsMaintenanceAction(item)
    )
    .filter((item: AiPathsMaintenanceActionReport | null): item is AiPathsMaintenanceActionReport =>
      Boolean(item)
    );
  const pendingActions = actions.filter((item) => item.status === 'pending');
  return {
    scannedAt:
      typeof payload['scannedAt'] === 'string' && payload['scannedAt'].trim().length > 0
        ? payload['scannedAt']
        : new Date().toISOString(),
    pendingActions:
      typeof payload['pendingActions'] === 'number' && Number.isFinite(payload['pendingActions'])
        ? Math.max(0, Math.trunc(payload['pendingActions']))
        : pendingActions.length,
    blockingActions:
      typeof payload['blockingActions'] === 'number' && Number.isFinite(payload['blockingActions'])
        ? Math.max(0, Math.trunc(payload['blockingActions']))
        : pendingActions.filter((item) => item.blocking).length,
    actions,
  };
};

const readBackupSettings = (): AiPathsSettingRecord[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AI_PATHS_SETTINGS_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const records = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as { records?: unknown }).records)
        ? (parsed as { records: unknown[] }).records
        : null;
    if (!records) return null;
    const backupAgeMs =
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { savedAt?: unknown }).savedAt === 'number'
        ? Date.now() - (parsed as { savedAt: number }).savedAt
        : Number.POSITIVE_INFINITY;
    if (backupAgeMs > AI_PATHS_SETTINGS_BACKUP_MAX_AGE_MS) {
      return null;
    }
    const normalized = records
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
    window.localStorage.setItem(
      AI_PATHS_SETTINGS_BACKUP_KEY,
      JSON.stringify({ savedAt: Date.now(), records })
    );
  } catch {
    // Ignore storage failures in private mode/quota conditions.
  }
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const shouldRetrySettingsFetch = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  // Don't retry explicit client-side timeouts — if MongoDB was slow once it'll be slow again
  if (error.name === 'TimeoutError') return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('load failed') ||
    message.includes('aborted') ||
    message.includes('abort')
  );
};

const normalizeAiPathsSettingsKeys = (keys: string[]): string[] => {
  const normalized = Array.from(
    new Set(
      keys
        .map((key) => key.trim())
        .filter(
          (key) =>
            key.length > 0 &&
            key.length <= AI_PATHS_SETTINGS_MAX_KEY_LENGTH &&
            key.startsWith('ai_paths_')
        )
    )
  ).sort();
  if (normalized.length > AI_PATHS_SETTINGS_MAX_QUERY_KEYS) {
    throw new Error(
      `Too many AI Paths keys requested (${normalized.length}). Maximum is ${AI_PATHS_SETTINGS_MAX_QUERY_KEYS}.`
    );
  }
  return normalized;
};

const createAiPathsKeysCacheKey = (keys: string[]): string => keys.join('\u0001');

const buildAiPathsSettingsUrl = (keys?: string[]): string => {
  if (!keys || keys.length === 0) return '/api/ai-paths/settings';
  const params = new URLSearchParams();
  keys.forEach((key) => {
    params.append('keys', key);
  });
  return `/api/ai-paths/settings?${params.toString()}`;
};

const fetchAiPathsSettingsResponse = async (options?: {
  keys?: string[] | undefined;
  timeoutMs?: number | undefined;
}): Promise<Response> => {
  const timeoutMs = options?.timeoutMs ?? AI_PATHS_SETTINGS_REQUEST_TIMEOUT_MS;
  const requestUrl = buildAiPathsSettingsUrl(options?.keys);
  let lastError: unknown;
  for (let attempt = 0; attempt <= AI_PATHS_SETTINGS_RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeoutError = Object.assign(
      new Error(`AI Paths settings request timed out after ${timeoutMs}ms`),
      { name: 'TimeoutError' }
    );
    const timeoutId = setTimeout(() => controller.abort(timeoutError), timeoutMs);
    try {
      const response = await fetch(requestUrl, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) return response;
      if (response.status >= 500 && attempt < AI_PATHS_SETTINGS_RETRY_DELAYS_MS.length) {
        await sleep(AI_PATHS_SETTINGS_RETRY_DELAYS_MS[attempt] ?? 250);
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (!shouldRetrySettingsFetch(error) || attempt >= AI_PATHS_SETTINGS_RETRY_DELAYS_MS.length) {
        break;
      }
      await sleep(AI_PATHS_SETTINGS_RETRY_DELAYS_MS[attempt] ?? 250);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to fetch AI Paths settings.');
};

const fetchAiPathsSettingsFromApi = async (options?: {
  keys?: string[] | undefined;
  timeoutMs?: number | undefined;
}): Promise<AiPathsSettingRecord[]> => {
  const res = await fetchAiPathsSettingsResponse(options);
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

export const fetchAiPathsSettingsCached = async (options?: {
  bypassCache?: boolean | undefined;
}): Promise<AiPathsSettingRecord[]> => {
  if (!options?.bypassCache && isFreshCache() && aiPathsSettingsCache) {
    return aiPathsSettingsCache;
  }
  if (!options?.bypassCache && aiPathsSettingsInflight) {
    return await aiPathsSettingsInflight;
  }

  const startedAt = Date.now();
  const request = fetchAiPathsSettingsFromApi()
    .then((records: AiPathsSettingRecord[]) => {
      aiPathsSettingsCache = records;
      aiPathsSettingsFetchedAt = Date.now();
      const durationMs = Date.now() - startedAt;
      if (durationMs >= 250) {
        const payloadBytes = records.reduce(
          (sum, item) => sum + item.key.length + item.value.length,
          0
        );
        console.info('[ai-paths-settings-client] fetched full settings', {
          durationMs,
          recordCount: records.length,
          payloadBytes,
        });
      }
      return records;
    })
    .catch((error: unknown) => {
      if (aiPathsSettingsCache) {
        logClientError(error, {
          context: {
            source: 'ai-paths-settings-client',
            action: 'fetchCached',
            message: 'GET failed; using stale cache.',
            level: 'warn',
          },
        });
        return aiPathsSettingsCache;
      }
      const backup = readBackupSettings();
      if (backup && backup.length > 0) {
        logClientError(error, {
          context: {
            source: 'ai-paths-settings-client',
            action: 'fetchCached',
            message: 'GET failed; using local backup cache.',
            level: 'warn',
          },
        });
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

export const fetchAiPathsSettingsByKeysCached = async (
  keys: string[],
  options?: {
    bypassCache?: boolean | undefined;
    timeoutMs?: number | undefined;
  }
): Promise<AiPathsSettingRecord[]> => {
  const normalizedKeys = normalizeAiPathsSettingsKeys(keys);
  if (normalizedKeys.length === 0) return [];
  const cacheKey = createAiPathsKeysCacheKey(normalizedKeys);
  const bypassCache = options?.bypassCache === true;
  const timeoutMs = options?.timeoutMs ?? AI_PATHS_SETTINGS_SELECTIVE_REQUEST_TIMEOUT_MS;

  if (!bypassCache) {
    const cached = aiPathsSettingsByKeysCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < AI_PATHS_SETTINGS_STALE_MS) {
      return cached.records;
    }
    const inflight = aiPathsSettingsByKeysInflight.get(cacheKey);
    if (inflight) return await inflight;
  }

  const startedAt = Date.now();
  const request = fetchAiPathsSettingsFromApi({ keys: normalizedKeys, timeoutMs })
    .then((records: AiPathsSettingRecord[]) => {
      const byKey = new Map(records.map((record) => [record.key, record]));
      const orderedRecords = normalizedKeys
        .map((key) => byKey.get(key) ?? null)
        .filter((record): record is AiPathsSettingRecord => Boolean(record));
      aiPathsSettingsByKeysCache.set(cacheKey, {
        records: orderedRecords,
        fetchedAt: Date.now(),
      });
      const durationMs = Date.now() - startedAt;
      if (durationMs >= 150) {
        const payloadBytes = orderedRecords.reduce(
          (sum, item) => sum + item.key.length + item.value.length,
          0
        );
        console.info('[ai-paths-settings-client] fetched selective settings', {
          durationMs,
          requestedKeys: normalizedKeys.length,
          recordCount: orderedRecords.length,
          payloadBytes,
        });
      }
      return orderedRecords;
    })
    .catch((error: unknown) => {
      const fullCache = aiPathsSettingsCache;
      if (fullCache) {
        const byKey = new Map(fullCache.map((record) => [record.key, record]));
        const fromFullCache = normalizedKeys
          .map((key) => byKey.get(key) ?? null)
          .filter((record): record is AiPathsSettingRecord => Boolean(record));
        if (fromFullCache.length > 0) {
          logClientError(error, {
            context: {
              source: 'ai-paths-settings-client',
              action: 'fetchByKeysCached',
              message: 'Selective GET failed; using full cache subset.',
              level: 'warn',
              requestedKeys: normalizedKeys.length,
              resolvedKeys: fromFullCache.length,
            },
          });
          return fromFullCache;
        }
      }
      throw error;
    })
    .finally(() => {
      aiPathsSettingsByKeysInflight.delete(cacheKey);
    });

  aiPathsSettingsByKeysInflight.set(cacheKey, request);
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

  let data: unknown;
  try {
    data = await api.post<unknown>('/api/ai-paths/settings', { items: payload }, {
      timeout: AI_PATHS_SETTINGS_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(`Failed to update AI Paths settings (${error.status})`, { cause: error });
    }
    throw error;
  }
  invalidateAiPathsSettingsCache();
  dispatchAiPathsSettingsUpdatedEvent();
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
  let data: unknown;
  try {
    data = await api.post<unknown>('/api/ai-paths/settings', { key, value }, {
      timeout: AI_PATHS_SETTINGS_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(`Failed to update AI Paths setting (${error.status})`, { cause: error });
    }
    throw error;
  }
  invalidateAiPathsSettingsCache();
  dispatchAiPathsSettingsUpdatedEvent();
  if (!data || typeof data !== 'object') return { key, value };
  const nextKey = (data as { key?: unknown }).key;
  const nextValue = (data as { value?: unknown }).value;
  return {
    key: typeof nextKey === 'string' ? nextKey : key,
    value: typeof nextValue === 'string' ? nextValue : value,
  };
};

export const deleteAiPathsSettings = async (keys: string[]): Promise<number> => {
  const normalizedKeys = Array.from(
    new Set(
      keys.filter((key: string): boolean => typeof key === 'string' && key.startsWith('ai_paths_'))
    )
  );
  if (normalizedKeys.length === 0) return 0;

  let data: { deletedCount?: unknown } | null;
  try {
    data = await api.delete<{ deletedCount?: unknown }>('/api/ai-paths/settings', {
      body: JSON.stringify({ keys: normalizedKeys }),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(`Failed to delete AI Paths settings (${error.status})`, { cause: error });
    }
    throw error;
  }
  invalidateAiPathsSettingsCache();
  dispatchAiPathsSettingsUpdatedEvent();
  return typeof data?.deletedCount === 'number' ? data.deletedCount : 0;
};

export const fetchAiPathsMaintenanceReport = async (): Promise<AiPathsMaintenanceReport> => {
  let data: unknown;
  try {
    data = await api.get<unknown>('/api/ai-paths/settings/maintenance');
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(`Failed to load AI Paths maintenance report (${error.status})`, {
        cause: error,
      });
    }
    throw error;
  }
  return normalizeAiPathsMaintenanceReport(data);
};

export const applyAiPathsMaintenanceActions = async (
  actionIds?: AiPathsMaintenanceActionId[]
): Promise<AiPathsMaintenanceApplyResult> => {
  const normalizedActionIds =
    actionIds && actionIds.length > 0
      ? Array.from(
        new Set(
          actionIds.filter((actionId): actionId is AiPathsMaintenanceActionId =>
            isAiPathsMaintenanceActionId(actionId)
          )
        )
      )
      : undefined;
  let data: unknown;
  try {
    data = await api.post<unknown>('/api/ai-paths/settings/maintenance', {
      ...(normalizedActionIds ? { actionIds: normalizedActionIds } : {}),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(`Failed to apply AI Paths maintenance (${error.status})`, {
        cause: error,
      });
    }
    throw error;
  }

  const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const appliedActionIds = Array.isArray(payload['appliedActionIds'])
    ? payload['appliedActionIds'].filter((value: unknown): value is AiPathsMaintenanceActionId =>
      isAiPathsMaintenanceActionId(value)
    )
    : [];
  const report = normalizeAiPathsMaintenanceReport(payload['report']);
  invalidateAiPathsSettingsCache();
  dispatchAiPathsSettingsUpdatedEvent();
  return {
    appliedActionIds,
    report,
  };
};
