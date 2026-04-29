import { ObjectId } from 'mongodb';

import type {
  ProductListing,
  ProductListingExportEvent,
} from '@/shared/contracts/integrations/listings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const LISTING_COLLECTION = 'product_listings';
const EXTERNAL_LISTING_ID_INDEX = 'product_listings_externalListingId';

type ProductListingLookupDocument = {
  _id: string | ObjectId;
  productId: string | ObjectId;
  integrationId: string | ObjectId;
  connectionId: string | ObjectId;
  externalListingId: string | null;
  inventoryId: string | null;
  status: string;
  listedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  nextRelistAt?: Date | string | null;
  relistPolicy?: ProductListing['relistPolicy'];
  relistAttempts?: number;
  lastRelistedAt?: Date | string | null;
  lastStatusCheckAt?: Date | string | null;
  marketplaceData?: Record<string, unknown> | null;
  failureReason?: string | null;
  exportHistory?: ProductListingExportEvent[] | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const normalizeLookupIdOrFallback = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (value instanceof ObjectId) return value.toHexString();
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeIsoDate = (value: Date | string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const normalizeRequiredIsoDate = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : value;

const normalizeExportHistory = (
  value: ProductListingExportEvent[] | null | undefined
): ProductListingExportEvent[] =>
  (value ?? []).map((event: ProductListingExportEvent) => ({
    ...event,
    exportedAt: normalizeIsoDate(event.exportedAt) ?? new Date().toISOString(),
    expiresAt: normalizeIsoDate(event.expiresAt) ?? null,
  }));

const toListingRecord = (doc: ProductListingLookupDocument): ProductListing => ({
  id: normalizeLookupIdOrFallback(doc._id),
  productId: normalizeLookupIdOrFallback(doc.productId),
  integrationId: normalizeLookupIdOrFallback(doc.integrationId),
  connectionId: normalizeLookupIdOrFallback(doc.connectionId),
  externalListingId: doc.externalListingId,
  inventoryId: doc.inventoryId ?? null,
  status: doc.status,
  listedAt: normalizeIsoDate(doc.listedAt),
  expiresAt: normalizeIsoDate(doc.expiresAt),
  nextRelistAt: normalizeIsoDate(doc.nextRelistAt),
  relistPolicy: doc.relistPolicy ?? null,
  relistAttempts: doc.relistAttempts ?? 0,
  lastRelistedAt: normalizeIsoDate(doc.lastRelistedAt),
  lastStatusCheckAt: normalizeIsoDate(doc.lastStatusCheckAt),
  marketplaceData: doc.marketplaceData ?? null,
  failureReason: doc.failureReason ?? null,
  exportHistory: normalizeExportHistory(doc.exportHistory),
  createdAt: normalizeRequiredIsoDate(doc.createdAt),
  updatedAt: normalizeRequiredIsoDate(doc.updatedAt),
});

export async function findProductListingsByExternalListingIds(
  externalListingIds: string[]
): Promise<ProductListing[]> {
  const uniqueExternalListingIds = Array.from(
    new Set(
      externalListingIds
        .map((id: string): string => id.trim())
        .filter((id: string): boolean => id.length > 0)
    )
  );
  if (uniqueExternalListingIds.length === 0) return [];

  const db = await getMongoDb();
  const collection = db.collection<ProductListingLookupDocument>(LISTING_COLLECTION);
  await collection.createIndex({ externalListingId: 1 }, { name: EXTERNAL_LISTING_ID_INDEX });
  const listings = await collection
    .find({ externalListingId: { $in: uniqueExternalListingIds } })
    .toArray();
  return listings.map(toListingRecord);
}
