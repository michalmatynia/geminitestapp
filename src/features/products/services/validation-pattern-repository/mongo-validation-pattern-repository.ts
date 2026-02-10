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
  replacementValue: string | null;
  replacementFields: string[];
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
  replacementValue: string | null;
  replacementFields: string[];
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
  replacementValue: doc.replacementValue ?? null,
  replacementFields: normalizeReplacementFields(doc.replacementFields),
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
      .sort({ target: 1, label: 1 })
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
      replacementValue: data.replacementValue?.trim() || null,
      replacementFields: normalizeReplacementFields(data.replacementFields),
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
    if (data.replacementValue !== undefined) set.replacementValue = data.replacementValue?.trim() || null;
    if (data.replacementFields !== undefined) {
      set.replacementFields = normalizeReplacementFields(data.replacementFields);
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
