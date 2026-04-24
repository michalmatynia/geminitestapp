import 'server-only';

import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
  type AiPathsMaintenanceActionId,
  type AiPathsMaintenanceApplyResult,
  type AiPathsMaintenanceReport,
  type AiPathsSettingRecord,
  type ParsedPathMeta,
} from './settings-store.constants';
import {
  assertMongoConfigured,
  isAiPathsKey,
  parsePositiveInt,
} from './settings-store.helpers';
import {
  buildAiPathsMaintenanceReport,
  resolveRequestedMaintenanceActionIds,
  runMaintenanceAction,
} from './settings-store.maintenance';
import { parsePathMetas, preservePathConfigFlagsOnSeed } from './settings-store.parsing';
import {
  ensureCanonicalStarterWorkflowRecordsForPathIds,
  getCanonicalStarterWorkflowPathIds,
  isCanonicalStarterWorkflowPathId,
} from './starter-workflows-settings';
import {
  deleteMongoAiPathsSettings,
  fetchMongoAiPathsSettings,
  upsertMongoAiPathsSettings,
  ensureMongoIndexes,
} from './settings-store.repository';
const AI_PATHS_MONGO_OP_TIMEOUT_MS = parsePositiveInt(
  process.env['AI_PATHS_MONGO_OP_TIMEOUT_MS'],
  15000
);

// Server-side in-memory cache — survives across requests in the same Node.js process.
// Prevents repeated cold-start MongoDB queries when the client re-fetches within the stale window.
// Override via AI_PATHS_SERVER_SETTINGS_CACHE_TTL_MS env var (milliseconds, 5000–600000).
const SERVER_SETTINGS_CACHE_TTL_MS = (() => {
  const raw = process.env['AI_PATHS_SERVER_SETTINGS_CACHE_TTL_MS'];
  if (!raw) return 60_000;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 60_000;
  return Math.max(5_000, Math.min(600_000, parsed));
})();
let serverSettingsCache: { records: AiPathsSettingRecord[]; cachedAt: number } | null = null;
let serverSettingsFetchInflight: Promise<AiPathsSettingRecord[]> | null = null;
const serverSettingsByKeysCache = new Map<
  string,
  { records: AiPathsSettingRecord[]; cachedAt: number }
>();
const serverSettingsByKeysInflight = new Map<string, Promise<AiPathsSettingRecord[]>>();
const SERVER_SETTINGS_BY_KEYS_CACHE_MAX = 200;

const normalizeServerSettingsKeys = (keys: string[]): string[] =>
  Array.from(new Set(keys.filter(isAiPathsKey))).sort();

const getServerSettingsByKeysCacheKey = (keys: string[]): string => keys.join('\u0001');

const pruneServerSettingsByKeysCache = (): void => {
  if (serverSettingsByKeysCache.size <= SERVER_SETTINGS_BY_KEYS_CACHE_MAX) return;
  const entries = Array.from(serverSettingsByKeysCache.entries()).sort(
    (a, b) => a[1].cachedAt - b[1].cachedAt
  );
  const overflow = entries.length - SERVER_SETTINGS_BY_KEYS_CACHE_MAX;
  for (let index = 0; index < overflow; index += 1) {
    const key = entries[index]?.[0];
    if (!key) continue;
    serverSettingsByKeysCache.delete(key);
  }
};

const invalidateServerSettingsCache = (): void => {
  serverSettingsCache = null;
  serverSettingsFetchInflight = null;
  serverSettingsByKeysCache.clear();
  serverSettingsByKeysInflight.clear();
};

export async function getAiPathsSettings(
  keys?: string[],
  options?: { bypassCache?: boolean }
): Promise<AiPathsSettingRecord[]> {
  if (!keys || keys.length === 0) {
    // Return server-side cache if fresh and not bypassed
    if (
      !options?.bypassCache &&
      serverSettingsCache &&
      Date.now() - serverSettingsCache.cachedAt < SERVER_SETTINGS_CACHE_TTL_MS
    ) {
      return serverSettingsCache.records;
    }
    // Deduplicate concurrent in-flight fetches
    if (!options?.bypassCache && serverSettingsFetchInflight) {
      return await serverSettingsFetchInflight;
    }

    const fetchAll = async (): Promise<AiPathsSettingRecord[]> => {
      assertMongoConfigured();
      // Fetch index and then all configs
      const indexRecord = await fetchMongoAiPathsSettings(
        [AI_PATHS_INDEX_KEY],
        AI_PATHS_MONGO_OP_TIMEOUT_MS
      );
      if (!indexRecord.length) return [];
      const metas = parsePathMetas(indexRecord[0]?.value);
      const configKeys = metas.map((m) => `${AI_PATHS_CONFIG_KEY_PREFIX}${m.id}`);
      const triggerButtonsKey = AI_PATHS_TRIGGER_BUTTONS_KEY;
      const allKeys = [AI_PATHS_INDEX_KEY, triggerButtonsKey, ...configKeys];

      // Fetch with keys (no cache check — we already resolved the key list)
      return getAiPathsSettings(allKeys, options);
    };

    const promise = fetchAll()
      .then((records) => {
        serverSettingsCache = { records, cachedAt: Date.now() };
        return records;
      })
      .finally(() => {
        serverSettingsFetchInflight = null;
      });

    serverSettingsFetchInflight = promise;
    return await promise;
  }

  const normalizedKeys = normalizeServerSettingsKeys(keys);
  if (normalizedKeys.length === 0) return [];

  if (!options?.bypassCache) {
    const keysetCacheKey = getServerSettingsByKeysCacheKey(normalizedKeys);
    const cached = serverSettingsByKeysCache.get(keysetCacheKey);
    if (cached && Date.now() - cached.cachedAt < SERVER_SETTINGS_CACHE_TTL_MS) {
      return cached.records;
    }
    const inflight = serverSettingsByKeysInflight.get(keysetCacheKey);
    if (inflight) {
      return await inflight;
    }

    const fetchByKeys = (async () => {
      assertMongoConfigured();
      return await fetchMongoAiPathsSettings(normalizedKeys, AI_PATHS_MONGO_OP_TIMEOUT_MS);
    })().then((records) => {
        serverSettingsByKeysCache.set(keysetCacheKey, {
          records,
          cachedAt: Date.now(),
        });
        pruneServerSettingsByKeysCache();
        return records;
      })
      .finally(() => {
        serverSettingsByKeysInflight.delete(keysetCacheKey);
      });
    serverSettingsByKeysInflight.set(keysetCacheKey, fetchByKeys);
    return await fetchByKeys;
  }

  assertMongoConfigured();
  return await fetchMongoAiPathsSettings(normalizedKeys, AI_PATHS_MONGO_OP_TIMEOUT_MS);
}

export async function getAiPathsSetting(key: string): Promise<string | null> {
  const records = await getAiPathsSettings([key]);
  return records[0]?.value ?? null;
}

export async function getAllAiPathsSettings(options?: {
  bypassCache?: boolean;
}): Promise<AiPathsSettingRecord[]> {
  return await getAiPathsSettings(undefined, options);
}

export const listAiPathsSettings = getAiPathsSettings;

export async function upsertAiPathsSettings(records: AiPathsSettingRecord[]): Promise<void> {
  const normalized = records.filter((r) => isAiPathsKey(r.key));
  if (normalized.length === 0) return;

  assertMongoConfigured();
  await ensureMongoIndexes(AI_PATHS_MONGO_OP_TIMEOUT_MS);

  await upsertMongoAiPathsSettings(normalized, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  invalidateServerSettingsCache();
}

export const upsertAiPathsSettingsBulk = upsertAiPathsSettings;

export async function upsertAiPathsSetting(key: string, value: string): Promise<void> {
  await upsertAiPathsSettings([{ key, value }]);
}

export async function deleteAiPathsSettings(keys: string[]): Promise<number> {
  const normalizedKeys = keys.filter(isAiPathsKey);
  if (normalizedKeys.length === 0) return 0;

  assertMongoConfigured();
  await ensureMongoIndexes(AI_PATHS_MONGO_OP_TIMEOUT_MS);

  await deleteMongoAiPathsSettings(normalizedKeys, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  invalidateServerSettingsCache();
  return normalizedKeys.length;
}

export async function ensureCanonicalStarterWorkflowSettingsForPathIds(
  pathIds?: string[]
): Promise<{ records: AiPathsSettingRecord[]; affectedCount: number }> {
  const targetPathIds =
    pathIds && pathIds.length > 0
      ? Array.from(new Set(pathIds.map((pathId) => pathId.trim()).filter(isCanonicalStarterWorkflowPathId)))
      : getCanonicalStarterWorkflowPathIds();
  if (targetPathIds.length === 0) {
    return { records: [], affectedCount: 0 };
  }

  const allSettings = await getAllAiPathsSettings({ bypassCache: true });
  const result = ensureCanonicalStarterWorkflowRecordsForPathIds(allSettings, targetPathIds);
  if (result.affectedCount > 0) {
    await upsertAiPathsSettings(result.nextRecords);
  }

  return {
    records: result.nextRecords,
    affectedCount: result.affectedCount,
  };
}

export const runAiPathsMaintenance = async (
  actionIds?: AiPathsMaintenanceActionId[]
): Promise<AiPathsMaintenanceApplyResult> => {
  const allSettings = await getAllAiPathsSettings();
  const report = buildAiPathsMaintenanceReport(allSettings);
  const requestedIds = resolveRequestedMaintenanceActionIds(report, actionIds);

  const appliedActionIds: AiPathsMaintenanceActionId[] = [];
  const deletedKeys = new Set<string>();
  let currentRecords = [...allSettings];

  for (const id of requestedIds) {
    const actionReport = runMaintenanceAction({
      actionId: id,
      records: currentRecords,
    });
    if (actionReport.success) {
      appliedActionIds.push(id);
      currentRecords = actionReport.nextRecords;
      actionReport.deletedKeys.forEach((key) => deletedKeys.add(key));
    }
  }

  if (appliedActionIds.length > 0) {
    await upsertAiPathsSettings(currentRecords);
    if (deletedKeys.size > 0) {
      await deleteAiPathsSettings([...deletedKeys]);
    }
  }

  return {
    appliedActionIds,
    report: buildAiPathsMaintenanceReport(currentRecords),
  };
};

export const inspectAiPathsSettingsMaintenance = async (): Promise<AiPathsMaintenanceReport> => {
  const allSettings = await getAllAiPathsSettings();
  return buildAiPathsMaintenanceReport(allSettings);
};

export const applyAiPathsSettingsMaintenance = async (
  actionIds?: AiPathsMaintenanceActionId[]
): Promise<AiPathsMaintenanceApplyResult> => {
  return runAiPathsMaintenance(actionIds);
};

export const __testOnly = {
  preservePathConfigFlagsOnSeed,
};

export type {
  AiPathsSettingRecord,
  AiPathsMaintenanceReport,
  AiPathsMaintenanceApplyResult,
  ParsedPathMeta,
};
