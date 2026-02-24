import 'server-only';

import { ObjectId } from 'mongodb';

import type { SettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

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

type MongoAiPathsSettingDoc = {
  _id?: string | ObjectId;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type ParsedPathMeta = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type ParsedPathConfig = {
  id?: string;
  name?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isActive?: boolean;
  isLocked?: boolean;
};

const AI_PATHS_SETTINGS_COLLECTION = 'ai_paths_settings';
const AI_PATHS_KEY_PREFIX = 'ai_paths_';
const AI_PATHS_INDEX_KEY = 'ai_paths_index';
const AI_PATHS_CONFIG_KEY_PREFIX = 'ai_paths_config_';
const AI_PATHS_TRIGGER_BUTTONS_KEY = 'ai_paths_trigger_buttons';
const MONGO_INDEX_NAME = 'ai_paths_settings_key';
const AI_PATHS_CONFIG_COMPACTION_THRESHOLD = 120_000;
const INFER_FIELDS_TRIGGER_BUTTON_ID = 'c5288f60-3a78-4415-891c-8953c3187b5a';

type TriggerButtonSettingRecord = Record<string, unknown> & {
  id: string;
};

export const AI_PATHS_MAINTENANCE_ACTION_IDS = [
  'compact_oversized_configs',
  'repair_path_index',
  'ensure_parameter_inference_defaults',
  'ensure_description_inference_defaults',
  'ensure_base_export_defaults',
  'upgrade_translation_en_pl',
  'upgrade_runtime_input_contracts',
  'upgrade_server_execution_mode',
] as const;

export type AiPathsMaintenanceActionId =
  (typeof AI_PATHS_MAINTENANCE_ACTION_IDS)[number];

export type AiPathsMaintenanceActionReport = {
  id: AiPathsMaintenanceActionId;
  title: string;
  description: string;
  blocking: boolean;
  status: 'pending' | 'ready';
  affectedRecords: number;
};

export type AiPathsMaintenanceReport = {
  scannedAt: string;
  pendingActions: number;
  blockingActions: number;
  actions: AiPathsMaintenanceActionReport[];
};

export type AiPathsMaintenanceApplyResult = {
  appliedActionIds: AiPathsMaintenanceActionId[];
  report: AiPathsMaintenanceReport;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return fallback;
};

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

let mongoIndexesEnsured: Promise<void> | null = null;
let aiPathsSettingsCache:
  | { value: AiPathsSettingRecord[]; fetchedAt: number }
  | null = null;

const isAiPathsKey = (key: string): boolean => key.startsWith(AI_PATHS_KEY_PREFIX);

const assertMongoConfigured = (): void => {
  if (!process.env['MONGODB_URI']) {
    throw new Error('AI Paths settings require MongoDB.');
  }
};

const createMongoTimeoutError = (message: string): Error => {
  const error = new Error(message);
  error.name = 'MongoNetworkTimeoutError';
  return error;
};

const withMongoOperationTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number = AI_PATHS_MONGO_OP_TIMEOUT_MS
): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(createMongoTimeoutError(`[ai-paths] Mongo operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    operation
      .then((value: T) => {
        clearTimeout(timeoutHandle);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
  });
};

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
    Array.from(map.entries()).map(([key, value]): AiPathsSettingRecord => ({
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

const ensureMongoIndexes = async (): Promise<void> => {
  assertMongoConfigured();
  if (!mongoIndexesEnsured) {
    mongoIndexesEnsured = (async (): Promise<void> => {
      const mongo = await getMongoDb();
      await mongo
        .collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION)
        .createIndex({ key: 1 }, { unique: true, name: MONGO_INDEX_NAME });
    })();
  }
  try {
    await mongoIndexesEnsured;
  } catch (error) {
    mongoIndexesEnsured = null;
    throw error;
  }
};

const listMongoAiPathsSettings = async (): Promise<AiPathsSettingRecord[]> => {
  await withMongoOperationTimeout(ensureMongoIndexes());
  const mongo = await withMongoOperationTimeout(getMongoDb());
  const docs = await withMongoOperationTimeout(
    mongo
      .collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION)
      .find({}, { projection: { key: 1, value: 1 } })
      .toArray()
  );

  return docs
    .map((doc: MongoAiPathsSettingDoc): AiPathsSettingRecord | null => {
      const key = typeof doc.key === 'string' ? doc.key : null;
      const value = typeof doc.value === 'string' ? doc.value : null;
      if (!key || value === null) return null;
      return { key, value };
    })
    .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
};

const upsertMongoAiPathsSetting = async (
  key: string,
  value: string
): Promise<AiPathsSettingRecord> => {
  await withMongoOperationTimeout(ensureMongoIndexes());
  const mongo = await withMongoOperationTimeout(getMongoDb());
  const now = new Date();
  await withMongoOperationTimeout(
    mongo.collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION).updateOne(
      { key },
      {
        $set: { key, value, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    )
  );
  return { key, value };
};

const upsertMongoAiPathsSettingsBatch = async (
  items: AiPathsSettingRecord[]
): Promise<void> => {
  if (items.length === 0) return;
  await withMongoOperationTimeout(ensureMongoIndexes());
  const mongo = await withMongoOperationTimeout(getMongoDb());
  const now = new Date();
  const collection = mongo.collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION);
  await withMongoOperationTimeout(
    Promise.all(
      items.map((item: AiPathsSettingRecord) =>
        collection.updateOne(
          { key: item.key },
          {
            $set: { key: item.key, value: item.value, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true }
        )
      )
    )
  );
};

const trimLargeString = (value: string, maxLen: number = 1000): string =>
  value.length > maxLen ? `${value.slice(0, maxLen)}…` : value;

const compactRuntimeValue = (value: unknown, depth: number = 1): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return trimLargeString(value, 1000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (depth <= 0) return `[Array(${value.length})]`;
    const slice = value.slice(0, 20).map((entry: unknown) => compactRuntimeValue(entry, depth - 1));
    if (value.length > 20) {
      slice.push(`…${value.length - 20} more`);
    }
    return slice;
  }
  if (typeof value === 'object') {
    if (depth <= 0) return '[Object]';
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record);
    const limited = entries.slice(0, 20).map(([key, entryValue]: [string, unknown]) => [
      key,
      compactRuntimeValue(entryValue, depth - 1),
    ]);
    const result = Object.fromEntries(limited) as Record<string, unknown>;
    if (entries.length > 20) {
      result['__truncated__'] = `…${entries.length - 20} more keys`;
    }
    return result;
  }
  return value;
};

const compactRuntimePorts = (
  portsLike: unknown
): Record<string, Record<string, unknown>> => {
  if (!portsLike || typeof portsLike !== 'object') return {};
  const result: Record<string, Record<string, unknown>> = {};
  const nodeEntries = Object.entries(portsLike as Record<string, unknown>).slice(0, 25);
  nodeEntries.forEach(([nodeId, rawPorts]: [string, unknown]) => {
    if (!rawPorts || typeof rawPorts !== 'object') return;
    const portEntries = Object.entries(rawPorts as Record<string, unknown>).slice(0, 20);
    const compacted = Object.fromEntries(
      portEntries.map(([portName, value]: [string, unknown]) => [
        portName,
        compactRuntimeValue(value, 1),
      ])
    ) as Record<string, unknown>;
    result[nodeId] = compacted;
  });
  return result;
};

const compactRuntimeStateField = (runtimeStateRaw: unknown): string | null => {
  const parsedRuntimeState =
    typeof runtimeStateRaw === 'string'
      ? (() => {
        try {
          return JSON.parse(runtimeStateRaw) as Record<string, unknown>;
        } catch {
          return null;
        }
      })()
      : runtimeStateRaw && typeof runtimeStateRaw === 'object'
        ? (runtimeStateRaw as Record<string, unknown>)
        : null;

  if (!parsedRuntimeState) return null;

  const compacted: Record<string, unknown> = {
    inputs: compactRuntimePorts(parsedRuntimeState['inputs']),
    outputs: compactRuntimePorts(parsedRuntimeState['outputs']),
  };

  if (typeof parsedRuntimeState['runId'] === 'string') {
    compacted['runId'] = parsedRuntimeState['runId'];
  }
  if (typeof parsedRuntimeState['runStartedAt'] === 'string') {
    compacted['runStartedAt'] = parsedRuntimeState['runStartedAt'];
  }

  return JSON.stringify(compacted);
};

const compactSampleBag = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 50);
  return Object.fromEntries(
    entries.map(([key, sample]: [string, unknown]) => [key, compactRuntimeValue(sample, 1)])
  );
};

const stripHeavyDatabaseSnapshots = (
  nodesRaw: unknown
): { nodes: unknown; changed: boolean } => {
  if (!Array.isArray(nodesRaw)) return { nodes: nodesRaw, changed: false };
  let changed = false;
  const nodes = nodesRaw.map((node: unknown): unknown => {
    if (!node || typeof node !== 'object') return node;
    const nodeRecord = node as Record<string, unknown>;
    if (nodeRecord['type'] !== 'database') return node;
    const config = nodeRecord['config'];
    if (!config || typeof config !== 'object') return node;
    const configRecord = config as Record<string, unknown>;
    const database = configRecord['database'];
    if (!database || typeof database !== 'object') return node;
    const databaseRecord = database as Record<string, unknown>;
    if (!('schemaSnapshot' in databaseRecord)) return node;
    const nextDatabase = { ...databaseRecord };
    delete nextDatabase['schemaSnapshot'];
    changed = true;
    return {
      ...nodeRecord,
      config: {
        ...configRecord,
        database: nextDatabase,
      },
    };
  });
  return { nodes, changed };
};

const compactPathConfigValue = (raw: string): string | null => {
  let parsed: Record<string, unknown>;
  try {
    const candidate = JSON.parse(raw) as unknown;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return null;
    }
    parsed = { ...(candidate as Record<string, unknown>) };
  } catch {
    return null;
  }

  let changed = false;

  const strippedNodes = stripHeavyDatabaseSnapshots(parsed['nodes']);
  if (strippedNodes.changed) {
    parsed['nodes'] = strippedNodes.nodes;
    changed = true;
  }

  const compactedRuntimeState = compactRuntimeStateField(parsed['runtimeState']);
  if (compactedRuntimeState && compactedRuntimeState !== parsed['runtimeState']) {
    parsed['runtimeState'] = compactedRuntimeState;
    changed = true;
  }

  if (parsed['parserSamples'] !== undefined) {
    const compactedParserSamples = compactSampleBag(parsed['parserSamples']);
    if (compactedParserSamples !== parsed['parserSamples']) {
      parsed['parserSamples'] = compactedParserSamples;
      changed = true;
    }
  }

  if (parsed['updaterSamples'] !== undefined) {
    const compactedUpdaterSamples = compactSampleBag(parsed['updaterSamples']);
    if (compactedUpdaterSamples !== parsed['updaterSamples']) {
      parsed['updaterSamples'] = compactedUpdaterSamples;
      changed = true;
    }
  }

  const compacted = JSON.stringify(parsed);
  if (!changed && compacted.length >= raw.length) {
    return null;
  }
  return compacted;
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
    await upsertMongoAiPathsSettingsBatch(updates);
  }

  return mapped;
};

const parsePathMetas = (raw: string | null | undefined): ParsedPathMeta[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: unknown): ParsedPathMeta | null => {
        if (!item || typeof item !== 'object') return null;
        const id = (item as { id?: unknown }).id;
        if (typeof id !== 'string' || id.trim().length === 0) return null;
        const nameRaw = (item as { name?: unknown }).name;
        const createdAtRaw = (item as { createdAt?: unknown }).createdAt;
        const updatedAtRaw = (item as { updatedAt?: unknown }).updatedAt;
        const fallbackTime = new Date().toISOString();
        return {
          id,
          name:
            typeof nameRaw === 'string' && nameRaw.trim().length > 0
              ? nameRaw.trim()
              : `Path ${id.slice(0, 6)}`,
          createdAt:
            typeof createdAtRaw === 'string' && createdAtRaw.trim().length > 0
              ? createdAtRaw
              : fallbackTime,
          updatedAt:
            typeof updatedAtRaw === 'string' && updatedAtRaw.trim().length > 0
              ? updatedAtRaw
              : typeof createdAtRaw === 'string' && createdAtRaw.trim().length > 0
                ? createdAtRaw
                : fallbackTime,
        };
      })
      .filter((item: ParsedPathMeta | null): item is ParsedPathMeta => Boolean(item));
  } catch {
    return [];
  }
};

const parsePathConfigMeta = (id: string, raw: string): ParsedPathMeta | null => {
  try {
    const parsed = JSON.parse(raw) as ParsedPathConfig;
    if (!parsed || typeof parsed !== 'object') return null;
    const resolvedId =
      typeof parsed.id === 'string' && parsed.id.trim().length > 0 ? parsed.id : id;
    const fallbackTime = new Date().toISOString();
    const createdAt =
      typeof parsed.createdAt === 'string' && parsed.createdAt.trim().length > 0
        ? parsed.createdAt
        : typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim().length > 0
          ? parsed.updatedAt
          : fallbackTime;
    return {
      id: resolvedId,
      name:
        typeof parsed.name === 'string' && parsed.name.trim().length > 0
          ? parsed.name.trim()
          : `Path ${resolvedId.slice(0, 6)}`,
      createdAt,
      updatedAt:
        typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim().length > 0
          ? parsed.updatedAt
          : createdAt,
    };
  } catch {
    return null;
  }
};

const parsePathConfigFlags = (
  raw: string | undefined
): { isActive?: boolean; isLocked?: boolean } => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const parsedRecord = parsed as Record<string, unknown>;
    return {
      ...(typeof parsedRecord['isActive'] === 'boolean'
        ? { isActive: parsedRecord['isActive'] }
        : {}),
      ...(typeof parsedRecord['isLocked'] === 'boolean'
        ? { isLocked: parsedRecord['isLocked'] }
        : {}),
    };
  } catch {
    return {};
  }
};

const preservePathConfigFlagsOnSeed = (
  seededRaw: string,
  existingRaw: string | undefined
): string => {
  const preservedFlags = parsePathConfigFlags(existingRaw);
  if (preservedFlags.isActive === undefined && preservedFlags.isLocked === undefined) {
    return seededRaw;
  }
  try {
    const parsedSeeded = JSON.parse(seededRaw) as unknown;
    if (!parsedSeeded || typeof parsedSeeded !== 'object' || Array.isArray(parsedSeeded)) {
      return seededRaw;
    }
    const parsedSeededRecord = parsedSeeded as Record<string, unknown>;
    const merged: Record<string, unknown> = {
      ...parsedSeededRecord,
      ...(preservedFlags.isActive !== undefined
        ? { isActive: preservedFlags.isActive }
        : {}),
      ...(preservedFlags.isLocked !== undefined
        ? { isLocked: preservedFlags.isLocked }
        : {}),
    };
    return JSON.stringify(merged);
  } catch {
    return seededRaw;
  }
};

const logSeedRewriteFlags = (input: {
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

const parseTriggerButtons = (
  raw: string | undefined
): TriggerButtonSettingRecord[] | null => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry: unknown): TriggerButtonSettingRecord | null => {
        if (!entry || typeof entry !== 'object') return null;
        const id = (entry as { id?: unknown }).id;
        if (typeof id !== 'string' || id.trim().length === 0) return null;
        return {
          ...(entry as Record<string, unknown>),
          id: id.trim(),
        };
      })
      .filter((entry: TriggerButtonSettingRecord | null): entry is TriggerButtonSettingRecord =>
        Boolean(entry)
      );
  } catch {
    return null;
  }
};

const buildTriggerButtonDisplay = (name: string): Record<string, unknown> => ({
  label: name,
  showLabel: true,
});

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
    // Path does not need a full reset. Silently bump version to 10 so future reads
    // skip content checks, allowing users to freely customize the path.
    try {
      const parsedExisting = JSON.parse(pathConfigRaw) as Record<string, unknown>;
      if (typeof parsedExisting['version'] !== 'number' || parsedExisting['version'] < 10) {
        const bumped = JSON.stringify({ ...parsedExisting, version: 10 });
        pathConfigRaw = bumped;
        map.set(pathConfigKey, bumped);
        updates.push({ key: pathConfigKey, value: bumped });
      }
    } catch {
      // Ignore — config was already validated by parsedConfigMeta
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
  await upsertMongoAiPathsSettingsBatch(updates);
  return Array.from(map.entries()).map(
    ([key, value]): AiPathsSettingRecord => ({ key, value })
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
  await upsertMongoAiPathsSettingsBatch(updates);
  return Array.from(map.entries()).map(
    ([key, value]): AiPathsSettingRecord => ({ key, value })
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
  await upsertMongoAiPathsSettingsBatch(updates);
  return Array.from(map.entries()).map(
    ([key, value]): AiPathsSettingRecord => ({ key, value })
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
  await upsertMongoAiPathsSettingsBatch(updates);
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
  await upsertMongoAiPathsSettingsBatch(updates);
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
  await upsertMongoAiPathsSettingsBatch(updates);
  return Array.from(map.entries()).map(
    ([nextKey, nextValue]: [string, string]): AiPathsSettingRecord => ({
      key: nextKey,
      value: nextValue,
    })
  );
};

const repairPathIndexFromConfigs = (records: Map<string, string>): string | null => {
  const existingIndexRaw = records.get(AI_PATHS_INDEX_KEY);
  const existingIndex = parsePathMetas(existingIndexRaw);
  // Do not resurrect deleted paths when an explicit index already exists.
  // Rebuild only when the index is missing/empty/corrupt.
  if (existingIndexRaw && existingIndex.length > 0) {
    return null;
  }

  const configMetasById = new Map<string, ParsedPathMeta>();
  records.forEach((value: string, key: string) => {
    if (!key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
    const configId = key.slice(AI_PATHS_CONFIG_KEY_PREFIX.length);
    if (!configId) return;
    const meta = parsePathConfigMeta(configId, value);
    if (!meta) return;
    configMetasById.set(meta.id, meta);
  });

  if (configMetasById.size === 0) return null;
  const rebuilt = Array.from(configMetasById.values()).sort((a: ParsedPathMeta, b: ParsedPathMeta) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  return JSON.stringify(rebuilt);
};

const normalizeExistingPathIndexValue = (
  records: Map<string, string>
): string | null => {
  const existingIndexRaw = records.get(AI_PATHS_INDEX_KEY);
  if (!existingIndexRaw) return null;
  const existingIndex = parsePathMetas(existingIndexRaw);
  if (existingIndex.length === 0) return null;

  const configMetasById = new Map<string, ParsedPathMeta>();
  records.forEach((value: string, key: string) => {
    if (!key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
    const configId = key.slice(AI_PATHS_CONFIG_KEY_PREFIX.length);
    if (!configId) return;
    const meta = parsePathConfigMeta(configId, value);
    if (!meta) return;
    configMetasById.set(meta.id, meta);
  });

  const normalizedById = new Map<string, ParsedPathMeta>();
  existingIndex.forEach((meta: ParsedPathMeta) => {
    const configMeta = configMetasById.get(meta.id);
    const candidateName =
      configMeta?.name?.trim().length
        ? configMeta.name.trim()
        : meta.name.trim();
    const normalizedName = candidateName || `Path ${meta.id.slice(0, 6)}`;
    const normalizedMeta: ParsedPathMeta = {
      id: meta.id,
      name: normalizedName,
      createdAt:
        configMeta?.createdAt?.trim().length
          ? configMeta.createdAt
          : meta.createdAt,
      updatedAt:
        configMeta?.updatedAt?.trim().length &&
        configMeta.updatedAt.localeCompare(meta.updatedAt) > 0
          ? configMeta.updatedAt
          : meta.updatedAt,
    };

    const existing = normalizedById.get(meta.id);
    if (!existing) {
      normalizedById.set(meta.id, normalizedMeta);
      return;
    }
    if (normalizedMeta.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      normalizedById.set(meta.id, normalizedMeta);
    }
  });

  const normalized = Array.from(normalizedById.values()).sort(
    (a: ParsedPathMeta, b: ParsedPathMeta) =>
      b.updatedAt.localeCompare(a.updatedAt)
  );
  if (JSON.stringify(normalized) === JSON.stringify(existingIndex)) {
    return null;
  }
  return JSON.stringify(normalized);
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
  await upsertMongoAiPathsSetting(AI_PATHS_INDEX_KEY, nextIndexValue);
  return Array.from(map.entries()).map(
    ([key, value]): AiPathsSettingRecord => ({ key, value })
  );
};

const countPendingPathConfigCompactions = (records: AiPathsSettingRecord[]): number => {
  if (records.length === 0) return 0;
  return records.reduce((count: number, entry: AiPathsSettingRecord): number => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return count;
    const shouldCompact =
      entry.value.length > AI_PATHS_CONFIG_COMPACTION_THRESHOLD ||
      entry.value.includes('"history"') ||
      entry.value.includes('"schemaSnapshot"');
    if (!shouldCompact) return count;
    const compacted = compactPathConfigValue(entry.value);
    if (!compacted || compacted === entry.value) return count;
    return count + 1;
  }, 0);
};

const needsPathIndexConsistencyRepair = (
  records: AiPathsSettingRecord[]
): boolean => {
  if (records.length === 0) return false;
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  return Boolean(repairPathIndexFromConfigs(map) ?? normalizeExistingPathIndexValue(map));
};

const hasParameterInferenceDefaults = (records: AiPathsSettingRecord[]): boolean => {
  if (records.length === 0) return false;
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const configRaw = map.get(
    `${AI_PATHS_CONFIG_KEY_PREFIX}${PARAMETER_INFERENCE_PATH_ID}`
  );
  if (needsParameterInferenceConfigUpgrade(configRaw)) return false;
  const configMeta = configRaw
    ? parsePathConfigMeta(PARAMETER_INFERENCE_PATH_ID, configRaw)
    : null;
  if (!configMeta) return false;

  const metas = parsePathMetas(map.get(AI_PATHS_INDEX_KEY));
  const parameterMeta = metas.find(
    (meta: ParsedPathMeta): boolean => meta.id === PARAMETER_INFERENCE_PATH_ID
  );
  if (!parameterMeta) return false;

  const buttons = parseTriggerButtons(map.get(AI_PATHS_TRIGGER_BUTTONS_KEY));
  if (buttons === null) return false;
  return true;
};

const hasDescriptionInferenceLiteDefaults = (
  records: AiPathsSettingRecord[]
): boolean => {
  if (records.length === 0) return false;
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const configRaw = map.get(
    `${AI_PATHS_CONFIG_KEY_PREFIX}${DESCRIPTION_INFERENCE_LITE_PATH_ID}`
  );
  if (needsDescriptionInferenceLiteConfigUpgrade(configRaw)) return false;
  const configMeta = configRaw
    ? parsePathConfigMeta(DESCRIPTION_INFERENCE_LITE_PATH_ID, configRaw)
    : null;
  if (!configMeta) return false;

  const metas = parsePathMetas(map.get(AI_PATHS_INDEX_KEY));
  const descriptionMeta = metas.find(
    (meta: ParsedPathMeta): boolean => meta.id === DESCRIPTION_INFERENCE_LITE_PATH_ID
  );
  if (!descriptionMeta) return false;

  const buttons = parseTriggerButtons(map.get(AI_PATHS_TRIGGER_BUTTONS_KEY));
  if (buttons === null) return false;
  return true;
};

const hasBaseExportBlwoDefaults = (
  records: AiPathsSettingRecord[]
): boolean => {
  if (records.length === 0) return false;
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const configRaw = map.get(
    `${AI_PATHS_CONFIG_KEY_PREFIX}${BASE_EXPORT_BLWO_PATH_ID}`
  );
  if (needsBaseExportBlwoConfigUpgrade(configRaw)) return false;
  const configMeta = configRaw
    ? parsePathConfigMeta(BASE_EXPORT_BLWO_PATH_ID, configRaw)
    : null;
  if (!configMeta) return false;

  const metas = parsePathMetas(map.get(AI_PATHS_INDEX_KEY));
  const pathMeta = metas.find(
    (meta: ParsedPathMeta): boolean => meta.id === BASE_EXPORT_BLWO_PATH_ID
  );
  if (!pathMeta) return false;

  const buttons = parseTriggerButtons(map.get(AI_PATHS_TRIGGER_BUTTONS_KEY));
  if (buttons === null) return false;
  return true;
};

const hasTranslationEnPlDefaults = (records: AiPathsSettingRecord[]): boolean => {
  if (records.length === 0) return true;
  const map = new Map<string, string>(
    records.map(
      (entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value]
    )
  );
  const raw = map.get(`${AI_PATHS_CONFIG_KEY_PREFIX}${TRANSLATION_EN_PL_PATH_ID}`);
  if (!raw) return true;
  return !needsTranslationEnPlConfigUpgrade(raw);
};

const AI_PATHS_MAINTENANCE_ACTION_DETAILS: Record<
  AiPathsMaintenanceActionId,
  {
    title: string;
    description: string;
    blocking: boolean;
  }
> = {
  compact_oversized_configs: {
    title: 'Compact oversized path configs',
    description:
      'Removes oversized runtime snapshots/history fields from persisted path config records.',
    blocking: false,
  },
  repair_path_index: {
    title: 'Repair path index consistency',
    description:
      'Rebuilds/normalizes `ai_paths_index` metadata from stored path configs when index drift is detected.',
    blocking: true,
  },
  ensure_parameter_inference_defaults: {
    title: 'Seed Parameter Inference defaults',
    description:
      'Creates or updates the Parameter Inference path template and trigger button defaults.',
    blocking: false,
  },
  ensure_description_inference_defaults: {
    title: 'Seed Description Inference defaults',
    description:
      'Creates or updates the Description Inference Lite path template and trigger button defaults.',
    blocking: false,
  },
  ensure_base_export_defaults: {
    title: 'Seed Base Export defaults',
    description:
      'Creates or updates the Base Export (BLWO) path template and trigger button defaults.',
    blocking: false,
  },
  upgrade_translation_en_pl: {
    title: 'Upgrade EN/PL translation path',
    description:
      'Applies explicit config upgrades for the EN/PL translation path when required.',
    blocking: false,
  },
  upgrade_runtime_input_contracts: {
    title: 'Normalize runtime input contracts',
    description:
      'Applies universal runtime input contract migrations (removes legacy prompt deadlocks and normalizes model prompt requirements).',
    blocking: false,
  },
  upgrade_server_execution_mode: {
    title: 'Upgrade server execution mode defaults',
    description:
      'Adds server execution mode defaults to path configs that still use legacy runtime mode.',
    blocking: false,
  },
};

const countPendingServerExecutionModeUpgrades = (
  records: AiPathsSettingRecord[]
): number => {
  if (records.length === 0) return 0;
  return records.reduce((count: number, entry: AiPathsSettingRecord): number => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return count;
    return needsServerExecutionModeConfigUpgrade(entry.value) ? count + 1 : count;
  }, 0);
};

const countPendingRuntimeInputContractUpgrades = (
  records: AiPathsSettingRecord[]
): number => {
  if (records.length === 0) return 0;
  return records.reduce((count: number, entry: AiPathsSettingRecord): number => {
    if (!entry.key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return count;
    return needsRuntimeInputContractsUpgrade(entry.value) ? count + 1 : count;
  }, 0);
};

const buildAiPathsMaintenanceReport = (
  records: AiPathsSettingRecord[]
): AiPathsMaintenanceReport => {
  const pendingByAction: Record<AiPathsMaintenanceActionId, number> = {
    compact_oversized_configs: countPendingPathConfigCompactions(records),
    repair_path_index: needsPathIndexConsistencyRepair(records) ? 1 : 0,
    ensure_parameter_inference_defaults: hasParameterInferenceDefaults(records) ? 0 : 1,
    ensure_description_inference_defaults: hasDescriptionInferenceLiteDefaults(records)
      ? 0
      : 1,
    ensure_base_export_defaults: hasBaseExportBlwoDefaults(records) ? 0 : 1,
    upgrade_translation_en_pl: hasTranslationEnPlDefaults(records) ? 0 : 1,
    upgrade_runtime_input_contracts: countPendingRuntimeInputContractUpgrades(records),
    upgrade_server_execution_mode: countPendingServerExecutionModeUpgrades(records),
  };

  const actions = AI_PATHS_MAINTENANCE_ACTION_IDS.map(
    (actionId: AiPathsMaintenanceActionId): AiPathsMaintenanceActionReport => {
      const details = AI_PATHS_MAINTENANCE_ACTION_DETAILS[actionId];
      const affectedRecords = pendingByAction[actionId];
      return {
        id: actionId,
        title: details.title,
        description: details.description,
        blocking: details.blocking,
        status: affectedRecords > 0 ? 'pending' : 'ready',
        affectedRecords,
      };
    }
  );

  const pendingActions = actions.filter(
    (action: AiPathsMaintenanceActionReport): boolean => action.status === 'pending'
  );

  return {
    scannedAt: new Date().toISOString(),
    pendingActions: pendingActions.length,
    blockingActions: pendingActions.filter((action) => action.blocking).length,
    actions,
  };
};

const resolveRequestedMaintenanceActionIds = (
  report: AiPathsMaintenanceReport,
  requestedActionIds?: AiPathsMaintenanceActionId[]
): AiPathsMaintenanceActionId[] => {
  const orderedRequested =
    requestedActionIds && requestedActionIds.length > 0
      ? AI_PATHS_MAINTENANCE_ACTION_IDS.filter((actionId: AiPathsMaintenanceActionId) =>
        requestedActionIds.includes(actionId)
      )
      : report.actions
        .filter((action: AiPathsMaintenanceActionReport): boolean => action.status === 'pending')
        .map((action: AiPathsMaintenanceActionReport): AiPathsMaintenanceActionId => action.id);
  return Array.from(new Set(orderedRequested));
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
    await listMongoAiPathsSettings()
  );
  setCachedAiPathsSettings(settings);
  return buildAiPathsMaintenanceReport(settings);
}

export async function applyAiPathsSettingsMaintenance(
  actionIds?: AiPathsMaintenanceActionId[]
): Promise<AiPathsMaintenanceApplyResult> {
  assertMongoConfigured();
  const settings = await listMongoAiPathsSettings();
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
    await listMongoAiPathsSettings()
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
  const updated = await upsertMongoAiPathsSetting(key, value);
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

  await upsertMongoAiPathsSettingsBatch(normalized);
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

  await withMongoOperationTimeout(ensureMongoIndexes());
  const mongo = await withMongoOperationTimeout(getMongoDb());
  const result = await withMongoOperationTimeout(
    mongo
      .collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION)
      .deleteMany({ key: { $in: normalizedKeys } })
  );
  deleteCachedAiPathsSettings(normalizedKeys);
  return result.deletedCount ?? 0;
}

export const __testOnly = {
  parsePathConfigFlags,
  preservePathConfigFlagsOnSeed,
  maybeAutoApplyDefaultSeedsOnRead,
  resolveAutoApplyDefaultSeedsOnRead: (
    value: string | undefined
  ): boolean => parseBooleanEnv(value, false),
};
