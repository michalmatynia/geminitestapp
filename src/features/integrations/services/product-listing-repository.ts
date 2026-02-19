import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';
import { ObjectId, type Filter, type UpdateFilter, type Document } from 'mongodb';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import {
  CreateProductListingInput,
  ProductListingExportEvent,
  ProductListingRecord,
  ProductListingRepository,
  ProductListingWithDetails,
} from '../types/listings';

const LISTING_COLLECTION = 'product_listings';

/**
 * MongoDB Document
 */
type ProductListingDocument = {
  _id: string;
  productId: string;
  integrationId: string;
  connectionId: string;
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

const toListingRecord = (doc: ProductListingDocument): ProductListingRecord => ({
  id: doc._id,
  productId: doc.productId,
  integrationId: doc.integrationId,
  connectionId: doc.connectionId,
  externalListingId: doc.externalListingId,
  inventoryId: doc.inventoryId ?? null,
  status: doc.status,
  listedAt: doc.listedAt ? doc.listedAt.toISOString() : null,
  expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
  nextRelistAt: doc.nextRelistAt ? doc.nextRelistAt.toISOString() : null,
  relistPolicy: (doc.relistPolicy ?? null) as ProductListingRecord['relistPolicy'],
  relistAttempts: doc.relistAttempts ?? 0,
  lastRelistedAt: doc.lastRelistedAt ? doc.lastRelistedAt.toISOString() : null,
  lastStatusCheckAt: doc.lastStatusCheckAt
    ? doc.lastStatusCheckAt.toISOString()
    : null,
  marketplaceData: doc.marketplaceData ?? null,
  failureReason: doc.failureReason ?? null,
  exportHistory: (doc.exportHistory ?? []).map((event) => ({
    ...event,
    exportedAt:
      event.exportedAt instanceof Date
        ? event.exportedAt.toISOString()
        : event.exportedAt,
    expiresAt:
      event.expiresAt instanceof Date
        ? event.expiresAt.toISOString()
        : event.expiresAt ?? undefined,
  })),
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
  listedAt: listing.listedAt ? listing.listedAt.toISOString() : null,
  expiresAt: listing.expiresAt ? listing.expiresAt.toISOString() : null,
  nextRelistAt: listing.nextRelistAt ? listing.nextRelistAt.toISOString() : null,
  relistPolicy: (listing.relistPolicy ??
    null) as ProductListingWithDetails['relistPolicy'],
  relistAttempts: listing.relistAttempts ?? 0,
  lastRelistedAt: listing.lastRelistedAt
    ? listing.lastRelistedAt.toISOString()
    : null,
  lastStatusCheckAt: listing.lastStatusCheckAt
    ? listing.lastStatusCheckAt.toISOString()
    : null,
  marketplaceData: (listing.marketplaceData ??
    null) as ProductListingWithDetails['marketplaceData'],
  failureReason: listing.failureReason ?? null,
  exportHistory: (
    (listing.exportHistory as unknown as ProductListingExportEvent[] | null) ?? []
  ).map((event) => ({
    ...event,
    exportedAt:
      event.exportedAt instanceof Date
        ? event.exportedAt.toISOString()
        : event.exportedAt,
    expiresAt:
      event.expiresAt instanceof Date
        ? event.expiresAt.toISOString()
        : event.expiresAt ?? undefined,
  })),
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

  getListingById: async (id: string): Promise<ProductListingRecord | null> => {
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

  appendExportHistory: async (id: string, event: ProductListingExportEvent): Promise<void> => {
    const listing = await prisma.productListing.findUnique({ where: { id } });
    if (!listing) return;
    const history = (listing.exportHistory as unknown as ProductListingExportEvent[] | null) ?? [];
    await prisma.productListing.update({
      where: { id },
      data: {
        exportHistory: toPrismaNullableJson([event, ...history].slice(0, 50)),
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

  listAllListings: async (): Promise<
    Array<Pick<ProductListingRecord, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>
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
      marketplaceData: l.marketplaceData as ProductListingRecord['marketplaceData'],
    }));
  },
};

const mongoRepository: ProductListingRepository = {
  getListingsByProductId: async (productId: string): Promise<ProductListingWithDetails[]> => {
    const db = await getMongoDb();
    const docs = await db
      .collection<ProductListingDocument>(LISTING_COLLECTION)
      .find({ productId })
      .sort({ createdAt: -1 })
      .toArray();

    const integrationIds = Array.from(new Set(docs.map((d) => d.integrationId)));
    const connectionIds = Array.from(new Set(docs.map((d) => d.connectionId)));

    const integrations = await db
      .collection('integrations')
      .find({ _id: { $in: integrationIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id)) } as unknown as Filter<Document> })
      .toArray();
    
    const connections = await db
      .collection('integration_connections')
      .find({ _id: { $in: connectionIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id)) } as unknown as Filter<Document> })
      .toArray();    
    const integrationMap = new Map(integrations.map((i) => [i._id.toString(), i]));
    const connectionMap = new Map(connections.map((c) => [c._id.toString(), c]));
    
    return docs.map((doc) => {
      const integration = integrationMap.get(doc.integrationId);
      const connection = connectionMap.get(doc.connectionId);
      return {
        ...toListingRecord(doc),
        integration: {
          id: integration?.['_id']?.toString() ?? doc.integrationId,
          name: String(integration?.['name'] ?? 'Unknown'),
          slug: String(integration?.['slug'] ?? 'unknown'),
        },
        connection: {
          id: connection?.['_id']?.toString() ?? doc.connectionId,
          name: String(connection?.['name'] ?? 'Unknown'),
        },
      };
    });
    
  },

  getListingById: async (id: string): Promise<ProductListingRecord | null> => {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductListingDocument>(LISTING_COLLECTION)
      .findOne({ _id: id });
    return doc ? toListingRecord(doc) : null;
  },

  createListing: async (input: CreateProductListingInput): Promise<ProductListingWithDetails> => {
    const db = await getMongoDb();
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
      listedAt: input.listedAt instanceof Date ? input.listedAt : input.listedAt ? new Date(input.listedAt) : null,
      expiresAt: input.expiresAt instanceof Date ? input.expiresAt : input.expiresAt ? new Date(input.expiresAt) : null,
      nextRelistAt: input.nextRelistAt instanceof Date ? input.nextRelistAt : input.nextRelistAt ? new Date(input.nextRelistAt) : null,
      relistPolicy: (input.relistPolicy ?? null) as unknown as ProductListingDocument['relistPolicy'],
      relistAttempts: input.relistAttempts ?? 0,
      lastRelistedAt: input.lastRelistedAt instanceof Date ? input.lastRelistedAt : input.lastRelistedAt ? new Date(input.lastRelistedAt) : null,
      lastStatusCheckAt: input.lastStatusCheckAt instanceof Date ? input.lastStatusCheckAt : input.lastStatusCheckAt ? new Date(input.lastStatusCheckAt) : null,
      marketplaceData: (input.marketplaceData ?? null) as unknown as ProductListingDocument['marketplaceData'],
      failureReason: input.failureReason ?? null,
      exportHistory: input.exportHistory ?? [],
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<ProductListingDocument>(LISTING_COLLECTION).insertOne(doc);
    return mongoRepository.getListingsByProductId(input.productId).then((list) => list.find((l) => l.id === id)!);
  },
      
  updateListingExternalId: async (id: string, externalListingId: string | null): Promise<void> => {
    const db = await getMongoDb();
    await db
      .collection<ProductListingDocument>(LISTING_COLLECTION)
      .updateOne({ _id: id }, { $set: { externalListingId, updatedAt: new Date() } });
  },
      
  updateListingStatus: async (id: string, status: string): Promise<void> => {
    const db = await getMongoDb();
    await db
      .collection<ProductListingDocument>(LISTING_COLLECTION)
      .updateOne({ _id: id }, { $set: { status, updatedAt: new Date() } });
  },
      
  updateListing: async (id: string, input: Partial<CreateProductListingInput>): Promise<void> => {
    const db = await getMongoDb();
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
    if (input.lastStatusCheckAt) updateData['lastStatusCheckAt'] = new Date(input.lastStatusCheckAt);
      
    await db
      .collection<ProductListingDocument>(LISTING_COLLECTION)
      .updateOne({ _id: id }, { $set: updateData as unknown as UpdateFilter<ProductListingDocument> });
  },
  updateListingInventoryId: async (id: string, inventoryId: string | null): Promise<void> => {
    const db = await getMongoDb();
    await db
      .collection<ProductListingDocument>(LISTING_COLLECTION)
      .updateOne({ _id: id }, { $set: { inventoryId, updatedAt: new Date() } });
  },

  appendExportHistory: async (id: string, event: ProductListingExportEvent): Promise<void> => {
    const db = await getMongoDb();
    await db.collection<ProductListingDocument>(LISTING_COLLECTION).updateOne(
      { _id: id },
      {
        $push: {
          exportHistory: {
            $each: [event],
            $position: 0,
            $slice: 50,
          },
        },
        $set: { updatedAt: new Date() },
      } as unknown as UpdateFilter<ProductListingDocument>
    );
  },
  deleteListing: async (id: string): Promise<void> => {
    const db = await getMongoDb();
    await db.collection<ProductListingDocument>(LISTING_COLLECTION).deleteOne({ _id: id });
  },

  listingExists: async (productId: string, connectionId: string): Promise<boolean> => {
    const db = await getMongoDb();
    const count = await db
      .collection<ProductListingDocument>(LISTING_COLLECTION)
      .countDocuments({ productId, connectionId });
    return count > 0;
  },

  listAllListings: async (): Promise<
    Array<Pick<ProductListingRecord, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>
  > => {
    const db = await getMongoDb();
    const listings = await db
      .collection<ProductListingDocument>(LISTING_COLLECTION)
      .find({}, { projection: { productId: 1, status: 1, integrationId: 1, marketplaceData: 1 } })
      .toArray();
    return listings.map((l) => ({
      productId: l.productId,
      status: l.status,
      integrationId: l.integrationId,
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

export async function findProductListingByIdAcrossProviders(
  id: string
): Promise<{
  listing: ProductListingRecord;
  repository: ProductListingRepository;
} | null> {
  // Check active provider first for performance
  const provider = await getAppDbProvider();
  const activeRepo =
    provider === 'mongodb' ? mongoRepository : prismaRepository;
  const otherRepo =
    provider === 'mongodb' ? prismaRepository : mongoRepository;

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
  listing: ProductListingRecord;
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

export async function listAllProductListingsAcrossProviders(): Promise<
  Array<Pick<ProductListingRecord, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>
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
