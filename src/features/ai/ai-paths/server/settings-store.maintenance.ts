import {
  AI_PATHS_CONFIG_COMPACTION_THRESHOLD,
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
  type AiPathsMaintenanceActionId,
  type AiPathsMaintenanceActionReport,
  type AiPathsMaintenanceReport,
  type AiPathsSettingRecord,
} from './settings-store.constants';
import {
  AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
  AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
  AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
  AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
  AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
} from '@/shared/lib/ai-paths/core/constants';
import { compactPathConfigValue } from './settings-store.compaction';
import { parsePathMetas, parseTriggerButtons } from './settings-store.parsing';
import {
  countPendingStarterWorkflowDefaults,
  ensureStarterWorkflowDefaults,
} from './starter-workflows-settings';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { serializeAiTriggerButtonsRaw } from '@/features/ai/ai-paths/validations/trigger-buttons';

const RUNTIME_KERNEL_SETTINGS_NORMALIZATION_ACTION_ID = 'normalize_runtime_kernel_settings';

const normalizeRuntimeKernelNodeTypeToken = (value: string): string =>
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

const parseRuntimeKernelListValueFromUnknown = ({
  value,
  normalizeToken,
}: {
  value: unknown;
  normalizeToken: (token: string) => string;
}): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = Array.from(
      new Set(
        value
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry: string): string => normalizeToken(entry))
          .filter(Boolean)
      )
    );
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value !== 'string') return undefined;
  return parseRuntimeKernelListValue({ value, normalizeToken });
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readTriggerEventsForPathConfig = (value: string): Set<string> => {
  try {
    const parsed = JSON.parse(value) as unknown;
    const record = asRecord(parsed);
    if (!record) return new Set<string>();
    const nodes = Array.isArray(record['nodes']) ? record['nodes'] : [];
    const events = nodes
      .map((node: unknown): string | null => {
        const nodeRecord = asRecord(node);
        if (nodeRecord?.['type'] !== 'trigger') return null;
        const config = asRecord(nodeRecord['config']);
        const trigger = asRecord(config?.['trigger']);
        const event = typeof trigger?.['event'] === 'string' ? trigger['event'].trim() : '';
        return event.length > 0 ? event : 'manual';
      })
      .filter((event: string | null): event is string => Boolean(event));
    return new Set<string>(events);
  } catch {
    return new Set<string>();
  }
};

const normalizeTriggerButtonPathId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const repairTriggerButtonBindings = (records: AiPathsSettingRecord[]): {
  nextRecords: AiPathsSettingRecord[];
  affectedCount: number;
} => {
  const indexEntry = records.find((entry) => entry.key === AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(indexEntry?.value);
  const indexedPathIds = new Set<string>(metas.map((meta) => meta.id));
  const pathConfigById = new Map<string, AiPathsSettingRecord>();
  records.forEach((entry) => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
    pathConfigById.set(entry.key.replace(AI_PATHS_CONFIG_KEY_PREFIX, ''), entry);
  });

  const validIndexedPathIds = new Set<string>(
    metas
      .map((meta) => meta.id)
      .filter((pathId) => pathConfigById.has(pathId))
  );
  const triggerEventPathMatches = new Map<string, string[]>();

  metas.forEach((meta) => {
    const configEntry = pathConfigById.get(meta.id);
    if (!configEntry) return;
    const triggerEvents = readTriggerEventsForPathConfig(configEntry.value);
    triggerEvents.forEach((eventId) => {
      const nextMatches = triggerEventPathMatches.get(eventId) ?? [];
      nextMatches.push(meta.id);
      triggerEventPathMatches.set(eventId, nextMatches);
    });
  });

  const triggerButtonsEntry = records.find((entry) => entry.key === AI_PATHS_TRIGGER_BUTTONS_KEY);
  if (!triggerButtonsEntry) {
    return {
      nextRecords: records,
      affectedCount: 0,
    };
  }

  const buttons = parseTriggerButtons(triggerButtonsEntry.value);
  let affectedCount = 0;
  const repairedButtons = buttons.map((button: AiTriggerButtonRecord): AiTriggerButtonRecord => {
    const currentPathId = normalizeTriggerButtonPathId(button.pathId);
    if (!currentPathId) return button;
    if (validIndexedPathIds.has(currentPathId)) return button;

    const indexedButMissingConfig = indexedPathIds.has(currentPathId) && !pathConfigById.has(currentPathId);
    if (indexedButMissingConfig) {
      return button;
    }

    const matchingPaths = triggerEventPathMatches.get(button.id) ?? [];
    const nextPathId = matchingPaths.length === 1 ? matchingPaths[0] ?? null : null;
    if (nextPathId === currentPathId) return button;

    affectedCount += 1;
    return {
      ...button,
      pathId: nextPathId,
    };
  });

  if (affectedCount === 0) {
    return {
      nextRecords: records,
      affectedCount: 0,
    };
  }

  const nextRecords = records.map((entry) =>
    entry.key === AI_PATHS_TRIGGER_BUTTONS_KEY
      ? {
        ...entry,
        value: serializeAiTriggerButtonsRaw(repairedButtons),
      }
      : entry
  );

  return {
    nextRecords,
    affectedCount,
  };
};

export const countPendingTriggerButtonBindingRepairs = (
  records: AiPathsSettingRecord[]
): number => repairTriggerButtonBindings(records).affectedCount;

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
  if (entry.key === AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY) {
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

  let changed = false;
  const nextRuntimeKernel: Record<string, unknown> = { ...runtimeKernel };

  if ('mode' in nextRuntimeKernel) {
    delete nextRuntimeKernel['mode'];
    changed = true;
  }

  const nodeTypes = parseRuntimeKernelListValueFromUnknown({
    value: runtimeKernel['nodeTypes'] ?? runtimeKernel['pilotNodeTypes'],
    normalizeToken: normalizeRuntimeKernelNodeTypeToken,
  });
  if (nodeTypes) {
    const previous = Array.isArray(runtimeKernel['nodeTypes'])
      ? (runtimeKernel['nodeTypes'] as unknown[])
      : null;
    const previousJoined = previous?.every(
      (entry: unknown): entry is string => typeof entry === 'string'
    )
      ? previous.join('|')
      : '';
    const nextJoined = nodeTypes.join('|');
    if (previousJoined !== nextJoined || !Array.isArray(runtimeKernel['nodeTypes'])) {
      nextRuntimeKernel['nodeTypes'] = nodeTypes;
      changed = true;
    }
  } else if ('nodeTypes' in nextRuntimeKernel) {
    delete nextRuntimeKernel['nodeTypes'];
    changed = true;
  }
  if ('pilotNodeTypes' in nextRuntimeKernel) {
    delete nextRuntimeKernel['pilotNodeTypes'];
    changed = true;
  }

  const resolverIds = parseRuntimeKernelListValueFromUnknown({
    value: runtimeKernel['codeObjectResolverIds'] ?? runtimeKernel['resolverIds'],
    normalizeToken: normalizeRuntimeKernelResolverIdToken,
  });
  if (resolverIds) {
    const previous = Array.isArray(runtimeKernel['codeObjectResolverIds'])
      ? (runtimeKernel['codeObjectResolverIds'] as unknown[])
      : null;
    const previousJoined = previous?.every(
      (entry: unknown): entry is string => typeof entry === 'string'
    )
      ? previous.join('|')
      : '';
    const nextJoined = resolverIds.join('|');
    if (previousJoined !== nextJoined || !Array.isArray(runtimeKernel['codeObjectResolverIds'])) {
      nextRuntimeKernel['codeObjectResolverIds'] = resolverIds;
      changed = true;
    }
  } else if ('codeObjectResolverIds' in nextRuntimeKernel) {
    delete nextRuntimeKernel['codeObjectResolverIds'];
    changed = true;
  }
  if ('resolverIds' in nextRuntimeKernel) {
    delete nextRuntimeKernel['resolverIds'];
    changed = true;
  }

  if ('strictNativeRegistry' in nextRuntimeKernel) {
    delete nextRuntimeKernel['strictNativeRegistry'];
    changed = true;
  }
  if ('strictCodeObjectRegistry' in nextRuntimeKernel) {
    delete nextRuntimeKernel['strictCodeObjectRegistry'];
    changed = true;
  }

  if (!changed) return null;

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

const normalizeRuntimeKernelSettingsRecords = (records: AiPathsSettingRecord[]): {
  nextRecords: AiPathsSettingRecord[];
  affectedCount: number;
  deletedKeys: string[];
} => {
  const nextRecords: AiPathsSettingRecord[] = [];
  const deletedKeys = new Set<string>();
  const canonicalNodeTypesEntry =
    records.find((entry) => entry.key === AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY) ?? null;
  const legacyNodeTypesEntry =
    records.find((entry) => entry.key === AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY) ?? null;
  const rawNodeTypesValue =
    canonicalNodeTypesEntry?.value ?? legacyNodeTypesEntry?.value ?? undefined;
  const canonicalNodeTypesValue =
    toCanonicalRuntimeKernelListSettingValue({
      value: rawNodeTypesValue,
      normalizeToken: normalizeRuntimeKernelNodeTypeToken,
    }) ?? '';
  const shouldManageNodeTypesEntry = canonicalNodeTypesEntry !== null || legacyNodeTypesEntry !== null;
  const shouldUpdateCanonicalNodeTypesEntry =
    shouldManageNodeTypesEntry &&
    (canonicalNodeTypesEntry?.value !== canonicalNodeTypesValue);
  const shouldDeleteLegacyNodeTypesEntry = legacyNodeTypesEntry !== null;
  let affectedCount =
    shouldUpdateCanonicalNodeTypesEntry || shouldDeleteLegacyNodeTypesEntry ? 1 : 0;
  let nodeTypesHandled = false;

  for (const entry of records) {
    if (
      entry.key === AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY ||
      entry.key === AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY
    ) {
      if (!nodeTypesHandled && shouldManageNodeTypesEntry) {
        nextRecords.push({
          key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
          value: canonicalNodeTypesValue,
        });
        nodeTypesHandled = true;
      }
      if (entry.key === AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY) {
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

export const countPendingRuntimeKernelModeNormalizations = (
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

  const triggerButtonBindingRepairCount = countPendingTriggerButtonBindingRepairs(records);
  if (triggerButtonBindingRepairCount > 0) {
    actions.push({
      id: 'repair_trigger_button_bindings',
      title: 'Repair Trigger Button Bindings',
      description:
        'Clear or rebind stale trigger button path references so modal/list triggers fall back to valid event routing.',
      blocking: false,
      status: 'pending',
      affectedRecords: triggerButtonBindingRepairCount,
    });
  }

  const runtimeKernelModeNormalizationCount = countPendingRuntimeKernelModeNormalizations(records);
  if (runtimeKernelModeNormalizationCount > 0) {
    actions.push({
      id: RUNTIME_KERNEL_SETTINGS_NORMALIZATION_ACTION_ID,
      title: 'Normalize Runtime Kernel Settings',
      description:
        'Prune deprecated runtime-kernel mode/strict settings and normalize node-type overrides plus resolver ids for forward-compatible execution.',
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

    case 'repair_trigger_button_bindings': {
      const result = repairTriggerButtonBindings(args.records);
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
      'repair_trigger_button_bindings',
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
