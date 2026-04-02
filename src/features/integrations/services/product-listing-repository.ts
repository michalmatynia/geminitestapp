import { randomUUID } from 'crypto';

import { ObjectId, type Filter, type UpdateFilter, type Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  CreateProductListingInput,
  ProductListing,
  ProductListingExportEvent,
  ProductListingExportEventRecord,
  ProductListingRepository,
  ProductListingWithDetails,
} from '@/shared/contracts/integrations';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const LISTING_COLLECTION = 'product_listings';
let listingIndexesEnsured: Promise<void> | null = null;

const ensureListingIndexes = async (): Promise<void> => {
  if (!listingIndexesEnsured) {
    listingIndexesEnsured = (async (): Promise<void> => {
      const db = await getMongoDb();
      const collection = db.collection<ProductListingDocument>(LISTING_COLLECTION);
      await Promise.all([
        collection.createIndex({ productId: 1 }, { name: 'product_listings_productId' }),
        collection.createIndex({ connectionId: 1 }, { name: 'product_listings_connectionId' }),
        collection.createIndex({ integrationId: 1 }, { name: 'product_listings_integrationId' }),
        collection.createIndex({ status: 1 }, { name: 'product_listings_status' }),
        collection.createIndex({ createdAt: -1 }, { name: 'product_listings_createdAt_desc' }),
      ]);
    })();
  }

  try {
    await listingIndexesEnsured;
  } catch (error) {
    logClientError(error);
    listingIndexesEnsured = null;
    throw error;
  }
};

const getListingCollection = async () => {
  await ensureListingIndexes();
  const db = await getMongoDb();
  return db.collection<ProductListingDocument>(LISTING_COLLECTION);
};

/**
 * MongoDB Document
 */
type ProductListingDocument = {
  _id: string | ObjectId;
  productId: string | ObjectId;
  integrationId: string | ObjectId;
  connectionId: string | ObjectId;
  externalListingId: string | null;
  inventoryId: string | null;
  status: string;
  listedAt?: Date | null | undefined;
  expiresAt?: Date | null | undefined;
  nextDueAt?: Date | null | undefined;
  nextRelistAt?: Date | null | undefined;
  relistPolicy?: Record<string, unknown> | null | undefined;
  relistAttempts?: number | undefined;
  lastRelistedAt?: Date | null | undefined;
  lastStatusCheckAt?: Date | null | undefined;
  marketplaceData?: Record<string, unknown> | null | undefined;
  failureReason?: string | null | undefined;
  exportHistory?: ProductListingExportEvent[] | null | undefined;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeLookupId = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
  }
  if (value instanceof ObjectId) {
    return value.toHexString();
  }
  return '';
};

const normalizeLookupIdOrFallback = (value: unknown): string => {
  const normalized = normalizeLookupId(value);
  if (normalized) return normalized;
  if (value === null || value === undefined) return '';
  const fallback = String(value).trim();
  return fallback.length > 0 ? fallback : '';
};

const buildLookupCandidates = (ids: string[]): Array<string | ObjectId> => {
  const seen = new Set<string>();
  const candidates: Array<string | ObjectId> = [];
  ids.forEach((rawId: string) => {
    const normalized = rawId.trim();
    if (!normalized) return;

    const stringKey = `s:${normalized}`;
    if (!seen.has(stringKey)) {
      seen.add(stringKey);
      candidates.push(normalized);
    }

    if (!ObjectId.isValid(normalized)) return;
    const objectId = new ObjectId(normalized);
    const objectKey = `o:${objectId.toHexString()}`;
    if (!seen.has(objectKey)) {
      seen.add(objectKey);
      candidates.push(objectId);
    }
  });
  return candidates;
};

const buildLookupFilter = (
  field: '_id' | 'productId' | 'integrationId' | 'connectionId',
  value: string
): Filter<ProductListingDocument> => {
  const candidates = buildLookupCandidates([value]);
  if (candidates.length > 1) {
    return { [field]: { $in: candidates } } as Filter<ProductListingDocument>;
  }
  const normalized = value.trim();
  return { [field]: candidates[0] ?? normalized } as Filter<ProductListingDocument>;
};

const buildLookupFilterForIds = (
  field: string,
  values: string[]
): Filter<ProductListingDocument> => {
  const candidates = buildLookupCandidates(values);
  return { [field]: { $in: candidates } } as Filter<ProductListingDocument>;
};

const normalizeIsoDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const toListingRecord = (doc: ProductListingDocument): ProductListing => ({
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
  relistPolicy: (doc.relistPolicy ?? null) as ProductListing['relistPolicy'],
  relistAttempts: doc.relistAttempts ?? 0,
  lastRelistedAt: normalizeIsoDate(doc.lastRelistedAt),
  lastStatusCheckAt: normalizeIsoDate(doc.lastStatusCheckAt),
  marketplaceData: doc.marketplaceData ?? null,
  failureReason: doc.failureReason ?? null,
  exportHistory: (doc.exportHistory ?? []).map(
    (event) => ({
      ...event,
      exportedAt:
        normalizeIsoDate(event.exportedAt as string | Date) ?? new Date().toISOString(),
      expiresAt: normalizeIsoDate(event.expiresAt as string | Date) ?? null,
    })
  ),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const mongoRepository: ProductListingRepository = {
  getListingsByProductId: async (productId: string): Promise<ProductListingWithDetails[]> => {
    const collection = await getListingCollection();
    const db = await getMongoDb();
    const docs = await collection
      .find(buildLookupFilter('productId', productId))
      .sort({ createdAt: -1 })
      .toArray();

    const integrationIds = Array.from(
      new Set(
        docs
          .map((doc: ProductListingDocument) => normalizeLookupId(doc.integrationId))
          .filter((id: string) => id.length > 0)
      )
    );
    const connectionIds = Array.from(
      new Set(
        docs
          .map((doc: ProductListingDocument) => normalizeLookupId(doc.connectionId))
          .filter((id: string) => id.length > 0)
      )
    );

    const integrationLookup = buildLookupCandidates(integrationIds);
    const connectionLookup = buildLookupCandidates(connectionIds);

    const integrations =
      integrationLookup.length > 0
        ? await db
          .collection('integrations')
          .find({ _id: { $in: integrationLookup } } as Filter<Document>)
          .toArray()
        : [];

    const connections =
      connectionLookup.length > 0
        ? await db
          .collection('integration_connections')
          .find({ _id: { $in: connectionLookup } } as Filter<Document>)
          .toArray()
        : [];
    const integrationMap = new Map(integrations.map((i) => [i._id.toString(), i]));
    const connectionMap = new Map(connections.map((c) => [c._id.toString(), c]));

    return docs.map((doc) => {
      const integrationId = normalizeLookupIdOrFallback(doc.integrationId);
      const connectionId = normalizeLookupIdOrFallback(doc.connectionId);
      const integration = integrationMap.get(integrationId);
      const connection = connectionMap.get(connectionId);
      return {
        ...toListingRecord(doc),
        integration: {
          id: integration?.['_id']?.toString() ?? integrationId,
          name: String(integration?.['name'] ?? 'Unknown'),
          slug: String(integration?.['slug'] ?? 'unknown'),
        },
        connection: {
          id: connection?.['_id']?.toString() ?? connectionId,
          name: String(connection?.['name'] ?? 'Unknown'),
        },
      };
    });
  },

  getListingById: async (id: string): Promise<ProductListing | null> => {
    const collection = await getListingCollection();
    const doc = await collection.findOne(buildLookupFilter('_id', id));
    return doc ? toListingRecord(doc) : null;
  },

  createListing: async (input: CreateProductListingInput): Promise<ProductListingWithDetails> => {
    const collection = await getListingCollection();
    const now = new Date();
    const id = randomUUID();
    const doc: ProductListingDocument = {
      _id: id,
      productId: input.productId,
      integrationId: input.integrationId,
      connectionId: input.connectionId,
      status: input.status ?? 'pending',
      externalListingId: input.externalListingId ?? null,
      inventoryId: input.inventoryId ?? null,
      listedAt:
        input.listedAt instanceof Date
          ? input.listedAt
          : input.listedAt
            ? new Date(input.listedAt)
            : null,
      expiresAt:
        input.expiresAt instanceof Date
          ? input.expiresAt
          : input.expiresAt
            ? new Date(input.expiresAt)
            : null,
      nextRelistAt:
        input.nextRelistAt instanceof Date
          ? input.nextRelistAt
          : input.nextRelistAt
            ? new Date(input.nextRelistAt)
            : null,
      relistPolicy: (input.relistPolicy ?? null) as ProductListingDocument['relistPolicy'],
      relistAttempts: input.relistAttempts ?? 0,
      lastRelistedAt:
        input.lastRelistedAt instanceof Date
          ? input.lastRelistedAt
          : input.lastRelistedAt
            ? new Date(input.lastRelistedAt)
            : null,
      lastStatusCheckAt:
        input.lastStatusCheckAt instanceof Date
          ? input.lastStatusCheckAt
          : input.lastStatusCheckAt
            ? new Date(input.lastStatusCheckAt)
            : null,
      marketplaceData: (input.marketplaceData ?? null) as ProductListingDocument['marketplaceData'],
      failureReason: input.failureReason ?? null,
      exportHistory: input.exportHistory ?? [],
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return mongoRepository
      .getListingsByProductId(input.productId)
      .then((list) => list.find((l) => l.id === id)!);
  },

  updateListingExternalId: async (id: string, externalListingId: string | null): Promise<void> => {
    const collection = await getListingCollection();
    await collection.updateOne(buildLookupFilter('_id', id), {
      $set: { externalListingId, updatedAt: new Date() },
    });
  },

  updateListingStatus: async (id: string, status: string): Promise<void> => {
    const collection = await getListingCollection();
    await collection.updateOne(buildLookupFilter('_id', id), {
      $set: { status, updatedAt: new Date() },
    });
  },

  updateListing: async (id: string, input: Partial<CreateProductListingInput>): Promise<void> => {
    const collection = await getListingCollection();
    const updateData: Record<string, unknown> = { ...input, updatedAt: new Date() };
    delete updateData['id'];
    delete updateData['productId'];
    delete updateData['integrationId'];
    delete updateData['connectionId'];

    // Map dates
    if (input.listedAt) updateData['listedAt'] = new Date(input.listedAt);
    if (input.expiresAt) updateData['expiresAt'] = new Date(input.expiresAt);
    if (input.nextRelistAt) updateData['nextRelistAt'] = new Date(input.nextRelistAt);
    if (input.lastRelistedAt) updateData['lastRelistedAt'] = new Date(input.lastRelistedAt);
    if (input.lastStatusCheckAt)
      updateData['lastStatusCheckAt'] = new Date(input.lastStatusCheckAt);

    await collection.updateOne(buildLookupFilter('_id', id), {
      $set: updateData as UpdateFilter<ProductListingDocument>,
    });
  },
  updateListingInventoryId: async (id: string, inventoryId: string | null): Promise<void> => {
    const collection = await getListingCollection();
    await collection.updateOne(buildLookupFilter('_id', id), {
      $set: { inventoryId, updatedAt: new Date() },
    });
  },

  appendExportHistory: async (
    id: string,
    event: ProductListingExportEventRecord
  ): Promise<void> => {
    const collection = await getListingCollection();

    const normalizedEvent: ProductListingExportEvent = {
      ...event,
      exportedAt: normalizeIsoDate(event.exportedAt) ?? new Date().toISOString(),
      expiresAt: normalizeIsoDate(event.expiresAt) ?? null,
    };

    await collection.updateOne(buildLookupFilter('_id', id), {
      $push: {
        exportHistory: {
          $each: [normalizedEvent],
          $position: 0,
          $slice: 50,
        },
      },
      $set: { updatedAt: new Date() },
    } as UpdateFilter<ProductListingDocument>);
  },
  deleteListing: async (id: string): Promise<void> => {
    const collection = await getListingCollection();
    await collection.deleteOne(buildLookupFilter('_id', id));
  },

  listingExists: async (productId: string, connectionId: string): Promise<boolean> => {
    const collection = await getListingCollection();
    const count = await collection.countDocuments({
      $and: [
        buildLookupFilter('productId', productId),
        buildLookupFilter('connectionId', connectionId),
      ],
    } as Filter<ProductListingDocument>);
    return count > 0;
  },

  getListingsByProductIds: async (productIds: string[]): Promise<ProductListing[]> => {
    if (productIds.length === 0) return [];
    const collection = await getListingCollection();
    const listings = await collection
      .find(buildLookupFilterForIds('productId', productIds))
      .toArray();
    return listings.map(toListingRecord);
  },

  getListingsByConnection: async (connectionId: string): Promise<ProductListing[]> => {
    const collection = await getListingCollection();
    const listings = await collection
      .find(buildLookupFilter('connectionId', connectionId))
      .toArray();
    return listings.map(toListingRecord);
  },

  listAllListings: async (): Promise<
    Array<
      Pick<
        ProductListing,
        'productId' | 'status' | 'integrationId' | 'marketplaceData' | 'updatedAt'
      >
    >
  > => {
    const collection = await getListingCollection();
    const listings = await collection
      .find(
        {},
        {
          projection: {
            productId: 1,
            status: 1,
            integrationId: 1,
            marketplaceData: 1,
            updatedAt: 1,
          },
        }
      )
      .toArray();
    return listings.map((l) => ({
      productId: normalizeLookupIdOrFallback(l.productId),
      status: l.status,
      integrationId: normalizeLookupIdOrFallback(l.integrationId),
      marketplaceData: l.marketplaceData ?? null,
      updatedAt: l.updatedAt.toISOString(),
    }));
  },
};

export async function getProductListingRepository(): Promise<ProductListingRepository> {
  return mongoRepository;
}

/**
 * Legacy cross-provider helpers now resolve against MongoDB only.
 */

export async function findProductListingByIdAcrossProviders(id: string): Promise<{
  listing: ProductListing;
  repository: ProductListingRepository;
} | null> {
  const listing = await mongoRepository.getListingById(id);
  if (listing) {
    return { listing, repository: mongoRepository };
  }

  return null;
}

export async function findProductListingByProductAndConnectionAcrossProviders(
  productId: string,
  connectionId: string
): Promise<{
  listing: ProductListing;
  repository: ProductListingRepository;
} | null> {
  const listings = await mongoRepository.getListingsByProductId(productId);
  const matched = listings.find((l) => l.connectionId === connectionId);
  if (matched) {
    return { listing: matched, repository: mongoRepository };
  }
  return null;
}

export async function findProductListingsByProductsAndConnectionAcrossProviders(
  productIds: string[],
  connectionId: string
): Promise<Map<string, { listing: ProductListing; repository: ProductListingRepository }>> {
  const result = new Map<
    string,
    { listing: ProductListing; repository: ProductListingRepository }
  >();
  if (productIds.length === 0) return result;

  const listings = await mongoRepository.getListingsByProductIds(productIds);
  listings.forEach((listing) => {
    if (listing.connectionId === connectionId) {
      result.set(listing.productId, { listing, repository: mongoRepository });
    }
  });

  return result;
}

export async function listProductListingsByProductIdAcrossProviders(
  productId: string
): Promise<ProductListingWithDetails[]> {
  return mongoRepository.getListingsByProductId(productId);
}

export async function listProductListingsByProductIdsAcrossProviders(
  productIds: string[]
): Promise<
  Array<Pick<ProductListing, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>
> {
  const uniqueProductIds = Array.from(
    new Set(productIds.map((id) => id.trim()).filter((id) => id.length > 0))
  );
  if (uniqueProductIds.length === 0) return [];

  const mongoListings = await mongoRepository.getListingsByProductIds(uniqueProductIds);
  return mongoListings.map((listing) => ({
    productId: listing.productId,
    status: listing.status,
    integrationId: listing.integrationId,
    marketplaceData: listing.marketplaceData,
  }));
}

export async function listAllProductListingsAcrossProviders(): Promise<
  Array<Pick<ProductListing, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>
  > {
  return mongoRepository.listAllListings();
}

export async function listingExistsAcrossProviders(
  productId: string,
  connectionId: string
): Promise<boolean> {
  return mongoRepository.listingExists(productId, connectionId);
}
