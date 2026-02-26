/* eslint-disable */
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
import {
  parsePathMetas,
  preservePathConfigFlagsOnSeed,
} from './settings-store.parsing';
import {
  buildAiPathsMaintenanceReport,
  buildTriggerButtonDisplay,
  resolveRequestedMaintenanceActionIds,
  runMaintenanceAction,
} from './settings-store.maintenance';
import {
  deleteMongoAiPathsSettings,
  fetchMongoAiPathsSettings,
  upsertMongoAiPathsSettings,
  ensureMongoIndexes,
} from './settings-store.repository';
import {
  buildBaseExportBlwoPathConfigValue,
  BASE_EXPORT_BLWO_PATH_ID,
  BASE_EXPORT_BLWO_PATH_NAME,
} from './settings-store-base-export-workflow';
import {
  buildParameterInferencePathConfigValue,
  PARAMETER_INFERENCE_PATH_ID,
  PARAMETER_INFERENCE_PATH_NAME,
} from './settings-store-parameter-inference';
import {
  TRANSLATION_EN_PL_PATH_ID,
  TRANSLATION_EN_PL_PATH_NAME,
  buildTranslationEnPlPathConfigValue,
} from './settings-store-translation-en-pl';

const AI_PATHS_MONGO_OP_TIMEOUT_MS = parsePositiveInt(process.env['AI_PATHS_MONGO_OP_TIMEOUT_MS'], 15000);

export async function getAiPathsSettings(
  keys?: string[],
  options?: { bypassCache?: boolean }
): Promise<AiPathsSettingRecord[]> {
  await assertMongoConfigured();

  if (!keys || keys.length === 0) {
    // Fetch index and then all configs
    const indexRecord = await fetchMongoAiPathsSettings([AI_PATHS_INDEX_KEY], AI_PATHS_MONGO_OP_TIMEOUT_MS);
    if (!indexRecord.length) return [];
    const metas = parsePathMetas(indexRecord[0]?.value);
    const configKeys = metas.map(m => `${AI_PATHS_CONFIG_KEY_PREFIX}${m.id}`);
    const triggerButtonsKey = AI_PATHS_TRIGGER_BUTTONS_KEY;
    const allKeys = [AI_PATHS_INDEX_KEY, triggerButtonsKey, ...configKeys];
    
    // Recursive call WITH keys to perform the actual fetch
    return getAiPathsSettings(allKeys, options);
  }

  const normalizedKeys = keys.filter(isAiPathsKey);
  if (normalizedKeys.length === 0) return [];

  await assertMongoConfigured();
  
  const records = await fetchMongoAiPathsSettings(normalizedKeys, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  
  // Apply defaults for missing core keys if needed
  const result = await maybeAutoApplyDefaultSeedsOnRead(normalizedKeys, records);
  
  return result;
}

export async function getAiPathsSetting(key: string): Promise<string | null> {
  const records = await getAiPathsSettings([key]);
  return records[0]?.value ?? null;
}

export async function getAllAiPathsSettings(): Promise<AiPathsSettingRecord[]> {
  await assertMongoConfigured();
  // We don't have a 'fetchAll' in mongo wrapper yet, but we can fetch index and then all configs
  
  const indexRecord = await fetchMongoAiPathsSettings([AI_PATHS_INDEX_KEY], AI_PATHS_MONGO_OP_TIMEOUT_MS);
  if (!indexRecord.length) return [];
  const metas = parsePathMetas(indexRecord[0]?.value);
  const configKeys = metas.map(m => `${AI_PATHS_CONFIG_KEY_PREFIX}${m.id}`);
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
  const envAutoApply = testOptions?.autoApply !== undefined
    ? testOptions.autoApply
    : parseBooleanEnv(process.env['AI_PATHS_AUTO_APPLY_DEFAULTS'], true);
  
  if (!envAutoApply) return existingRecords;

  if (testOptions?.applyDefaultSeeds) {
    return testOptions.applyDefaultSeeds(existingRecords);
  }

  const result = [...existingRecords];
  let changed = false;
  const now = new Date().toISOString();

  // 1. Ensure Trigger Buttons
  if (requestedKeys.includes(AI_PATHS_TRIGGER_BUTTONS_KEY)) {
    const hasButtons = existingRecords.some(r => r.key === AI_PATHS_TRIGGER_BUTTONS_KEY);
    if (!hasButtons) {
      const defaultButtons: Array<Record<string, unknown>> = [
        {
          id: 'base-export-blwo',
          name: BASE_EXPORT_BLWO_PATH_NAME,
          pathId: BASE_EXPORT_BLWO_PATH_ID,
          display: buildTriggerButtonDisplay(BASE_EXPORT_BLWO_PATH_NAME),
        },
        {
          id: 'parameter-inference',
          name: PARAMETER_INFERENCE_PATH_NAME,
          pathId: PARAMETER_INFERENCE_PATH_ID,
          display: buildTriggerButtonDisplay(PARAMETER_INFERENCE_PATH_NAME),
        },
        {
          id: 'translation-en-pl',
          name: TRANSLATION_EN_PL_PATH_NAME,
          pathId: TRANSLATION_EN_PL_PATH_ID,
          display: buildTriggerButtonDisplay(TRANSLATION_EN_PL_PATH_NAME),
        }
      ];
      const newValue = JSON.stringify(defaultButtons);
      result.push({ key: AI_PATHS_TRIGGER_BUTTONS_KEY, value: newValue });
      changed = true;
    }
  }

  // 2. Ensure Core Path Configs
  const corePaths = [
    { id: BASE_EXPORT_BLWO_PATH_ID, name: BASE_EXPORT_BLWO_PATH_NAME, factory: () => buildBaseExportBlwoPathConfigValue(now) },
    { id: PARAMETER_INFERENCE_PATH_ID, name: PARAMETER_INFERENCE_PATH_NAME, factory: () => buildParameterInferencePathConfigValue(now) },
    { id: TRANSLATION_EN_PL_PATH_ID, name: TRANSLATION_EN_PL_PATH_NAME, factory: () => buildTranslationEnPlPathConfigValue() },
  ];

  for (const core of corePaths) {
    const configKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${core.id}`;
    if (requestedKeys.includes(configKey)) {
      const hasConfig = existingRecords.some(r => r.key === configKey);
      if (!hasConfig) {
        const newValue = core.factory();
        result.push({ key: configKey, value: newValue });
        changed = true;
      }
    }
  }

  // 3. Ensure Index contains core paths
  if (requestedKeys.includes(AI_PATHS_INDEX_KEY)) {
    const indexRecord = result.find(r => r.key === AI_PATHS_INDEX_KEY);
    const existingMetas = parsePathMetas(indexRecord?.value);
    const nextMetas = [...existingMetas];
    let indexChanged = false;

    for (const core of corePaths) {
      if (!nextMetas.some(m => m.id === core.id)) {
        nextMetas.push({
          id: core.id,
          name: core.name,
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
        indexChanged = true;
      }
    }

    if (indexChanged) {
      const newValue = JSON.stringify(nextMetas);
      if (indexRecord) {
        indexRecord.value = newValue;
      } else {
        result.push({ key: AI_PATHS_INDEX_KEY, value: newValue });
      }
      changed = true;
    }
  }

  if (changed) {
    await upsertAiPathsSettings(result);
  }

  return result;
}

export async function upsertAiPathsSettings(
  records: AiPathsSettingRecord[]
): Promise<void> {
  const normalized = records.filter(r => isAiPathsKey(r.key));
  if (normalized.length === 0) return;

  await assertMongoConfigured();
  await ensureMongoIndexes(AI_PATHS_MONGO_OP_TIMEOUT_MS);
  
  await upsertMongoAiPathsSettings(normalized, AI_PATHS_MONGO_OP_TIMEOUT_MS);
}

export const upsertAiPathsSettingsBulk = upsertAiPathsSettings;

export async function upsertAiPathsSetting(key: string, value: string): Promise<void> {
  await upsertAiPathsSettings([{ key, value }]);
}

export async function deleteAiPathsSettings(keys: string[]): Promise<number> {
  const normalizedKeys = keys.filter(isAiPathsKey);
  if (normalizedKeys.length === 0) return 0;

  await assertMongoConfigured();
  await ensureMongoIndexes(AI_PATHS_MONGO_OP_TIMEOUT_MS);
  
  await deleteMongoAiPathsSettings(normalizedKeys, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  return normalizedKeys.length;
}

export const runAiPathsMaintenance = async (actionIds?: AiPathsMaintenanceActionId[]): Promise<AiPathsMaintenanceApplyResult> => {
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

export const applyAiPathsSettingsMaintenance = async (actionIds?: AiPathsMaintenanceActionId[]): Promise<AiPathsMaintenanceApplyResult> => {
  return runAiPathsMaintenance(actionIds);
};

export const __testOnly = {
  maybeAutoApplyDefaultSeedsOnRead,
  preservePathConfigFlagsOnSeed,
  resolveAutoApplyDefaultSeedsOnRead: (
    value: string | undefined
  ): boolean => parseBooleanEnv(value, false),
};

export type {
  AiPathsSettingRecord,
  AiPathsMaintenanceReport,
  AiPathsMaintenanceApplyResult,
  ParsedPathMeta,
};
