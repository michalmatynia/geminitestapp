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
  exportHistory?: ProductListingExportEvent[] | null;
  createdAt: Date;
  updatedAt: Date;
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
      exportHistory: listing.exportHistory as unknown as ProductListingExportEvent[] | null,
    })) as unknown as ProductListingWithDetails[];
  },

  getListingById: async (id: string): Promise<ProductListingRecord | null> => {
    const listing = await prisma.productListing.findUnique({ where: { id } });
    if (!listing) return null;
    return {
      ...listing,
      exportHistory: listing.exportHistory as unknown as ProductListingExportEvent[] | null,
    };
  },

  createListing: async (input: CreateProductListingInput): Promise<ProductListingWithDetails> => {
    const listing = await prisma.productListing.create({
      data: {
        productId: input.productId,
        integrationId: input.integrationId,
        connectionId: input.connectionId,
        externalListingId: input.externalListingId || null,
        inventoryId: input.inventoryId || null,
        status: 'pending',
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
      externalListingId: input.externalListingId || null,
      inventoryId: input.inventoryId || null,
      status: 'pending',
      listedAt: null,
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
      updateData.listedAt = new Date();
    }
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
    ? Boolean(process.env["MONGODB_URI"])
    : Boolean(process.env["DATABASE_URL"]);

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
  if (normalized === 'pending' || normalized === 'queued') return 3;
  if (normalized === 'failed' || normalized === 'error') return 1;
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
      .collection<{ _id: string; name: string; integrationId: string }>('integration_connections')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return integrations.map((integration: { _id: string; name: string; slug: string }) => ({
      id: integration._id,
      name: integration.name,
      slug: integration.slug,
      connections: connections
        .filter((c: { integrationId: string }) => c.integrationId === integration._id)
        .map((c: { _id: string; name: string; integrationId: string }) => ({
          id: c._id,
          name: c.name,
          integrationId: c.integrationId,
        })),
    }));
  }

  // Prisma
  const integrations = await prisma.integration.findMany({
    include: {
      connections: {
        select: { id: true, name: true, integrationId: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return integrations.map((integration) => ({
    ...integration,
    connections: integration.connections ? [integration.connections] : [],
  })) as IntegrationWithConnectionsBasic[];
};
