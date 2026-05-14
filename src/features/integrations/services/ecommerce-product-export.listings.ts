import 'server-only';

import { ObjectId, type Filter } from 'mongodb';

import { ECOMMERCE_EXPORT_INTEGRATION_SLUG } from '@/shared/lib/integration-slugs';
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const PRODUCT_LISTINGS_COLLECTION = 'product_listings';
const ECOMMERCE_PRODUCTS_COLLECTION = 'products';

type EcommerceProductListingDocument = {
  _id: string;
  connectionId: string;
  createdAt: Date;
  externalListingId: string | null;
  integrationId: string;
  inventoryId: string | null;
  productId: string;
  status: 'active';
  updatedAt: Date;
};

type EcommerceProductBadgeDocument = {
  _id: string | ObjectId;
  id?: string | null | undefined;
  sourceProductId?: string | null | undefined;
  published?: boolean | null | undefined;
  archived?: boolean | null | undefined;
  stock?: number | null | undefined;
  catalogId?: string | null | undefined;
  catalogs?: Array<{ catalogId?: string | null | undefined }> | null | undefined;
};

const trimString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeDocumentId = (value: unknown): string => {
  if (value instanceof ObjectId) return value.toHexString();
  return trimString(value);
};

const buildLookupValues = (ids: readonly string[]): Array<string | ObjectId> => {
  const seen = new Set<string>();
  const values: Array<string | ObjectId> = [];

  ids.forEach((rawId) => {
    const normalized = rawId.trim();
    if (!normalized) return;

    const stringKey = `s:${normalized}`;
    if (!seen.has(stringKey)) {
      seen.add(stringKey);
      values.push(normalized);
    }

    if (!ObjectId.isValid(normalized)) return;
    const objectId = new ObjectId(normalized);
    const objectKey = `o:${objectId.toHexString()}`;
    if (!seen.has(objectKey)) {
      seen.add(objectKey);
      values.push(objectId);
    }
  });

  return values;
};

const normalizeProductIds = (productIds: readonly string[]): string[] =>
  Array.from(
    new Set(
      productIds
        .map((productId) => productId.trim())
        .filter((productId) => productId.length > 0)
    )
  );

const resolveEcommerceCatalogId = (): string =>
  trimString(process.env['ECOM_EXPORT_CATALOG_ID']) || trimString(process.env['MENTIOS_CATALOG_ID']);

const buildEcommerceProductBadgeFilter = (
  productIds: readonly string[]
): Filter<EcommerceProductBadgeDocument> => {
  const normalizedProductIds = normalizeProductIds(productIds);
  const lookupValues = buildLookupValues(normalizedProductIds);
  const catalogId = resolveEcommerceCatalogId();
  const conditions: Filter<EcommerceProductBadgeDocument>[] = [
    {
      $or: [
        { _id: { $in: lookupValues } },
        { id: { $in: normalizedProductIds } },
        { sourceProductId: { $in: normalizedProductIds } },
      ],
    } as Filter<EcommerceProductBadgeDocument>,
    { published: { $ne: false } } as Filter<EcommerceProductBadgeDocument>,
    { archived: { $ne: true } } as Filter<EcommerceProductBadgeDocument>,
    { stock: { $ne: 0 } } as Filter<EcommerceProductBadgeDocument>,
  ];

  if (catalogId.length > 0) {
    conditions.push({
      $or: [{ catalogId }, { 'catalogs.catalogId': catalogId }],
    } as Filter<EcommerceProductBadgeDocument>);
  }

  return { $and: conditions } as Filter<EcommerceProductBadgeDocument>;
};

const collectMatchingRequestedProductIds = (
  doc: EcommerceProductBadgeDocument,
  requestedProductIds: ReadonlySet<string>
): string[] => {
  const candidates = [
    normalizeDocumentId(doc._id),
    trimString(doc.id),
    trimString(doc.sourceProductId),
  ].filter((candidate) => candidate.length > 0);

  return candidates.filter((candidate) => requestedProductIds.has(candidate));
};

export const upsertEcommerceProductListing = async (productId: string): Promise<void> => {
  try {
    const db = await getMongoDb();
    const now = new Date();
    // Query by _id (primary key) to avoid duplicate key conflicts on concurrent upserts
    await db.collection<EcommerceProductListingDocument>(PRODUCT_LISTINGS_COLLECTION).updateOne(
      { _id: `ecom:${productId}` },
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

export const findVisibleEcommerceProductIds = async (
  productIds: readonly string[]
): Promise<Set<string>> => {
  const normalizedProductIds = normalizeProductIds(productIds);
  if (normalizedProductIds.length === 0) return new Set<string>();

  try {
    const requestedProductIds = new Set(normalizedProductIds);
    const db = await getMongoDb();
    const docs = await db
      .collection<EcommerceProductBadgeDocument>(ECOMMERCE_PRODUCTS_COLLECTION)
      .find(buildEcommerceProductBadgeFilter(normalizedProductIds), {
        projection: { _id: 1, id: 1, sourceProductId: 1 },
      })
      .toArray();

    return new Set(
      docs.flatMap((doc) => collectMatchingRequestedProductIds(doc, requestedProductIds))
    );
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      message: 'ecommerce-product-export: failed to resolve visible ecommerce product badges',
      source: 'ecommerce-product-export',
      context: {
        productIdCount: normalizedProductIds.length,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return new Set<string>();
  }
};
