import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { serializeAiTriggerButtonsRaw } from '@/features/ai/ai-paths/validations/trigger-buttons';
import {
  getAutoSeedStarterWorkflowEntries,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';

import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
  type AiPathsSettingRecord,
} from './settings-store.constants';
import { parsePathConfigMeta, parsePathMetas, parseTriggerButtons } from './settings-store.parsing';

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

export const countPendingStarterWorkflowDefaults = (records: AiPathsSettingRecord[]): number => {
  if (records.length === 0) return getAutoSeedStarterWorkflowEntries().length;

  const indexEntry = records.find((record) => record.key === AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(indexEntry?.value);
  const triggerButtons = parseTriggerButtons(
    records.find((record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY)?.value
  );

  return getAutoSeedStarterWorkflowEntries().reduce((count, entry) => {
    const defaultPathId = entry.seedPolicy?.defaultPathId;
    if (!defaultPathId) return count;
    const configKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${defaultPathId}`;
    const existingConfig = records.find((record) => record.key === configKey);
    const hasConfig = Boolean(existingConfig);
    const hasIndexMeta = metas.some((meta) => meta.id === defaultPathId);
    const missingButtons = (entry.triggerButtonPresets ?? []).some(
      (preset) => !triggerButtons.some((button) => button.id === preset.id)
    );
    return count + Number(!hasConfig) + Number(!hasIndexMeta) + Number(missingButtons);
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
  triggerButtonsEntry.value = serializeAiTriggerButtonsRaw(nextButtons);
  return { nextRecords, affectedCount };
};
