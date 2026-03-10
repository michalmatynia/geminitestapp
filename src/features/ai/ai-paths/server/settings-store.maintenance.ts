import {
  AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
  AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
} from '@/shared/lib/ai-paths/core/constants';
import {
  normalizeRuntimeKernelConfigRecord,
  normalizeRuntimeKernelNodeTypeToken,
  normalizeRuntimeKernelResolverIdToken,
  parseRuntimeKernelListValue,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import {
  DEPRECATED_AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
  DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
  DEPRECATED_AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-legacy-aliases';

import { compactPathConfigValue } from './settings-store.compaction';
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
import { parsePathMetas } from './settings-store.parsing';
import {
  countPendingStarterWorkflowConfigRefreshes,
  countPendingStarterWorkflowDefaults,
  ensureStarterWorkflowDefaults,
  refreshStarterWorkflowConfigs,
} from './starter-workflows-settings';

const RUNTIME_KERNEL_SETTINGS_NORMALIZATION_ACTION_ID = 'normalize_runtime_kernel_settings';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toCanonicalRuntimeKernelListSettingValue = ({
  value,
  normalizeToken,
}: {
  value: string | undefined;
  normalizeToken: (token: string) => string;
}): string | undefined => {
  if (typeof value !== 'string') return value;
  const parsed = parseRuntimeKernelListValue({ value, normalizeToken });
  return parsed ? parsed.join(', ') : '';
};

const toCanonicalRuntimeKernelSettingEntryValue = (
  entry: AiPathsSettingRecord
): string | undefined | null => {
  if (entry.key === DEPRECATED_AI_PATHS_RUNTIME_KERNEL_MODE_KEY) {
    return undefined;
  }
  if (entry.key === AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY) {
    return toCanonicalRuntimeKernelListSettingValue({
      value: entry.value,
      normalizeToken: normalizeRuntimeKernelNodeTypeToken,
    });
  }
  if (entry.key === AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY) {
    return toCanonicalRuntimeKernelListSettingValue({
      value: entry.value,
      normalizeToken: normalizeRuntimeKernelResolverIdToken,
    });
  }
  if (entry.key === DEPRECATED_AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY) {
    return undefined;
  }
  return null;
};

const toCanonicalRuntimeKernelPathConfigEntryValue = (
  entry: AiPathsSettingRecord
): string | null => {
  if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return null;
  let parsed: Record<string, unknown>;
  try {
    const candidate = JSON.parse(entry.value) as unknown;
    const record = asRecord(candidate);
    if (!record) return null;
    parsed = record;
  } catch {
    return null;
  }

  const extensions = asRecord(parsed['extensions']);
  if (!extensions) return null;
  const runtimeKernel = asRecord(extensions['runtimeKernel']);
  if (!runtimeKernel) return null;

  const nextRuntimeKernel = normalizeRuntimeKernelConfigRecord(runtimeKernel, {
    translateLegacyAliases: true,
  });
  if (!nextRuntimeKernel || nextRuntimeKernel === runtimeKernel) return null;

  const nextExtensions = {
    ...extensions,
    runtimeKernel: nextRuntimeKernel,
  };
  const nextConfig = {
    ...parsed,
    extensions: nextExtensions,
  };
  return JSON.stringify(nextConfig);
};

const normalizeRuntimeKernelSettingsRecords = (
  records: AiPathsSettingRecord[]
): {
  nextRecords: AiPathsSettingRecord[];
  affectedCount: number;
  deletedKeys: string[];
} => {
  const nextRecords: AiPathsSettingRecord[] = [];
  const deletedKeys = new Set<string>();
  const canonicalNodeTypesEntry =
    records.find((entry) => entry.key === AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY) ?? null;
  const legacyNodeTypesEntry =
    records.find(
      (entry) => entry.key === DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY
    ) ?? null;
  const rawNodeTypesValue =
    canonicalNodeTypesEntry?.value ?? legacyNodeTypesEntry?.value ?? undefined;
  const canonicalNodeTypesValue =
    toCanonicalRuntimeKernelListSettingValue({
      value: rawNodeTypesValue,
      normalizeToken: normalizeRuntimeKernelNodeTypeToken,
    }) ?? '';
  const shouldManageNodeTypesEntry =
    canonicalNodeTypesEntry !== null || legacyNodeTypesEntry !== null;
  const shouldUpdateCanonicalNodeTypesEntry =
    shouldManageNodeTypesEntry && canonicalNodeTypesEntry?.value !== canonicalNodeTypesValue;
  const shouldDeleteLegacyNodeTypesEntry = legacyNodeTypesEntry !== null;
  let affectedCount =
    shouldUpdateCanonicalNodeTypesEntry || shouldDeleteLegacyNodeTypesEntry ? 1 : 0;
  let nodeTypesHandled = false;

  for (const entry of records) {
    if (
      entry.key === AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY ||
      entry.key === DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY
    ) {
      if (!nodeTypesHandled && shouldManageNodeTypesEntry) {
        nextRecords.push({
          key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
          value: canonicalNodeTypesValue,
        });
        nodeTypesHandled = true;
      }
      if (entry.key === DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY) {
        deletedKeys.add(entry.key);
      }
      continue;
    }

    const nextValue = toCanonicalRuntimeKernelSettingEntryValue(entry);
    if (nextValue === undefined) {
      deletedKeys.add(entry.key);
      affectedCount += 1;
      continue;
    }
    if (nextValue !== null && nextValue !== entry.value) {
      nextRecords.push({
        ...entry,
        value: nextValue ?? '',
      });
      affectedCount += 1;
      continue;
    }

    const nextPathConfigValue = toCanonicalRuntimeKernelPathConfigEntryValue(entry);
    if (nextPathConfigValue !== null && nextPathConfigValue !== entry.value) {
      nextRecords.push({
        ...entry,
        value: nextPathConfigValue,
      });
      affectedCount += 1;
      continue;
    }

    nextRecords.push(entry);
  }

  return {
    nextRecords,
    affectedCount,
    deletedKeys: [...deletedKeys].sort((left, right) => left.localeCompare(right)),
  };
};

export const countPendingRuntimeKernelSettingsNormalizations = (
  records: AiPathsSettingRecord[]
): number => normalizeRuntimeKernelSettingsRecords(records).affectedCount;

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
  requestedIds: AiPathsMaintenanceActionId[] | undefined
): AiPathsMaintenanceActionId[] => {
  if (!requestedIds || requestedIds.length === 0) {
    return report.actions.filter((a) => a.status === 'pending').map((a) => a.id);
  }
  const allowed = new Set<string>(AI_PATHS_MAINTENANCE_ACTION_IDS);
  const normalized = requestedIds
    .map((id): AiPathsMaintenanceActionId | null => (allowed.has(id) ? id : null))
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

  const starterRefreshCount = countPendingStarterWorkflowConfigRefreshes(records);
  if (starterRefreshCount > 0) {
    actions.push({
      id: 'refresh_starter_workflow_configs',
      title: 'Refresh Starter Workflow Configs',
      description:
        'Refresh starter-derived workflow configs that still match canonical starter lineage but lag behind the latest semantic asset.',
      blocking: false,
      status: 'pending',
      affectedRecords: starterRefreshCount,
    });
  }

  const runtimeKernelSettingsNormalizationCount =
    countPendingRuntimeKernelSettingsNormalizations(records);
  if (runtimeKernelSettingsNormalizationCount > 0) {
    actions.push({
      id: RUNTIME_KERNEL_SETTINGS_NORMALIZATION_ACTION_ID,
      title: 'Normalize Runtime Kernel Settings',
      description:
        'Prune deprecated runtime-kernel mode/strict settings and normalize node-type overrides plus resolver ids for forward-compatible execution.',
      blocking: false,
      status: 'pending',
      affectedRecords: runtimeKernelSettingsNormalizationCount,
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
  deletedKeys: string[];
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

    case 'ensure_starter_workflow_defaults': {
      const result = ensureStarterWorkflowDefaults(args.records);
      nextRecords.push(...result.nextRecords);
      affectedCount = result.affectedCount;
      break;
    }

    case 'refresh_starter_workflow_configs': {
      const result = refreshStarterWorkflowConfigs(args.records);
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

    case RUNTIME_KERNEL_SETTINGS_NORMALIZATION_ACTION_ID: {
      const normalized = normalizeRuntimeKernelSettingsRecords(args.records);
      return {
        actionId: args.actionId,
        affectedCount: normalized.affectedCount,
        deletedKeys: normalized.deletedKeys,
        durationMs: Date.now() - startedAt,
        nextRecords: normalized.nextRecords,
        success: true,
      };
    }

    default:
      throw new Error(`Unknown AI Paths maintenance action: ${args.actionId}`);
  }

  return {
    actionId: args.actionId,
    affectedCount,
    deletedKeys: [],
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
      'refresh_starter_workflow_configs',
      RUNTIME_KERNEL_SETTINGS_NORMALIZATION_ACTION_ID,
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
