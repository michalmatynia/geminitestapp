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
  parseBooleanEnv,
  parsePositiveInt,
} from './settings-store.helpers';
import { parsePathMetas, preservePathConfigFlagsOnSeed } from './settings-store.parsing';
import {
  buildAiPathsMaintenanceReport,
  resolveRequestedMaintenanceActionIds,
  runMaintenanceAction,
} from './settings-store.maintenance';
import {
  deleteMongoAiPathsSettings,
  fetchMongoAiPathsSettings,
  upsertMongoAiPathsSettings,
  ensureMongoIndexes,
} from './settings-store.repository';
import { ensureStarterWorkflowDefaults } from './starter-workflows-settings';

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

const invalidateServerSettingsCache = (): void => {
  serverSettingsCache = null;
  serverSettingsFetchInflight = null;
};

export async function getAiPathsSettings(
  keys?: string[],
  options?: { bypassCache?: boolean }
): Promise<AiPathsSettingRecord[]> {
  assertMongoConfigured();

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

  const normalizedKeys = keys.filter(isAiPathsKey);
  if (normalizedKeys.length === 0) return [];

  assertMongoConfigured();

  const records = await fetchMongoAiPathsSettings(normalizedKeys, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  return records;
}

export async function getAiPathsSetting(key: string): Promise<string | null> {
  const records = await getAiPathsSettings([key]);
  return records[0]?.value ?? null;
}

export async function getAllAiPathsSettings(): Promise<AiPathsSettingRecord[]> {
  assertMongoConfigured();
  // We don't have a 'fetchAll' in mongo wrapper yet, but we can fetch index and then all configs

  const indexRecord = await fetchMongoAiPathsSettings(
    [AI_PATHS_INDEX_KEY],
    AI_PATHS_MONGO_OP_TIMEOUT_MS
  );
  if (!indexRecord.length) return [];
  const metas = parsePathMetas(indexRecord[0]?.value);
  const configKeys = metas.map((m) => `${AI_PATHS_CONFIG_KEY_PREFIX}${m.id}`);
  const triggerButtonsKey = AI_PATHS_TRIGGER_BUTTONS_KEY;

  const allKeys = [AI_PATHS_INDEX_KEY, triggerButtonsKey, ...configKeys];
  return getAiPathsSettings(allKeys);
}

export const listAiPathsSettings = getAiPathsSettings;

async function maybeAutoApplyDefaultSeedsOnRead(
  requestedKeys: string[],
  existingRecords: AiPathsSettingRecord[],
  testOptions?: {
    autoApply?: boolean;
    applyDefaultSeeds?: (items: AiPathsSettingRecord[]) => Promise<AiPathsSettingRecord[]>;
  }
): Promise<AiPathsSettingRecord[]> {
  const envAutoApply =
    testOptions?.autoApply !== undefined
      ? testOptions.autoApply
      : parseBooleanEnv(process.env['AI_PATHS_AUTO_APPLY_DEFAULTS'], false);

  if (!envAutoApply) return existingRecords;

  if (testOptions?.applyDefaultSeeds) {
    return testOptions.applyDefaultSeeds(existingRecords);
  }

  const result = [...existingRecords];
  const requestedDefaultKeys = requestedKeys.filter((key) => {
    if (key === AI_PATHS_INDEX_KEY || key === AI_PATHS_TRIGGER_BUTTONS_KEY) return true;
    return key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX);
  });
  if (requestedDefaultKeys.length > 0) {
    const seeded = ensureStarterWorkflowDefaults(result);
    if (seeded.affectedCount > 0) {
      await upsertAiPathsSettings(seeded.nextRecords);
      return seeded.nextRecords;
    }
  }

  return result;
}

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

export const runAiPathsMaintenance = async (
  actionIds?: AiPathsMaintenanceActionId[]
): Promise<AiPathsMaintenanceApplyResult> => {
  const allSettings = await getAllAiPathsSettings();
  const report = buildAiPathsMaintenanceReport(allSettings);
  const requestedIds = resolveRequestedMaintenanceActionIds(report, actionIds);

  const appliedActionIds: AiPathsMaintenanceActionId[] = [];
  let currentRecords = [...allSettings];

  for (const id of requestedIds) {
    const actionReport = runMaintenanceAction({
      actionId: id,
      records: currentRecords,
    });
    if (actionReport.success) {
      appliedActionIds.push(id);
      currentRecords = actionReport.nextRecords;
    }
  }

  if (appliedActionIds.length > 0) {
    await upsertAiPathsSettings(currentRecords);
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
  maybeAutoApplyDefaultSeedsOnRead,
  preservePathConfigFlagsOnSeed,
  resolveAutoApplyDefaultSeedsOnRead: (value: string | undefined): boolean =>
    parseBooleanEnv(value, false),
};

export type {
  AiPathsSettingRecord,
  AiPathsMaintenanceReport,
  AiPathsMaintenanceApplyResult,
  ParsedPathMeta,
};
