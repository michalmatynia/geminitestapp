import 'server-only';

import {
  AI_PATHS_CONFIG_COMPACTION_THRESHOLD,
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
  INFER_FIELDS_TRIGGER_BUTTON_ID,
  type AiPathsMaintenanceActionId,
  type AiPathsMaintenanceApplyResult,
  type AiPathsMaintenanceReport,
  type AiPathsSettingRecord,
  type ParsedPathMeta,
  type TriggerButtonSettingRecord,
} from './settings-store.constants';
import {
  assertMongoConfigured,
  isAiPathsKey,
  parseBooleanEnv,
  parsePositiveInt,
  withMongoOperationTimeout,
} from './settings-store.helpers';
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
  buildAiPathsMaintenanceReport,
  buildTriggerButtonDisplay,
  countPendingPathConfigCompactions,
  countPendingRuntimeInputContractUpgrades,
  countPendingServerExecutionModeUpgrades,
  hasBaseExportBlwoDefaults,
  hasDescriptionInferenceLiteDefaults,
  hasParameterInferenceDefaults,
  hasTranslationEnPlDefaults,
  logSeedRewriteFlags,
  needsPathIndexConsistencyRepair,
  normalizeExistingPathIndexValue,
  repairPathIndexFromConfigs,
  resolveRequestedMaintenanceActionIds,
} from './settings-store.maintenance';
import {
  deleteMongoAiPathsSettings,
  ensureMongoIndexes,
  listMongoAiPathsSettings,
  upsertMongoAiPathsSetting,
  upsertMongoAiPathsSettingsBatch,
} from './settings-store.repository';
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
  upgradeServerExecutionModeConfig,
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
  upgradeTranslationEnPlConfig,
} from './settings-store-translation-en-pl';
import {
  needsRuntimeInputContractsUpgrade,
  upgradeRuntimeInputContractsConfig,
} from './settings-store-runtime-input-contracts';

const AI_PATHS_MONGO_OP_TIMEOUT_MS = parsePositiveInt(
  process.env['AI_PATHS_MONGO_OP_TIMEOUT_MS'],
  30_000
);
const AI_PATHS_SETTINGS_CACHE_TTL_MS = parsePositiveInt(
  process.env['AI_PATHS_SETTINGS_CACHE_TTL_MS'],
  300_000
);
const AI_PATHS_AUTO_APPLY_DEFAULT_SEEDS_ON_READ = parseBooleanEnv(
  process.env['AI_PATHS_AUTO_APPLY_DEFAULT_SEEDS_ON_READ'],
  false
);

let aiPathsSettingsCache:
  | { value: AiPathsSettingRecord[]; fetchedAt: number }
  | null = null;

const getCachedAiPathsSettings = (): AiPathsSettingRecord[] | null => {
  if (!aiPathsSettingsCache) return null;
  if (Date.now() - aiPathsSettingsCache.fetchedAt > AI_PATHS_SETTINGS_CACHE_TTL_MS) {
    aiPathsSettingsCache = null;
    return null;
  }
  return aiPathsSettingsCache.value;
};

const setCachedAiPathsSettings = (settings: AiPathsSettingRecord[]): void => {
  aiPathsSettingsCache = {
    value: settings,
    fetchedAt: Date.now(),
  };
};

const upsertCachedAiPathsSettings = (items: AiPathsSettingRecord[]): void => {
  if (!aiPathsSettingsCache || items.length === 0) return;
  const map = new Map<string, string>(
    aiPathsSettingsCache.value.map(
      (entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value]
    )
  );
  items.forEach((item: AiPathsSettingRecord) => {
    map.set(item.key, item.value);
  });
  setCachedAiPathsSettings(
    Array.from(map.entries()).map(([key, value]: [string, string]): AiPathsSettingRecord => ({
      key,
      value,
    }))
  );
};

const deleteCachedAiPathsSettings = (keys: string[]): void => {
  if (!aiPathsSettingsCache || keys.length === 0) return;
  const keySet = new Set(keys);
  const next = aiPathsSettingsCache.value.filter(
    (entry: AiPathsSettingRecord): boolean => !keySet.has(entry.key)
  );
  setCachedAiPathsSettings(next);
};

const compactOversizedPathConfigs = async (
  records: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  if (records.length === 0) return records;
  const updates: AiPathsSettingRecord[] = [];
  const mapped = records.map((entry: AiPathsSettingRecord): AiPathsSettingRecord => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return entry;
    const shouldCompact =
      entry.value.length > AI_PATHS_CONFIG_COMPACTION_THRESHOLD ||
      entry.value.includes('"history"') ||
      entry.value.includes('"schemaSnapshot"');
    if (!shouldCompact) return entry;
    const compacted = compactPathConfigValue(entry.value);
    if (!compacted || compacted === entry.value) return entry;
    const nextEntry = { key: entry.key, value: compacted };
    updates.push(nextEntry);
    return nextEntry;
  });

  if (updates.length > 0) {
    await upsertMongoAiPathsSettingsBatch(updates, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  }

  return mapped;
};

const ensureParameterInferenceDefaults = async (
  records: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const updates: AiPathsSettingRecord[] = [];
  const now = new Date().toISOString();
  const pathConfigKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${PARAMETER_INFERENCE_PATH_ID}`;
  let shouldSeedDefaultButton = false;
  let pathConfigRaw = map.get(pathConfigKey);
  const existingPathConfigRaw = pathConfigRaw;

  const parsedConfigMeta = pathConfigRaw
    ? parsePathConfigMeta(PARAMETER_INFERENCE_PATH_ID, pathConfigRaw)
    : null;
  if (!pathConfigRaw || !parsedConfigMeta || needsParameterInferenceConfigUpgrade(pathConfigRaw)) {
    const seeded = buildParameterInferencePathConfigValue(now);
    pathConfigRaw = preservePathConfigFlagsOnSeed(seeded, existingPathConfigRaw);
    shouldSeedDefaultButton = true;
    map.set(pathConfigKey, pathConfigRaw);
    updates.push({ key: pathConfigKey, value: pathConfigRaw });
    logSeedRewriteFlags({
      actionId: 'ensure_parameter_inference_defaults',
      pathId: PARAMETER_INFERENCE_PATH_ID,
      previousRaw: existingPathConfigRaw,
      nextRaw: pathConfigRaw,
    });
  } else {
    try {
      const parsedExisting = JSON.parse(pathConfigRaw) as Record<string, unknown>;
      if (typeof parsedExisting['version'] !== 'number' || parsedExisting['version'] < 10) {
        const bumped = JSON.stringify({ ...parsedExisting, version: 10 });
        pathConfigRaw = bumped;
        map.set(pathConfigKey, bumped);
        updates.push({ key: pathConfigKey, value: bumped });
      }
    } catch {
      // Ignore
    }
  }

  const currentMetas = parsePathMetas(map.get(AI_PATHS_INDEX_KEY));
  const parameterPathMetaIndex = currentMetas.findIndex(
    (meta: ParsedPathMeta): boolean => meta.id === PARAMETER_INFERENCE_PATH_ID
  );
  if (parameterPathMetaIndex === -1) {
    const fallbackMeta: ParsedPathMeta = {
      id: PARAMETER_INFERENCE_PATH_ID,
      name: PARAMETER_INFERENCE_PATH_NAME,
      createdAt: now,
      updatedAt: now,
    };
    const configMeta = pathConfigRaw
      ? parsePathConfigMeta(PARAMETER_INFERENCE_PATH_ID, pathConfigRaw)
      : null;
    const nextMetas = [...currentMetas, configMeta ?? fallbackMeta].sort(
      (a: ParsedPathMeta, b: ParsedPathMeta) => b.updatedAt.localeCompare(a.updatedAt)
    );
    const indexValue = JSON.stringify(nextMetas);
    map.set(AI_PATHS_INDEX_KEY, indexValue);
    updates.push({ key: AI_PATHS_INDEX_KEY, value: indexValue });
  } else {
    const currentMeta = currentMetas[parameterPathMetaIndex];
    if (currentMeta && currentMeta.name.trim() !== PARAMETER_INFERENCE_PATH_NAME) {
      const nextMetas = [...currentMetas];
      nextMetas[parameterPathMetaIndex] = {
        ...currentMeta,
        name: PARAMETER_INFERENCE_PATH_NAME,
        updatedAt: now,
      };
      const indexValue = JSON.stringify(nextMetas);
      map.set(AI_PATHS_INDEX_KEY, indexValue);
      updates.push({ key: AI_PATHS_INDEX_KEY, value: indexValue });
    }
  }

  const parsedButtons = parseTriggerButtons(map.get(AI_PATHS_TRIGGER_BUTTONS_KEY));
  if (parsedButtons === null) {
    const triggerButtonsValue = JSON.stringify([
      {
        id: PARAMETER_INFERENCE_TRIGGER_BUTTON_ID,
        name: PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME,
        iconId: null,
        locations: ['product_modal'],
        mode: 'click',
        display: buildTriggerButtonDisplay(PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME),
        createdAt: now,
        updatedAt: now,
      },
    ]);
    map.set(AI_PATHS_TRIGGER_BUTTONS_KEY, triggerButtonsValue);
    updates.push({
      key: AI_PATHS_TRIGGER_BUTTONS_KEY,
      value: triggerButtonsValue,
    });
  } else if (parsedButtons) {
    const seededButton: TriggerButtonSettingRecord = {
      id: PARAMETER_INFERENCE_TRIGGER_BUTTON_ID,
      name: PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME,
      iconId: null,
      locations: ['product_modal'],
      mode: 'click',
      display: buildTriggerButtonDisplay(PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME),
      createdAt: now,
      updatedAt: now,
    };
    const canonicalParameterButtonName =
      PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME.trim().toLowerCase();
    const seenParameterButtonIds = new Set<string>();
    const nextButtons = parsedButtons.reduce(
      (acc: TriggerButtonSettingRecord[], button: TriggerButtonSettingRecord) => {
        const normalizedName =
          typeof button['name'] === 'string' ? button['name'].trim().toLowerCase() : '';
        if (
          button.id !== PARAMETER_INFERENCE_TRIGGER_BUTTON_ID &&
          normalizedName === canonicalParameterButtonName
        ) {
          return acc;
        }
        if (seenParameterButtonIds.has(button.id)) return acc;
        seenParameterButtonIds.add(button.id);
        acc.push(button);
        return acc;
      },
      []
    );
    const existingIndex = nextButtons.findIndex(
      (button: TriggerButtonSettingRecord): boolean =>
        button.id === PARAMETER_INFERENCE_TRIGGER_BUTTON_ID
    );
    if (existingIndex >= 0) {
      const existingButton = nextButtons[existingIndex]!;
      nextButtons[existingIndex] = {
        ...existingButton,
        name: PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME,
        locations: Array.from(
          new Set([
            ...(Array.isArray(existingButton['locations'])
              ? (existingButton['locations'] as string[])
              : []),
            'product_modal',
          ])
        ),
        mode: 'click',
        display: buildTriggerButtonDisplay(PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME),
      };
    } else if (shouldSeedDefaultButton) {
      nextButtons.push(seededButton);
    }

    const inferFieldsIndex = nextButtons.findIndex(
      (button: TriggerButtonSettingRecord): boolean =>
        button.id === INFER_FIELDS_TRIGGER_BUTTON_ID
    );
    const parameterIndex = nextButtons.findIndex(
      (button: TriggerButtonSettingRecord): boolean =>
        button.id === PARAMETER_INFERENCE_TRIGGER_BUTTON_ID
    );
    if (parameterIndex >= 0) {
      const [parameterButton] = nextButtons.splice(parameterIndex, 1);
      if (parameterButton) {
        const targetIndex =
          inferFieldsIndex >= 0
            ? Math.min(inferFieldsIndex + 1, nextButtons.length)
            : nextButtons.length;
        nextButtons.splice(targetIndex, 0, parameterButton);
      }
    }

    if (JSON.stringify(nextButtons) !== JSON.stringify(parsedButtons)) {
      const triggerButtonsValue = JSON.stringify(nextButtons);
      map.set(AI_PATHS_TRIGGER_BUTTONS_KEY, triggerButtonsValue);
      updates.push({
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: triggerButtonsValue,
      });
    }
  }

  if (updates.length === 0) return records;
  await upsertMongoAiPathsSettingsBatch(updates, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  return Array.from(map.entries()).map(
    ([key, value]: [string, string]): AiPathsSettingRecord => ({ key, value })
  );
};

const ensureDescriptionInferenceLiteDefaults = async (
  records: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const updates: AiPathsSettingRecord[] = [];
  const now = new Date().toISOString();
  const pathConfigKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${DESCRIPTION_INFERENCE_LITE_PATH_ID}`;
  let shouldSeedDefaultButton = false;

  let pathConfigRaw = map.get(pathConfigKey);
  const existingPathConfigRaw = pathConfigRaw;
  const parsedConfigMeta = pathConfigRaw
    ? parsePathConfigMeta(DESCRIPTION_INFERENCE_LITE_PATH_ID, pathConfigRaw)
    : null;
  if (
    !pathConfigRaw ||
    !parsedConfigMeta ||
    needsDescriptionInferenceLiteConfigUpgrade(pathConfigRaw)
  ) {
    const seeded = buildDescriptionInferenceLitePathConfigValue(now);
    pathConfigRaw = preservePathConfigFlagsOnSeed(seeded, existingPathConfigRaw);
    shouldSeedDefaultButton = true;
    map.set(pathConfigKey, pathConfigRaw);
    updates.push({ key: pathConfigKey, value: pathConfigRaw });
    logSeedRewriteFlags({
      actionId: 'ensure_description_inference_defaults',
      pathId: DESCRIPTION_INFERENCE_LITE_PATH_ID,
      previousRaw: existingPathConfigRaw,
      nextRaw: pathConfigRaw,
    });
  }

  const currentMetas = parsePathMetas(map.get(AI_PATHS_INDEX_KEY));
  const descriptionPathMetaIndex = currentMetas.findIndex(
    (meta: ParsedPathMeta): boolean => meta.id === DESCRIPTION_INFERENCE_LITE_PATH_ID
  );
  if (descriptionPathMetaIndex === -1) {
    const fallbackMeta: ParsedPathMeta = {
      id: DESCRIPTION_INFERENCE_LITE_PATH_ID,
      name: DESCRIPTION_INFERENCE_LITE_PATH_NAME,
      createdAt: now,
      updatedAt: now,
    };
    const configMeta = pathConfigRaw
      ? parsePathConfigMeta(DESCRIPTION_INFERENCE_LITE_PATH_ID, pathConfigRaw)
      : null;
    const nextMetas = [...currentMetas, configMeta ?? fallbackMeta].sort(
      (a: ParsedPathMeta, b: ParsedPathMeta) => b.updatedAt.localeCompare(a.updatedAt)
    );
    const indexValue = JSON.stringify(nextMetas);
    map.set(AI_PATHS_INDEX_KEY, indexValue);
    updates.push({ key: AI_PATHS_INDEX_KEY, value: indexValue });
  } else {
    const currentMeta = currentMetas[descriptionPathMetaIndex];
    if (currentMeta && currentMeta.name.trim() !== DESCRIPTION_INFERENCE_LITE_PATH_NAME) {
      const nextMetas = [...currentMetas];
      nextMetas[descriptionPathMetaIndex] = {
        ...currentMeta,
        name: DESCRIPTION_INFERENCE_LITE_PATH_NAME,
        updatedAt: now,
      };
      const indexValue = JSON.stringify(nextMetas);
      map.set(AI_PATHS_INDEX_KEY, indexValue);
      updates.push({ key: AI_PATHS_INDEX_KEY, value: indexValue });
    }
  }

  const parsedButtons = parseTriggerButtons(map.get(AI_PATHS_TRIGGER_BUTTONS_KEY));
  if (parsedButtons === null) {
    const triggerButtonsValue = JSON.stringify([
      {
        id: DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID,
        name: DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME,
        iconId: null,
        locations: ['product_modal'],
        mode: 'click',
        display: buildTriggerButtonDisplay(DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME),
        createdAt: now,
        updatedAt: now,
      },
    ]);
    map.set(AI_PATHS_TRIGGER_BUTTONS_KEY, triggerButtonsValue);
    updates.push({
      key: AI_PATHS_TRIGGER_BUTTONS_KEY,
      value: triggerButtonsValue,
    });
  } else if (parsedButtons) {
    const seededButton: TriggerButtonSettingRecord = {
      id: DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID,
      name: DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME,
      iconId: null,
      locations: ['product_modal'],
      mode: 'click',
      display: buildTriggerButtonDisplay(DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME),
      createdAt: now,
      updatedAt: now,
    };
    const canonicalDescriptionButtonName =
      DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME.trim().toLowerCase();
    const seenButtonIds = new Set<string>();
    const nextButtons = parsedButtons.reduce(
      (acc: TriggerButtonSettingRecord[], button: TriggerButtonSettingRecord) => {
        const normalizedName =
          typeof button['name'] === 'string' ? button['name'].trim().toLowerCase() : '';
        if (
          button.id !== DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID &&
          normalizedName === canonicalDescriptionButtonName
        ) {
          return acc;
        }
        if (seenButtonIds.has(button.id)) return acc;
        seenButtonIds.add(button.id);
        acc.push(button);
        return acc;
      },
      []
    );
    const existingIndex = nextButtons.findIndex(
      (button: TriggerButtonSettingRecord): boolean =>
        button.id === DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID
    );
    if (existingIndex >= 0) {
      const existingButton = nextButtons[existingIndex]!;
      nextButtons[existingIndex] = {
        ...existingButton,
        name: DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME,
        locations: Array.from(
          new Set([
            ...(Array.isArray(existingButton['locations'])
              ? (existingButton['locations'] as string[])
              : []),
            'product_modal',
          ])
        ),
        mode: 'click',
        display: buildTriggerButtonDisplay(DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME),
      };
    } else if (shouldSeedDefaultButton) {
      nextButtons.push(seededButton);
    }

    const descriptionIndex = nextButtons.findIndex(
      (button: TriggerButtonSettingRecord): boolean =>
        button.id === DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID
    );
    if (descriptionIndex >= 0) {
      const [descriptionButton] = nextButtons.splice(descriptionIndex, 1);
      if (descriptionButton) {
        const anchorIndex = nextButtons.findIndex(
          (button: TriggerButtonSettingRecord): boolean =>
            button.id === PARAMETER_INFERENCE_TRIGGER_BUTTON_ID
        );
        const inferFieldsIndex = nextButtons.findIndex(
          (button: TriggerButtonSettingRecord): boolean =>
            button.id === INFER_FIELDS_TRIGGER_BUTTON_ID
        );
        const targetIndex =
          anchorIndex >= 0
            ? Math.min(anchorIndex + 1, nextButtons.length)
            : inferFieldsIndex >= 0
              ? Math.min(inferFieldsIndex + 1, nextButtons.length)
              : nextButtons.length;
        nextButtons.splice(targetIndex, 0, descriptionButton);
      }
    }

    if (JSON.stringify(nextButtons) !== JSON.stringify(parsedButtons)) {
      const triggerButtonsValue = JSON.stringify(nextButtons);
      map.set(AI_PATHS_TRIGGER_BUTTONS_KEY, triggerButtonsValue);
      updates.push({
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: triggerButtonsValue,
      });
    }
  }

  if (updates.length === 0) return records;
  await upsertMongoAiPathsSettingsBatch(updates, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  return Array.from(map.entries()).map(
    ([key, value]: [string, string]): AiPathsSettingRecord => ({ key, value })
  );
};

const ensureBaseExportBlwoDefaults = async (
  records: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const updates: AiPathsSettingRecord[] = [];
  const now = new Date().toISOString();
  const pathConfigKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${BASE_EXPORT_BLWO_PATH_ID}`;
  let shouldSeedDefaultButton = false;
  let pathConfigRaw = map.get(pathConfigKey);
  const existingPathConfigRaw = pathConfigRaw;

  const parsedConfigMeta = pathConfigRaw
    ? parsePathConfigMeta(BASE_EXPORT_BLWO_PATH_ID, pathConfigRaw)
    : null;

  if (!pathConfigRaw || !parsedConfigMeta || needsBaseExportBlwoConfigUpgrade(pathConfigRaw)) {
    const seeded = buildBaseExportBlwoPathConfigValue(now);
    pathConfigRaw = preservePathConfigFlagsOnSeed(seeded, existingPathConfigRaw);
    shouldSeedDefaultButton = true;
    map.set(pathConfigKey, pathConfigRaw);
    updates.push({ key: pathConfigKey, value: pathConfigRaw });
    logSeedRewriteFlags({
      actionId: 'ensure_base_export_defaults',
      pathId: BASE_EXPORT_BLWO_PATH_ID,
      previousRaw: existingPathConfigRaw,
      nextRaw: pathConfigRaw,
    });
  }

  const currentMetas = parsePathMetas(map.get(AI_PATHS_INDEX_KEY));
  const pathMetaIndex = currentMetas.findIndex(
    (meta: ParsedPathMeta): boolean => meta.id === BASE_EXPORT_BLWO_PATH_ID
  );
  if (pathMetaIndex === -1) {
    const fallbackMeta: ParsedPathMeta = {
      id: BASE_EXPORT_BLWO_PATH_ID,
      name: BASE_EXPORT_BLWO_PATH_NAME,
      createdAt: now,
      updatedAt: now,
    };
    const configMeta = pathConfigRaw
      ? parsePathConfigMeta(BASE_EXPORT_BLWO_PATH_ID, pathConfigRaw)
      : null;
    const nextMetas = [...currentMetas, configMeta ?? fallbackMeta].sort(
      (a: ParsedPathMeta, b: ParsedPathMeta) => b.updatedAt.localeCompare(a.updatedAt)
    );
    const indexValue = JSON.stringify(nextMetas);
    map.set(AI_PATHS_INDEX_KEY, indexValue);
    updates.push({ key: AI_PATHS_INDEX_KEY, value: indexValue });
  } else {
    const currentMeta = currentMetas[pathMetaIndex];
    if (currentMeta && currentMeta.name.trim() !== BASE_EXPORT_BLWO_PATH_NAME) {
      const nextMetas = [...currentMetas];
      nextMetas[pathMetaIndex] = {
        ...currentMeta,
        name: BASE_EXPORT_BLWO_PATH_NAME,
        updatedAt: now,
      };
      const indexValue = JSON.stringify(nextMetas);
      map.set(AI_PATHS_INDEX_KEY, indexValue);
      updates.push({ key: AI_PATHS_INDEX_KEY, value: indexValue });
    }
  }

  const parsedButtons = parseTriggerButtons(map.get(AI_PATHS_TRIGGER_BUTTONS_KEY));
  if (parsedButtons === null) {
    const triggerButtonsValue = JSON.stringify([
      {
        id: BASE_EXPORT_BLWO_TRIGGER_BUTTON_ID,
        name: BASE_EXPORT_BLWO_TRIGGER_BUTTON_NAME,
        iconId: null,
        locations: ['product_row'],
        mode: 'click',
        display: buildTriggerButtonDisplay(BASE_EXPORT_BLWO_TRIGGER_BUTTON_NAME),
        createdAt: now,
        updatedAt: now,
      },
    ]);
    map.set(AI_PATHS_TRIGGER_BUTTONS_KEY, triggerButtonsValue);
    updates.push({
      key: AI_PATHS_TRIGGER_BUTTONS_KEY,
      value: triggerButtonsValue,
    });
  } else if (parsedButtons) {
    const canonicalButtonName = BASE_EXPORT_BLWO_TRIGGER_BUTTON_NAME.trim().toLowerCase();
    const seenButtonIds = new Set<string>();
    const nextButtons = parsedButtons.reduce(
      (acc: TriggerButtonSettingRecord[], button: TriggerButtonSettingRecord) => {
        const normalizedName =
          typeof button['name'] === 'string' ? button['name'].trim().toLowerCase() : '';
        if (
          button.id !== BASE_EXPORT_BLWO_TRIGGER_BUTTON_ID &&
          normalizedName === canonicalButtonName
        ) {
          return acc;
        }
        if (seenButtonIds.has(button.id)) return acc;
        seenButtonIds.add(button.id);
        acc.push(button);
        return acc;
      },
      []
    );
    const existingIndex = nextButtons.findIndex(
      (button: TriggerButtonSettingRecord): boolean =>
        button.id === BASE_EXPORT_BLWO_TRIGGER_BUTTON_ID
    );
    if (existingIndex >= 0) {
      const existingButton = nextButtons[existingIndex]!;
      nextButtons[existingIndex] = {
        ...existingButton,
        name: BASE_EXPORT_BLWO_TRIGGER_BUTTON_NAME,
        locations: Array.from(
          new Set([
            ...(Array.isArray(existingButton['locations'])
              ? (existingButton['locations'] as string[])
              : []),
            'product_row',
          ])
        ),
        mode: 'click',
        display: buildTriggerButtonDisplay(BASE_EXPORT_BLWO_TRIGGER_BUTTON_NAME),
      };
    } else if (shouldSeedDefaultButton) {
      nextButtons.push({
        id: BASE_EXPORT_BLWO_TRIGGER_BUTTON_ID,
        name: BASE_EXPORT_BLWO_TRIGGER_BUTTON_NAME,
        iconId: null,
        locations: ['product_row'],
        mode: 'click',
        display: buildTriggerButtonDisplay(BASE_EXPORT_BLWO_TRIGGER_BUTTON_NAME),
        createdAt: now,
        updatedAt: now,
      });
    }

    if (JSON.stringify(nextButtons) !== JSON.stringify(parsedButtons)) {
      const triggerButtonsValue = JSON.stringify(nextButtons);
      map.set(AI_PATHS_TRIGGER_BUTTONS_KEY, triggerButtonsValue);
      updates.push({
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: triggerButtonsValue,
      });
    }
  }

  if (updates.length === 0) return records;
  await upsertMongoAiPathsSettingsBatch(updates, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  return Array.from(map.entries()).map(
    ([key, value]: [string, string]): AiPathsSettingRecord => ({ key, value })
  );
};

const ensureTranslationEnPlDefaults = async (
  records: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  if (records.length === 0) return records;
  const map = new Map<string, string>(
    records.map(
      (entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value]
    )
  );
  const updates: AiPathsSettingRecord[] = [];
  const key = `${AI_PATHS_CONFIG_KEY_PREFIX}${TRANSLATION_EN_PL_PATH_ID}`;
  const raw = map.get(key);
  if (!raw || !needsTranslationEnPlConfigUpgrade(raw)) {
    return records;
  }

  const upgraded = upgradeTranslationEnPlConfig(raw);
  if (!upgraded || upgraded === raw) {
    return records;
  }
  map.set(key, upgraded);
  updates.push({ key, value: upgraded });
  await upsertMongoAiPathsSettingsBatch(updates, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  return Array.from(map.entries()).map(
    ([nextKey, nextValue]): AiPathsSettingRecord => ({
      key: nextKey,
      value: nextValue,
    })
  );
};

const ensureRuntimeInputContractsDefaults = async (
  records: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  if (records.length === 0) return records;
  const map = new Map<string, string>(
    records.map(
      (entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value]
    )
  );
  const updates: AiPathsSettingRecord[] = [];
  map.forEach((value: string, key: string): void => {
    if (!key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
    if (!needsRuntimeInputContractsUpgrade(value)) return;
    const upgraded = upgradeRuntimeInputContractsConfig(value);
    if (!upgraded || upgraded === value) return;
    map.set(key, upgraded);
    updates.push({ key, value: upgraded });
  });
  if (updates.length === 0) return records;
  await upsertMongoAiPathsSettingsBatch(updates, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  return Array.from(map.entries()).map(
    ([nextKey, nextValue]): AiPathsSettingRecord => ({
      key: nextKey,
      value: nextValue,
    })
  );
};

const ensureServerExecutionModeDefaults = async (
  records: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  if (records.length === 0) return records;
  const now = new Date().toISOString();
  const map = new Map<string, string>(
    records.map(
      (entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value]
    )
  );
  const updates: AiPathsSettingRecord[] = [];
  map.forEach((value: string, key: string): void => {
    if (!key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
    if (!needsServerExecutionModeConfigUpgrade(value)) return;
    const upgraded = upgradeServerExecutionModeConfig(value, { updatedAt: now });
    if (!upgraded || upgraded === value) return;
    map.set(key, upgraded);
    updates.push({ key, value: upgraded });
  });
  if (updates.length === 0) return records;
  await upsertMongoAiPathsSettingsBatch(updates, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  return Array.from(map.entries()).map(
    ([nextKey, nextValue]: [string, string]): AiPathsSettingRecord => ({
      key: nextKey,
      value: nextValue,
    })
  );
};

const ensurePathIndexConsistency = async (
  records: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  if (records.length === 0) return records;
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const nextIndexValue =
    repairPathIndexFromConfigs(map) ?? normalizeExistingPathIndexValue(map);
  if (!nextIndexValue) return records;
  map.set(AI_PATHS_INDEX_KEY, nextIndexValue);
  await upsertMongoAiPathsSetting(AI_PATHS_INDEX_KEY, nextIndexValue, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  return Array.from(map.entries()).map(
    ([key, value]: [string, string]): AiPathsSettingRecord => ({ key, value })
  );
};

const applyDefaultSeedActions = async (
  settings: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  let next = settings;
  next = await ensureParameterInferenceDefaults(next);
  next = await ensureDescriptionInferenceLiteDefaults(next);
  next = await ensureBaseExportBlwoDefaults(next);
  return next;
};

const maybeAutoApplyDefaultSeedsOnRead = async (
  settings: AiPathsSettingRecord[],
  options?: {
    autoApply?: boolean;
    applyDefaultSeeds?: (records: AiPathsSettingRecord[]) => Promise<AiPathsSettingRecord[]>;
  }
): Promise<AiPathsSettingRecord[]> => {
  const autoApply = options?.autoApply ?? AI_PATHS_AUTO_APPLY_DEFAULT_SEEDS_ON_READ;
  if (!autoApply) return settings;
  const applyDefaultSeeds = options?.applyDefaultSeeds ?? applyDefaultSeedActions;
  return await applyDefaultSeeds(settings);
};

export async function inspectAiPathsSettingsMaintenance(): Promise<AiPathsMaintenanceReport> {
  assertMongoConfigured();
  const settings = await maybeAutoApplyDefaultSeedsOnRead(
    await listMongoAiPathsSettings(AI_PATHS_MONGO_OP_TIMEOUT_MS)
  );
  setCachedAiPathsSettings(settings);
  return buildAiPathsMaintenanceReport(settings);
}

export async function applyAiPathsSettingsMaintenance(
  actionIds?: AiPathsMaintenanceActionId[]
): Promise<AiPathsMaintenanceApplyResult> {
  assertMongoConfigured();
  const settings = await listMongoAiPathsSettings(AI_PATHS_MONGO_OP_TIMEOUT_MS);
  const pendingReport = buildAiPathsMaintenanceReport(settings);
  const selectedActionIds = resolveRequestedMaintenanceActionIds(pendingReport, actionIds);
  if (selectedActionIds.length === 0) {
    return {
      appliedActionIds: [],
      report: pendingReport,
    };
  }

  let next = settings;
  for (const actionId of selectedActionIds) {
    if (actionId === 'compact_oversized_configs') {
      next = await compactOversizedPathConfigs(next);
      continue;
    }
    if (actionId === 'repair_path_index') {
      next = await ensurePathIndexConsistency(next);
      continue;
    }
    if (actionId === 'ensure_parameter_inference_defaults') {
      next = await ensureParameterInferenceDefaults(next);
      continue;
    }
    if (actionId === 'ensure_description_inference_defaults') {
      next = await ensureDescriptionInferenceLiteDefaults(next);
      continue;
    }
    if (actionId === 'ensure_base_export_defaults') {
      next = await ensureBaseExportBlwoDefaults(next);
      continue;
    }
    if (actionId === 'upgrade_translation_en_pl') {
      next = await ensureTranslationEnPlDefaults(next);
      continue;
    }
    if (actionId === 'upgrade_runtime_input_contracts') {
      next = await ensureRuntimeInputContractsDefaults(next);
      continue;
    }
    if (actionId === 'upgrade_server_execution_mode') {
      next = await ensureServerExecutionModeDefaults(next);
    }
  }

  setCachedAiPathsSettings(next);
  return {
    appliedActionIds: selectedActionIds,
    report: buildAiPathsMaintenanceReport(next),
  };
}

export async function listAiPathsSettings(): Promise<AiPathsSettingRecord[]> {
  assertMongoConfigured();
  const cached = getCachedAiPathsSettings();
  if (cached) return cached;
  const settings = await maybeAutoApplyDefaultSeedsOnRead(
    await listMongoAiPathsSettings(AI_PATHS_MONGO_OP_TIMEOUT_MS)
  );
  setCachedAiPathsSettings(settings);
  return settings;
}

export async function getAiPathsSetting(key: string): Promise<string | null> {
  const settings = await listAiPathsSettings();
  const match = settings.find((item: AiPathsSettingRecord): boolean => item.key === key);
  return match?.value ?? null;
}

export async function upsertAiPathsSetting(
  key: string,
  value: string
): Promise<AiPathsSettingRecord> {
  assertMongoConfigured();
  if (!isAiPathsKey(key)) {
    throw new Error(`Invalid AI Paths setting key: ${key}`);
  }
  const updated = await upsertMongoAiPathsSetting(key, value, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  upsertCachedAiPathsSettings([updated]);
  return updated;
}

export async function upsertAiPathsSettingsBulk(
  items: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> {
  assertMongoConfigured();
  const normalized = items.filter(
    (item: AiPathsSettingRecord): boolean =>
      Boolean(item) &&
      typeof item.key === 'string' &&
      item.key.length > 0 &&
      typeof item.value === 'string' &&
      isAiPathsKey(item.key)
  );
  if (normalized.length === 0) return [];

  await upsertMongoAiPathsSettingsBatch(normalized, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  upsertCachedAiPathsSettings(normalized);
  return normalized;
}

export async function deleteAiPathsSettings(keys: string[]): Promise<number> {
  assertMongoConfigured();
  const normalizedKeys = Array.from(
    new Set(
      keys.filter(
        (key: string): boolean =>
          typeof key === 'string' && key.length > 0 && isAiPathsKey(key)
      )
    )
  );
  if (normalizedKeys.length === 0) return 0;

  await ensureMongoIndexes(AI_PATHS_MONGO_OP_TIMEOUT_MS);
  await deleteMongoAiPathsSettings(normalizedKeys, AI_PATHS_MONGO_OP_TIMEOUT_MS);
  deleteCachedAiPathsSettings(normalizedKeys);
  return normalizedKeys.length; // Approximate, as deleteMany doesn't return count directly in the current repo wrapper
}

export const __testOnly = {
  parsePathConfigFlags,
  preservePathConfigFlagsOnSeed,
  maybeAutoApplyDefaultSeedsOnRead,
  resolveAutoApplyDefaultSeedsOnRead: (
    value: string | undefined
  ): boolean => parseBooleanEnv(value, false),
};

export type {
  AiPathsSettingRecord,
  AiPathsMaintenanceActionId,
  AiPathsMaintenanceActionReport,
  AiPathsMaintenanceReport,
  AiPathsMaintenanceApplyResult,
};
