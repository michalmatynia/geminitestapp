import {
  AI_PATHS_CONFIG_COMPACTION_THRESHOLD,
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_MAINTENANCE_ACTION_ID_ALIASES,
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  type AiPathsMaintenanceActionId,
  type AiPathsMaintenanceActionReport,
  type AiPathsMaintenanceReport,
  type AiPathsMaintenanceRequestedActionId,
  type AiPathsSettingRecord,
} from './settings-store.constants';
import { compactPathConfigValue } from './settings-store.compaction';
import { parsePathMetas } from './settings-store.parsing';
import {
  needsServerExecutionModeConfigUpgrade,
  upgradeServerExecutionModeConfig,
} from './settings-store-execution-mode-server';
import {
  needsRuntimeInputContractsUpgrade,
  upgradeRuntimeInputContractsConfig,
} from './settings-store-runtime-input-contracts';
import {
  countPendingLegacyStarterWorkflowMigrations,
  countPendingStarterWorkflowDefaults,
  ensureStarterWorkflowDefaults,
  migrateLegacyStarterWorkflows,
} from './starter-workflows-settings';

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
  requestedIds: AiPathsMaintenanceRequestedActionId[] | undefined
): AiPathsMaintenanceActionId[] => {
  if (!requestedIds || requestedIds.length === 0) {
    return report.actions.filter((a) => a.status === 'pending').map((a) => a.id);
  }
  const allowed = new Set<string>(AI_PATHS_MAINTENANCE_ACTION_IDS);
  const normalized = requestedIds
    .map((id): AiPathsMaintenanceActionId | null => {
      if (allowed.has(id)) {
        return id as AiPathsMaintenanceActionId;
      }
      const mapped = AI_PATHS_MAINTENANCE_ACTION_ID_ALIASES[
        id as keyof typeof AI_PATHS_MAINTENANCE_ACTION_ID_ALIASES
      ];
      return mapped && allowed.has(mapped) ? mapped : null;
    })
    .filter((id): id is AiPathsMaintenanceActionId => Boolean(id));
  return Array.from(new Set(normalized));
};

export const buildAiPathsMaintenanceReport = (
  records: AiPathsSettingRecord[]
): AiPathsMaintenanceReport => {
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
      description:
        'Synchronize the global path index with existing configuration records to recover missing references.',
      blocking: true,
      status: 'pending',
      affectedRecords: 1,
    });
  }

  const starterDefaultsCount = countPendingStarterWorkflowDefaults(records);
  if (starterDefaultsCount > 0) {
    actions.push({
      id: 'ensure_starter_workflow_defaults',
      title: 'Ensure Starter Workflow Defaults',
      description:
        'Add missing seeded starter workflows, index entries, and trigger buttons from the semantic starter registry.',
      blocking: false,
      status: 'pending',
      affectedRecords: starterDefaultsCount,
    });
  }

  const legacyStarterMigrationCount = countPendingLegacyStarterWorkflowMigrations(records);
  if (legacyStarterMigrationCount > 0) {
    actions.push({
      id: 'migrate_legacy_starter_workflows',
      title: 'Migrate Legacy Starter Workflows',
      description:
        `Migrate ${legacyStarterMigrationCount} starter workflow config(s) to the current semantic asset overlay and starter provenance format.`,
      blocking: true,
      status: 'pending',
      affectedRecords: legacyStarterMigrationCount,
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
        const upgraded = upgradeRuntimeInputContractsConfig(entry.value);
        if (upgraded && upgraded !== entry.value) {
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
        const upgraded = upgradeServerExecutionModeConfig(entry.value);
        if (upgraded && upgraded !== entry.value) {
          nextRecords.push({ ...entry, value: upgraded });
          affectedCount++;
        } else {
          nextRecords.push(entry);
        }
      });
      break;

    case 'ensure_starter_workflow_defaults': {
      const result = ensureStarterWorkflowDefaults(args.records);
      nextRecords.push(...result.nextRecords);
      affectedCount = result.affectedCount;
      break;
    }

    case 'migrate_legacy_starter_workflows': {
      const result = migrateLegacyStarterWorkflows(args.records);
      nextRecords.push(...result.nextRecords);
      affectedCount = result.affectedCount;
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
  const reports: MaintenanceActionApplyResult[] = [];
  let currentRecords = [...records];

  (
    [
      'compact_oversized_configs',
      'repair_path_index',
      'ensure_starter_workflow_defaults',
      'migrate_legacy_starter_workflows',
      'upgrade_runtime_input_contracts',
      'upgrade_server_execution_mode',
    ] as AiPathsMaintenanceActionId[]
  ).forEach((actionId: AiPathsMaintenanceActionId) => {
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
