import { ObjectId, type Document, type Filter, type UpdateFilter } from 'mongodb';

import {
  PRODUCT_VALIDATION_REPLACEMENT_FIELDS,
  PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY,
} from '@/features/products/constants';
import type {
  CreateProductValidationPatternInput,
  ProductValidationPatternRepository,
  UpdateProductValidationPatternInput,
} from '@/features/products/types/services/validation-pattern-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type {
  ProductValidationChainMode,
  ProductValidationLaunchOperator,
  ProductValidationLaunchSourceMode,
  ProductValidationPattern,
  ProductValidationSeverity,
  ProductValidationTarget,
} from '@/shared/types/domain/products';

const COLLECTION = 'product_validation_patterns';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_ENABLED_BY_DEFAULT = true;

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
  replacementValue: string | null;
  replacementFields: string[];
  sequenceGroupId?: string | null;
  sequenceGroupLabel?: string | null;
  sequenceGroupDebounceMs?: number | null;
  sequence?: number | null;
  chainMode?: ProductValidationChainMode | null;
  maxExecutions?: number | null;
  passOutputToNext?: boolean | null;
  launchEnabled?: boolean | null;
  launchSourceMode?: ProductValidationLaunchSourceMode | null;
  launchSourceField?: string | null;
  launchOperator?: ProductValidationLaunchOperator | null;
  launchValue?: string | null;
  launchFlags?: string | null;
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
  replacementValue: string | null;
  replacementFields: string[];
  sequenceGroupId: string | null;
  sequenceGroupLabel: string | null;
  sequenceGroupDebounceMs: number;
  sequence: number | null;
  chainMode: ProductValidationChainMode;
  maxExecutions: number;
  passOutputToNext: boolean;
  launchEnabled: boolean;
  launchSourceMode: ProductValidationLaunchSourceMode;
  launchSourceField: string | null;
  launchOperator: ProductValidationLaunchOperator;
  launchValue: string | null;
  launchFlags: string | null;
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

const parseBooleanSetting = (value: string | null | undefined): boolean => {
  if (typeof value !== 'string') return DEFAULT_ENABLED_BY_DEFAULT;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return DEFAULT_ENABLED_BY_DEFAULT;
  if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') {
    return false;
  }
  return true;
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
  replacementValue: doc.replacementValue ?? null,
  replacementFields: normalizeReplacementFields(doc.replacementFields),
  sequenceGroupId: normalizeSequenceGroupId(doc.sequenceGroupId),
  sequenceGroupLabel: normalizeSequenceGroupLabel(doc.sequenceGroupLabel),
  sequenceGroupDebounceMs: normalizeSequenceGroupDebounceMs(doc.sequenceGroupDebounceMs),
  sequence: normalizeSequence(doc.sequence),
  chainMode: normalizeChainMode(doc.chainMode),
  maxExecutions: normalizeMaxExecutions(doc.maxExecutions),
  passOutputToNext: doc.passOutputToNext ?? true,
  launchEnabled: doc.launchEnabled ?? false,
  launchSourceMode: normalizeLaunchSourceMode(doc.launchSourceMode),
  launchSourceField:
    typeof doc.launchSourceField === 'string' && doc.launchSourceField.trim()
      ? doc.launchSourceField.trim()
      : null,
  launchOperator: normalizeLaunchOperator(doc.launchOperator),
  launchValue: typeof doc.launchValue === 'string' ? doc.launchValue : null,
  launchFlags:
    typeof doc.launchFlags === 'string' && doc.launchFlags.trim()
      ? doc.launchFlags.trim()
      : null,
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

const toObjectId = (id: string): ObjectId => new ObjectId(id);

export const mongoValidationPatternRepository: ProductValidationPatternRepository = {
  async listPatterns(): Promise<ProductValidationPattern[]> {
    const db = await getMongoDb();
    const rows = await db
      .collection<ProductValidationPatternDoc>(COLLECTION)
      .find({})
      .sort({ sequence: 1, target: 1, label: 1 })
      .toArray();
    return rows.map(toDomain);
  },

  async getPatternById(id: string): Promise<ProductValidationPattern | null> {
    const db = await getMongoDb();
    if (!ObjectId.isValid(id)) return null;
    const row = await db
      .collection<ProductValidationPatternDoc>(COLLECTION)
      .findOne({ _id: toObjectId(id) });
    return row ? toDomain(row) : null;
  },

  async createPattern(data: CreateProductValidationPatternInput): Promise<ProductValidationPattern> {
    const db = await getMongoDb();
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
      replacementValue: data.replacementValue?.trim() || null,
      replacementFields: normalizeReplacementFields(data.replacementFields),
      sequenceGroupId: normalizeSequenceGroupId(data.sequenceGroupId),
      sequenceGroupLabel: normalizeSequenceGroupLabel(data.sequenceGroupLabel),
      sequenceGroupDebounceMs: normalizeSequenceGroupDebounceMs(data.sequenceGroupDebounceMs),
      sequence: normalizeSequence(data.sequence) ?? fallbackSequence,
      chainMode: normalizeChainMode(data.chainMode),
      maxExecutions: normalizeMaxExecutions(data.maxExecutions),
      passOutputToNext: data.passOutputToNext ?? true,
      launchEnabled: data.launchEnabled ?? false,
      launchSourceMode: normalizeLaunchSourceMode(data.launchSourceMode),
      launchSourceField: data.launchSourceField?.trim() || null,
      launchOperator: normalizeLaunchOperator(data.launchOperator),
      launchValue: typeof data.launchValue === 'string' ? data.launchValue : null,
      launchFlags: data.launchFlags?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<ProductValidationPatternInsert>(COLLECTION).insertOne(payload);
    const inserted: ProductValidationPatternDoc = { ...payload, _id: result.insertedId };
    return toDomain(inserted);
  },

  async updatePattern(id: string, data: UpdateProductValidationPatternInput): Promise<ProductValidationPattern> {
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid pattern ID');
    }
    const db = await getMongoDb();
    const set: Partial<ProductValidationPatternDoc> = {
      updatedAt: new Date(),
    };
    if (data.label !== undefined) set.label = data.label;
    if (data.target !== undefined) set.target = data.target;
    if (data.locale !== undefined) set.locale = data.locale?.trim() || null;
    if (data.regex !== undefined) set.regex = data.regex;
    if (data.flags !== undefined) set.flags = data.flags ?? null;
    if (data.message !== undefined) set.message = data.message;
    if (data.severity !== undefined) set.severity = data.severity;
    if (data.enabled !== undefined) set.enabled = data.enabled;
    if (data.replacementEnabled !== undefined) set.replacementEnabled = data.replacementEnabled;
    if (data.replacementAutoApply !== undefined) set.replacementAutoApply = data.replacementAutoApply;
    if (data.replacementValue !== undefined) set.replacementValue = data.replacementValue?.trim() || null;
    if (data.replacementFields !== undefined) {
      set.replacementFields = normalizeReplacementFields(data.replacementFields);
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

    await db.collection<ProductValidationPatternDoc>(COLLECTION).updateOne(
      { _id: toObjectId(id) },
      { $set: set } as UpdateFilter<ProductValidationPatternDoc>
    );

    const updated = await db
      .collection<ProductValidationPatternDoc>(COLLECTION)
      .findOne({ _id: toObjectId(id) });
    if (!updated) throw new Error('Validation pattern not found');
    return toDomain(updated);
  },

  async deletePattern(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid pattern ID');
    }
    const db = await getMongoDb();
    await db.collection<ProductValidationPatternDoc>(COLLECTION).deleteOne({ _id: toObjectId(id) });
  },

  async getEnabledByDefault(): Promise<boolean> {
    const db = await getMongoDb();
    const setting = await db.collection<SettingDoc>(SETTINGS_COLLECTION).findOne({
      $or: [
        { key: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY },
        { _id: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY },
      ],
    } as Filter<SettingDoc>);
    return parseBooleanSetting(setting?.value);
  },

  async setEnabledByDefault(enabled: boolean): Promise<boolean> {
    const db = await getMongoDb();
    const now = new Date();
    await db.collection<SettingDoc>(SETTINGS_COLLECTION).updateOne(
      {
        $or: [
          { key: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY },
          { _id: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY },
        ],
      } as Filter<SettingDoc>,
      {
        $set: {
          key: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY,
          value: String(enabled),
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      } as UpdateFilter<SettingDoc>,
      { upsert: true }
    );
    return enabled;
  },
};
