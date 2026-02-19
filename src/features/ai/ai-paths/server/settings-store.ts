import 'server-only';

import { ObjectId } from 'mongodb';

import type { SettingRecordDto } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  buildDescriptionInferenceLitePathConfigValue,
  DESCRIPTION_INFERENCE_LITE_PATH_ID,
  DESCRIPTION_INFERENCE_LITE_PATH_NAME,
  DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID,
  DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME,
  needsDescriptionInferenceLiteConfigUpgrade,
} from './settings-store-description-inference';
import {
  buildParameterInferencePathConfigValue,
  needsParameterInferenceConfigUpgrade,
  PARAMETER_INFERENCE_PATH_ID,
  PARAMETER_INFERENCE_PATH_NAME,
  PARAMETER_INFERENCE_TRIGGER_BUTTON_ID,
  PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME,
} from './settings-store-parameter-inference';

export type AiPathsSettingRecord = SettingRecordDto;

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

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const AI_PATHS_MONGO_OP_TIMEOUT_MS = parsePositiveInt(
  process.env['AI_PATHS_MONGO_OP_TIMEOUT_MS'],
  30_000
);
const AI_PATHS_SETTINGS_CACHE_TTL_MS = parsePositiveInt(
  process.env['AI_PATHS_SETTINGS_CACHE_TTL_MS'],
  300_000
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

const ensureParameterInferenceDefaults = async (
  records: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> => {
  const map = new Map<string, string>(
    records.map((entry: AiPathsSettingRecord): [string, string] => [entry.key, entry.value])
  );
  const updates: AiPathsSettingRecord[] = [];
  const now = new Date().toISOString();
  const pathConfigKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${PARAMETER_INFERENCE_PATH_ID}`;
  let pathConfigRaw = map.get(pathConfigKey);

  const parsedConfigMeta = pathConfigRaw
    ? parsePathConfigMeta(PARAMETER_INFERENCE_PATH_ID, pathConfigRaw)
    : null;
  if (!pathConfigRaw || !parsedConfigMeta || needsParameterInferenceConfigUpgrade(pathConfigRaw)) {
    pathConfigRaw = buildParameterInferencePathConfigValue(now);
    map.set(pathConfigKey, pathConfigRaw);
    updates.push({ key: pathConfigKey, value: pathConfigRaw });
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
        display: 'icon_label',
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
      display: 'icon_label',
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
        display: 'icon_label',
      };
    } else {
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

  let pathConfigRaw = map.get(pathConfigKey);
  const parsedConfigMeta = pathConfigRaw
    ? parsePathConfigMeta(DESCRIPTION_INFERENCE_LITE_PATH_ID, pathConfigRaw)
    : null;
  if (
    !pathConfigRaw ||
    !parsedConfigMeta ||
    needsDescriptionInferenceLiteConfigUpgrade(pathConfigRaw)
  ) {
    pathConfigRaw = buildDescriptionInferenceLitePathConfigValue(now);
    map.set(pathConfigKey, pathConfigRaw);
    updates.push({ key: pathConfigKey, value: pathConfigRaw });
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
        display: 'icon_label',
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
      display: 'icon_label',
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
        display: 'icon_label',
      };
    } else {
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
  const parameterButton = buttons.find(
    (button: TriggerButtonSettingRecord): boolean =>
      button.id === PARAMETER_INFERENCE_TRIGGER_BUTTON_ID
  );
  if (!parameterButton) return false;
  const buttonName =
    typeof parameterButton['name'] === 'string' ? (parameterButton['name']).trim() : '';
  if (buttonName !== PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME) return false;
  const locations = Array.isArray(parameterButton['locations'])
    ? parameterButton['locations']
    : [];
  return locations.includes('product_modal');
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
  const descriptionButton = buttons.find(
    (button: TriggerButtonSettingRecord): boolean =>
      button.id === DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID
  );
  if (!descriptionButton) return false;
  const buttonName =
    typeof descriptionButton['name'] === 'string' ? (descriptionButton['name']).trim() : '';
  if (buttonName !== DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME) return false;
  const locations = Array.isArray(descriptionButton['locations'])
    ? descriptionButton['locations']
    : [];
  return locations.includes('product_modal');
};

const hasAiPathsSeedDefaults = (records: AiPathsSettingRecord[]): boolean =>
  hasParameterInferenceDefaults(records) &&
  hasDescriptionInferenceLiteDefaults(records);

export async function listAiPathsSettings(): Promise<AiPathsSettingRecord[]> {
  assertMongoConfigured();
  const cached = getCachedAiPathsSettings();
  if (cached && hasAiPathsSeedDefaults(cached)) return cached;

  const settings = await listMongoAiPathsSettings();
  const compacted = await compactOversizedPathConfigs(settings);
  const consistent = await ensurePathIndexConsistency(compacted);
  const withParameterDefaults = await ensureParameterInferenceDefaults(consistent);
  const ensuredDefaults = await ensureDescriptionInferenceLiteDefaults(
    withParameterDefaults
  );
  setCachedAiPathsSettings(ensuredDefaults);
  return ensuredDefaults;
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
