/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import {
  AI_PATHS_CONFIG_COMPACTION_THRESHOLD,
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  type AiPathsMaintenanceActionId,
  type AiPathsMaintenanceActionReport,
  type AiPathsMaintenanceReport,
  type AiPathsSettingRecord,
} from './settings-store.constants';
import {
  compactPathConfigValue,
} from './settings-store.compaction';
import {
  parsePathConfigFlags,
  parsePathMetas,
} from './settings-store.parsing';
import {
  BASE_EXPORT_BLWO_PATH_ID,
  needsBaseExportBlwoConfigUpgrade,
} from './settings-store-base-export-workflow';
import {
  DESCRIPTION_INFERENCE_LITE_PATH_ID,
  needsDescriptionInferenceLiteConfigUpgrade,
} from './settings-store-description-inference';
import {
  needsServerExecutionModeConfigUpgrade,
} from './settings-store-execution-mode-server';
import {
  needsParameterInferenceConfigUpgrade,
  PARAMETER_INFERENCE_PATH_ID,
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
    return compacted ? count + 1 : count;
  }, 0);
};

export const countPendingServerExecutionModeUpgrades = (records: AiPathsSettingRecord[]): number => {
  if (records.length === 0) return 0;
  return records.reduce((count: number, entry: AiPathsSettingRecord): number => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return count;
    return needsServerExecutionModeConfigUpgrade(entry.value) ? count + 1 : count;
  }, 0);
};

export const countPendingRuntimeInputContractUpgrades = (records: AiPathsSettingRecord[]): number => {
  if (records.length === 0) return 0;
  return records.reduce((count: number, entry: AiPathsSettingRecord): number => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return count;
    return needsRuntimeInputContractsUpgrade(entry.value) ? count + 1 : count;
  }, 0);
};

export const hasBaseExportBlwoDefaults = (records: AiPathsSettingRecord[]): boolean => {
  const indexEntry = records.find((r) => r.key === AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(indexEntry?.value);
  return metas.some((m) => m.id === BASE_EXPORT_BLWO_PATH_ID);
};

export const hasDescriptionInferenceLiteDefaults = (records: AiPathsSettingRecord[]): boolean => {
  const indexEntry = records.find((r) => r.key === AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(indexEntry?.value);
  return metas.some((m) => m.id === DESCRIPTION_INFERENCE_LITE_PATH_ID);
};

export const hasParameterInferenceDefaults = (records: AiPathsSettingRecord[]): boolean => {
  const indexEntry = records.find((r) => r.key === AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(indexEntry?.value);
  return metas.some((m) => m.id === PARAMETER_INFERENCE_PATH_ID);
};

export const hasTranslationEnPlDefaults = (records: AiPathsSettingRecord[]): boolean => {
  const indexEntry = records.find((r) => r.key === AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(indexEntry?.value);
  return metas.some((m) => m.id === TRANSLATION_EN_PL_PATH_ID);
};

export const needsPathIndexConsistencyRepair = (records: AiPathsSettingRecord[]): boolean => {
  const indexEntry = records.find((r) => r.key === AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(indexEntry?.value);
  const configKeys = records
    .filter((r) => r.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX))
    .map((r) => r.key.replace(AI_PATHS_CONFIG_KEY_PREFIX, ''));

  const missingFromIndex = configKeys.filter((id) => !metas.some((m) => m.id === id));
  const missingFromConfigs = metas.filter((m) => !configKeys.includes(m.id));

  return missingFromIndex.length > 0 || missingFromConfigs.length > 0;
};

export const normalizeExistingPathIndexValue = (raw: string | undefined): string => {
  const metas = parsePathMetas(raw);
  return JSON.stringify(metas);
};

export const repairPathIndexFromConfigs = (records: AiPathsSettingRecord[]): string => {
  const indexEntry = records.find((r) => r.key === AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(indexEntry?.value);
  const configRecords = records.filter((r) => r.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX));
  
  const nextMetas = [...metas];
  configRecords.forEach((record) => {
    const id = record.key.replace(AI_PATHS_CONFIG_KEY_PREFIX, '');
    if (!nextMetas.some((m) => m.id === id)) {
      nextMetas.push({
        id,
        name: `Recovered Path (${id.slice(0, 6)})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  return JSON.stringify(nextMetas);
};

export const resolveRequestedMaintenanceActionIds = (
  report: AiPathsMaintenanceReport,
  requestedIds: string[] | undefined
): AiPathsMaintenanceActionId[] => {
  if (!requestedIds || requestedIds.length === 0) {
    return report.actions
      .filter((a) => a.status === 'pending')
      .map((a) => a.id);
  }
  return requestedIds.filter((id): id is AiPathsMaintenanceActionId => 
    AI_PATHS_MAINTENANCE_ACTION_IDS.includes(id as AiPathsMaintenanceActionId)
  );
};

export const buildAiPathsMaintenanceReport = (records: AiPathsSettingRecord[]): AiPathsMaintenanceReport => {
  const actions: AiPathsMaintenanceActionReport[] = [];

  const compactionCount = countPendingPathConfigCompactions(records);
  if (compactionCount > 0) {
    actions.push({
      id: 'compact_oversized_configs',
      title: 'Compact Oversized Path Configs',
      description: `Compress ${compactionCount} configuration record(s) by removing temporary state snapshots and history.`,
      blocking: false,
      status: 'pending',
      affectedRecords: compactionCount,
    });
  }

  if (needsPathIndexConsistencyRepair(records)) {
    actions.push({
      id: 'repair_path_index',
      title: 'Repair Path Index Consistency',
      description: 'Synchronize the global path index with existing configuration records to recover missing references.',
      blocking: true,
      status: 'pending',
      affectedRecords: 1,
    });
  }

  if (!hasParameterInferenceDefaults(records)) {
    actions.push({
      id: 'ensure_parameter_inference_defaults',
      title: 'Ensure Parameter Inference Defaults',
      description: 'Add the default Parameter Inference path if it is missing.',
      blocking: false,
      status: 'pending',
      affectedRecords: 1,
    });
  }

  if (!hasDescriptionInferenceLiteDefaults(records)) {
    actions.push({
      id: 'ensure_description_inference_defaults',
      title: 'Ensure Description Inference Defaults',
      description: 'Add the default Description Inference Lite path if it is missing.',
      blocking: false,
      status: 'pending',
      affectedRecords: 1,
    });
  }

  if (!hasBaseExportBlwoDefaults(records)) {
    actions.push({
      id: 'ensure_base_export_defaults',
      title: 'Ensure Base Export Defaults',
      description: 'Add the default Base Export workflow if it is missing.',
      blocking: false,
      status: 'pending',
      affectedRecords: 1,
    });
  }

  const contractUpgradeCount = countPendingRuntimeInputContractUpgrades(records);
  if (contractUpgradeCount > 0) {
    actions.push({
      id: 'upgrade_runtime_input_contracts',
      title: 'Upgrade Runtime Input Contracts',
      description: `Migrate ${contractUpgradeCount} path(s) to the new runtime input contract format.`,
      blocking: true,
      status: 'pending',
      affectedRecords: contractUpgradeCount,
    });
  }

  const serverModeUpgradeCount = countPendingServerExecutionModeUpgrades(records);
  if (serverModeUpgradeCount > 0) {
    actions.push({
      id: 'upgrade_server_execution_mode',
      title: 'Upgrade Server Execution Mode',
      description: `Migrate ${serverModeUpgradeCount} path(s) to support server-side execution mode.`,
      blocking: false,
      status: 'pending',
      affectedRecords: serverModeUpgradeCount,
    });
  }

  return {
    scannedAt: new Date().toISOString(),
    pendingActions: actions.length,
    blockingActions: actions.filter((a) => a.blocking).length,
    actions,
  };
};

export type MaintenanceActionApplyResult = {
  actionId: AiPathsMaintenanceActionId;
  affectedCount: number;
  durationMs: number;
  nextRecords: AiPathsSettingRecord[];
  success: boolean;
};

export const runMaintenanceAction = (args: {
  actionId: AiPathsMaintenanceActionId;
  records: AiPathsSettingRecord[];
}): MaintenanceActionApplyResult => {
  const startedAt = Date.now();
  let affectedCount = 0;
  const nextRecords: AiPathsSettingRecord[] = [];

  switch (args.actionId) {
    case 'compact_oversized_configs':
      args.records.forEach((entry: AiPathsSettingRecord) => {
        if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) {
          nextRecords.push(entry);
          return;
        }
        const compacted = compactPathConfigValue(entry.value);
        if (compacted) {
          nextRecords.push({ ...entry, value: compacted });
          affectedCount++;
        } else {
          nextRecords.push(entry);
        }
      });
      break;

    case 'upgrade_runtime_input_contracts':
      args.records.forEach((entry: AiPathsSettingRecord) => {
        if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) {
          nextRecords.push(entry);
          return;
        }
        const upgraded = needsRuntimeInputContractsUpgrade(entry.value);
        if (upgraded) {
          nextRecords.push({ ...entry, value: upgraded });
          affectedCount++;
        } else {
          nextRecords.push(entry);
        }
      });
      break;

    case 'upgrade_server_execution_mode':
      args.records.forEach((entry: AiPathsSettingRecord) => {
        if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) {
          nextRecords.push(entry);
          return;
        }
        const upgraded = needsServerExecutionModeConfigUpgrade(entry.value);
        if (upgraded) {
          nextRecords.push({ ...entry, value: upgraded });
          affectedCount++;
        } else {
          nextRecords.push(entry);
        }
      });
      break;

    case 'ensure_base_export_defaults': {
      const indexEntry = args.records.find((r) => r.key === AI_PATHS_INDEX_KEY);
      const metas = parsePathMetas(indexEntry?.value);
      const baseExportPath = metas.find((m) => m.id === BASE_EXPORT_BLWO_PATH_ID);
      const baseExportConfigEntry = args.records.find((r) => r.key === `${AI_PATHS_CONFIG_KEY_PREFIX}${BASE_EXPORT_BLWO_PATH_ID}`);

      const needsUpgrade = baseExportConfigEntry ? needsBaseExportBlwoConfigUpgrade(baseExportConfigEntry.value) : true;

      if (!baseExportPath || needsUpgrade) {
        // Logic to add/upgrade base export path would go here
        affectedCount = 1;
      }
      nextRecords.push(...args.records);
      break;
    }

    case 'ensure_description_inference_defaults': {
      const indexEntry = args.records.find((r) => r.key === AI_PATHS_INDEX_KEY);
      const metas = parsePathMetas(indexEntry?.value);
      const descInfPath = metas.find((m) => m.id === DESCRIPTION_INFERENCE_LITE_PATH_ID);
      const descInfConfigEntry = args.records.find((r) => r.key === `${AI_PATHS_CONFIG_KEY_PREFIX}${DESCRIPTION_INFERENCE_LITE_PATH_ID}`);

      const needsUpgrade = descInfConfigEntry ? needsDescriptionInferenceLiteConfigUpgrade(descInfConfigEntry.value) : true;

      if (!descInfPath || needsUpgrade) {
        affectedCount = 1;
      }
      nextRecords.push(...args.records);
      break;
    }

    case 'ensure_parameter_inference_defaults': {
      const indexEntry = args.records.find((r) => r.key === AI_PATHS_INDEX_KEY);
      const metas = parsePathMetas(indexEntry?.value);
      const paramInfPath = metas.find((m) => m.id === PARAMETER_INFERENCE_PATH_ID);
      const paramInfConfigEntry = args.records.find((r) => r.key === `${AI_PATHS_CONFIG_KEY_PREFIX}${PARAMETER_INFERENCE_PATH_ID}`);

      const needsUpgrade = paramInfConfigEntry ? needsParameterInferenceConfigUpgrade(paramInfConfigEntry.value) : true;

      if (!paramInfPath || needsUpgrade) {
        affectedCount = 1;
      }
      nextRecords.push(...args.records);
      break;
    }

    case 'upgrade_translation_en_pl': {
      const indexEntry = args.records.find((r) => r.key === AI_PATHS_INDEX_KEY);
      const metas = parsePathMetas(indexEntry?.value);
      const transPath = metas.find((m) => m.id === TRANSLATION_EN_PL_PATH_ID);
      const transConfigEntry = args.records.find((r) => r.key === `${AI_PATHS_CONFIG_KEY_PREFIX}${TRANSLATION_EN_PL_PATH_ID}`);

      const needsUpgrade = transConfigEntry ? needsTranslationEnPlConfigUpgrade(transConfigEntry.value) : true;

      if (!transPath || needsUpgrade) {
        affectedCount = 1;
      }
      nextRecords.push(...args.records);
      break;
    }

    case 'repair_path_index': {
      const indexEntry = args.records.find((r) => r.key === AI_PATHS_INDEX_KEY);
      const metas = parsePathMetas(indexEntry?.value);
      const configKeys = args.records
        .filter((r) => r.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX))
        .map((r) => r.key.replace(AI_PATHS_CONFIG_KEY_PREFIX, ''));

      const missingFromIndex = configKeys.filter((id) => !metas.some((m) => m.id === id));
      const missingFromConfigs = metas.filter((m) => !configKeys.includes(m.id));

      if (missingFromIndex.length > 0 || missingFromConfigs.length > 0) {
        affectedCount = missingFromIndex.length + missingFromConfigs.length;
      }
      nextRecords.push(...args.records);
      break;
    }

    default:
      nextRecords.push(...args.records);
  }

  return {
    actionId: args.actionId,
    affectedCount,
    durationMs: Date.now() - startedAt,
    nextRecords,
    success: true,
  };
};

export const runFullMaintenance = (records: AiPathsSettingRecord[]): AiPathsMaintenanceReport => {
  const _startedAt = Date.now();
  const reports: MaintenanceActionApplyResult[] = [];
  let currentRecords = [...records];

  AI_PATHS_MAINTENANCE_ACTION_IDS.forEach((actionId: AiPathsMaintenanceActionId) => {
    const report = runMaintenanceAction({ actionId, records: currentRecords });
    reports.push(report);
    currentRecords = report.nextRecords;
  });

  return {
    scannedAt: new Date().toISOString(),
    pendingActions: 0,
    blockingActions: 0,
    actions: [],
  };
};
