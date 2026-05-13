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
import { upsertEcommerceProductListing } from './ecommerce-product-export.listings';
import {
  ECOMMERCE_PRODUCT_DEPRECATED_PRICING_UNSET,
  toEcommerceCategoryDocumentUpdate,
  toEcommerceProductDocumentUpdate,
} from './ecommerce-product-export.documents';
import { toIsoString } from './ecommerce-product-export.timestamps';
import { assertProductHasExportableCategory } from './ecommerce-product-export.validation';
import { hydrateProductCategoryForExport } from './ecommerce-product-export.category-hydration';
import { hydrateProductPricingForExport } from './ecommerce-product-export.pricing-hydration';
import { resolveEcommerceProductExportEnrichment } from './ecommerce-product-export.enrichment';

export { buildEcommerceProductExportDocument } from './ecommerce-product-export.mapper';

const trimProductId = (productId: string): string => productId.trim();

const PRODUCT_LISTINGS_COLLECTION = 'product_listings';

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
    tryCreateIndex(
      db,
      ECOM_PRODUCTS_COLLECTION,
      { sourceProductId: 1 },
      {
        unique: true,
        name: 'source_product_id_unique',
        partialFilterExpression: { sourceProductId: { $type: 'string' } },
      }
    ),
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
      $set: toEcommerceCategoryDocumentUpdate(document),
    },
    { upsert: true }
  );
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
  exportedAt: toIsoString(document.exportedAt),
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
        $set: toEcommerceProductDocumentUpdate(document),
        $unset: ECOMMERCE_PRODUCT_DEPRECATED_PRICING_UNSET,
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
    ecommerceDbs.map((db) =>
      db.collection<EcommerceProductDocument>(ECOM_PRODUCTS_COLLECTION).deleteMany(deleteQuery)
    )
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
  const productWithCategory = await hydrateProductCategoryForExport(product);
  assertProductHasExportableCategory(productWithCategory);
  const exportableProduct = await hydrateProductPricingForExport(productWithCategory);

  const exportedAt = new Date().toISOString();
  const enrichment = await resolveEcommerceProductExportEnrichment(exportableProduct);
  const document = buildEcommerceProductExportDocument(exportableProduct, exportedAt, enrichment);
  const categoryDocument = buildEcommerceCategoryDocument(exportableProduct, exportedAt);
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
    const query = { _id: { $in: productIds } };
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

const exportProductToBulkItem = async (productId: string): Promise<EcommerceProductExportItem> => {
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

  const items = await Promise.all(
    normalizedProductIds.map((productId) => exportProductToBulkItem(productId))
  );
  const failed = items.filter((item) => item.status === 'failed').length;
  return {
    success: true,
    requested: normalizedProductIds.length,
    succeeded: items.length - failed,
    failed,
    items,
  };
};
