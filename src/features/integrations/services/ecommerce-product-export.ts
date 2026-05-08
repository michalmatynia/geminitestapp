import 'server-only';

import type { Db } from 'mongodb';

import type {
  EcommerceProductBulkExportResponse,
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
  getEcommerceExportDb,
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
    await db.collection(PRODUCT_LISTINGS_COLLECTION).updateOne(
      { productId, integrationId: ECOMMERCE_EXPORT_INTEGRATION_SLUG },
      {
        $set: {
          status: 'active',
          integrationId: ECOMMERCE_EXPORT_INTEGRATION_SLUG,
          connectionId: ECOMMERCE_EXPORT_INTEGRATION_SLUG,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: `ecom:${productId}`,
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
      context: { productId, error: error instanceof Error ? error.message : String(error) },
    });
  }
};

const ensureEcommerceExportIndexes = async (db: Db): Promise<void> => {
  await Promise.all([
    db.collection(ECOM_PRODUCTS_COLLECTION).createIndex(
      { sourceProductId: 1 },
      { background: true, unique: true, name: 'source_product_id_unique' }
    ),
    db.collection(ECOM_PRODUCTS_COLLECTION).createIndex(
      { slug: 1 },
      { background: true, name: 'slug' }
    ),
    db.collection(ECOM_PRODUCTS_COLLECTION).createIndex(
      { catalogId: 1, published: 1, archived: 1, stock: 1, updatedAt: -1 },
      { background: true, name: 'catalog_active_updated' }
    ),
    db.collection(ECOM_CATEGORIES_COLLECTION).createIndex(
      { catalogId: 1, collectionSlug: 1, name: 1 },
      { background: true, name: 'catalog_collection_name' }
    ),
  ]);
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
  const db = await getEcommerceExportDb();
  await ensureEcommerceExportIndexes(db);

  const products = db.collection<EcommerceProductDocument>(ECOM_PRODUCTS_COLLECTION);
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
  const status: EcommerceProductExportStatus =
    updateResult.upsertedCount > 0 ? 'created' : 'updated';

  await persistEcommerceCategory(db, categoryDocument);
  await upsertEcommerceProductListing(normalizedProductId);
  return toExportResponse(normalizedProductId, document, status);
};

export const checkEcommerceProductsExistence = async (
  productIds: string[]
): Promise<Set<string>> => {
  if (productIds.length === 0) return new Set<string>();
  try {
    const db = await getEcommerceExportDb();
    // _id === product.id (always indexed), so this is faster than querying sourceProductId
    const docs = await db
      .collection<EcommerceProductDocument>(ECOM_PRODUCTS_COLLECTION)
      .find({ _id: { $in: productIds as unknown[] } }, { projection: { _id: 1 } })
      .toArray();
    return new Set(docs.map((d) => String(d._id)).filter((id) => id.length > 0));
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      message: 'ecommerce-product-export: checkEcommerceProductsExistence failed',
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
