import 'server-only';

import type { AnyBulkWriteOperation, Document } from 'mongodb';

import { validationError } from '@/shared/errors/app-error';
import { getMongoDb as getProductsMongoDb } from '@/shared/lib/db/product-mongo-client';

import {
  ECOM_CATEGORIES_COLLECTION,
  getAllEcommerceExportDbTargetsForWrite,
  type EcommerceExportDbTarget,
} from './ecommerce-product-export.config';
import {
  categoryToCollectionSlug,
  ECOMMERCE_PRODUCT_SOURCE,
  type EcommerceCategoryDocument,
} from './ecommerce-product-export.mapper';

const PRODUCT_CATEGORIES_COLLECTION = 'product_categories';

type ProductCategorySourceDocument = Document & {
  _id?: unknown;
  id?: unknown;
  catalogId?: unknown;
  color?: unknown;
  createdAt?: unknown;
  name?: unknown;
  name_de?: unknown;
  name_en?: unknown;
  name_pl?: unknown;
  parentId?: unknown;
  sortIndex?: unknown;
  updatedAt?: unknown;
};

type SyncedEcommerceCategoryDocument = EcommerceCategoryDocument & {
  color: string | null;
  createdAt?: Date;
  parentId: string | null;
  sortIndex: number | null;
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  syncedAt: Date;
};

export type EcommerceCategorySyncTargetResult = {
  categoryCount: number;
  dbName: string;
  deletedCount: number;
  matchedCount: number;
  modifiedCount: number;
  source: EcommerceExportDbTarget['source'];
  upsertedCount: number;
};

export type EcommerceCategorySyncResult = {
  sourceCategoryCount: number;
  syncedAt: string;
  targets: EcommerceCategorySyncTargetResult[];
};

const trimString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const firstTrimmedEnvValue = (...keys: string[]): string => {
  for (const key of keys) {
    const value = trimString(process.env[key]);
    if (value.length > 0) return value;
  }
  return '';
};

const firstNonEmptyString = (...values: string[]): string => {
  for (const value of values) {
    if (value.length > 0) return value;
  }
  return '';
};

const chooseText = (...values: unknown[]): string => {
  for (const value of values) {
    const trimmed = trimString(value);
    if (trimmed.length > 0) return trimmed;
  }
  return '';
};

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

const nullableString = (value: unknown): string | null => {
  const trimmed = trimString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const nullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toIsoDateString = (value: unknown): string | null => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};

const resolveTargetCatalogId = (sourceCatalogId: unknown): string =>
  firstNonEmptyString(
    firstTrimmedEnvValue('ECOM_EXPORT_CATALOG_ID', 'MENTIOS_CATALOG_ID'),
    trimString(sourceCatalogId),
    'catalog-mentios'
  );

const readCategoryId = (doc: ProductCategorySourceDocument): string | null =>
  stringifyDocumentValue(doc._id) ?? stringifyDocumentValue(doc.id);

const toSyncedEcommerceCategoryDocument = (
  doc: ProductCategorySourceDocument,
  syncedAt: Date
): SyncedEcommerceCategoryDocument | null => {
  const categoryId = readCategoryId(doc);
  if (categoryId === null) return null;

  const name = firstNonEmptyString(
    chooseText(doc.name_en, doc.name_pl, doc.name_de, doc.name),
    categoryId
  );

  return {
    _id: categoryId,
    sourceCategoryId: categoryId,
    name,
    name_en: nullableString(doc.name_en) ?? name,
    name_pl: nullableString(doc.name_pl),
    name_de: nullableString(doc.name_de),
    catalogId: resolveTargetCatalogId(doc.catalogId),
    collectionSlug: categoryToCollectionSlug(name),
    source: ECOMMERCE_PRODUCT_SOURCE,
    exportedAt: syncedAt,
    updatedAt: syncedAt,
    color: nullableString(doc.color),
    parentId: stringifyDocumentValue(doc.parentId),
    sortIndex: nullableNumber(doc.sortIndex),
    sourceCreatedAt: toIsoDateString(doc.createdAt),
    sourceUpdatedAt: toIsoDateString(doc.updatedAt),
    syncedAt,
  };
};

const readSourceCategories = async (): Promise<SyncedEcommerceCategoryDocument[]> => {
  const productsDb = await getProductsMongoDb('local');
  const sourceDocs = await productsDb
    .collection<ProductCategorySourceDocument>(PRODUCT_CATEGORIES_COLLECTION)
    .find({})
    .sort({ catalogId: 1, parentId: 1, sortIndex: 1, name: 1 })
    .toArray();
  const syncedAt = new Date();
  return sourceDocs.flatMap((doc) => {
    const category = toSyncedEcommerceCategoryDocument(doc, syncedAt);
    return category === null ? [] : [category];
  });
};

const toCategoryUpdateSet = (
  category: SyncedEcommerceCategoryDocument
): Omit<SyncedEcommerceCategoryDocument, '_id'> => {
  const updateSet: Partial<SyncedEcommerceCategoryDocument> = { ...category };
  delete updateSet._id;
  return updateSet as Omit<SyncedEcommerceCategoryDocument, '_id'>;
};

const syncCategoriesToTarget = async (
  target: EcommerceExportDbTarget,
  categories: SyncedEcommerceCategoryDocument[]
): Promise<EcommerceCategorySyncTargetResult> => {
  const collection = target.db.collection<SyncedEcommerceCategoryDocument>(ECOM_CATEGORIES_COLLECTION);
  const categoryIds = categories.map((category) => category._id);
  const operations: AnyBulkWriteOperation<SyncedEcommerceCategoryDocument>[] = categories.map(
    (category) => ({
      updateOne: {
        filter: { _id: category._id },
        update: {
          $set: toCategoryUpdateSet(category),
          $setOnInsert: { createdAt: category.syncedAt },
        },
        upsert: true,
      },
    })
  );

  const writeResult =
    operations.length > 0
      ? await collection.bulkWrite(operations, { ordered: false })
      : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  const deleteResult = await collection.deleteMany({
    source: ECOMMERCE_PRODUCT_SOURCE,
    _id: { $nin: categoryIds },
  });

  return {
    categoryCount: categories.length,
    dbName: target.dbName,
    deletedCount: deleteResult.deletedCount,
    matchedCount: writeResult.matchedCount,
    modifiedCount: writeResult.modifiedCount,
    source: target.source,
    upsertedCount: writeResult.upsertedCount,
  };
};

export const syncEcommerceCategoriesFromProductsLocalMongo =
  async (): Promise<EcommerceCategorySyncResult> => {
    const categories = await readSourceCategories();
    if (categories.length === 0) {
      throw validationError('No local Products categories were found to sync.', {
        reason: 'missing_local_product_categories',
      });
    }

    const targets = await getAllEcommerceExportDbTargetsForWrite();
    const targetResults = await Promise.all(
      targets.map((target) => syncCategoriesToTarget(target, categories))
    );

    return {
      sourceCategoryCount: categories.length,
      syncedAt: categories[0]?.syncedAt.toISOString() ?? new Date().toISOString(),
      targets: targetResults,
    };
  };
