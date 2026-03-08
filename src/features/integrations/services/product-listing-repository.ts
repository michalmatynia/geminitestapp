import { randomUUID } from 'crypto';

import { Prisma } from '@/shared/lib/db/prisma-client';
import { ObjectId, type Filter, type UpdateFilter, type Document } from 'mongodb';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import {
  CreateProductListingInput,
  ProductListing,
  ProductListingExportEvent,
  ProductListingExportEventRecord,
  ProductListingRepository,
  ProductListingWithDetails,
} from '../types/listings';

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

const toPrismaNullableJson = (
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
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
    return { [field]: { $in: candidates } } as unknown as Filter<ProductListingDocument>;
  }
  const normalized = value.trim();
  return { [field]: candidates[0] ?? normalized } as unknown as Filter<ProductListingDocument>;
};

const buildLookupFilterForIds = (
  field: string,
  values: string[]
): Filter<ProductListingDocument> => {
  const candidates = buildLookupCandidates(values);
  return { [field]: { $in: candidates } } as unknown as Filter<ProductListingDocument>;
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
  exportHistory: ((doc.exportHistory as unknown as Record<string, unknown>[]) ?? []).map(
    (event) => ({
      ...event,
      exportedAt:
        normalizeIsoDate(event?.['exportedAt'] as string | Date) ?? new Date().toISOString(),
      expiresAt: normalizeIsoDate(event?.['expiresAt'] as string | Date) ?? null,
    })
  ),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

type EnrichedPrismaListing = Prisma.ProductListingGetPayload<{
  include: {
    integration: { select: { id: true; name: true; slug: true } };
    connection: { select: { id: true; name: true } };
  };
}>;

const toDetailsRecord = (listing: EnrichedPrismaListing): ProductListingWithDetails => ({
  id: listing.id,
  productId: listing.productId,
  integrationId: listing.integrationId,
  connectionId: listing.connectionId,
  status: listing.status,
  externalListingId: listing.externalListingId ?? null,
  inventoryId: listing.inventoryId ?? null,
  listedAt: normalizeIsoDate(listing.listedAt),
  expiresAt: normalizeIsoDate(listing.expiresAt),
  nextRelistAt: normalizeIsoDate(listing.nextRelistAt),
  relistPolicy: (listing.relistPolicy ?? null) as ProductListingWithDetails['relistPolicy'],
  relistAttempts: listing.relistAttempts ?? 0,
  lastRelistedAt: normalizeIsoDate(listing.lastRelistedAt),
  lastStatusCheckAt: normalizeIsoDate(listing.lastStatusCheckAt),
  marketplaceData: (listing.marketplaceData ??
    null) as ProductListingWithDetails['marketplaceData'],
  failureReason: listing.failureReason ?? null,
  exportHistory: ((listing.exportHistory as unknown as Record<string, unknown>[] | null) ?? []).map(
    (event: Record<string, unknown>) => ({
      ...event,
      exportedAt:
        normalizeIsoDate(event?.['exportedAt'] as string | Date) ?? new Date().toISOString(),
      expiresAt: normalizeIsoDate(event?.['expiresAt'] as string | Date) ?? null,
    })
  ),
  createdAt: listing.createdAt.toISOString(),
  updatedAt: listing.updatedAt.toISOString(),
  integration: listing.integration,
  connection: listing.connection,
});

const prismaRepository: ProductListingRepository = {
  getListingsByProductId: async (productId: string): Promise<ProductListingWithDetails[]> => {
    const listings = await prisma.productListing.findMany({
      where: { productId },
      include: {
        integration: {
          select: { id: true, name: true, slug: true },
        },
        connection: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return (listings as EnrichedPrismaListing[]).map(toDetailsRecord);
  },

  getListingById: async (id: string): Promise<ProductListing | null> => {
    const listing = await prisma.productListing.findUnique({ where: { id } });
    if (!listing) return null;
    return toListingRecord({ ...listing, _id: listing.id } as unknown as ProductListingDocument);
  },

  createListing: async (input: CreateProductListingInput): Promise<ProductListingWithDetails> => {
    const listing = await prisma.productListing.create({
      data: {
        productId: input.productId,
        integrationId: input.integrationId,
        connectionId: input.connectionId,
        status: input.status ?? 'pending',
        externalListingId: input.externalListingId || null,
        inventoryId: input.inventoryId || null,
        expiresAt: input.expiresAt ?? null,
        nextRelistAt: input.nextRelistAt ?? null,
        ...(input.relistPolicy !== undefined
          ? { relistPolicy: toPrismaNullableJson(input.relistPolicy) }
          : {}),
        relistAttempts: input.relistAttempts ?? 0,
        lastRelistedAt: input.lastRelistedAt ?? null,
        lastStatusCheckAt: input.lastStatusCheckAt ?? null,
        ...(input.marketplaceData !== undefined
          ? { marketplaceData: toPrismaNullableJson(input.marketplaceData) }
          : {}),
        failureReason: input.failureReason ?? null,
        ...(input.exportHistory !== undefined
          ? { exportHistory: toPrismaNullableJson(input.exportHistory) }
          : {}),
      },
      include: {
        integration: {
          select: { id: true, name: true, slug: true },
        },
        connection: {
          select: { id: true, name: true },
        },
      },
    });
    return toDetailsRecord(listing as EnrichedPrismaListing);
  },

  updateListingExternalId: async (id: string, externalListingId: string | null): Promise<void> => {
    await prisma.productListing.update({
      where: { id },
      data: { externalListingId },
    });
  },

  updateListingStatus: async (id: string, status: string): Promise<void> => {
    await prisma.productListing.update({
      where: { id },
      data: { status },
    });
  },

  updateListing: async (id: string, input: Partial<CreateProductListingInput>): Promise<void> => {
    await prisma.productListing.update({
      where: { id },
      data: {
        status: input.status,
        externalListingId: input.externalListingId,
        inventoryId: input.inventoryId,
        expiresAt: input.expiresAt,
        nextRelistAt: input.nextRelistAt,
        ...(input.relistPolicy !== undefined
          ? { relistPolicy: toPrismaNullableJson(input.relistPolicy) }
          : {}),
        relistAttempts: input.relistAttempts,
        lastRelistedAt: input.lastRelistedAt,
        lastStatusCheckAt: input.lastStatusCheckAt,
        ...(input.marketplaceData !== undefined
          ? { marketplaceData: toPrismaNullableJson(input.marketplaceData) }
          : {}),
        failureReason: input.failureReason,
        ...(input.exportHistory !== undefined
          ? { exportHistory: toPrismaNullableJson(input.exportHistory) }
          : {}),
      } as unknown as Prisma.ProductListingUpdateInput,
    });
  },
  updateListingInventoryId: async (id: string, inventoryId: string | null): Promise<void> => {
    await prisma.productListing.update({
      where: { id },
      data: { inventoryId },
    });
  },

  appendExportHistory: async (
    id: string,
    event: ProductListingExportEventRecord
  ): Promise<void> => {
    const listing = await prisma.productListing.findUnique({ where: { id } });
    if (!listing) return;
    const history = (listing.exportHistory as unknown as ProductListingExportEvent[] | null) ?? [];

    const normalizedEvent: ProductListingExportEvent = {
      ...event,
      exportedAt: normalizeIsoDate(event.exportedAt) ?? new Date().toISOString(),
      expiresAt: normalizeIsoDate(event.expiresAt) ?? null,
    };

    await prisma.productListing.update({
      where: { id },
      data: {
        exportHistory: toPrismaNullableJson([normalizedEvent, ...history].slice(0, 50)),
      },
    });
  },

  deleteListing: async (id: string): Promise<void> => {
    await prisma.productListing.delete({ where: { id } });
  },

  listingExists: async (productId: string, connectionId: string): Promise<boolean> => {
    const count = await prisma.productListing.count({
      where: { productId, connectionId },
    });
    return count > 0;
  },

  getListingsByProductIds: async (productIds: string[]): Promise<ProductListing[]> => {
    if (productIds.length === 0) return [];
    const listings = await prisma.productListing.findMany({
      where: { productId: { in: productIds } },
    });
    return listings.map((l) => toListingRecord({ ...l, _id: l.id } as ProductListingDocument));
  },

  getListingsByConnection: async (connectionId: string): Promise<ProductListing[]> => {
    const listings = await prisma.productListing.findMany({
      where: { connectionId },
    });
    return listings.map((l) => toListingRecord({ ...l, _id: l.id } as ProductListingDocument));
  },

  listAllListings: async (): Promise<
    Array<Pick<ProductListing, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>
  > => {
    const listings = await prisma.productListing.findMany({
      select: {
        productId: true,
        status: true,
        integrationId: true,
        marketplaceData: true,
      },
    });
    return listings.map((l) => ({
      ...l,
      marketplaceData: l.marketplaceData as ProductListing['marketplaceData'],
    }));
  },
};

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
          .find({ _id: { $in: integrationLookup } } as unknown as Filter<Document>)
          .toArray()
        : [];

    const connections =
      connectionLookup.length > 0
        ? await db
          .collection('integration_connections')
          .find({ _id: { $in: connectionLookup } } as unknown as Filter<Document>)
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
      relistPolicy: (input.relistPolicy ??
        null) as unknown as ProductListingDocument['relistPolicy'],
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
      marketplaceData: (input.marketplaceData ??
        null) as unknown as ProductListingDocument['marketplaceData'],
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
      $set: updateData as unknown as UpdateFilter<ProductListingDocument>,
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
    } as unknown as UpdateFilter<ProductListingDocument>);
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
    Array<Pick<ProductListing, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>
  > => {
    const collection = await getListingCollection();
    const listings = await collection
      .find({}, { projection: { productId: 1, status: 1, integrationId: 1, marketplaceData: 1 } })
      .toArray();
    return listings.map((l) => ({
      productId: normalizeLookupIdOrFallback(l.productId),
      status: l.status,
      integrationId: normalizeLookupIdOrFallback(l.integrationId),
      marketplaceData: l.marketplaceData ?? null,
    }));
  },
};

export async function getProductListingRepository(): Promise<ProductListingRepository> {
  const provider = await getAppDbProvider();
  return provider === 'mongodb' ? mongoRepository : prismaRepository;
}

/**
 * Utility functions that check both providers.
 * Used during transition or for robust lookup when active provider might not have the data.
 */

export async function findProductListingByIdAcrossProviders(id: string): Promise<{
  listing: ProductListing;
  repository: ProductListingRepository;
} | null> {
  // Check active provider first for performance
  const provider = await getAppDbProvider();
  const activeRepo = provider === 'mongodb' ? mongoRepository : prismaRepository;
  const otherRepo = provider === 'mongodb' ? prismaRepository : mongoRepository;

  const activeResult = await activeRepo.getListingById(id);
  if (activeResult) {
    return { listing: activeResult, repository: activeRepo };
  }

  const otherResult = await otherRepo.getListingById(id);
  if (otherResult) {
    return { listing: otherResult, repository: otherRepo };
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
  const providers = [
    { repo: prismaRepository, name: 'prisma' },
    { repo: mongoRepository, name: 'mongodb' },
  ];

  for (const { repo } of providers) {
    const listings = await repo.getListingsByProductId(productId);
    const matched = listings.find((l) => l.connectionId === connectionId);
    if (matched) {
      return { listing: matched, repository: repo };
    }
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

  const providers = [
    { repo: prismaRepository, name: 'prisma' },
    { repo: mongoRepository, name: 'mongodb' },
  ];

  for (const { repo } of providers) {
    const listings = await repo.getListingsByProductIds(productIds);
    listings.forEach((listing) => {
      if (listing.connectionId === connectionId) {
        result.set(listing.productId, { listing, repository: repo });
      }
    });
  }

  return result;
}

export async function listProductListingsByProductIdAcrossProviders(
  productId: string
): Promise<ProductListingWithDetails[]> {
  const [prismaListings, mongoListings] = await Promise.all([
    prismaRepository.getListingsByProductId(productId),
    mongoRepository.getListingsByProductId(productId),
  ]);

  // Combine and deduplicate by ID
  const combined = [...prismaListings, ...mongoListings];
  const seen = new Set<string>();
  return combined.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
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

  const [prismaListings, mongoListings] = await Promise.all([
    prismaRepository.getListingsByProductIds(uniqueProductIds),
    mongoRepository.getListingsByProductIds(uniqueProductIds),
  ]);

  return [...prismaListings, ...mongoListings].map((listing) => ({
    productId: listing.productId,
    status: listing.status,
    integrationId: listing.integrationId,
    marketplaceData: listing.marketplaceData,
  }));
}

export async function listAllProductListingsAcrossProviders(): Promise<
  Array<Pick<ProductListing, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>
  > {
  const [prismaListings, mongoListings] = await Promise.all([
    prismaRepository.listAllListings(),
    mongoRepository.listAllListings(),
  ]);

  return [...prismaListings, ...mongoListings];
}

export async function listingExistsAcrossProviders(
  productId: string,
  connectionId: string
): Promise<boolean> {
  const [prismaExists, mongoExists] = await Promise.all([
    prismaRepository.listingExists(productId, connectionId),
    mongoRepository.listingExists(productId, connectionId),
  ]);

  return prismaExists || mongoExists;
}
