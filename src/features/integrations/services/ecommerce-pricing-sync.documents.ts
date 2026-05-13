import 'server-only';

import type { AnyBulkWriteOperation, Collection, Document } from 'mongodb';

import { getMongoDb as getProductsMongoDb } from '@/shared/lib/db/product-mongo-client';

import { ECOMMERCE_PRODUCT_SOURCE } from './ecommerce-product-export.mapper';

export const CURRENCIES_COLLECTION = 'currencies';
export const PRICE_GROUPS_COLLECTION = 'price_groups';

type CurrencySourceDocument = Document & {
  _id?: unknown;
  code?: unknown;
  createdAt?: unknown;
  exchangeRate?: unknown;
  id?: unknown;
  isActive?: unknown;
  isDefault?: unknown;
  name?: unknown;
  symbol?: unknown;
  updatedAt?: unknown;
};

type PriceGroupSourceDocument = Document & {
  _id?: unknown;
  addToPrice?: unknown;
  basePriceField?: unknown;
  createdAt?: unknown;
  currencyCode?: unknown;
  currencyId?: unknown;
  description?: unknown;
  groupId?: unknown;
  id?: unknown;
  isDefault?: unknown;
  name?: unknown;
  priceMultiplier?: unknown;
  sourceGroupId?: unknown;
  type?: unknown;
  updatedAt?: unknown;
};

export type SyncedEcommerceCurrencyDocument = {
  _id: string;
  code: string;
  createdAt?: Date;
  exchangeRate: number | null;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  source: typeof ECOMMERCE_PRODUCT_SOURCE;
  sourceCreatedAt: string | null;
  sourceCurrencyId: string;
  sourceUpdatedAt: string | null;
  symbol: string | null;
  syncedAt: Date;
  updatedAt: Date;
};

export type SyncedEcommercePriceGroupDocument = {
  _id: string;
  addToPrice: number;
  basePriceField: string;
  createdAt?: Date;
  currencyCode: string;
  description: string | null;
  id: string;
  isDefault: boolean;
  name: string;
  priceMultiplier: number;
  source: typeof ECOMMERCE_PRODUCT_SOURCE;
  sourceCreatedAt: string | null;
  sourceGroupId: string | null;
  sourcePriceGroupId: string;
  sourceUpdatedAt: string | null;
  syncedAt: Date;
  type: string;
  updatedAt: Date;
};

export type PricingSourceSnapshot = {
  currencies: SyncedEcommerceCurrencyDocument[];
  priceGroups: SyncedEcommercePriceGroupDocument[];
  syncedAt: Date;
};

const trimString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const nullableString = (value: unknown): string | null => {
  const trimmed = trimString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const nullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const stringifyObjectDocumentValue = (value: object): string | null => {
  const candidate = value as { toHexString?: () => string; toString?: () => string };
  if (typeof candidate.toHexString === 'function') return candidate.toHexString();
  if (
    typeof candidate.toString === 'function' &&
    candidate.toString !== Object.prototype.toString
  ) {
    const stringified = candidate.toString().trim();
    return stringified.length > 0 ? stringified : null;
  }
  return null;
};

const stringifyDocumentValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'object') return null;
  return stringifyObjectDocumentValue(value);
};

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const stringified = stringifyDocumentValue(value);
    if (stringified !== null) return stringified;
  }
  return null;
};

const toIsoDateString = (value: unknown): string | null => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};

const normalizeCurrencyCode = (value: unknown): string => trimString(value).toUpperCase();

const toSyncedCurrencyDocument = (
  doc: CurrencySourceDocument,
  syncedAt: Date
): SyncedEcommerceCurrencyDocument | null => {
  const id = firstString(doc.id, doc.code, doc._id);
  const code = normalizeCurrencyCode(doc.code ?? id);
  if (id === null || code.length === 0) return null;
  return {
    _id: id,
    code,
    exchangeRate: nullableNumber(doc.exchangeRate),
    id,
    isActive: doc.isActive !== false,
    isDefault: doc.isDefault === true,
    name: firstString(doc.name, code) ?? code,
    source: ECOMMERCE_PRODUCT_SOURCE,
    sourceCreatedAt: toIsoDateString(doc.createdAt),
    sourceCurrencyId: id,
    sourceUpdatedAt: toIsoDateString(doc.updatedAt),
    symbol: nullableString(doc.symbol),
    syncedAt,
    updatedAt: syncedAt,
  };
};

const resolvePriceGroupCurrencyCode = (doc: PriceGroupSourceDocument): string =>
  normalizeCurrencyCode(doc.currencyCode);

const resolvePriceGroupIdentity = (
  doc: PriceGroupSourceDocument
): { id: string } | null => {
  const id = firstString(doc.id);
  if (id === null) return null;
  return { id };
};

const addPriceGroupIdentifier = (
  target: Map<string, string>,
  identifier: unknown,
  canonicalId: string
): void => {
  const normalized = firstString(identifier);
  if (normalized !== null) target.set(normalized, canonicalId);
};

const buildPriceGroupIdByIdentifier = (
  docs: PriceGroupSourceDocument[]
): Map<string, string> => {
  const result = new Map<string, string>();
  docs.forEach((doc) => {
    const identity = resolvePriceGroupIdentity(doc);
    if (identity === null) return;
    addPriceGroupIdentifier(result, identity.id, identity.id);
    addPriceGroupIdentifier(result, doc.groupId, identity.id);
    addPriceGroupIdentifier(result, doc._id, identity.id);
  });
  return result;
};

const migrateSourcePriceGroupDependencies = async (
  collection: Collection<PriceGroupSourceDocument>,
  docs: PriceGroupSourceDocument[]
): Promise<PriceGroupSourceDocument[]> => {
  const priceGroupIdByIdentifier = buildPriceGroupIdByIdentifier(docs);
  const operations: AnyBulkWriteOperation<PriceGroupSourceDocument>[] = [];
  const migratedDocs = docs.map((doc) => {
    const identity = resolvePriceGroupIdentity(doc);
    const sourceGroupId = nullableString(doc.sourceGroupId);
    const canonicalSourceGroupId =
      sourceGroupId === null ? null : priceGroupIdByIdentifier.get(sourceGroupId) ?? sourceGroupId;
    if (
      identity === null ||
      sourceGroupId === null ||
      canonicalSourceGroupId === sourceGroupId
    ) {
      return doc;
    }
    operations.push({
      updateOne: {
        filter: { id: identity.id },
        update: { $set: { sourceGroupId: canonicalSourceGroupId } },
      },
    });
    return { ...doc, sourceGroupId: canonicalSourceGroupId };
  });

  if (operations.length > 0) {
    await collection.bulkWrite(operations, { ordered: false });
  }
  return migratedDocs;
};

const toSyncedPriceGroupDocument = (
  doc: PriceGroupSourceDocument,
  syncedAt: Date
): SyncedEcommercePriceGroupDocument | null => {
  const identity = resolvePriceGroupIdentity(doc);
  if (identity === null) return null;
  const { id } = identity;
  const currencyCode = resolvePriceGroupCurrencyCode(doc);
  if (currencyCode.length === 0) return null;
  return {
    _id: id,
    addToPrice: nullableNumber(doc.addToPrice) ?? 0,
    basePriceField: firstString(doc.basePriceField, 'price') ?? 'price',
    currencyCode,
    description: nullableString(doc.description),
    id,
    isDefault: doc.isDefault === true,
    name: firstString(doc.name, id) ?? id,
    priceMultiplier: nullableNumber(doc.priceMultiplier) ?? 1,
    source: ECOMMERCE_PRODUCT_SOURCE,
    sourceCreatedAt: toIsoDateString(doc.createdAt),
    sourceGroupId: nullableString(doc.sourceGroupId),
    sourcePriceGroupId: id,
    sourceUpdatedAt: toIsoDateString(doc.updatedAt),
    syncedAt,
    type: firstString(doc.type, 'standard') ?? 'standard',
    updatedAt: syncedAt,
  };
};

export const readSourcePricing = async (): Promise<PricingSourceSnapshot> => {
  const productsDb = await getProductsMongoDb('local');
  const syncedAt = new Date();
  const priceGroupsCollection =
    productsDb.collection<PriceGroupSourceDocument>(PRICE_GROUPS_COLLECTION);
  const [currencyDocs, priceGroupDocs] = await Promise.all([
    productsDb.collection<CurrencySourceDocument>(CURRENCIES_COLLECTION).find({}).toArray(),
    priceGroupsCollection.find({}).toArray(),
  ]);
  const currencies = currencyDocs.flatMap((doc) => {
    const currency = toSyncedCurrencyDocument(doc, syncedAt);
    return currency === null ? [] : [currency];
  });
  const migratedPriceGroupDocs = await migrateSourcePriceGroupDependencies(
    priceGroupsCollection,
    priceGroupDocs
  );
  const priceGroups = migratedPriceGroupDocs.flatMap((doc) => {
    const priceGroup = toSyncedPriceGroupDocument(doc, syncedAt);
    return priceGroup === null ? [] : [priceGroup];
  });
  return { currencies, priceGroups, syncedAt };
};
