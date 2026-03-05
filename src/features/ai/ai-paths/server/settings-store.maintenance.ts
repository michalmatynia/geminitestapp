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
  AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
  AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
  AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
} from '@/shared/lib/ai-paths/core/constants';
import { compactPathConfigValue } from './settings-store.compaction';
import { parsePathMetas } from './settings-store.parsing';
import {
  countPendingStarterWorkflowDefaults,
  ensureStarterWorkflowDefaults,
} from './starter-workflows-settings';

const LEGACY_RUNTIME_KERNEL_MODE = 'legacy_only';
const CANONICAL_RUNTIME_KERNEL_MODE = 'auto';

const normalizeRuntimeKernelModeValue = (value: string | undefined): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizeRuntimeKernelPilotNodeTypeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '_');

const normalizeRuntimeKernelResolverIdToken = (value: string): string => value.trim();

const parseRuntimeKernelListValue = ({
  value,
  normalizeToken,
}: {
  value: string | undefined;
  normalizeToken: (token: string) => string;
}): string[] | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        const normalized = Array.from(
          new Set(
            parsed
              .filter((entry): entry is string => typeof entry === 'string')
              .map((entry: string): string => normalizeToken(entry))
              .filter(Boolean)
          )
        );
        return normalized.length > 0 ? normalized : undefined;
      }
    } catch {
      // Fall through to tokenized parsing.
    }
  }

  const normalized = Array.from(
    new Set(
      trimmed
        .split(/[,\n]/g)
        .map((entry: string): string => normalizeToken(entry))
        .filter(Boolean)
    )
  );
  return normalized.length > 0 ? normalized : undefined;
};

const toCanonicalRuntimeKernelModeSettingValue = (
  value: string | undefined
): string | undefined => {
  if (typeof value !== 'string') return value;
  const normalized = normalizeRuntimeKernelModeValue(value);
  if (
    normalized === LEGACY_RUNTIME_KERNEL_MODE ||
    normalized === CANONICAL_RUNTIME_KERNEL_MODE
  ) {
    return CANONICAL_RUNTIME_KERNEL_MODE;
  }
  return value;
};

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
  if (entry.key === AI_PATHS_RUNTIME_KERNEL_MODE_KEY) {
    return toCanonicalRuntimeKernelModeSettingValue(entry.value);
  }
  if (entry.key === AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY) {
    return toCanonicalRuntimeKernelListSettingValue({
      value: entry.value,
      normalizeToken: normalizeRuntimeKernelPilotNodeTypeToken,
    });
  }
  if (entry.key === AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY) {
    return toCanonicalRuntimeKernelListSettingValue({
      value: entry.value,
      normalizeToken: normalizeRuntimeKernelResolverIdToken,
    });
  }
  return null;
};

export const countPendingRuntimeKernelModeNormalizations = (
  records: AiPathsSettingRecord[]
): number =>
  records.reduce((count: number, entry: AiPathsSettingRecord): number => {
    const nextValue = toCanonicalRuntimeKernelSettingEntryValue(entry);
    if (nextValue === null || nextValue === entry.value) return count;
    return count + 1;
  }, 0);

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

  const runtimeKernelModeNormalizationCount = countPendingRuntimeKernelModeNormalizations(records);
  if (runtimeKernelModeNormalizationCount > 0) {
    actions.push({
      id: 'normalize_runtime_kernel_mode',
      title: 'Normalize Runtime Kernel Settings',
      description:
        'Replace deprecated runtime-kernel mode values with canonical auto mode and normalize runtime-kernel list settings for forward-compatible execution.',
      blocking: false,
      status: 'pending',
      affectedRecords: runtimeKernelModeNormalizationCount,
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

    case 'ensure_starter_workflow_defaults': {
      const result = ensureStarterWorkflowDefaults(args.records);
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

    case 'normalize_runtime_kernel_mode': {
      args.records.forEach((entry: AiPathsSettingRecord) => {
        const nextValue = toCanonicalRuntimeKernelSettingEntryValue(entry);
        if (nextValue === null || nextValue === entry.value) {
          nextRecords.push(entry);
          return;
        }
        nextRecords.push({
          ...entry,
          value: nextValue ?? '',
        });
        affectedCount += 1;
      });
      break;
    }

    default:
      throw new Error(`Unknown AI Paths maintenance action: ${args.actionId}`);
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
      'normalize_runtime_kernel_mode',
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
