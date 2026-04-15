import { serializeAiTriggerButtonsRaw } from '@/features/ai/ai-paths/validations/trigger-buttons';
import type { PathConfig } from '@/shared/contracts/ai-paths';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { materializeStoredTriggerPathConfig } from '@/shared/lib/ai-paths/core/normalization/stored-trigger-path-config';
import {
  getAutoSeedStarterWorkflowEntries,
  getStaticRecoveryStarterWorkflowEntryByDefaultPathId,
  getStaticRecoveryStarterWorkflowEntries,
  materializeStarterWorkflowRecoveryBundle,
} from '@/shared/lib/ai-paths/core/starter-workflows/segments/api';
import {
  resolveStarterWorkflowForPathConfig,
  upgradeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { sanitizePathConfig } from '@/shared/lib/ai-paths/core/utils/path-config-sanitization';
import type {
  AiPathTemplateRegistryEntry,
  StarterWorkflowTriggerPreset,
} from '@/shared/lib/ai-paths/core/starter-workflows/segments/types';

import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
  type AiPathsSettingRecord,
} from './settings-store.constants';
import { parsePathConfigFlags, parsePathConfigMeta, parsePathMetas, parseTriggerButtons } from './settings-store.parsing';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const toTriggerButtonRecord = (
  preset: {
    id: string;
    name: string;
    pathId: string;
    locations: AiTriggerButtonRecord['locations'];
    mode?: AiTriggerButtonRecord['mode'];
    enabled?: boolean;
    display?: AiTriggerButtonRecord['display'];
    sortIndex?: number;
  },
  timestamp: string
): AiTriggerButtonRecord => ({
  id: preset.id,
  name: preset.name,
  pathId: preset.pathId,
  iconId: null,
  enabled: preset.enabled ?? true,
  locations: preset.locations,
  mode: preset.mode ?? 'click',
  display: preset.display ?? {
    label: preset.name,
    showLabel: true,
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  sortIndex: preset.sortIndex ?? 0,
});

const shouldSeedStarterTriggerButtons = (
  configRaw: string | undefined,
  fallbackIsActive: boolean | undefined
): boolean => {
  const flags = parsePathConfigFlags(configRaw);
  if (flags.isActive === false) return false;
  if (flags.isActive === true) return true;
  return fallbackIsActive !== false;
};

const hasEquivalentStarterTriggerButton = (
  buttons: AiTriggerButtonRecord[],
  preset: StarterWorkflowTriggerPreset
): boolean =>
  buttons.some((button) => {
    if (button.id === preset.id) return true;
    if ((button.pathId ?? null) !== preset.pathId) return false;
    return (button.locations ?? []).some((location) => preset.locations.includes(location));
  });

const areStringArraysEqual = (left: readonly string[], right: readonly string[]): boolean => {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const areTriggerButtonDisplaysEqual = (
  left: AiTriggerButtonRecord['display'],
  right: AiTriggerButtonRecord['display']
): boolean =>
  left.label === right.label &&
  left.icon === right.icon &&
  left.color === right.color &&
  left.variant === right.variant &&
  left.size === right.size &&
  left.showLabel === right.showLabel &&
  left.tooltip === right.tooltip;

const buildRefreshedStarterTriggerButton = (
  button: AiTriggerButtonRecord,
  preset: StarterWorkflowTriggerPreset,
  timestamp: string
): AiTriggerButtonRecord | null => {
  const nextDisplay = preset.display ?? {
    label: preset.name,
    showLabel: true,
  };
  const nextMode = preset.mode ?? 'click';
  const nextLocations = [...preset.locations];
  const isCurrent =
    button.name === preset.name &&
    (button.pathId ?? null) === preset.pathId &&
    button.mode === nextMode &&
    areStringArraysEqual(button.locations ?? [], nextLocations) &&
    areTriggerButtonDisplaysEqual(button.display, nextDisplay);

  if (isCurrent) return null;

  return {
    ...button,
    name: preset.name,
    pathId: preset.pathId,
    locations: nextLocations,
    mode: nextMode,
    display: nextDisplay,
    updatedAt: timestamp,
  };
};

const parsePathConfigRecord = (value: string): PathConfig | null => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as PathConfig;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const toTimestampOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const backfillStarterRefreshTimestamps = (config: PathConfig): PathConfig => {
  const fallbackTimestamp = toTimestampOrNull(config.updatedAt) ?? new Date().toISOString();

  return {
    ...config,
    updatedAt: toTimestampOrNull(config.updatedAt) ?? fallbackTimestamp,
    nodes: (config.nodes ?? []).map((node) => {
      const createdAt = toTimestampOrNull(node.createdAt) ?? fallbackTimestamp;
      return {
        ...node,
        createdAt,
        updatedAt: toTimestampOrNull(node.updatedAt) ?? createdAt,
      };
    }),
    edges: (config.edges ?? []).map((edge) => {
      const createdAt = toTimestampOrNull(edge.createdAt) ?? fallbackTimestamp;
      return {
        ...edge,
        createdAt,
        updatedAt: toTimestampOrNull(edge.updatedAt) ?? createdAt,
      };
    }),
  };
};

const buildRefreshedStarterWorkflowConfig = (config: PathConfig): PathConfig | null => {
  const resolution = resolveStarterWorkflowForPathConfig(config);
  if (!resolution) return null;

  const upgraded = upgradeStarterWorkflowPathConfig(config);
  if (!upgraded.changed) return null;

  const canonicalized = materializeStoredTriggerPathConfig({
    pathId: upgraded.config.id,
    rawConfig: JSON.stringify(backfillStarterRefreshTimestamps(upgraded.config)),
    fallbackName: upgraded.config.name,
    applyStarterWorkflowUpgrade: false,
    allowStaticRecoveryFallback: false,
  }).config;
  return sanitizePathConfig(canonicalized);
};

const tryRepairBrokenRecoverableStarterConfig = (args: {
  pathId: string;
  rawConfig: string;
}): PathConfig | null => {
  if (!getStaticRecoveryStarterWorkflowEntryByDefaultPathId(args.pathId)) {
    return null;
  }
  try {
    const resolved = materializeStoredTriggerPathConfig({
      pathId: args.pathId,
      rawConfig: args.rawConfig,
      fallbackName: args.pathId,
      applyStarterWorkflowUpgrade: true,
      allowStaticRecoveryFallback: true,
    });
    return resolved.changed ? sanitizePathConfig(resolved.config) : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const countPendingStarterWorkflowDefaults = (records: AiPathsSettingRecord[]): number => {
  return ensureStarterWorkflowEntries(records, getAutoSeedStarterWorkflowEntries()).affectedCount;
};

export const countPendingStaticStarterWorkflowBundle = (
  records: AiPathsSettingRecord[]
): number =>
  ensureStarterWorkflowEntries(records, getStaticRecoveryStarterWorkflowEntries()).affectedCount;

const ensureStarterWorkflowEntries = (
  records: AiPathsSettingRecord[],
  entries: AiPathTemplateRegistryEntry[]
): { nextRecords: AiPathsSettingRecord[]; affectedCount: number } => {
  const now = new Date().toISOString();
  const nextRecords = records.map((record) => ({ ...record }));
  let affectedCount = 0;

  const ensureRecord = (key: string, value: string): AiPathsSettingRecord => {
    const existing = nextRecords.find((record) => record.key === key);
    if (existing) {
      existing.value = value;
      return existing;
    }
    const created = { key, value };
    nextRecords.push(created);
    return created;
  };

  const indexEntry = ensureRecord(
    AI_PATHS_INDEX_KEY,
    JSON.stringify(
      parsePathMetas(nextRecords.find((record) => record.key === AI_PATHS_INDEX_KEY)?.value)
    )
  );
  const nextMetas = parsePathMetas(indexEntry.value);

  const triggerButtonsEntry = ensureRecord(
    AI_PATHS_TRIGGER_BUTTONS_KEY,
    serializeAiTriggerButtonsRaw(
      parseTriggerButtons(
        nextRecords.find((record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY)?.value
      )
    )
  );
  const nextButtons = parseTriggerButtons(triggerButtonsEntry.value);
  const bundleScope = entries.every((entry) => entry.seedPolicy?.autoSeed === true)
    ? 'auto_seed'
    : 'static_recovery';
  const bundle = materializeStarterWorkflowRecoveryBundle(bundleScope);
  const bundleConfigByPathId = new Map(
    bundle.pathConfigs.map((config) => [config.id, config] as const)
  );
  const bundleMetaByPathId = new Map(bundle.pathMetas.map((meta) => [meta.id, meta] as const));
  const bundleTriggerButtonsById = new Map(
    bundle.triggerButtons.map((button) => [button.id, button] as const)
  );

  entries.forEach((entry) => {
    const defaultPathId = entry.seedPolicy?.defaultPathId;
    if (!defaultPathId) return;

    const configKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${defaultPathId}`;
    const existingConfig = nextRecords.find((record) => record.key === configKey);
    const hasConfig = Boolean(existingConfig);
    let currentConfigRaw = existingConfig?.value;
    if (!hasConfig) {
      const canonicalConfig = bundleConfigByPathId.get(defaultPathId);
      if (!canonicalConfig) return;
      const raw = JSON.stringify(canonicalConfig);
      nextRecords.push({ key: configKey, value: raw });
      currentConfigRaw = raw;
      affectedCount += 1;
      const meta = bundleMetaByPathId.get(defaultPathId) ?? parsePathConfigMeta(defaultPathId, raw);
      if (meta && !nextMetas.some((current) => current.id === meta.id)) {
        nextMetas.push(meta);
        affectedCount += 1;
      }
    } else if (existingConfig) {
      if (!nextMetas.some((meta) => meta.id === defaultPathId)) {
        const meta =
          parsePathConfigMeta(defaultPathId, existingConfig.value) ??
          bundleMetaByPathId.get(defaultPathId) ??
          null;
        if (meta) {
          nextMetas.push(meta);
          affectedCount += 1;
        }
      } else {
        const meta =
          parsePathConfigMeta(defaultPathId, existingConfig.value) ??
          bundleMetaByPathId.get(defaultPathId) ??
          null;
        if (meta) {
          const index = nextMetas.findIndex((current) => current.id === defaultPathId);
          if (index >= 0) {
            nextMetas[index] = meta;
          }
        }
      }
    }

    if (!shouldSeedStarterTriggerButtons(currentConfigRaw, entry.seedPolicy?.isActive)) {
      return;
    }

    (entry.triggerButtonPresets ?? []).forEach((preset) => {
      const existingStarterIndex = nextButtons.findIndex((button) => button.id === preset.id);
      if (existingStarterIndex >= 0) {
        const existingStarterButton = nextButtons[existingStarterIndex];
        if (!existingStarterButton) return;
        const refreshed = buildRefreshedStarterTriggerButton(
          existingStarterButton,
          preset,
          now
        );
        if (refreshed) {
          nextButtons[existingStarterIndex] = refreshed;
          affectedCount += 1;
        }
        return;
      }
      if (hasEquivalentStarterTriggerButton(nextButtons, preset)) return;
      nextButtons.push(
        bundleTriggerButtonsById.get(preset.id) ?? toTriggerButtonRecord(preset, now)
      );
      affectedCount += 1;
    });
  });

  indexEntry.value = JSON.stringify(nextMetas);
  triggerButtonsEntry.value = serializeAiTriggerButtonsRaw(nextButtons);
  return { nextRecords, affectedCount };
};

export const ensureStarterWorkflowDefaults = (
  records: AiPathsSettingRecord[]
): { nextRecords: AiPathsSettingRecord[]; affectedCount: number } =>
  ensureStarterWorkflowEntries(records, getAutoSeedStarterWorkflowEntries());

export const restoreStaticStarterWorkflowBundle = (
  records: AiPathsSettingRecord[]
): { nextRecords: AiPathsSettingRecord[]; affectedCount: number } =>
  ensureStarterWorkflowEntries(records, getStaticRecoveryStarterWorkflowEntries());

export const countPendingStarterWorkflowConfigRefreshes = (
  records: AiPathsSettingRecord[]
): number => refreshStarterWorkflowConfigs(records).affectedCount;

export const refreshStarterWorkflowConfigs = (
  records: AiPathsSettingRecord[]
): { nextRecords: AiPathsSettingRecord[]; affectedCount: number } => {
  const nextRecords = records.map((record) => ({ ...record }));
  let affectedCount = 0;

  nextRecords.forEach((record) => {
    if (!record.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
    const pathId = record.key.replace(AI_PATHS_CONFIG_KEY_PREFIX, '');
    const parsedConfig = parsePathConfigRecord(record.value);
    if (!parsedConfig) {
      const repairedStarterConfig = tryRepairBrokenRecoverableStarterConfig({
        pathId,
        rawConfig: record.value,
      });
      if (!repairedStarterConfig) return;
      record.value = JSON.stringify(repairedStarterConfig);
      affectedCount += 1;
      return;
    }

    const refreshed = buildRefreshedStarterWorkflowConfig(parsedConfig);
    if (!refreshed) {
      const repairedStarterConfig = tryRepairBrokenRecoverableStarterConfig({
        pathId,
        rawConfig: record.value,
      });
      if (!repairedStarterConfig) return;
      record.value = JSON.stringify(repairedStarterConfig);
      affectedCount += 1;
      return;
    }

    record.value = JSON.stringify(refreshed);
    affectedCount += 1;
  });

  return { nextRecords, affectedCount };
};
