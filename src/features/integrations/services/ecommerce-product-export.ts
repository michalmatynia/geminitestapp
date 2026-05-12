import 'server-only';

import type { Db } from 'mongodb';

import type {
  EcommerceProductBulkExportResponse,
  EcommerceProductDeleteResponse,
  EcommerceProductExportItem,
  EcommerceProductExportResponse,
  EcommerceProductExportStatus,
} from '@/shared/contracts/integrations/ecommerce-export';
import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ECOMMERCE_EXPORT_INTEGRATION_SLUG } from '@/shared/lib/integration-slugs';

import {
  ECOM_CATEGORIES_COLLECTION,
  ECOM_PRODUCTS_COLLECTION,
  getAllEcommerceExportDbTargetsForWrite,
  getAllEcommerceExportDbsForCleanup,
  toEcommerceExportDbError,
  type EcommerceExportDbTarget,
} from './ecommerce-product-export.config';
import {
  buildEcommerceCategoryDocument,
  buildEcommerceProductExportDocument,
  type EcommerceCategoryDocument,
  type EcommerceProductDocument,
} from './ecommerce-product-export.mapper';

export { buildEcommerceProductExportDocument } from './ecommerce-product-export.mapper';

const trimProductId = (productId: string): string => productId.trim();

const PRODUCT_LISTINGS_COLLECTION = 'product_listings';

const upsertEcommerceProductListing = async (productId: string): Promise<void> => {
  try {
    const db = await getMongoDb();
    const now = new Date();
    // Query by _id (primary key) to avoid duplicate key conflicts on concurrent upserts
    await db.collection(PRODUCT_LISTINGS_COLLECTION).updateOne(
      { _id: `ecom:${productId}` as unknown },
      {
        $set: {
          status: 'active',
          integrationId: ECOMMERCE_EXPORT_INTEGRATION_SLUG,
          connectionId: ECOMMERCE_EXPORT_INTEGRATION_SLUG,
          updatedAt: now,
        },
        $setOnInsert: {
          productId,
          externalListingId: null,
          inventoryId: null,
          createdAt: now,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      message: 'ecommerce-product-export: failed to upsert product_listing badge record',
      source: 'ecommerce-product-export',
      context: { productId, error: error instanceof Error ? error.message : String(error) },
    });
  }
};

const tryCreateIndex = async (
  db: Db,
  collection: string,
  keys: Record<string, unknown>,
  options: Record<string, unknown>
): Promise<void> => {
  try {
    await db.collection(collection).createIndex(keys as never, options as never);
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      message: 'ecommerce-product-export: createIndex skipped (already exists or conflict)',
      source: 'ecommerce-product-export',
      context: { collection, options, error: error instanceof Error ? error.message : String(error) },
    });
  }
};

const ecommerceIndexesEnsuredByTargetKey = new Map<string, Promise<void>>();

const ensureEcommerceExportIndexes = async (
  targetKey: string,
  db: Db
): Promise<void> => {
  const existing = ecommerceIndexesEnsuredByTargetKey.get(targetKey);
  if (existing !== undefined) return existing;
  const promise = Promise.all([
    tryCreateIndex(db, ECOM_PRODUCTS_COLLECTION, { sourceProductId: 1 }, { unique: true, name: 'source_product_id_unique' }),
    tryCreateIndex(db, ECOM_PRODUCTS_COLLECTION, { slug: 1 }, { name: 'slug' }),
    tryCreateIndex(db, ECOM_PRODUCTS_COLLECTION, { catalogId: 1, published: 1, archived: 1, stock: 1, updatedAt: -1 }, { name: 'catalog_active_updated' }),
    tryCreateIndex(db, ECOM_CATEGORIES_COLLECTION, { catalogId: 1, collectionSlug: 1, name: 1 }, { name: 'catalog_collection_name' }),
  ]).then(() => undefined);
  ecommerceIndexesEnsuredByTargetKey.set(targetKey, promise);
  return promise;
};

const persistEcommerceCategory = async (
  db: Db,
  document: EcommerceCategoryDocument | null
): Promise<void> => {
  if (document === null) return;
  await db.collection<EcommerceCategoryDocument>(ECOM_CATEGORIES_COLLECTION).updateOne(
    { _id: document._id },
    {
      $set: document,
    },
    { upsert: true }
  );
};

const toDocumentUpdate = (
  document: EcommerceProductDocument
): Partial<EcommerceProductDocument> => {
  const documentForSet: Partial<EcommerceProductDocument> = { ...document };
  delete documentForSet._id;
  delete documentForSet.createdAt;
  return documentForSet;
};

const toExportResponse = (
  productId: string,
  document: EcommerceProductDocument,
  status: EcommerceProductExportStatus
): EcommerceProductExportResponse => ({
  success: true,
  productId,
  status,
  ecommerceProductId: document._id,
  slug: document.slug,
  exportedAt: document.exportedAt,
});

const persistEcommerceProductExport = async (
  target: EcommerceExportDbTarget,
  document: EcommerceProductDocument,
  categoryDocument: EcommerceCategoryDocument | null
): Promise<EcommerceProductExportStatus> => {
  try {
    await ensureEcommerceExportIndexes(target.key, target.db);

    const products = target.db.collection<EcommerceProductDocument>(ECOM_PRODUCTS_COLLECTION);
    const updateResult = await products.updateOne(
      { _id: document._id },
      {
        $set: toDocumentUpdate(document),
        $setOnInsert: {
          createdAt: document.createdAt,
        },
      },
      { upsert: true }
    );

    await persistEcommerceCategory(target.db, categoryDocument);
    return updateResult.upsertedCount > 0 ? 'created' : 'updated';
  } catch (error) {
    throw toEcommerceExportDbError(target, error);
  }
};

const resolveAggregateExportStatus = (
  statuses: EcommerceProductExportStatus[]
): EcommerceProductExportStatus => (statuses.includes('created') ? 'created' : 'updated');

export type { EcommerceProductDeleteResponse } from '@/shared/contracts/integrations/ecommerce-export';

export const deleteProductFromEcommerceExport = async (
  productId: string
): Promise<EcommerceProductDeleteResponse> => {
  const normalizedProductId = trimProductId(productId);
  if (normalizedProductId.length === 0) {
    return {
      success: true,
      productId: normalizedProductId,
      ecommerceDeletedCount: 0,
      listingDeletedCount: 0,
    };
  }

  const ecommerceDbs = await getAllEcommerceExportDbsForCleanup();

  const deleteQuery = {
    $or: [{ _id: normalizedProductId }, { sourceProductId: normalizedProductId }],
  };

  const ecommerceResults = await Promise.all(
    ecommerceDbs.map((db) => db.collection(ECOM_PRODUCTS_COLLECTION).deleteMany(deleteQuery))
  );
  const ecommerceDeletedCount = ecommerceResults.reduce(
    (total, result) => total + result.deletedCount,
    0
  );

  const productsDb = await getMongoDb();
  const listingResult = await productsDb
    .collection(PRODUCT_LISTINGS_COLLECTION)
    .deleteMany({
      productId: normalizedProductId,
      integrationId: ECOMMERCE_EXPORT_INTEGRATION_SLUG,
    });

  return {
    success: true,
    productId: normalizedProductId,
    ecommerceDeletedCount,
    listingDeletedCount: listingResult.deletedCount,
  };
};

export const exportProductToEcommerce = async (
  productId: string
): Promise<EcommerceProductExportResponse> => {
  const normalizedProductId = trimProductId(productId);
  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(normalizedProductId);
  if (product === null) {
    throw notFoundError('Product not found.', { productId: normalizedProductId });
  }

  const exportedAt = new Date().toISOString();
  const document = buildEcommerceProductExportDocument(product, exportedAt);
  const categoryDocument = buildEcommerceCategoryDocument(product, exportedAt);
  const targets = await getAllEcommerceExportDbTargetsForWrite();
  const statuses = await Promise.all(
    targets.map((target) => persistEcommerceProductExport(target, document, categoryDocument))
  );
  const status = resolveAggregateExportStatus(statuses);

  await upsertEcommerceProductListing(normalizedProductId);
  return toExportResponse(normalizedProductId, document, status);
};

export const checkEcommerceProductsExistence = async (
  productIds: string[]
): Promise<Set<string>> => {
  if (productIds.length === 0) return new Set<string>();
  try {
    const dbs = await getAllEcommerceExportDbsForCleanup();
    const query = { _id: { $in: productIds as unknown[] } };
    const projection = { projection: { _id: 1 } };
    // Query every ecommerce export source and normalize the matching ids.
    const results = await Promise.allSettled(
      dbs.map((db) =>
        db.collection<EcommerceProductDocument>(ECOM_PRODUCTS_COLLECTION).find(query, projection).toArray()
      )
    );
    const ids = results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value.map((doc) => String(doc._id)) : []
    );
    return new Set(ids.filter((id) => id.length > 0));
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      message: 'ecommerce-product-export: checkEcommerceProductsExistence failed',
      source: 'ecommerce-product-export',
      context: { error: error instanceof Error ? error.message : String(error), productIdCount: productIds.length },
    });
    return new Set<string>();
  }
};

const toBulkItem = (
  response: EcommerceProductExportResponse
): EcommerceProductExportItem => ({
  productId: response.productId,
  status: response.status,
  ecommerceProductId: response.ecommerceProductId,
  slug: response.slug,
  errorMessage: null,
});

const toFailedBulkItem = (
  productId: string,
  error: unknown
): EcommerceProductExportItem => ({
  productId,
  status: 'failed',
  ecommerceProductId: null,
  slug: null,
  errorMessage:
    error instanceof Error ? error.message : 'Failed to export product to ecommerce.',
});

const exportProductToBulkItem = async (
  productId: string
): Promise<EcommerceProductExportItem> => {
  try {
    const response = await exportProductToEcommerce(productId);
    return toBulkItem(response);
  } catch (error) {
    return toFailedBulkItem(productId, error);
  }
};

const normalizeBulkProductIds = (productIds: string[]): string[] =>
  Array.from(
    new Set(
      productIds
        .map((productId) => trimProductId(productId))
        .filter((productId): productId is string => productId.length > 0)
    )
  );

export const exportProductsToEcommerce = async (
  productIds: string[]
): Promise<EcommerceProductBulkExportResponse> => {
  const normalizedProductIds = normalizeBulkProductIds(productIds);
  if (normalizedProductIds.length === 0) {
    throw new Error('At least one product ID is required.');
  }

  const items = await Promise.all(normalizedProductIds.map(exportProductToBulkItem));
  const failed = items.filter((item) => item.status === 'failed').length;
  return {
    success: true,
    requested: normalizedProductIds.length,
    succeeded: items.length - failed,
    failed,
    items,
  };
};
