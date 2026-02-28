import { ObjectId, type Db, type Document, type Filter, type UpdateFilter } from 'mongodb';

import {
  PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY,
  PRODUCT_VALIDATION_REPLACEMENT_FIELDS,
  PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY,
  PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY,
} from '@/features/products/constants';
import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationSkipNoopReplacementProposal,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationInstanceDenyBehaviorMap,
} from '@/features/products/utils/validator-instance-behavior';
import type {
  CreateProductValidationPatternInput,
  ProductValidationPatternRepository,
  UpdateProductValidationPatternInput,
} from '@/shared/contracts/products';
import type {
  ProductValidationChainMode,
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidationLaunchScopeBehavior,
  ProductValidationLaunchOperator,
  ProductValidationLaunchSourceMode,
  ProductValidationPostAcceptBehavior,
  ProductValidationRuntimeType,
  ProductValidationPattern,
  ProductValidationSeverity,
  ProductValidationTarget,
} from '@/shared/contracts/products';
import { badRequestError, conflictError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION = 'product_validation_patterns';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_ENABLED_BY_DEFAULT = true;
const DEFAULT_FORMATTER_ENABLED_BY_DEFAULT = false;
const DEFAULT_PATTERNS_SORT_INDEX = 'validation_pattern_default_sort_idx';
const RUNTIME_LOOKUP_INDEX = 'validation_pattern_runtime_lookup_idx';

interface ProductValidationPatternDoc extends Document {
  _id: ObjectId;
  label: string;
  target: ProductValidationTarget;
  locale: string | null;
  regex: string;
  flags: string | null;
  message: string;
  severity: ProductValidationSeverity;
  enabled: boolean;
  replacementEnabled: boolean;
  replacementAutoApply?: boolean;
  skipNoopReplacementProposal?: boolean | null;
  replacementValue: string | null;
  replacementFields: string[];
  replacementAppliesToScopes?: ProductValidationInstanceScope[] | null;
  runtimeEnabled?: boolean | null;
  runtimeType?: ProductValidationRuntimeType | null;
  runtimeConfig?: string | null;
  postAcceptBehavior?: ProductValidationPostAcceptBehavior | null;
  denyBehaviorOverride?: ProductValidationDenyBehavior | null;
  validationDebounceMs?: number | null;
  sequenceGroupId?: string | null;
  sequenceGroupLabel?: string | null;
  sequenceGroupDebounceMs?: number | null;
  sequence?: number | null;
  chainMode?: ProductValidationChainMode | null;
  maxExecutions?: number | null;
  passOutputToNext?: boolean | null;
  launchEnabled?: boolean | null;
  launchAppliesToScopes?: ProductValidationInstanceScope[] | null;
  launchScopeBehavior?: ProductValidationLaunchScopeBehavior | null;
  launchSourceMode?: ProductValidationLaunchSourceMode | null;
  launchSourceField?: string | null;
  launchOperator?: ProductValidationLaunchOperator | null;
  launchValue?: string | null;
  launchFlags?: string | null;
  appliesToScopes?: ProductValidationInstanceScope[] | null;
  createdAt: Date;
  updatedAt: Date;
}

type ProductValidationPatternInsert = {
  label: string;
  target: ProductValidationTarget;
  locale: string | null;
  regex: string;
  flags: string | null;
  message: string;
  severity: ProductValidationSeverity;
  enabled: boolean;
  replacementEnabled: boolean;
  replacementAutoApply: boolean;
  skipNoopReplacementProposal: boolean;
  replacementValue: string | null;
  replacementFields: string[];
  replacementAppliesToScopes: ProductValidationInstanceScope[];
  runtimeEnabled: boolean;
  runtimeType: ProductValidationRuntimeType;
  runtimeConfig: string | null;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  denyBehaviorOverride: ProductValidationDenyBehavior | null;
  validationDebounceMs: number;
  sequenceGroupId: string | null;
  sequenceGroupLabel: string | null;
  sequenceGroupDebounceMs: number;
  sequence: number | null;
  chainMode: ProductValidationChainMode;
  maxExecutions: number;
  passOutputToNext: boolean;
  launchEnabled: boolean;
  launchAppliesToScopes: ProductValidationInstanceScope[];
  launchScopeBehavior: ProductValidationLaunchScopeBehavior;
  launchSourceMode: ProductValidationLaunchSourceMode;
  launchSourceField: string | null;
  launchOperator: ProductValidationLaunchOperator;
  launchValue: string | null;
  launchFlags: string | null;
  appliesToScopes: ProductValidationInstanceScope[];
  createdAt: Date;
  updatedAt: Date;
};

type SettingDoc = Document & {
  _id: ObjectId | string;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

let indexesInitialized = false;
let indexesInFlight: Promise<void> | null = null;

const ensureIndexes = async (db: Db): Promise<void> => {
  if (indexesInitialized) return;
  if (indexesInFlight) {
    await indexesInFlight;
    return;
  }
  indexesInFlight = (async (): Promise<void> => {
    const collection = db.collection<ProductValidationPatternDoc>(COLLECTION);
    await Promise.all([
      collection.createIndex(
        { sequence: 1, target: 1, label: 1 },
        { name: DEFAULT_PATTERNS_SORT_INDEX }
      ),
      collection.createIndex(
        { enabled: 1, runtimeEnabled: 1, target: 1, locale: 1, sequence: 1 },
        { name: RUNTIME_LOOKUP_INDEX }
      ),
    ]);
    indexesInitialized = true;
  })();
  try {
    await indexesInFlight;
  } finally {
    indexesInFlight = null;
  }
};

const parseBooleanSetting = (
  value: string | null | undefined,
  fallback: boolean = DEFAULT_ENABLED_BY_DEFAULT
): boolean => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') {
    return false;
  }
  return true;
};

const readStringSetting = async (key: string): Promise<string | null> => {
  const db = await getMongoDb();
  const setting = await db.collection<SettingDoc>(SETTINGS_COLLECTION).findOne({
    $or: [{ key }, { _id: key }],
  } as Filter<SettingDoc>);
  return typeof setting?.value === 'string' ? setting.value : null;
};

const writeStringSetting = async (key: string, value: string): Promise<void> => {
  const db = await getMongoDb();
  const now = new Date();
  await db.collection<SettingDoc>(SETTINGS_COLLECTION).updateOne(
    {
      $or: [{ key }, { _id: key }],
    } as Filter<SettingDoc>,
    {
      $set: {
        key,
        value,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    } as UpdateFilter<SettingDoc>,
    { upsert: true }
  );
};

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const normalizeReplacementFields = (fields: string[] | null | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (!field || !ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

const normalizeSequence = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
};

const normalizeSequenceGroupId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSequenceGroupLabel = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSequenceGroupDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

const normalizeValidationDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

const normalizePostAcceptBehavior = (value: unknown): ProductValidationPostAcceptBehavior =>
  value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate';

const normalizeRuntimeType = (value: unknown): ProductValidationRuntimeType => {
  if (value === 'database_query' || value === 'ai_prompt') return value;
  return 'none';
};

const normalizeRuntimeConfig = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeChainMode = (value: unknown): ProductValidationChainMode => {
  if (value === 'stop_on_match' || value === 'stop_on_replace') return value;
  return 'continue';
};

const normalizeMaxExecutions = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.min(20, Math.max(1, Math.floor(value)));
};

const normalizeLaunchSourceMode = (value: unknown): ProductValidationLaunchSourceMode => {
  if (value === 'form_field' || value === 'latest_product_field') return value;
  return 'current_field';
};

const normalizeLaunchOperator = (value: unknown): ProductValidationLaunchOperator => {
  switch (value) {
    case 'equals':
    case 'not_equals':
    case 'contains':
    case 'starts_with':
    case 'ends_with':
    case 'regex':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
    case 'is_empty':
    case 'is_not_empty':
      return value;
    default:
      return 'equals';
  }
};

const toDomain = (doc: ProductValidationPatternDoc): ProductValidationPattern => ({
  id: doc._id.toString(),
  label: doc.label,
  target: doc.target,
  locale: doc.locale ?? null,
  regex: doc.regex,
  flags: doc.flags ?? null,
  message: doc.message,
  severity: doc.severity ?? 'error',
  enabled: doc.enabled,
  replacementEnabled: doc.replacementEnabled ?? false,
  replacementAutoApply: doc.replacementAutoApply ?? false,
  skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
    doc.skipNoopReplacementProposal
  ),
  replacementValue: doc.replacementValue ?? null,
  replacementFields: normalizeReplacementFields(doc.replacementFields),
  replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
    doc.replacementAppliesToScopes,
    doc.appliesToScopes
  ),
  runtimeEnabled: doc.runtimeEnabled ?? false,
  runtimeType: normalizeRuntimeType(doc.runtimeType),
  runtimeConfig: normalizeRuntimeConfig(doc.runtimeConfig),
  postAcceptBehavior: normalizePostAcceptBehavior(doc.postAcceptBehavior),
  denyBehaviorOverride: normalizeProductValidationPatternDenyBehaviorOverride(
    doc.denyBehaviorOverride
  ),
  validationDebounceMs: normalizeValidationDebounceMs(doc.validationDebounceMs),
  sequenceGroupId: normalizeSequenceGroupId(doc.sequenceGroupId),
  sequenceGroupLabel: normalizeSequenceGroupLabel(doc.sequenceGroupLabel),
  sequenceGroupDebounceMs: normalizeSequenceGroupDebounceMs(doc.sequenceGroupDebounceMs),
  sequence: normalizeSequence(doc.sequence),
  chainMode: normalizeChainMode(doc.chainMode),
  maxExecutions: normalizeMaxExecutions(doc.maxExecutions),
  passOutputToNext: doc.passOutputToNext ?? true,
  launchEnabled: doc.launchEnabled ?? false,
  launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
    doc.launchAppliesToScopes,
    doc.appliesToScopes
  ),
  launchScopeBehavior: normalizeProductValidationLaunchScopeBehavior(doc.launchScopeBehavior),
  launchSourceMode: normalizeLaunchSourceMode(doc.launchSourceMode),
  launchSourceField:
    typeof doc.launchSourceField === 'string' && doc.launchSourceField.trim()
      ? doc.launchSourceField.trim()
      : null,
  launchOperator: normalizeLaunchOperator(doc.launchOperator),
  launchValue: typeof doc.launchValue === 'string' ? doc.launchValue : null,
  launchFlags:
    typeof doc.launchFlags === 'string' && doc.launchFlags.trim() ? doc.launchFlags.trim() : null,
  appliesToScopes: normalizeProductValidationPatternScopes(doc.appliesToScopes),
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

const toObjectId = (id: string): ObjectId => new ObjectId(id);

export const mongoValidationPatternRepository: ProductValidationPatternRepository = {
  async listPatterns(): Promise<ProductValidationPattern[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const rows = await db
      .collection<ProductValidationPatternDoc>(COLLECTION)
      .find({})
      .sort({ sequence: 1, target: 1, label: 1 })
      .toArray();
    return rows.map(toDomain);
  },

  async getPatternById(id: string): Promise<ProductValidationPattern | null> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    if (!ObjectId.isValid(id)) return null;
    const row = await db
      .collection<ProductValidationPatternDoc>(COLLECTION)
      .findOne({ _id: toObjectId(id) });
    return row ? toDomain(row) : null;
  },

  async createPattern(
    data: CreateProductValidationPatternInput
  ): Promise<ProductValidationPattern> {
    const db = await getMongoDb();
    await ensureIndexes(db);
    const now = new Date();
    const maxSequenceRow = await db
      .collection<ProductValidationPatternDoc>(COLLECTION)
      .find({})
      .project<{ sequence?: number | null }>({ sequence: 1 })
      .sort({ sequence: -1 })
      .limit(1)
      .next();
    const fallbackSequence =
      typeof maxSequenceRow?.sequence === 'number' && Number.isFinite(maxSequenceRow.sequence)
        ? Math.floor(maxSequenceRow.sequence) + 10
        : 10;
    const payload: ProductValidationPatternInsert = {
      label: data.label,
      target: data.target,
      locale: data.locale?.trim() || null,
      regex: data.regex,
      flags: data.flags ?? null,
      message: data.message,
      severity: data.severity ?? 'error',
      enabled: data.enabled ?? true,
      replacementEnabled: data.replacementEnabled ?? false,
      replacementAutoApply: data.replacementAutoApply ?? false,
      skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
        data.skipNoopReplacementProposal
      ),
      replacementValue: data.replacementValue?.trim() || null,
      replacementFields: normalizeReplacementFields(data.replacementFields),
      replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
        data.replacementAppliesToScopes,
        data.appliesToScopes
      ),
      runtimeEnabled: data.runtimeEnabled ?? false,
      runtimeType: normalizeRuntimeType(data.runtimeType),
      runtimeConfig: normalizeRuntimeConfig(data.runtimeConfig),
      postAcceptBehavior: normalizePostAcceptBehavior(data.postAcceptBehavior),
      denyBehaviorOverride: normalizeProductValidationPatternDenyBehaviorOverride(
        data.denyBehaviorOverride
      ),
      validationDebounceMs: normalizeValidationDebounceMs(data.validationDebounceMs),
      sequenceGroupId: normalizeSequenceGroupId(data.sequenceGroupId),
      sequenceGroupLabel: normalizeSequenceGroupLabel(data.sequenceGroupLabel),
      sequenceGroupDebounceMs: normalizeSequenceGroupDebounceMs(data.sequenceGroupDebounceMs),
      sequence: normalizeSequence(data.sequence) ?? fallbackSequence,
      chainMode: normalizeChainMode(data.chainMode),
      maxExecutions: normalizeMaxExecutions(data.maxExecutions),
      passOutputToNext: data.passOutputToNext ?? true,
      launchEnabled: data.launchEnabled ?? false,
      launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
        data.launchAppliesToScopes,
        data.appliesToScopes
      ),
      launchScopeBehavior: normalizeProductValidationLaunchScopeBehavior(data.launchScopeBehavior),
      launchSourceMode: normalizeLaunchSourceMode(data.launchSourceMode),
      launchSourceField: data.launchSourceField?.trim() || null,
      launchOperator: normalizeLaunchOperator(data.launchOperator),
      launchValue: typeof data.launchValue === 'string' ? data.launchValue : null,
      launchFlags: data.launchFlags?.trim() || null,
      appliesToScopes: normalizeProductValidationPatternScopes(data.appliesToScopes),
      createdAt: now,
      updatedAt: now,
    };
    const result = await db
      .collection<ProductValidationPatternInsert>(COLLECTION)
      .insertOne(payload);
    const inserted: ProductValidationPatternDoc = { ...payload, _id: result.insertedId };
    return toDomain(inserted);
  },

  async updatePattern(
    id: string,
    data: UpdateProductValidationPatternInput
  ): Promise<ProductValidationPattern> {
    if (!ObjectId.isValid(id)) {
      throw badRequestError('Invalid pattern ID', { patternId: id });
    }
    const db = await getMongoDb();
    await ensureIndexes(db);
    const expectedUpdatedAtRaw =
      typeof data.expectedUpdatedAt === 'string' && data.expectedUpdatedAt.trim()
        ? data.expectedUpdatedAt.trim()
        : null;
    const expectedUpdatedAt = expectedUpdatedAtRaw ? new Date(expectedUpdatedAtRaw) : null;
    if (expectedUpdatedAtRaw && Number.isNaN(expectedUpdatedAt?.getTime() ?? Number.NaN)) {
      throw badRequestError('Invalid expectedUpdatedAt value.', {
        patternId: id,
        expectedUpdatedAt: expectedUpdatedAtRaw,
      });
    }
    const set: Partial<ProductValidationPatternDoc> = {
      updatedAt: new Date(),
    };
    if (data.label !== undefined) set.label = data.label;
    if (data.target !== undefined) set.target = data.target;
    if (data.locale !== undefined) set.locale = data.locale?.trim() || null;
    if (data.regex !== undefined) set.regex = data.regex;
    if (data.flags !== undefined) set.flags = data.flags ?? null;
    if (data.message !== undefined) set.message = data.message;
    if (data.severity !== undefined) {
      set.severity = data.severity ?? 'error';
    }
    if (data.enabled !== undefined) set.enabled = data.enabled;
    if (data.replacementEnabled !== undefined) set.replacementEnabled = data.replacementEnabled;
    if (data.replacementAutoApply !== undefined)
      set.replacementAutoApply = data.replacementAutoApply;
    if (data.skipNoopReplacementProposal !== undefined) {
      set.skipNoopReplacementProposal = normalizeProductValidationSkipNoopReplacementProposal(
        data.skipNoopReplacementProposal
      );
    }
    if (data.replacementValue !== undefined)
      set.replacementValue = data.replacementValue?.trim() || null;
    if (data.replacementFields !== undefined) {
      set.replacementFields = normalizeReplacementFields(data.replacementFields);
    }
    if (data.replacementAppliesToScopes !== undefined) {
      set.replacementAppliesToScopes = normalizeProductValidationPatternReplacementScopes(
        data.replacementAppliesToScopes,
        data.appliesToScopes
      );
    }
    if (data.runtimeEnabled !== undefined) {
      set.runtimeEnabled = data.runtimeEnabled;
    }
    if (data.runtimeType !== undefined) {
      set.runtimeType = normalizeRuntimeType(data.runtimeType);
    }
    if (data.runtimeConfig !== undefined) {
      set.runtimeConfig = normalizeRuntimeConfig(data.runtimeConfig);
    }
    if (data.postAcceptBehavior !== undefined) {
      set.postAcceptBehavior = normalizePostAcceptBehavior(data.postAcceptBehavior);
    }
    if (data.denyBehaviorOverride !== undefined) {
      set.denyBehaviorOverride = normalizeProductValidationPatternDenyBehaviorOverride(
        data.denyBehaviorOverride
      );
    }
    if (data.validationDebounceMs !== undefined) {
      set.validationDebounceMs = normalizeValidationDebounceMs(data.validationDebounceMs);
    }
    if (data.sequenceGroupId !== undefined) {
      set.sequenceGroupId = normalizeSequenceGroupId(data.sequenceGroupId);
    }
    if (data.sequenceGroupLabel !== undefined) {
      set.sequenceGroupLabel = normalizeSequenceGroupLabel(data.sequenceGroupLabel);
    }
    if (data.sequenceGroupDebounceMs !== undefined) {
      set.sequenceGroupDebounceMs = normalizeSequenceGroupDebounceMs(data.sequenceGroupDebounceMs);
    }
    if (data.sequence !== undefined) {
      set.sequence = normalizeSequence(data.sequence);
    }
    if (data.chainMode !== undefined) {
      set.chainMode = normalizeChainMode(data.chainMode);
    }
    if (data.maxExecutions !== undefined) {
      set.maxExecutions = normalizeMaxExecutions(data.maxExecutions);
    }
    if (data.passOutputToNext !== undefined) {
      set.passOutputToNext = data.passOutputToNext;
    }
    if (data.launchEnabled !== undefined) {
      set.launchEnabled = data.launchEnabled;
    }
    if (data.launchAppliesToScopes !== undefined) {
      set.launchAppliesToScopes = normalizeProductValidationPatternLaunchScopes(
        data.launchAppliesToScopes,
        data.appliesToScopes
      );
    }
    if (data.launchScopeBehavior !== undefined) {
      set.launchScopeBehavior = normalizeProductValidationLaunchScopeBehavior(
        data.launchScopeBehavior
      );
    }
    if (data.launchSourceMode !== undefined) {
      set.launchSourceMode = normalizeLaunchSourceMode(data.launchSourceMode);
    }
    if (data.launchSourceField !== undefined) {
      set.launchSourceField = data.launchSourceField?.trim() || null;
    }
    if (data.launchOperator !== undefined) {
      set.launchOperator = normalizeLaunchOperator(data.launchOperator);
    }
    if (data.launchValue !== undefined) {
      set.launchValue = typeof data.launchValue === 'string' ? data.launchValue : null;
    }
    if (data.launchFlags !== undefined) {
      set.launchFlags = data.launchFlags?.trim() || null;
    }
    if (data.appliesToScopes !== undefined) {
      set.appliesToScopes = normalizeProductValidationPatternScopes(data.appliesToScopes);
    }

    const filter: Filter<ProductValidationPatternDoc> = {
      _id: toObjectId(id),
      ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
    };
    const updateResult = await db
      .collection<ProductValidationPatternDoc>(COLLECTION)
      .updateOne(filter, { $set: set } as UpdateFilter<ProductValidationPatternDoc>);
    if (updateResult.matchedCount === 0) {
      const existing = await db
        .collection<ProductValidationPatternDoc>(COLLECTION)
        .findOne({ _id: toObjectId(id) });
      if (!existing) {
        throw notFoundError('Validation pattern not found', { patternId: id });
      }
      throw conflictError('Validation pattern was modified by another request.', {
        patternId: id,
        expectedUpdatedAt: expectedUpdatedAtRaw,
        actualUpdatedAt: existing.updatedAt?.toISOString?.() ?? null,
      });
    }

    const updated = await db
      .collection<ProductValidationPatternDoc>(COLLECTION)
      .findOne({ _id: toObjectId(id) });
    if (!updated) throw notFoundError('Validation pattern not found', { patternId: id });
    return toDomain(updated);
  },

  async deletePattern(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw badRequestError('Invalid pattern ID', { patternId: id });
    }
    const db = await getMongoDb();
    await db.collection<ProductValidationPatternDoc>(COLLECTION).deleteOne({ _id: toObjectId(id) });
  },

  async getEnabledByDefault(): Promise<boolean> {
    return parseBooleanSetting(
      await readStringSetting(PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY)
    );
  },

  async setEnabledByDefault(enabled: boolean): Promise<boolean> {
    await writeStringSetting(PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY, String(enabled));
    return enabled;
  },

  async getFormatterEnabledByDefault(): Promise<boolean> {
    return parseBooleanSetting(
      await readStringSetting(PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY),
      DEFAULT_FORMATTER_ENABLED_BY_DEFAULT
    );
  },

  async setFormatterEnabledByDefault(enabled: boolean): Promise<boolean> {
    await writeStringSetting(PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY, String(enabled));
    return enabled;
  },

  async getInstanceDenyBehavior(): Promise<ProductValidationInstanceDenyBehaviorMap> {
    const raw = await readStringSetting(PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY);
    if (!raw) {
      return normalizeProductValidationInstanceDenyBehaviorMap(null);
    }
    try {
      return normalizeProductValidationInstanceDenyBehaviorMap(JSON.parse(raw) as unknown);
    } catch {
      return normalizeProductValidationInstanceDenyBehaviorMap(null);
    }
  },

  async setInstanceDenyBehavior(
    value: ProductValidationInstanceDenyBehaviorMap
  ): Promise<ProductValidationInstanceDenyBehaviorMap> {
    const normalized = normalizeProductValidationInstanceDenyBehaviorMap(value);
    await writeStringSetting(
      PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY,
      JSON.stringify(normalized)
    );
    return normalized;
  },
};
