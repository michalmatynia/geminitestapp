import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { PathConfig } from '@/shared/contracts/ai-paths';
import {
  getAutoSeedStarterWorkflowEntries,
  materializeStarterWorkflowPathConfig,
  upgradeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';

import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
  type AiPathsSettingRecord,
  type ParsedPathMeta,
} from './settings-store.constants';
import { parsePathConfigMeta, parsePathMetas, parseTriggerButtons } from './settings-store.parsing';

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const parsePathConfigRecord = (raw: string): PathConfig | null => {
  try {
    const parsed = JSON.parse(raw) as PathConfig;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

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
  display:
    preset.display ?? {
      label: preset.name,
      showLabel: true,
    },
  createdAt: timestamp,
  updatedAt: timestamp,
  sortIndex: preset.sortIndex ?? 0,
});

export const countPendingStarterWorkflowDefaults = (records: AiPathsSettingRecord[]): number => {
  if (records.length === 0) return getAutoSeedStarterWorkflowEntries().length;

  const indexEntry = records.find((record) => record.key === AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(indexEntry?.value);
  const triggerButtons = parseTriggerButtons(
    records.find((record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY)?.value
  ) ?? [];

  return getAutoSeedStarterWorkflowEntries().reduce((count, entry) => {
    const defaultPathId = entry.seedPolicy?.defaultPathId;
    if (!defaultPathId) return count;
    const configKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${defaultPathId}`;
    const existingConfig = records.find((record) => record.key === configKey);
    const hasConfig = Boolean(existingConfig);
    const parsedConfig = existingConfig ? parsePathConfigRecord(existingConfig.value) : null;
    const pendingConfigRefresh = parsedConfig
      ? (() => {
          const upgraded = upgradeStarterWorkflowPathConfig(parsedConfig);
          return upgraded.changed && upgraded.resolution?.entry.templateId === entry.templateId;
        })()
      : false;
    const hasIndexMeta = metas.some((meta) => meta.id === defaultPathId);
    const missingButtons = (entry.triggerButtonPresets ?? []).some(
      (preset) => !triggerButtons.some((button) => button.id === preset.id)
    );
    return (
      count +
      Number(!hasConfig) +
      Number(pendingConfigRefresh) +
      Number(!hasIndexMeta) +
      Number(missingButtons)
    );
  }, 0);
};

export const ensureStarterWorkflowDefaults = (
  records: AiPathsSettingRecord[]
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

  const indexEntry = ensureRecord(AI_PATHS_INDEX_KEY, JSON.stringify(parsePathMetas(
    nextRecords.find((record) => record.key === AI_PATHS_INDEX_KEY)?.value
  )));
  const nextMetas = parsePathMetas(indexEntry.value);

  const triggerButtonsEntry = ensureRecord(
    AI_PATHS_TRIGGER_BUTTONS_KEY,
    JSON.stringify(parseTriggerButtons(
      nextRecords.find((record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY)?.value
    ) ?? [])
  );
  const nextButtons = parseTriggerButtons(triggerButtonsEntry.value) ?? [];

  getAutoSeedStarterWorkflowEntries().forEach((entry) => {
    const defaultPathId = entry.seedPolicy?.defaultPathId;
    if (!defaultPathId) return;

    const configKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${defaultPathId}`;
    const existingConfig = nextRecords.find((record) => record.key === configKey);
    const hasConfig = Boolean(existingConfig);
    if (!hasConfig) {
      const raw = JSON.stringify(
        materializeStarterWorkflowPathConfig(entry, {
          pathId: defaultPathId,
          seededDefault: true,
        })
      );
      nextRecords.push({ key: configKey, value: raw });
      affectedCount += 1;
      const meta = parsePathConfigMeta(defaultPathId, raw);
      if (meta && !nextMetas.some((current) => current.id === meta.id)) {
        nextMetas.push(meta);
        affectedCount += 1;
      }
    } else if (existingConfig) {
      const parsed = parsePathConfigRecord(existingConfig.value);
      if (parsed) {
        const upgraded = upgradeStarterWorkflowPathConfig(parsed);
        if (upgraded.changed && upgraded.resolution?.entry.templateId === entry.templateId) {
          existingConfig.value = JSON.stringify({
            ...upgraded.config,
            updatedAt: now,
          });
          affectedCount += 1;
        }
      }
      if (!nextMetas.some((meta) => meta.id === defaultPathId)) {
        const meta = parsePathConfigMeta(defaultPathId, existingConfig.value);
        if (meta) {
          nextMetas.push(meta);
          affectedCount += 1;
        }
      } else {
        const meta = parsePathConfigMeta(defaultPathId, existingConfig.value);
        if (meta) {
          const index = nextMetas.findIndex((current) => current.id === defaultPathId);
          if (index >= 0) {
            nextMetas[index] = meta;
          }
        }
      }
    }

    (entry.triggerButtonPresets ?? []).forEach((preset) => {
      if (nextButtons.some((button) => button.id === preset.id)) return;
      nextButtons.push(toTriggerButtonRecord(preset, now));
      affectedCount += 1;
    });
  });

  indexEntry.value = JSON.stringify(nextMetas);
  triggerButtonsEntry.value = JSON.stringify(nextButtons);
  return { nextRecords, affectedCount };
};

export const countPendingLegacyStarterWorkflowMigrations = (
  records: AiPathsSettingRecord[]
): number =>
  records.reduce((count, entry) => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return count;
    const parsed = parsePathConfigRecord(entry.value);
    if (!parsed) return count;
    return upgradeStarterWorkflowPathConfig(parsed).changed ? count + 1 : count;
  }, 0);

const mergeUpdatedIndexMetas = (
  metas: ParsedPathMeta[],
  updatedConfigs: Array<{ id: string; raw: string }>
): ParsedPathMeta[] => {
  if (updatedConfigs.length === 0) return metas;
  return metas.map((meta) => {
    const updated = updatedConfigs.find((entry) => entry.id === meta.id);
    if (!updated) return meta;
    return parsePathConfigMeta(meta.id, updated.raw) ?? meta;
  });
};

export const migrateLegacyStarterWorkflows = (
  records: AiPathsSettingRecord[]
): { nextRecords: AiPathsSettingRecord[]; affectedCount: number } => {
  const nextRecords = records.map((entry) => ({ ...entry }));
  let affectedCount = 0;
  const updatedConfigs: Array<{ id: string; raw: string }> = [];

  nextRecords.forEach((entry) => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
    const parsed = parsePathConfigRecord(entry.value);
    if (!parsed) return;
    const upgraded = upgradeStarterWorkflowPathConfig(parsed);
    if (!upgraded.changed) return;
    entry.value = JSON.stringify({
      ...upgraded.config,
      updatedAt: new Date().toISOString(),
    });
    updatedConfigs.push({
      id: normalizeText(upgraded.config.id),
      raw: entry.value,
    });
    affectedCount += 1;
  });

  if (updatedConfigs.length > 0) {
    const indexEntry = nextRecords.find((entry) => entry.key === AI_PATHS_INDEX_KEY);
    if (indexEntry) {
      indexEntry.value = JSON.stringify(
        mergeUpdatedIndexMetas(parsePathMetas(indexEntry.value), updatedConfigs)
      );
    }
  }

  return { nextRecords, affectedCount };
};
