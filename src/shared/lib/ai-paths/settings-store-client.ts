import {
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  aiPathsMaintenanceApplyResultSchema,
  aiPathsMaintenanceReportSchema,
  type AiPathsMaintenanceActionId,
  type AiPathsMaintenanceReport,
  type AiPathsMaintenanceApplyResult,
} from '@/shared/contracts/ai-paths';
import { settingRecordSchema, type SettingRecord as AiPathsSettingRecord } from '@/shared/contracts/settings';
import { ApiError, api } from '@/shared/lib/api-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger-client';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

export type { AiPathsSettingRecord };
export { AI_PATHS_MAINTENANCE_ACTION_IDS };
export type {
  AiPathsMaintenanceActionId,
  AiPathsMaintenanceReport,
  AiPathsMaintenanceApplyResult,
};

const AI_PATHS_SETTINGS_STALE_MS = 60_000;
const AI_PATHS_SETTINGS_BACKUP_KEY = 'ai_paths_settings_backup';
const AI_PATHS_SETTINGS_RETRY_DELAYS_MS = [500, 1500];
const AI_PATHS_SETTINGS_BACKUP_MAX_AGE_MS = 300_000;
const AI_PATHS_SETTINGS_BACKUP_MAX_BYTES = 1_000_000;
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

const aiPathsSettingRecordsSchema = settingRecordSchema.array();

const estimateUtf8Bytes = (value: string): number => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).byteLength;
  }
  return value.length;
};

const isQuotaExceededStorageError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const normalizedName = error.name.trim().toLowerCase();
  const normalizedMessage = error.message.trim().toLowerCase();
  return (
    normalizedName.includes('quota') ||
    normalizedMessage.includes('quota') ||
    normalizedMessage.includes('exceeded the quota')
  );
};

type AiPathsSettingsBackupPayload = {
  records: unknown;
  savedAt: number;
};

const parseBackupPayload = (raw: string): AiPathsSettingsBackupPayload | null => {
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const parsedRecord = parsed as { records?: unknown; savedAt?: unknown };

  if (!Array.isArray(parsedRecord.records) || typeof parsedRecord.savedAt !== 'number') {
    return null;
  }

  return {
    records: parsedRecord.records,
    savedAt: parsedRecord.savedAt,
  };
};

const isFreshBackupTimestamp = (savedAt: number): boolean =>
  Date.now() - savedAt <= AI_PATHS_SETTINGS_BACKUP_MAX_AGE_MS;

const parseBackupRecords = (records: unknown): AiPathsSettingRecord[] | null => {
  const parsedSettings = aiPathsSettingRecordsSchema.safeParse(records);

  if (!parsedSettings.success) {
    return null;
  }

  return parsedSettings.data.length > 0 ? parsedSettings.data : null;
};

const readBackupSettings = (): AiPathsSettingRecord[] | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AI_PATHS_SETTINGS_BACKUP_KEY);

    if (!raw) return null;

    const payload = parseBackupPayload(raw);

    if (!payload || !isFreshBackupTimestamp(payload.savedAt)) {
      return null;
    }

    return parseBackupRecords(payload.records);
  } catch (error) {
    logClientCatch(error, {
      source: 'ai-paths-settings-client',
      action: 'readBackupSettings',
      storageKey: AI_PATHS_SETTINGS_BACKUP_KEY,
    });
    return null;
  }
};

const writeBackupSettings = (records: AiPathsSettingRecord[]): void => {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({ savedAt: Date.now(), records });
  if (estimateUtf8Bytes(payload) > AI_PATHS_SETTINGS_BACKUP_MAX_BYTES) {
    return;
  }
  try {
    window.localStorage.setItem(AI_PATHS_SETTINGS_BACKUP_KEY, payload);
  } catch (error) {
    if (isQuotaExceededStorageError(error)) {
      return;
    }
    logClientCatch(error, {
      source: 'ai-paths-settings-client',
      action: 'writeBackupSettings',
      storageKey: AI_PATHS_SETTINGS_BACKUP_KEY,
      recordCount: records.length,
    });

    // Ignore storage failures in private mode/quota conditions.
  }
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const shouldRetrySettingsFetch = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  // Don't retry client-side timeouts — if MongoDB was slow once it'll be slow again.
  if (error.name === 'TimeoutError') return false;
  const message = error.message.toLowerCase();
  // Don't retry generic network failures — they're usually caused by page
  // re-renders / HMR aborting in-flight requests and retrying just generates
  // error spam. Only retry explicit server 5xx (handled in the response check).
  if (message.includes('failed to fetch') || message.includes('load failed')) return false;
  return (
    message.includes('network') ||
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

const createSettingsTimeoutError = (timeoutMs: number): Error =>
  Object.assign(new Error(`AI Paths settings request timed out after ${timeoutMs}ms`), {
    name: 'TimeoutError',
  });

const getSettingsRetryDelay = (attempt: number): number =>
  AI_PATHS_SETTINGS_RETRY_DELAYS_MS[attempt] ?? 250;

const shouldRetrySettingsResponse = (response: Response, attempt: number): boolean =>
  response.status >= 500 && attempt < AI_PATHS_SETTINGS_RETRY_DELAYS_MS.length;

const createSettingsAbortController = (timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} => {
  const controller = new AbortController();
  const timeoutError = createSettingsTimeoutError(timeoutMs);
  const timeoutId = setTimeout(() => controller.abort(timeoutError), timeoutMs);

  return { controller, timeoutId };
};

const fetchAiPathsSettingsAttempt = async (args: {
  requestUrl: string;
  timeoutMs: number;
}): Promise<Response> => {
  const { requestUrl, timeoutMs } = args;
  const { controller, timeoutId } = createSettingsAbortController(timeoutMs);

  try {
    return await fetch(requestUrl, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchAiPathsSettingsResponse = async (options?: {
  keys?: string[] | undefined;
  timeoutMs?: number | undefined;
}): Promise<Response> => {
  const timeoutMs = options?.timeoutMs ?? AI_PATHS_SETTINGS_REQUEST_TIMEOUT_MS;
  const requestUrl = buildAiPathsSettingsUrl(options?.keys);
  let lastError: unknown;

  for (let attempt = 0; attempt <= AI_PATHS_SETTINGS_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchAiPathsSettingsAttempt({ requestUrl, timeoutMs });

      if (response.ok) return response;

      if (shouldRetrySettingsResponse(response, attempt)) {
        await sleep(getSettingsRetryDelay(attempt));
        continue;
      }

      return response;
    } catch (error) {
      logClientCatch(error, {
        source: 'ai-paths-settings-client',
        action: 'fetchSettingsResponse',
        requestUrl,
        timeoutMs,
        attempt,
      });
      lastError = error;

      if (!shouldRetrySettingsFetch(error) || attempt >= AI_PATHS_SETTINGS_RETRY_DELAYS_MS.length) {
        break;
      }

      await sleep(getSettingsRetryDelay(attempt));
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
  const parsedSettings = aiPathsSettingRecordsSchema.safeParse(await res.json());
  if (!parsedSettings.success) return [];
  const normalized = parsedSettings.data;
  if (normalized.length > 0 && (!options?.keys || options.keys.length === 0)) {
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
        void logSystemEvent({
          level: 'info',
          source: 'ai-paths-settings-client',
          message: 'Fetched full settings payload',
          context: {
            durationMs,
            recordCount: records.length,
            payloadBytes,
          },
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
        void logSystemEvent({
          level: 'info',
          source: 'ai-paths-settings-client',
          message: 'Fetched selective settings payload',
          context: {
            durationMs,
            requestedKeys: normalizedKeys.length,
            recordCount: orderedRecords.length,
            payloadBytes,
          },
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
      const backup = readBackupSettings();
      if (backup && backup.length > 0) {
        const byKey = new Map(backup.map((record) => [record.key, record]));
        const fromBackup = normalizedKeys
          .map((key) => byKey.get(key) ?? null)
          .filter((record): record is AiPathsSettingRecord => Boolean(record));
        if (fromBackup.length > 0) {
          logClientError(error, {
            context: {
              source: 'ai-paths-settings-client',
              action: 'fetchByKeysCached',
              message: 'Selective GET failed; using local backup subset.',
              level: 'warn',
              requestedKeys: normalizedKeys.length,
              resolvedKeys: fromBackup.length,
            },
          });
          aiPathsSettingsCache = backup;
          aiPathsSettingsFetchedAt = Date.now();
          return fromBackup;
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

  let data: AiPathsSettingRecord[] | unknown;
  try {
    data = await api.post<AiPathsSettingRecord[]>(
      '/api/ai-paths/settings',
      { items: payload },
      {
        timeout: AI_PATHS_SETTINGS_WRITE_TIMEOUT_MS,
      }
    );
  } catch (error) {
    logClientCatch(error, {
      source: 'ai-paths-settings-client',
      action: 'updateSettingsBulk',
      itemCount: payload.length,
    });
    if (error instanceof ApiError) {
      throw new Error(`Failed to update AI Paths settings (${error.status})`, { cause: error });
    }
    throw error;
  }
  invalidateAiPathsSettingsCache();
  dispatchAiPathsSettingsUpdatedEvent();
  const parsedSettings = aiPathsSettingRecordsSchema.safeParse(data);
  return parsedSettings.success ? parsedSettings.data : payload;
};

export const updateAiPathsSetting = async (
  key: string,
  value: string
): Promise<AiPathsSettingRecord> => {
  let data: AiPathsSettingRecord | unknown;
  try {
    data = await api.post<AiPathsSettingRecord>(
      '/api/ai-paths/settings',
      { key, value },
      {
        timeout: AI_PATHS_SETTINGS_WRITE_TIMEOUT_MS,
      }
    );
  } catch (error) {
    logClientCatch(error, {
      source: 'ai-paths-settings-client',
      action: 'updateSetting',
      key,
    });
    if (error instanceof ApiError) {
      throw new Error(`Failed to update AI Paths setting (${error.status})`, { cause: error });
    }
    throw error;
  }
  invalidateAiPathsSettingsCache();
  dispatchAiPathsSettingsUpdatedEvent();
  const parsedSetting = settingRecordSchema.safeParse(data);
  return parsedSetting.success ? parsedSetting.data : { key, value };
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
    logClientCatch(error, {
      source: 'ai-paths-settings-client',
      action: 'deleteSettings',
      keyCount: normalizedKeys.length,
    });
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
  let data: AiPathsMaintenanceReport | unknown;
  try {
    data = await api.get<AiPathsMaintenanceReport>('/api/ai-paths/settings/maintenance');
  } catch (error) {
    logClientCatch(error, {
      source: 'ai-paths-settings-client',
      action: 'fetchMaintenanceReport',
    });
    if (error instanceof ApiError) {
      throw new Error(`Failed to load AI Paths maintenance report (${error.status})`, {
        cause: error,
      });
    }
    throw error;
  }
  return aiPathsMaintenanceReportSchema.parse(data);
};

export const applyAiPathsMaintenanceActions = async (
  actionIds?: AiPathsMaintenanceActionId[]
): Promise<AiPathsMaintenanceApplyResult> => {
  const normalizedActionIds =
    actionIds && actionIds.length > 0 ? Array.from(new Set(actionIds)) : undefined;
  let data: AiPathsMaintenanceApplyResult | unknown;
  try {
    data = await api.post<AiPathsMaintenanceApplyResult>('/api/ai-paths/settings/maintenance', {
      ...(normalizedActionIds ? { actionIds: normalizedActionIds } : {}),
    });
  } catch (error) {
    logClientCatch(error, {
      source: 'ai-paths-settings-client',
      action: 'applyMaintenanceActions',
      actionCount: normalizedActionIds?.length ?? 0,
    });
    if (error instanceof ApiError) {
      throw new Error(`Failed to apply AI Paths maintenance (${error.status})`, {
        cause: error,
      });
    }
    throw error;
  }

  const parsed = aiPathsMaintenanceApplyResultSchema.parse(data);
  invalidateAiPathsSettingsCache();
  dispatchAiPathsSettingsUpdatedEvent();
  return parsed;
};
