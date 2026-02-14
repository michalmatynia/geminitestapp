import 'server-only';

import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';

import { getIntegrationDataProvider } from '@/features/integrations/services/integration-provider';
import type {
  ProductListingRecord,
  ProductListingExportEvent,
  ProductListingWithDetails,
  CreateProductListingInput,
  ProductListingRepository,
  IntegrationWithConnectionsBasic,
} from '@/features/integrations/types/listings';
import { getProductDataProvider } from '@/features/products/server';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export type {
  ProductListingRecord,
  ProductListingExportEvent,
  ProductListingWithDetails,
  CreateProductListingInput,
  ProductListingRepository,
  IntegrationWithConnectionsBasic,
};

type ListingProvider = 'prisma' | 'mongodb';
type ProductListingRepositoryWithProvider = {
  provider: ListingProvider;
  repository: ProductListingRepository;
};

const LISTINGS_COLLECTION = 'product_listings';

type ProductListingDocument = {
  _id: string;
  productId: string;
  integrationId: string;
  connectionId: string;
  externalListingId: string | null;
  inventoryId?: string | null;
  status: string;
  listedAt: Date | null;
  expiresAt?: Date | null;
  nextRelistAt?: Date | null;
  relistPolicy?: Record<string, unknown> | null;
  relistAttempts?: number;
  lastRelistedAt?: Date | null;
  lastStatusCheckAt?: Date | null;
  marketplaceData?: Record<string, unknown> | null;
  failureReason?: string | null;
  exportHistory?: ProductListingExportEvent[] | null;
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
  listedAt: doc.listedAt,
  expiresAt: doc.expiresAt ?? null,
  nextRelistAt: doc.nextRelistAt ?? null,
  relistPolicy: (doc.relistPolicy ?? null) as ProductListingRecord['relistPolicy'],
  relistAttempts: doc.relistAttempts ?? 0,
  lastRelistedAt: doc.lastRelistedAt ?? null,
  lastStatusCheckAt: doc.lastStatusCheckAt ?? null,
  marketplaceData: (doc.marketplaceData ?? null),
  failureReason: doc.failureReason ?? null,
  exportHistory: doc.exportHistory ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

type EnrichedPrismaListing = Prisma.ProductListingGetPayload<{
  include: {
    integration: { select: { id: true; name: true; slug: true } };
    connection: { select: { id: true; name: true } };
  };
}>;

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
    return (listings as EnrichedPrismaListing[]).map((listing: EnrichedPrismaListing) => ({
      ...listing,
      relistPolicy: (listing as unknown as Record<string, unknown>)['relistPolicy'] as ProductListingRecord['relistPolicy'],
      marketplaceData: (listing as unknown as Record<string, unknown>)['marketplaceData'] as ProductListingRecord['marketplaceData'],
      exportHistory: listing.exportHistory as unknown as ProductListingExportEvent[] | null,
    })) as unknown as ProductListingWithDetails[];
  },

  getListingById: async (id: string): Promise<ProductListingRecord | null> => {
    const listing = await prisma.productListing.findUnique({ where: { id } });
    if (!listing) return null;
    return {
      ...listing,
      relistPolicy: (listing as unknown as Record<string, unknown>)['relistPolicy'] as ProductListingRecord['relistPolicy'],
      marketplaceData: (listing as unknown as Record<string, unknown>)['marketplaceData'] as ProductListingRecord['marketplaceData'],
      exportHistory: listing.exportHistory as unknown as ProductListingExportEvent[] | null,
    };
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
    return {
      ...listing,
      relistPolicy: (listing as unknown as Record<string, unknown>)['relistPolicy'] as ProductListingRecord['relistPolicy'],
      marketplaceData: (listing as unknown as Record<string, unknown>)['marketplaceData'] as ProductListingRecord['marketplaceData'],
      exportHistory: listing.exportHistory as unknown as ProductListingExportEvent[] | null,
    } as unknown as ProductListingWithDetails;
  },

  updateListingExternalId: async (id: string, externalListingId: string | null): Promise<void> => {
    await prisma.productListing.update({
      where: { id },
      data: { externalListingId },
    });
  },

  updateListingStatus: async (id: string, status: string): Promise<void> => {
    const data: { status: string; listedAt?: Date } = { status };
    if (status === 'active') {
      data.listedAt = new Date();
    }
    await prisma.productListing.update({
      where: { id },
      data,
    });
  },

  updateListing: async (id: string, input: Partial<CreateProductListingInput>): Promise<void> => {
    const updateData: Record<string, unknown> = {};
    if (typeof input.integrationId === 'string') updateData['integrationId'] = input.integrationId;
    if (typeof input.connectionId === 'string') updateData['connectionId'] = input.connectionId;
    if (typeof input.status === 'string') updateData['status'] = input.status;
    if (typeof input.externalListingId === 'string' || input.externalListingId === null) {
      updateData['externalListingId'] = input.externalListingId ?? null;
    }
    if (typeof input.inventoryId === 'string' || input.inventoryId === null) {
      updateData['inventoryId'] = input.inventoryId ?? null;
    }
    if (input.expiresAt instanceof Date || input.expiresAt === null) {
      updateData['expiresAt'] = input.expiresAt ?? null;
    }
    if (input.nextRelistAt instanceof Date || input.nextRelistAt === null) {
      updateData['nextRelistAt'] = input.nextRelistAt ?? null;
    }
    if (typeof input.relistAttempts === 'number') updateData['relistAttempts'] = input.relistAttempts;
    if (input.lastRelistedAt instanceof Date || input.lastRelistedAt === null) {
      updateData['lastRelistedAt'] = input.lastRelistedAt ?? null;
    }
    if (input.lastStatusCheckAt instanceof Date || input.lastStatusCheckAt === null) {
      updateData['lastStatusCheckAt'] = input.lastStatusCheckAt ?? null;
    }
    if (typeof input.failureReason === 'string' || input.failureReason === null) {
      updateData['failureReason'] = input.failureReason ?? null;
    }
    if (input.relistPolicy !== undefined) {
      updateData['relistPolicy'] = toPrismaNullableJson(input.relistPolicy);
    }
    if (input.marketplaceData !== undefined) {
      updateData['marketplaceData'] = toPrismaNullableJson(input.marketplaceData);
    }

    if (Object.keys(updateData).length === 0) return;
    await prisma.productListing.update({
      where: { id },
      data: updateData as Prisma.ProductListingUpdateInput,
    });
  },

  updateListingInventoryId: async (id: string, inventoryId: string | null): Promise<void> => {
    await prisma.productListing.update({
      where: { id },
      data: { inventoryId },
    });
  },

  appendExportHistory: async (id: string, event: ProductListingExportEvent): Promise<void> => {
    const listing = await prisma.productListing.findUnique({
      where: { id },
      select: { exportHistory: true },
    });
    const current = Array.isArray(listing?.exportHistory)
      ? (listing?.exportHistory as Prisma.InputJsonValue[])
      : [];
    await prisma.productListing.update({
      where: { id },
      data: { exportHistory: [...current, event as unknown as Prisma.InputJsonValue] as Prisma.InputJsonValue[] },
    });
  },

  deleteListing: async (id: string): Promise<void> => {
    await prisma.productListing.delete({ where: { id } });
  },

  listingExists: async (productId: string, connectionId: string): Promise<boolean> => {
    const existing = await prisma.productListing.findUnique({
      where: { productId_connectionId: { productId, connectionId } },
    });
    return existing !== null;
  },

  listAllListings: async (): Promise<Array<{ productId: string; status: string; integrationId: string }>> => {
    return prisma.productListing.findMany({
      select: { productId: true, status: true, integrationId: true },
    });
  },
};

const mongoRepository: ProductListingRepository = {
  getListingsByProductId: async (productId: string): Promise<ProductListingWithDetails[]> => {
    const db = await getMongoDb();

    // Get listings
    const listings = await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .find({ productId })
      .sort({ createdAt: -1 })
      .toArray();

    // Get integrations and connections for enrichment
    const integrationIds = listings.reduce<string[]>((acc: string[], listing: ProductListingDocument) => {
      if (!acc.includes(listing.integrationId)) {
        acc.push(listing.integrationId);
      }
      return acc;
    }, []);
    const connectionIds = listings.reduce<string[]>((acc: string[], listing: ProductListingDocument) => {
      if (!acc.includes(listing.connectionId)) {
        acc.push(listing.connectionId);
      }
      return acc;
    }, []);

    const integrations = await db
      .collection<{ _id: string; name: string; slug: string }>('integrations')
      .find({ _id: { $in: Array.from(integrationIds) } })
      .toArray();

    const connections = await db
      .collection<{ _id: string; name: string }>('integration_connections')
      .find({ _id: { $in: Array.from(connectionIds) } })
      .toArray();

    const integrationMap = new Map<string, { _id: string; name: string; slug: string }>(integrations.map((i: { _id: string; name: string; slug: string }) => [i._id, i]));
    const connectionMap = new Map<string, { _id: string; name: string }>(connections.map((c: { _id: string; name: string }) => [c._id, c]));

    return listings.map((listing: ProductListingDocument) => {
      const integration = integrationMap.get(listing.integrationId);
      const connection = connectionMap.get(listing.connectionId);
      return {
        ...toListingRecord(listing),
        integration: {
          id: integration?._id || listing.integrationId,
          name: integration?.name || 'Unknown',
          slug: integration?.slug || '',
        },
        connection: {
          id: connection?._id || listing.connectionId,
          name: connection?.name || 'Unknown',
        },
      } as ProductListingWithDetails;
    });
  },

  getListingById: async (id: string): Promise<ProductListingRecord | null> => {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
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
      externalListingId: input.externalListingId || null,
      inventoryId: input.inventoryId || null,
      listedAt: null,
      expiresAt: input.expiresAt ?? null,
      nextRelistAt: input.nextRelistAt ?? null,
      relistPolicy: input.relistPolicy ?? null,
      relistAttempts: input.relistAttempts ?? 0,
      lastRelistedAt: input.lastRelistedAt ?? null,
      lastStatusCheckAt: input.lastStatusCheckAt ?? null,
      marketplaceData: input.marketplaceData ?? null,
      failureReason: input.failureReason ?? null,
      exportHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<ProductListingDocument>(LISTINGS_COLLECTION).insertOne(doc);

    // Fetch integration and connection details
    const integration = await db
      .collection<{ _id: string; name: string; slug: string }>('integrations')
      .findOne({ _id: input.integrationId });

    const connection = await db
      .collection<{ _id: string; name: string }>('integration_connections')
      .findOne({ _id: input.connectionId });

    return {
      ...toListingRecord(doc),
      integration: {
        id: integration?._id || input.integrationId,
        name: integration?.name || 'Unknown',
        slug: integration?.slug || '',
      },
      connection: {
        id: connection?._id || input.connectionId,
        name: connection?.name || 'Unknown',
      },
    } as ProductListingWithDetails;
  },

  updateListingExternalId: async (id: string, externalListingId: string | null): Promise<void> => {
    const db = await getMongoDb();
    await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .updateOne({ _id: id }, { $set: { externalListingId, updatedAt: new Date() } });
  },

  updateListingStatus: async (id: string, status: string): Promise<void> => {
    const db = await getMongoDb();
    const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === 'active') {
      updateData['listedAt'] = new Date();
    }
    await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .updateOne({ _id: id }, { $set: updateData });
  },

  updateListing: async (id: string, input: Partial<CreateProductListingInput>): Promise<void> => {
    const db = await getMongoDb();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof input.integrationId === 'string') updateData['integrationId'] = input.integrationId;
    if (typeof input.connectionId === 'string') updateData['connectionId'] = input.connectionId;
    if (typeof input.status === 'string') updateData['status'] = input.status;
    if (typeof input.externalListingId === 'string' || input.externalListingId === null) {
      updateData['externalListingId'] = input.externalListingId ?? null;
    }
    if (typeof input.inventoryId === 'string' || input.inventoryId === null) {
      updateData['inventoryId'] = input.inventoryId ?? null;
    }
    if (input.expiresAt instanceof Date || input.expiresAt === null) updateData['expiresAt'] = input.expiresAt ?? null;
    if (input.nextRelistAt instanceof Date || input.nextRelistAt === null) {
      updateData['nextRelistAt'] = input.nextRelistAt ?? null;
    }
    if (typeof input.relistAttempts === 'number') updateData['relistAttempts'] = input.relistAttempts;
    if (input.lastRelistedAt instanceof Date || input.lastRelistedAt === null) {
      updateData['lastRelistedAt'] = input.lastRelistedAt ?? null;
    }
    if (input.lastStatusCheckAt instanceof Date || input.lastStatusCheckAt === null) {
      updateData['lastStatusCheckAt'] = input.lastStatusCheckAt ?? null;
    }
    if (typeof input.failureReason === 'string' || input.failureReason === null) {
      updateData['failureReason'] = input.failureReason ?? null;
    }
    if (input.relistPolicy !== undefined) updateData['relistPolicy'] = input.relistPolicy ?? null;
    if (input.marketplaceData !== undefined) updateData['marketplaceData'] = input.marketplaceData ?? null;

    await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .updateOne({ _id: id }, { $set: updateData });
  },

  updateListingInventoryId: async (id: string, inventoryId: string | null): Promise<void> => {
    const db = await getMongoDb();
    await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .updateOne(
        { _id: id },
        { $set: { inventoryId, updatedAt: new Date() } }
      );
  },

  appendExportHistory: async (id: string, event: ProductListingExportEvent): Promise<void> => {
    const db = await getMongoDb();
    await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .updateOne(
        { _id: id },
        {
          $push: { exportHistory: event },
          $set: { updatedAt: new Date() },
        }
      );
  },

  deleteListing: async (id: string): Promise<void> => {
    const db = await getMongoDb();
    await db.collection<ProductListingDocument>(LISTINGS_COLLECTION).deleteOne({ _id: id });
  },

  listingExists: async (productId: string, connectionId: string): Promise<boolean> => {
    const db = await getMongoDb();
    const existing = await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .findOne({ productId, connectionId });
    return existing !== null;
  },

  listAllListings: async (): Promise<Array<{ productId: string; status: string; integrationId: string }>> => {
    const db = await getMongoDb();
    return db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .find({}, { projection: { productId: 1, status: 1, integrationId: 1 } })
      .toArray()
      .then((docs: ProductListingDocument[]) =>
        docs.map((doc: ProductListingDocument) => ({
          productId: doc.productId,
          status: doc.status,
          integrationId: doc.integrationId,
        }))
      );
  },
};

export const getProductListingRepository = async (): Promise<ProductListingRepository> => {
  // Use the same provider as products since listings are product-related
  const provider = await getProductDataProvider();
  return provider === 'mongodb' ? mongoRepository : prismaRepository;
};

const isProviderConfigured = (provider: ListingProvider): boolean =>
  provider === 'mongodb'
    ? Boolean(process.env['MONGODB_URI'])
    : Boolean(process.env['DATABASE_URL']);

const repositoryByProvider = (provider: ListingProvider): ProductListingRepository =>
  provider === 'mongodb' ? mongoRepository : prismaRepository;

const resolveProviderOrder = async (): Promise<ListingProvider[]> => {
  const primary = await getProductDataProvider();
  const secondary: ListingProvider = primary === 'mongodb' ? 'prisma' : 'mongodb';
  const order: ListingProvider[] = [];
  if (isProviderConfigured(primary)) order.push(primary);
  if (secondary !== primary && isProviderConfigured(secondary)) order.push(secondary);
  if (order.length === 0) order.push(primary);
  return order;
};

const listingStatusRank = (status: string | null | undefined): number => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return -1;
  if (normalized === 'active' || normalized === 'success' || normalized === 'completed') return 5;
  if (normalized === 'running' || normalized === 'processing' || normalized === 'in_progress') return 4;
  if (normalized === 'pending' || normalized === 'queued' || normalized === 'queued_relist') return 3;
  if (normalized === 'failed' || normalized === 'error' || normalized === 'needs_login' || normalized === 'auth_required') return 1;
  if (normalized === 'removed') return 0;
  return 2;
};

const toEpochMs = (value: Date | string | null | undefined): number => {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
};

const mergeListingsByConnection = (
  entries: Array<{ provider: ListingProvider; repository: ProductListingRepository; listing: ProductListingWithDetails }>
): Array<{ provider: ListingProvider; repository: ProductListingRepository; listing: ProductListingWithDetails }> => {
  const byConnection = new Map<string, { provider: ListingProvider; repository: ProductListingRepository; listing: ProductListingWithDetails }>();

  for (const entry of entries) {
    const key = `${entry.listing.productId}::${entry.listing.connectionId}`;
    const current = byConnection.get(key);
    if (!current) {
      byConnection.set(key, entry);
      continue;
    }
    const currentRank = listingStatusRank(current.listing.status);
    const nextRank = listingStatusRank(entry.listing.status);
    if (nextRank > currentRank) {
      byConnection.set(key, entry);
      continue;
    }
    if (nextRank < currentRank) continue;

    const currentHasExternal = Boolean(current.listing.externalListingId);
    const nextHasExternal = Boolean(entry.listing.externalListingId);
    if (nextHasExternal && !currentHasExternal) {
      byConnection.set(key, entry);
      continue;
    }
    if (!nextHasExternal && currentHasExternal) continue;

    const currentUpdatedAt = toEpochMs(current.listing.updatedAt);
    const nextUpdatedAt = toEpochMs(entry.listing.updatedAt);
    if (nextUpdatedAt > currentUpdatedAt) {
      byConnection.set(key, entry);
    }
  }

  return Array.from(byConnection.values()).sort(
    (a, b) => toEpochMs(b.listing.updatedAt) - toEpochMs(a.listing.updatedAt)
  );
};

export const getProductListingRepositoriesForRead = async (): Promise<ProductListingRepositoryWithProvider[]> => {
  const providers = await resolveProviderOrder();
  return providers.map((provider) => ({
    provider,
    repository: repositoryByProvider(provider),
  }));
};

export const listProductListingsByProductIdAcrossProviders = async (
  productId: string
): Promise<ProductListingWithDetails[]> => {
  const repositories = await getProductListingRepositoriesForRead();
  const entries = await Promise.all(
    repositories.map(async ({ provider, repository }) => {
      let listings: ProductListingWithDetails[] = [];
      try {
        listings = await repository.getListingsByProductId(productId);
      } catch {
        listings = [];
      }
      return listings.map((listing) => ({ provider, repository, listing }));
    })
  );
  return mergeListingsByConnection(entries.flat()).map((entry) => entry.listing);
};

export const listAllProductListingsAcrossProviders = async (): Promise<
  Array<Pick<ProductListingRecord, 'productId' | 'status' | 'integrationId'>>
> => {
  const repositories = await getProductListingRepositoriesForRead();
  const all = await Promise.all(
    repositories.map(async ({ repository }) => {
      try {
        return await repository.listAllListings();
      } catch {
        return [] as Array<Pick<ProductListingRecord, 'productId' | 'status' | 'integrationId'>>;
      }
    })
  );
  return all.flat();
};

export const listingExistsAcrossProviders = async (
  productId: string,
  connectionId: string
): Promise<boolean> => {
  const repositories = await getProductListingRepositoriesForRead();
  for (const { repository } of repositories) {
    try {
      if (await repository.listingExists(productId, connectionId)) {
        return true;
      }
    } catch {
      // Continue checking other providers.
    }
  }
  return false;
};

export const findProductListingByIdAcrossProviders = async (
  listingId: string
): Promise<
  | {
      provider: ListingProvider;
      repository: ProductListingRepository;
      listing: ProductListingRecord;
    }
  | null
> => {
  const repositories = await getProductListingRepositoriesForRead();
  for (const { provider, repository } of repositories) {
    try {
      const listing = await repository.getListingById(listingId);
      if (listing) {
        return { provider, repository, listing };
      }
    } catch {
      // Continue checking other providers.
    }
  }
  return null;
};

export const findProductListingByProductAndConnectionAcrossProviders = async (
  productId: string,
  connectionId: string
): Promise<
  | {
      provider: ListingProvider;
      repository: ProductListingRepository;
      listing: ProductListingWithDetails;
    }
  | null
> => {
  const repositories = await getProductListingRepositoriesForRead();
  const matches: Array<{
    provider: ListingProvider;
    repository: ProductListingRepository;
    listing: ProductListingWithDetails;
  }> = [];

  for (const { provider, repository } of repositories) {
    let listings: ProductListingWithDetails[] = [];
    try {
      listings = await repository.getListingsByProductId(productId);
    } catch {
      listings = [];
    }
    for (const listing of listings) {
      if (listing.connectionId === connectionId) {
        matches.push({ provider, repository, listing });
      }
    }
  }

  const merged = mergeListingsByConnection(matches);
  return merged[0] ?? null;
};

export const getIntegrationsWithConnections = async (): Promise<IntegrationWithConnectionsBasic[]> => {
  const provider = await getIntegrationDataProvider();

  if (provider === 'mongodb') {
    const db = await getMongoDb();

    const integrations = await db
      .collection<{ _id: string; name: string; slug: string }>('integrations')
      .find({})
      .sort({ name: 1 })
      .toArray();

    const connections = await db
      .collection<{
        _id: string;
        name: string;
        integrationId: string;
        traderaDefaultTemplateId?: string | null;
        traderaDefaultDurationHours?: number | null;
        traderaAutoRelistEnabled?: boolean | null;
        traderaAutoRelistLeadMinutes?: number | null;
        traderaApiAppId?: number | null;
        traderaApiPublicKey?: string | null;
        traderaApiUserId?: number | null;
        traderaApiSandbox?: boolean | null;
      }>('integration_connections')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return integrations.map((integration: { _id: string; name: string; slug: string }) => ({
      id: integration._id,
      name: integration.name,
      slug: integration.slug,
      connections: connections
        .filter((c: { integrationId: string }) => c.integrationId === integration._id)
        .map((c: {
          _id: string;
          name: string;
          integrationId: string;
          traderaDefaultTemplateId?: string | null;
          traderaDefaultDurationHours?: number | null;
          traderaAutoRelistEnabled?: boolean | null;
          traderaAutoRelistLeadMinutes?: number | null;
          traderaApiAppId?: number | null;
          traderaApiPublicKey?: string | null;
          traderaApiUserId?: number | null;
          traderaApiSandbox?: boolean | null;
        }) => ({
          id: c._id,
          name: c.name,
          integrationId: c.integrationId,
          traderaDefaultTemplateId: c.traderaDefaultTemplateId ?? null,
          traderaDefaultDurationHours:
            c.traderaDefaultDurationHours ?? null,
          traderaAutoRelistEnabled:
            c.traderaAutoRelistEnabled ?? null,
          traderaAutoRelistLeadMinutes:
            c.traderaAutoRelistLeadMinutes ?? null,
          traderaApiAppId: c.traderaApiAppId ?? null,
          traderaApiPublicKey: c.traderaApiPublicKey ?? null,
          traderaApiUserId: c.traderaApiUserId ?? null,
          traderaApiSandbox: c.traderaApiSandbox ?? null,
        })),
    }));
  }

  // Prisma
  const integrations = await prisma.integration.findMany({
    include: {
      connections: {
        select: {
          id: true,
          name: true,
          integrationId: true,
          traderaDefaultTemplateId: true,
          traderaDefaultDurationHours: true,
          traderaAutoRelistEnabled: true,
          traderaAutoRelistLeadMinutes: true,
          traderaApiAppId: true,
          traderaApiPublicKey: true,
          traderaApiUserId: true,
          traderaApiSandbox: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return integrations.map((integration) => {
    const rawConnections = (integration as { connections?: unknown }).connections;
    const normalizedConnections = Array.isArray(rawConnections)
      ? rawConnections
      : rawConnections && typeof rawConnections === 'object'
        ? [rawConnections]
        : [];

    return {
      id: integration.id,
      name: integration.name,
      slug: integration.slug,
      connections: normalizedConnections
        .map((connection) => connection as {
          id?: string;
          name?: string;
          integrationId?: string;
          traderaDefaultTemplateId?: string | null;
          traderaDefaultDurationHours?: number | null;
          traderaAutoRelistEnabled?: boolean | null;
          traderaAutoRelistLeadMinutes?: number | null;
          traderaApiAppId?: number | null;
          traderaApiPublicKey?: string | null;
          traderaApiUserId?: number | null;
          traderaApiSandbox?: boolean | null;
        })
        .filter((connection): connection is {
          id: string;
          name: string;
          integrationId: string;
          traderaDefaultTemplateId?: string | null;
          traderaDefaultDurationHours?: number | null;
          traderaAutoRelistEnabled?: boolean | null;
          traderaAutoRelistLeadMinutes?: number | null;
          traderaApiAppId?: number | null;
          traderaApiPublicKey?: string | null;
          traderaApiUserId?: number | null;
          traderaApiSandbox?: boolean | null;
        } =>
          Boolean(connection.id && connection.name)
        )
        .map((connection) => ({
          id: connection.id,
          name: connection.name,
          integrationId: connection.integrationId ?? integration.id,
          traderaDefaultTemplateId:
            connection.traderaDefaultTemplateId ?? null,
          traderaDefaultDurationHours:
            connection.traderaDefaultDurationHours ?? null,
          traderaAutoRelistEnabled:
            connection.traderaAutoRelistEnabled ?? null,
          traderaAutoRelistLeadMinutes:
            connection.traderaAutoRelistLeadMinutes ?? null,
          traderaApiAppId: connection.traderaApiAppId ?? null,
          traderaApiPublicKey: connection.traderaApiPublicKey ?? null,
          traderaApiUserId: connection.traderaApiUserId ?? null,
          traderaApiSandbox: connection.traderaApiSandbox ?? null,
        })),
    };
  }) as IntegrationWithConnectionsBasic[];
};
