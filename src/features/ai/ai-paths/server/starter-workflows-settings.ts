import { serializeAiTriggerButtonsRaw } from '@/features/ai/ai-paths/validations/trigger-buttons';
import type { PathConfig } from '@/shared/contracts/ai-paths';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { materializeStoredTriggerPathConfig } from '@/shared/lib/ai-paths/core/normalization/stored-trigger-path-config';
import {
  computeStarterWorkflowGraphHash,
  getAutoSeedStarterWorkflowEntries,
  materializeStarterWorkflowPathConfig,
  resolveStarterWorkflowForPathConfig,
  type StarterWorkflowTriggerPreset,
} from '@/shared/lib/ai-paths/core/starter-workflows';

import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
  type AiPathsSettingRecord,
  type ParsedPathMeta,
} from './settings-store.constants';
import {
  parsePathConfigFlags,
  parsePathConfigMeta,
  parsePathMetas,
  parseTriggerButtons,
} from './settings-store.parsing';
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

const normalizeTriggerButtonName = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const findLegacyStarterTriggerButtonUpgradeIndex = (
  buttons: AiTriggerButtonRecord[],
  preset: StarterWorkflowTriggerPreset
): number =>
  buttons.findIndex((button) => {
    const normalizedPathId =
      typeof button.pathId === 'string' ? button.pathId.trim() : '';
    if (normalizedPathId.length > 0) {
      return false;
    }
    if (normalizeTriggerButtonName(button.name) !== normalizeTriggerButtonName(preset.name)) {
      return false;
    }
    return (button.locations ?? []).some((location) => preset.locations.includes(location));
  });

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

const upsertPathMeta = (metas: ParsedPathMeta[], meta: ParsedPathMeta): void => {
  const existingIndex = metas.findIndex((entry) => entry.id === meta.id);
  if (existingIndex >= 0) {
    metas[existingIndex] = meta;
    return;
  }
  metas.push(meta);
};

const findPathConfigRecord = (
  records: AiPathsSettingRecord[],
  pathId: string
): { record: AiPathsSettingRecord; config: PathConfig } | null => {
  const record = records.find((candidate) => candidate.key === `${AI_PATHS_CONFIG_KEY_PREFIX}${pathId}`);
  if (!record) return null;
  const config = parsePathConfigRecord(record.value);
  if (!config) return null;
  return { record, config };
};

const extractExplicitModelSelection = (
  config: PathConfig
): { model: Record<string, unknown>; provider?: unknown } | null => {
  const modelNode = (config.nodes ?? []).find((node) => {
    if (node.type !== 'model') return false;
    const modelId =
      typeof node.config?.model?.['modelId'] === 'string'
        ? node.config.model['modelId'].trim()
        : '';
    return modelId.length > 0;
  });
  if (!(modelNode?.config?.model && typeof modelNode.config.model === 'object')) {
    return null;
  }
  return {
    model: { ...(modelNode.config.model as Record<string, unknown>) },
    ...(modelNode.config?.provider !== undefined ? { provider: modelNode.config.provider } : {}),
  };
};

const resolveDescriptionModelSeed = (
  records: AiPathsSettingRecord[],
  buttons: AiTriggerButtonRecord[]
): { pathId: string; model: Record<string, unknown>; provider?: unknown } | null => {
  const descriptionButtons = buttons.filter(
    (button) => normalizeTriggerButtonName(button.name) === 'description'
  );

  for (const button of descriptionButtons) {
    const configuredPathId =
      typeof button.pathId === 'string' ? button.pathId.trim() : '';
    if (!configuredPathId) continue;
    const configRecord = findPathConfigRecord(records, configuredPathId);
    const selection = configRecord ? extractExplicitModelSelection(configRecord.config) : null;
    if (configRecord && selection) {
      return {
        pathId: configRecord.config.id,
        ...selection,
      };
    }
  }

  const configRecords = records
    .filter((record) => record.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX))
    .map((record) => ({ record, config: parsePathConfigRecord(record.value) }))
    .filter((entry): entry is { record: AiPathsSettingRecord; config: PathConfig } => Boolean(entry.config));

  for (const button of descriptionButtons) {
    for (const entry of configRecords) {
      const matchesTrigger = (entry.config.nodes ?? []).some((node) => {
        if (node.type !== 'trigger') return false;
        return node.config?.trigger?.event === button.id;
      });
      if (!matchesTrigger) continue;
      const selection = extractExplicitModelSelection(entry.config);
      if (!selection) continue;
      return {
        pathId: entry.config.id,
        ...selection,
      };
    }
  }

  for (const entry of configRecords) {
    const normalizedName = typeof entry.config.name === 'string' ? entry.config.name.trim() : '';
    if (!/description/i.test(normalizedName)) continue;
    const selection = extractExplicitModelSelection(entry.config);
    if (!selection) continue;
    return {
      pathId: entry.config.id,
      ...selection,
    };
  }

  return null;
};

const inheritNormalizeStarterModelSelection = (args: {
  records: AiPathsSettingRecord[];
  buttons: AiTriggerButtonRecord[];
  metas: ParsedPathMeta[];
}): boolean => {
  const normalizeRecord = findPathConfigRecord(args.records, 'path_name_normalize_v1');
  if (!normalizeRecord) return false;

  const normalizeNodes = normalizeRecord.config.nodes ?? [];
  const normalizeModelNode = normalizeNodes.find((node) => node.type === 'model');
  const normalizedExistingModelId =
    typeof normalizeModelNode?.config?.model?.['modelId'] === 'string'
      ? normalizeModelNode.config.model['modelId'].trim()
      : '';
  if (!normalizeModelNode || normalizedExistingModelId.length > 0) {
    return false;
  }

  const descriptionSeed = resolveDescriptionModelSeed(args.records, args.buttons);
  if (!descriptionSeed) return false;

  normalizeModelNode.config = {
    ...(normalizeModelNode.config ?? {}),
    model: { ...descriptionSeed.model },
    ...(descriptionSeed.provider !== undefined ? { provider: descriptionSeed.provider } : {}),
  };
  normalizeRecord.config.updatedAt = new Date().toISOString();
  normalizeRecord.record.value = JSON.stringify(normalizeRecord.config);

  const meta = parsePathConfigMeta('path_name_normalize_v1', normalizeRecord.record.value);
  if (meta) upsertPathMeta(args.metas, meta);

  return true;
};

const refreshNormalizeStarterWorkflowConfig = (args: {
  records: AiPathsSettingRecord[];
  metas: ParsedPathMeta[];
}): boolean => {
  const normalizeRecord = findPathConfigRecord(args.records, 'path_name_normalize_v1');
  if (!normalizeRecord) return false;

  const refreshed = buildRefreshedStarterWorkflowConfig(normalizeRecord.config);
  if (!refreshed) return false;

  normalizeRecord.record.value = JSON.stringify(refreshed);
  const meta = parsePathConfigMeta('path_name_normalize_v1', normalizeRecord.record.value);
  if (meta) upsertPathMeta(args.metas, meta);
  return true;
};

const buildRefreshedStarterWorkflowConfig = (config: PathConfig): PathConfig | null => {
  const resolution = resolveStarterWorkflowForPathConfig(config);
  if (!resolution) return null;

  const currentHash = computeStarterWorkflowGraphHash(config);
  const canonicalHashes = new Set(resolution.entry.starterLineage.canonicalGraphHashes);
  if (!canonicalHashes.has(currentHash)) return null;

  const latest = materializeStarterWorkflowPathConfig(resolution.entry, {
    pathId: config.id,
    name: typeof config.name === 'string' && config.name.trim().length > 0 ? config.name : undefined,
    description:
      typeof config.description === 'string' && config.description.trim().length > 0
        ? config.description
        : undefined,
    isActive: config.isActive,
    isLocked: config.isLocked,
    seededDefault:
      config.id === resolution.entry.seedPolicy?.defaultPathId &&
      resolution.entry.seedPolicy?.autoSeed === true,
    updatedAt: config.updatedAt,
  });

  const currentNodesById = new Map((config.nodes ?? []).map((node) => [node.id, node] as const));
  const currentEdgesById = new Map((config.edges ?? []).map((edge) => [edge.id, edge] as const));

  const nextConfig: PathConfig = {
    ...config,
    ...latest,
    id: config.id,
    name: typeof config.name === 'string' && config.name.trim().length > 0 ? config.name : latest.name,
    description:
      typeof config.description === 'string' && config.description.trim().length > 0
        ? config.description
        : latest.description,
    isActive: config.isActive ?? latest.isActive,
    isLocked: config.isLocked ?? latest.isLocked,
    updatedAt: config.updatedAt ?? latest.updatedAt,
    nodes: (latest.nodes ?? []).map((node) => {
      const currentNode = currentNodesById.get(node.id);
      return {
        ...node,
        position: currentNode?.position ?? node.position,
        data: currentNode?.data ?? node.data,
        createdAt: currentNode?.createdAt ?? node.createdAt,
        updatedAt: currentNode?.updatedAt ?? node.updatedAt,
      };
    }),
    edges: (latest.edges ?? []).map((edge) => {
      const currentEdge = currentEdgesById.get(edge.id);
      return {
        ...edge,
        createdAt: currentEdge?.createdAt ?? edge.createdAt,
        updatedAt: currentEdge?.updatedAt ?? edge.updatedAt,
        data: currentEdge?.data ?? edge.data,
      };
    }),
    extensions:
      config.extensions || latest.extensions
        ? {
          ...(config.extensions ?? {}),
          ...(latest.extensions ?? {}),
        }
        : undefined,
    uiState: config.uiState ?? latest.uiState,
  };

  return JSON.stringify(nextConfig) === JSON.stringify(config) ? null : nextConfig;
};

const DEFAULT_STARTER_PATH_IDS = new Set(
  getAutoSeedStarterWorkflowEntries()
    .map((entry) => entry.seedPolicy?.defaultPathId ?? null)
    .filter((pathId): pathId is string => typeof pathId === 'string' && pathId.trim().length > 0)
);

const tryRepairBrokenSeededStarterConfig = (args: {
  pathId: string;
  rawConfig: string;
}): PathConfig | null => {
  if (!DEFAULT_STARTER_PATH_IDS.has(args.pathId)) {
    return null;
  }
  try {
    const resolved = materializeStoredTriggerPathConfig({
      pathId: args.pathId,
      rawConfig: args.rawConfig,
      fallbackName: args.pathId,
    });
    return resolved.changed ? resolved.config : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

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
    const shouldSeedButtons = shouldSeedStarterTriggerButtons(
      existingConfig?.value,
      entry.seedPolicy?.isActive
    );
    const missingButtons = shouldSeedButtons
      ? (entry.triggerButtonPresets ?? []).some(
        (preset) => !hasEquivalentStarterTriggerButton(triggerButtons, preset)
      )
      : false;
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
    let currentConfigRaw = existingConfig?.value;
    if (!hasConfig) {
      const raw = JSON.stringify(
        materializeStarterWorkflowPathConfig(entry, {
          pathId: defaultPathId,
          seededDefault: true,
        })
      );
      nextRecords.push({ key: configKey, value: raw });
      currentConfigRaw = raw;
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

    if (!shouldSeedStarterTriggerButtons(currentConfigRaw, entry.seedPolicy?.isActive)) {
      return;
    }

    (entry.triggerButtonPresets ?? []).forEach((preset) => {
      if (hasEquivalentStarterTriggerButton(nextButtons, preset)) return;
      const legacyUpgradeIndex = findLegacyStarterTriggerButtonUpgradeIndex(nextButtons, preset);
      if (legacyUpgradeIndex >= 0) {
        const existingButton = nextButtons[legacyUpgradeIndex];
        nextButtons[legacyUpgradeIndex] = {
          ...existingButton,
          id: preset.id,
          name: preset.name,
          pathId: preset.pathId,
          enabled: existingButton?.enabled ?? (preset.enabled ?? true),
          locations: [...preset.locations],
          mode: preset.mode ?? existingButton?.mode ?? 'click',
          display: preset.display ?? existingButton?.display ?? {
            label: preset.name,
            showLabel: true,
          },
          updatedAt: now,
          sortIndex: existingButton?.sortIndex ?? preset.sortIndex ?? 0,
        };
        affectedCount += 1;
        return;
      }
      nextButtons.push(toTriggerButtonRecord(preset, now));
      affectedCount += 1;
    });
  });

  if (refreshNormalizeStarterWorkflowConfig({ records: nextRecords, metas: nextMetas })) {
    affectedCount += 1;
  }

  if (
    inheritNormalizeStarterModelSelection({
      records: nextRecords,
      buttons: nextButtons,
      metas: nextMetas,
    })
  ) {
    affectedCount += 1;
  }

  indexEntry.value = JSON.stringify(nextMetas);
  triggerButtonsEntry.value = serializeAiTriggerButtonsRaw(nextButtons);
  return { nextRecords, affectedCount };
};

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
      const repairedSeededConfig = tryRepairBrokenSeededStarterConfig({
        pathId,
        rawConfig: record.value,
      });
      if (!repairedSeededConfig) return;
      record.value = JSON.stringify(repairedSeededConfig);
      affectedCount += 1;
      return;
    }

    const refreshed = buildRefreshedStarterWorkflowConfig(parsedConfig);
    if (!refreshed) {
      const repairedSeededConfig = tryRepairBrokenSeededStarterConfig({
        pathId,
        rawConfig: record.value,
      });
      if (!repairedSeededConfig) return;
      record.value = JSON.stringify(repairedSeededConfig);
      affectedCount += 1;
      return;
    }

    record.value = JSON.stringify(refreshed);
    affectedCount += 1;
  });

  return { nextRecords, affectedCount };
};
