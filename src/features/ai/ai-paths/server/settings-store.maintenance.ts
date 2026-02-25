import {
  AI_PATHS_CONFIG_COMPACTION_THRESHOLD,
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
  INFER_FIELDS_TRIGGER_BUTTON_ID,
  type AiPathsMaintenanceActionId,
  type AiPathsMaintenanceActionReport,
  type AiPathsMaintenanceReport,
  type AiPathsSettingRecord,
  type ParsedPathMeta,
  type TriggerButtonSettingRecord,
} from './settings-store.constants';
import {
  compactPathConfigValue,
} from './settings-store.compaction';
import {
  parsePathConfigFlags,
  parsePathConfigMeta,
  parsePathMetas,
  parseTriggerButtons,
  preservePathConfigFlagsOnSeed,
} from './settings-store.parsing';
import {
  BASE_EXPORT_BLWO_PATH_ID,
  BASE_EXPORT_BLWO_PATH_NAME,
  BASE_EXPORT_BLWO_TRIGGER_BUTTON_ID,
  BASE_EXPORT_BLWO_TRIGGER_BUTTON_NAME,
  buildBaseExportBlwoPathConfigValue,
  needsBaseExportBlwoConfigUpgrade,
} from './settings-store-base-export-workflow';
import {
  buildDescriptionInferenceLitePathConfigValue,
  DESCRIPTION_INFERENCE_LITE_PATH_ID,
  DESCRIPTION_INFERENCE_LITE_PATH_NAME,
  DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID,
  DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME,
  needsDescriptionInferenceLiteConfigUpgrade,
} from './settings-store-description-inference';
import {
  needsServerExecutionModeConfigUpgrade,
} from './settings-store-execution-mode-server';
import {
  buildParameterInferencePathConfigValue,
  needsParameterInferenceConfigUpgrade,
  PARAMETER_INFERENCE_PATH_ID,
  PARAMETER_INFERENCE_PATH_NAME,
  PARAMETER_INFERENCE_TRIGGER_BUTTON_ID,
  PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME,
} from './settings-store-parameter-inference';
import {
  needsTranslationEnPlConfigUpgrade,
  TRANSLATION_EN_PL_PATH_ID,
} from './settings-store-translation-en-pl';
import {
  needsRuntimeInputContractsUpgrade,
} from './settings-store-runtime-input-contracts';

export const buildTriggerButtonDisplay = (name: string): Record<string, unknown> => ({
  label: name,
  showLabel: true,
});

export const logSeedRewriteFlags = (input: {
  actionId: 'ensure_parameter_inference_defaults' | 'ensure_description_inference_defaults' | 'ensure_base_export_defaults';
  pathId: string;
  previousRaw: string | undefined;
  nextRaw: string;
}): void => {
  const previousFlags = parsePathConfigFlags(input.previousRaw);
  const nextFlags = parsePathConfigFlags(input.nextRaw);
  const previousActive = previousFlags.isActive ?? null;
  const previousLocked = previousFlags.isLocked ?? null;
  const nextActive = nextFlags.isActive ?? null;
  const nextLocked = nextFlags.isLocked ?? null;
  console.info('[ai-paths-settings] Seeded path config rewrite', {
    actionId: input.actionId,
    pathId: input.pathId,
    previousFlags: {
      isActive: previousActive,
      isLocked: previousLocked,
    },
    nextFlags: {
      isActive: nextActive,
      isLocked: nextLocked,
    },
  });
};

export const countPendingPathConfigCompactions = (records: AiPathsSettingRecord[]): number => {
  if (records.length === 0) return 0;
  return records.reduce((count: number, entry: AiPathsSettingRecord): number => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return count;
    const shouldCompact =
      entry.value.length > AI_PATHS_CONFIG_COMPACTION_THRESHOLD ||
      entry.value.includes('"history"') ||
      entry.value.includes('"schemaSnapshot"');
    if (!shouldCompact) return count;
    const compacted = compactPathConfigValue(entry.value);
    if (!compacted || compacted === entry.value) return count;
    return count + 1;
  }, 0);
};

export const repairPathIndexFromConfigs = (records: Map<string, string>): string | null => {
  const existingIndexRaw = records.get(AI_PATHS_INDEX_KEY);
  const existingIndex = parsePathMetas(existingIndexRaw);
  if (existingIndexRaw && existingIndex.length > 0) {
    return null;
  }

  const configMetasById = new Map<string, ParsedPathMeta>();
  records.forEach((value: string, key: string) => {
    if (!key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
    const configId = key.slice(AI_PATHS_CONFIG_KEY_PREFIX.length);
    if (!configId) return;
    const meta = parsePathConfigMeta(configId, value);
    if (!meta) return;
    configMetasById.set(meta.id, meta);
  });

  if (configMetasById.size === 0) return null;
  const rebuilt = Array.from(configMetasById.values()).sort((a: ParsedPathMeta, b: ParsedPathMeta) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  return JSON.stringify(rebuilt);
};

export const normalizeExistingPathIndexValue = (
  records: Map<string, string>
): string | null => {
  const existingIndexRaw = records.get(AI_PATHS_INDEX_KEY);
  if (!existingIndexRaw) return null;
  const existingIndex = parsePathMetas(existingIndexRaw);
  if (existingIndex.length === 0) return null;

  const configMetasById = new Map<string, ParsedPathMeta>();
  records.forEach((value: string, key: string) => {
    if (!key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
    const configId = key.slice(AI_PATHS_CONFIG_KEY_PREFIX.length);
    if (!configId) return;
    const meta = parsePathConfigMeta(configId, value);
    if (!meta) return;
    configMetasById.set(meta.id, meta);
  });

  const normalizedById = new Map<string, ParsedPathMeta>();
  existingIndex.forEach((meta: ParsedPathMeta) => {
    const configMeta = configMetasById.get(meta.id);
    const candidateName =
      configMeta?.name?.trim().length
        ? configMeta.name.trim()
        : meta.name.trim();
    const normalizedName = candidateName || `Path ${meta.id.slice(0, 6)}`;
    const normalizedMeta: ParsedPathMeta = {
      id: meta.id,
      name: normalizedName,
      createdAt:
        configMeta?.createdAt?.trim().length
          ? configMeta.createdAt
          : meta.createdAt,
      updatedAt:
        configMeta?.updatedAt?.trim().length &&
        configMeta.updatedAt.localeCompare(meta.updatedAt) > 0
          ? configMeta.updatedAt
          : meta.updatedAt,
    };

    const existing = normalizedById.get(meta.id);
    if (!existing) {
      normalizedById.set(meta.id, normalizedMeta);
      return;
    }
    if (normalizedMeta.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      normalizedById.set(meta.id, normalizedMeta);
    }
  });

  const normalized = Array.from(normalizedById.values()).sort(
    (a: ParsedPathMeta, b: ParsedPathMeta) =>
      b.updatedAt.localeCompare(a.updatedAt)
  );
  if (JSON.stringify(normalized) === JSON.stringify(existingIndex)) {
    return null;
  }
  return JSON.stringify(normalized);
};

export const needsPathIndexConsistencyRepair = (
  records: AiPathsSettingRecord[]
): boolean => {
  if (records.length === 0) return false;
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  return Boolean(repairPathIndexFromConfigs(map) ?? normalizeExistingPathIndexValue(map));
};

export const hasParameterInferenceDefaults = (records: AiPathsSettingRecord[]): boolean => {
  if (records.length === 0) return false;
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const configRaw = map.get(
    `${AI_PATHS_CONFIG_KEY_PREFIX}${PARAMETER_INFERENCE_PATH_ID}`
  );
  if (needsParameterInferenceConfigUpgrade(configRaw)) return false;
  const configMeta = configRaw
    ? parsePathConfigMeta(PARAMETER_INFERENCE_PATH_ID, configRaw)
    : null;
  if (!configMeta) return false;

  const metas = parsePathMetas(map.get(AI_PATHS_INDEX_KEY));
  const parameterMeta = metas.find(
    (meta: ParsedPathMeta): boolean => meta.id === PARAMETER_INFERENCE_PATH_ID
  );
  if (!parameterMeta) return false;

  const buttons = parseTriggerButtons(map.get(AI_PATHS_TRIGGER_BUTTONS_KEY));
  if (buttons === null) return false;
  return true;
};

export const hasDescriptionInferenceLiteDefaults = (
  records: AiPathsSettingRecord[]
): boolean => {
  if (records.length === 0) return false;
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const configRaw = map.get(
    `${AI_PATHS_CONFIG_KEY_PREFIX}${DESCRIPTION_INFERENCE_LITE_PATH_ID}`
  );
  if (needsDescriptionInferenceLiteConfigUpgrade(configRaw)) return false;
  const configMeta = configRaw
    ? parsePathConfigMeta(DESCRIPTION_INFERENCE_LITE_PATH_ID, configRaw)
    : null;
  if (!configMeta) return false;

  const metas = parsePathMetas(map.get(AI_PATHS_INDEX_KEY));
  const descriptionMeta = metas.find(
    (meta: ParsedPathMeta): boolean => meta.id === DESCRIPTION_INFERENCE_LITE_PATH_ID
  );
  if (!descriptionMeta) return false;

  const buttons = parseTriggerButtons(map.get(AI_PATHS_TRIGGER_BUTTONS_KEY));
  if (buttons === null) return false;
  return true;
};

export const hasBaseExportBlwoDefaults = (
  records: AiPathsSettingRecord[]
): boolean => {
  if (records.length === 0) return false;
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const configRaw = map.get(
    `${AI_PATHS_CONFIG_KEY_PREFIX}${BASE_EXPORT_BLWO_PATH_ID}`
  );
  if (needsBaseExportBlwoConfigUpgrade(configRaw)) return false;
  const configMeta = configRaw
    ? parsePathConfigMeta(BASE_EXPORT_BLWO_PATH_ID, configRaw)
    : null;
  if (!configMeta) return false;

  const metas = parsePathMetas(map.get(AI_PATHS_INDEX_KEY));
  const pathMeta = metas.find(
    (meta: ParsedPathMeta): boolean => meta.id === BASE_EXPORT_BLWO_PATH_ID
  );
  if (!pathMeta) return false;

  const buttons = parseTriggerButtons(map.get(AI_PATHS_TRIGGER_BUTTONS_KEY));
  if (buttons === null) return false;
  return true;
};

export const hasTranslationEnPlDefaults = (records: AiPathsSettingRecord[]): boolean => {
  if (records.length === 0) return true;
  const map = new Map<string, string>(
    records.map(
      (entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value]
    )
  );
  const raw = map.get(`${AI_PATHS_CONFIG_KEY_PREFIX}${TRANSLATION_EN_PL_PATH_ID}`);
  if (!raw) return true;
  return !needsTranslationEnPlConfigUpgrade(raw);
};

export const countPendingServerExecutionModeUpgrades = (
  records: AiPathsSettingRecord[]
): number => {
  if (records.length === 0) return 0;
  return records.reduce((count: number, entry: AiPathsSettingRecord): number => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return count;
    return needsServerExecutionModeConfigUpgrade(entry.value) ? count + 1 : count;
  }, 0);
};

export const countPendingRuntimeInputContractUpgrades = (
  records: AiPathsSettingRecord[]
): number => {
  if (records.length === 0) return 0;
  return records.reduce((count: number, entry: AiPathsSettingRecord): number => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return count;
    return needsRuntimeInputContractsUpgrade(entry.value) ? count + 1 : count;
  }, 0);
};

const AI_PATHS_MAINTENANCE_ACTION_DETAILS: Record<
  AiPathsMaintenanceActionId,
  {
    title: string;
    description: string;
    blocking: boolean;
  }
> = {
  compact_oversized_configs: {
    title: 'Compact oversized path configs',
    description:
      'Removes oversized runtime snapshots/history fields from persisted path config records.',
    blocking: false,
  },
  repair_path_index: {
    title: 'Repair path index consistency',
    description:
      'Rebuilds/normalizes `ai_paths_index` metadata from stored path configs when index drift is detected.',
    blocking: true,
  },
  ensure_parameter_inference_defaults: {
    title: 'Seed Parameter Inference defaults',
    description:
      'Creates or updates the Parameter Inference path template and trigger button defaults.',
    blocking: false,
  },
  ensure_description_inference_defaults: {
    title: 'Seed Description Inference defaults',
    description:
      'Creates or updates the Description Inference Lite path template and trigger button defaults.',
    blocking: false,
  },
  ensure_base_export_defaults: {
    title: 'Seed Base Export defaults',
    description:
      'Creates or updates the Base Export (BLWO) path template and trigger button defaults.',
    blocking: false,
  },
  upgrade_translation_en_pl: {
    title: 'Upgrade EN/PL translation path',
    description:
      'Applies explicit config upgrades for the EN/PL translation path when required.',
    blocking: false,
  },
  upgrade_runtime_input_contracts: {
    title: 'Normalize runtime input contracts',
    description:
      'Applies universal runtime input contract migrations (removes legacy prompt deadlocks and normalizes model prompt requirements).',
    blocking: false,
  },
  upgrade_server_execution_mode: {
    title: 'Upgrade server execution mode defaults',
    description:
      'Adds server execution mode defaults to path configs that still use legacy runtime mode.',
    blocking: false,
  },
};

export const buildAiPathsMaintenanceReport = (
  records: AiPathsSettingRecord[]
): AiPathsMaintenanceReport => {
  const pendingByAction: Record<AiPathsMaintenanceActionId, number> = {
    compact_oversized_configs: countPendingPathConfigCompactions(records),
    repair_path_index: needsPathIndexConsistencyRepair(records) ? 1 : 0,
    ensure_parameter_inference_defaults: hasParameterInferenceDefaults(records) ? 0 : 1,
    ensure_description_inference_defaults: hasDescriptionInferenceLiteDefaults(records)
      ? 0
      : 1,
    ensure_base_export_defaults: hasBaseExportBlwoDefaults(records) ? 0 : 1,
    upgrade_translation_en_pl: hasTranslationEnPlDefaults(records) ? 0 : 1,
    upgrade_runtime_input_contracts: countPendingRuntimeInputContractUpgrades(records),
    upgrade_server_execution_mode: countPendingServerExecutionModeUpgrades(records),
  };

  const actions = AI_PATHS_MAINTENANCE_ACTION_IDS.map(
    (actionId: AiPathsMaintenanceActionId): AiPathsMaintenanceActionReport => {
      const details = AI_PATHS_MAINTENANCE_ACTION_DETAILS[actionId];
      const affectedRecords = pendingByAction[actionId];
      return {
        id: actionId,
        title: details.title,
        description: details.description,
        blocking: details.blocking,
        status: affectedRecords > 0 ? 'pending' : 'ready',
        affectedRecords,
      };
    }
  );

  const pendingActions = actions.filter(
    (action: AiPathsMaintenanceActionReport): boolean => action.status === 'pending'
  );

  return {
    scannedAt: new Date().toISOString(),
    pendingActions: pendingActions.length,
    blockingActions: pendingActions.filter((action) => action.blocking).length,
    actions,
  };
};

export const resolveRequestedMaintenanceActionIds = (
  report: AiPathsMaintenanceReport,
  requestedActionIds?: AiPathsMaintenanceActionId[]
): AiPathsMaintenanceActionId[] => {
  const orderedRequested =
    requestedActionIds && requestedActionIds.length > 0
      ? AI_PATHS_MAINTENANCE_ACTION_IDS.filter((actionId: AiPathsMaintenanceActionId) =>
        requestedActionIds.includes(actionId)
      )
      : report.actions
        .filter((action: AiPathsMaintenanceActionReport): boolean => action.status === 'pending')
        .map((action: AiPathsMaintenanceActionReport): AiPathsMaintenanceActionId => action.id);
  return Array.from(new Set(orderedRequested));
};
