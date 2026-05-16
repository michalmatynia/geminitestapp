import 'server-only';

import type { Document } from 'mongodb';

import {
  DEFAULT_ECOMMERCE_PROVIDER_SETTINGS,
  ECOMMERCE_PROVIDER_SETTINGS_KEY,
  ECOMMERCE_PROVIDER_SETTINGS_SOURCE,
  ecommerceProviderSettingsSchema,
  type EcommerceProviderSettingsInput,
} from '@/shared/contracts/integrations/ecommerce-provider-settings';
import { validationError } from '@/shared/errors/app-error';
import { getMongoDb as getProductsMongoDb } from '@/shared/lib/db/product-mongo-client';

import {
  getAllEcommerceExportDbTargetsForWrite,
  type EcommerceExportDbTarget,
} from './ecommerce-product-export.config';

const PRODUCTS_PROVIDER_SETTINGS_COLLECTION = 'ecommerce_provider_settings';
const ECOM_SETTINGS_COLLECTION = 'ecom_settings';

type ProviderSettingsSourceDocument = Document & {
  key?: unknown;
  lastPushedAt?: unknown;
  settings?: unknown;
  updatedAt?: unknown;
  updatedBy?: unknown;
  value?: unknown;
};

export type EcommerceProviderSettingsTargetResult = {
  dbName: string;
  matchedCount: number;
  modifiedCount: number;
  source: EcommerceExportDbTarget['source'];
  upsertedCount: number;
};

export type EcommerceProviderSettingsReadResult = {
  key: typeof ECOMMERCE_PROVIDER_SETTINGS_KEY;
  lastPushedAt: string | null;
  settings: EcommerceProviderSettingsInput;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type EcommerceProviderSettingsWriteResult = EcommerceProviderSettingsReadResult & {
  pushed: boolean;
  targets: EcommerceProviderSettingsTargetResult[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const trimString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const nullableTrimmedString = (value: unknown): string | null => {
  const trimmed = trimString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const cloneProviderSettings = (
  settings: EcommerceProviderSettingsInput = DEFAULT_ECOMMERCE_PROVIDER_SETTINGS
): EcommerceProviderSettingsInput => ({
  payment: {
    payu: { ...settings.payment.payu },
  },
  shipping: {
    dpd: { ...settings.shipping.dpd },
    inpost: { ...settings.shipping.inpost },
    pocztaPolska: { ...settings.shipping.pocztaPolska },
  },
});

const mergeKnownSettings = (base: unknown, input: unknown): unknown => {
  if (!isRecord(base)) return input === undefined ? base : input;
  if (!isRecord(input)) return base;

  const output: Record<string, unknown> = {};
  for (const [key, baseValue] of Object.entries(base)) {
    output[key] = mergeKnownSettings(baseValue, input[key]);
  }
  return output;
};

const parseJsonRecord = (value: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readSettingsPayload = (value: unknown): unknown => {
  if (isRecord(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return parseJsonRecord(trimmed);
};

const normalizeProviderSettings = (
  input: unknown,
  options: { fallbackOnInvalid?: boolean } = {}
): EcommerceProviderSettingsInput => {
  const merged = mergeKnownSettings(DEFAULT_ECOMMERCE_PROVIDER_SETTINGS, input);
  const parsed = ecommerceProviderSettingsSchema.safeParse(merged);
  if (parsed.success) return parsed.data;
  if (options.fallbackOnInvalid === true) return cloneProviderSettings();
  throw validationError('Provider settings payload is invalid.', {
    issues: parsed.error.issues,
  });
};

const toIsoStringOrNull = (value: unknown): string | null => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};

const targetResult = (
  target: EcommerceExportDbTarget,
  matchedCount: number,
  modifiedCount: number,
  upsertedCount: number
): EcommerceProviderSettingsTargetResult => ({
  dbName: target.dbName,
  matchedCount,
  modifiedCount,
  source: target.source,
  upsertedCount,
});

const sourceDocToResult = (
  doc: ProviderSettingsSourceDocument | null
): EcommerceProviderSettingsReadResult => {
  const payload = readSettingsPayload(doc?.value ?? doc?.settings);
  return {
    key: ECOMMERCE_PROVIDER_SETTINGS_KEY,
    lastPushedAt: toIsoStringOrNull(doc?.lastPushedAt),
    settings: normalizeProviderSettings(payload, { fallbackOnInvalid: true }),
    updatedAt: toIsoStringOrNull(doc?.updatedAt),
    updatedBy: nullableTrimmedString(doc?.updatedBy),
  };
};

export const getEcommerceProviderSettings =
  async (): Promise<EcommerceProviderSettingsReadResult> => {
    const productsDb = await getProductsMongoDb('local');
    const doc = await productsDb
      .collection<ProviderSettingsSourceDocument>(PRODUCTS_PROVIDER_SETTINGS_COLLECTION)
      .findOne({ key: ECOMMERCE_PROVIDER_SETTINGS_KEY });
    return sourceDocToResult(doc);
  };

export const pushEcommerceProviderSettingsToEcommerce = async (
  settingsInput?: EcommerceProviderSettingsInput,
  options: { pushedAt?: Date; updatedBy?: string | null } = {}
): Promise<EcommerceProviderSettingsTargetResult[]> => {
  const settings =
    settingsInput ?? (await getEcommerceProviderSettings()).settings;
  const pushedAt = options.pushedAt ?? new Date();
  const updatedBy = nullableTrimmedString(options.updatedBy);
  const targets = await getAllEcommerceExportDbTargetsForWrite();

  return Promise.all(
    targets.map(async (target) => {
      const result = await target.db.collection<Document>(ECOM_SETTINGS_COLLECTION).updateOne(
        {
          $or: [
            { key: ECOMMERCE_PROVIDER_SETTINGS_KEY },
            { _id: ECOMMERCE_PROVIDER_SETTINGS_KEY },
          ],
        } as Document,
        {
          $set: {
            key: ECOMMERCE_PROVIDER_SETTINGS_KEY,
            source: ECOMMERCE_PROVIDER_SETTINGS_SOURCE,
            syncedAt: pushedAt,
            updatedAt: pushedAt,
            updatedBy,
            value: settings,
          },
          $setOnInsert: {
            _id: ECOMMERCE_PROVIDER_SETTINGS_KEY,
            createdAt: pushedAt,
          },
        },
        { upsert: true }
      );
      return targetResult(
        target,
        result.matchedCount,
        result.modifiedCount,
        result.upsertedCount
      );
    })
  );
};

export const saveEcommerceProviderSettings = async (
  input: EcommerceProviderSettingsInput,
  options: { pushToEcommerce?: boolean; userId?: string | null } = {}
): Promise<EcommerceProviderSettingsWriteResult> => {
  const settings = normalizeProviderSettings(input);
  const productsDb = await getProductsMongoDb('local');
  const sourceCollection = productsDb.collection<ProviderSettingsSourceDocument>(
    PRODUCTS_PROVIDER_SETTINGS_COLLECTION
  );
  const existingDoc = await sourceCollection.findOne({ key: ECOMMERCE_PROVIDER_SETTINGS_KEY });
  const previousLastPushedAt = toIsoStringOrNull(existingDoc?.lastPushedAt);
  const updatedAt = new Date();
  const updatedBy = nullableTrimmedString(options.userId);

  await sourceCollection.updateOne(
    { key: ECOMMERCE_PROVIDER_SETTINGS_KEY },
    {
      $set: {
        key: ECOMMERCE_PROVIDER_SETTINGS_KEY,
        source: ECOMMERCE_PROVIDER_SETTINGS_SOURCE,
        updatedAt,
        updatedBy,
        value: settings,
      },
      $setOnInsert: {
        _id: ECOMMERCE_PROVIDER_SETTINGS_KEY,
        createdAt: updatedAt,
      },
    },
    { upsert: true }
  );

  const pushToEcommerce = options.pushToEcommerce === true;
  const targets = pushToEcommerce
    ? await pushEcommerceProviderSettingsToEcommerce(settings, { pushedAt: updatedAt, updatedBy })
    : [];

  if (pushToEcommerce) {
    await sourceCollection.updateOne(
      { key: ECOMMERCE_PROVIDER_SETTINGS_KEY },
      { $set: { lastPushedAt: updatedAt } }
    );
  }

  return {
    key: ECOMMERCE_PROVIDER_SETTINGS_KEY,
    lastPushedAt: pushToEcommerce ? updatedAt.toISOString() : previousLastPushedAt,
    pushed: pushToEcommerce,
    settings,
    targets,
    updatedAt: updatedAt.toISOString(),
    updatedBy,
  };
};
