import "server-only";

import { randomUUID } from "crypto";
import prisma from "@/shared/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getProductDataProvider } from "@/features/products/server";
import { getIntegrationDataProvider } from "@/features/integrations/services/integration-provider";
import type {
  ProductListingRecord,
  ProductListingExportEvent,
  ProductListingWithDetails,
  CreateProductListingInput,
  ProductListingRepository,
  IntegrationWithConnectionsBasic,
} from "@/features/integrations/types/listings";

export type {
  ProductListingRecord,
  ProductListingExportEvent,
  ProductListingWithDetails,
  CreateProductListingInput,
  ProductListingRepository,
  IntegrationWithConnectionsBasic,
};

const LISTINGS_COLLECTION = "product_listings";

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

const prismaRepository: ProductListingRepository = {
  getListingsByProductId: async (productId) => {
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
      orderBy: { createdAt: "desc" },
    });
    return listings.map((listing) => ({
      ...listing,
      exportHistory: listing.exportHistory as ProductListingExportEvent[] | null,
    }));
  },

  getListingById: async (id) => {
    const listing = await prisma.productListing.findUnique({ where: { id } });
    if (!listing) return null;
    return {
      ...listing,
      exportHistory: listing.exportHistory as ProductListingExportEvent[] | null,
    };
  },

  createListing: async (input) => {
    const listing = await prisma.productListing.create({
      data: {
        productId: input.productId,
        integrationId: input.integrationId,
        connectionId: input.connectionId,
        externalListingId: input.externalListingId || null,
        inventoryId: input.inventoryId || null,
        status: "pending",
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
      exportHistory: listing.exportHistory as ProductListingExportEvent[] | null,
    };
  },

  updateListingExternalId: async (id, externalListingId) => {
    await prisma.productListing.update({
      where: { id },
      data: { externalListingId },
    });
  },

  updateListingStatus: async (id, status) => {
    const data: { status: string; listedAt?: Date } = { status };
    if (status === "active") {
      data.listedAt = new Date();
    }
    await prisma.productListing.update({
      where: { id },
      data,
    });
  },

  updateListingInventoryId: async (id, inventoryId) => {
    await prisma.productListing.update({
      where: { id },
      data: { inventoryId },
    });
  },

  appendExportHistory: async (id, event) => {
    const listing = await prisma.productListing.findUnique({
      where: { id },
      select: { exportHistory: true },
    });
    const current = Array.isArray(listing?.exportHistory)
      ? listing?.exportHistory
      : [];
    await prisma.productListing.update({
      where: { id },
      data: { exportHistory: [...current, event] as Prisma.InputJsonValue[] },
    });
  },

  deleteListing: async (id) => {
    await prisma.productListing.delete({ where: { id } });
  },

  listingExists: async (productId, connectionId) => {
    const existing = await prisma.productListing.findUnique({
      where: { productId_connectionId: { productId, connectionId } },
    });
    return existing !== null;
  },

  listAllListings: async () => {
    return prisma.productListing.findMany({
      select: { productId: true, status: true },
    });
  },
};

const mongoRepository: ProductListingRepository = {
  getListingsByProductId: async (productId) => {
    const db = await getMongoDb();

    // Get listings
    const listings = await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .find({ productId })
      .sort({ createdAt: -1 })
      .toArray();

    // Get integrations and connections for enrichment
    const integrationIds = listings.reduce<string[]>((acc, listing) => {
      if (!acc.includes(listing.integrationId)) {
        acc.push(listing.integrationId);
      }
      return acc;
    }, []);
    const connectionIds = listings.reduce<string[]>((acc, listing) => {
      if (!acc.includes(listing.connectionId)) {
        acc.push(listing.connectionId);
      }
      return acc;
    }, []);

    const integrations = await db
      .collection<{ _id: string; name: string; slug: string }>("integrations")
      .find({ _id: { $in: Array.from(integrationIds) } })
      .toArray();

    const connections = await db
      .collection<{ _id: string; name: string }>("integration_connections")
      .find({ _id: { $in: Array.from(connectionIds) } })
      .toArray();

    const integrationMap = new Map(integrations.map((i) => [i._id, i]));
    const connectionMap = new Map(connections.map((c) => [c._id, c]));

    return listings.map((listing) => {
      const integration = integrationMap.get(listing.integrationId);
      const connection = connectionMap.get(listing.connectionId);
      return {
        ...toListingRecord(listing),
        integration: {
          id: integration?._id || listing.integrationId,
          name: integration?.name || "Unknown",
          slug: integration?.slug || "",
        },
        connection: {
          id: connection?._id || listing.connectionId,
          name: connection?.name || "Unknown",
        },
      };
    });
  },

  getListingById: async (id) => {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .findOne({ _id: id });
    return doc ? toListingRecord(doc) : null;
  },

  createListing: async (input) => {
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
      status: "pending",
      listedAt: null,
      exportHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<ProductListingDocument>(LISTINGS_COLLECTION).insertOne(doc);

    // Fetch integration and connection details
    const integration = await db
      .collection<{ _id: string; name: string; slug: string }>("integrations")
      .findOne({ _id: input.integrationId });

    const connection = await db
      .collection<{ _id: string; name: string }>("integration_connections")
      .findOne({ _id: input.connectionId });

    return {
      ...toListingRecord(doc),
      integration: {
        id: integration?._id || input.integrationId,
        name: integration?.name || "Unknown",
        slug: integration?.slug || "",
      },
      connection: {
        id: connection?._id || input.connectionId,
        name: connection?.name || "Unknown",
      },
    };
  },

  updateListingExternalId: async (id, externalListingId) => {
    const db = await getMongoDb();
    await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .updateOne({ _id: id }, { $set: { externalListingId, updatedAt: new Date() } });
  },

  updateListingStatus: async (id, status) => {
    const db = await getMongoDb();
    const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "active") {
      updateData.listedAt = new Date();
    }
    await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .updateOne({ _id: id }, { $set: updateData });
  },

  updateListingInventoryId: async (id, inventoryId) => {
    const db = await getMongoDb();
    await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .updateOne(
        { _id: id },
        { $set: { inventoryId, updatedAt: new Date() } }
      );
  },

  appendExportHistory: async (id, event) => {
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

  deleteListing: async (id) => {
    const db = await getMongoDb();
    await db.collection<ProductListingDocument>(LISTINGS_COLLECTION).deleteOne({ _id: id });
  },

  listingExists: async (productId, connectionId) => {
    const db = await getMongoDb();
    const existing = await db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .findOne({ productId, connectionId });
    return existing !== null;
  },

  listAllListings: async () => {
    const db = await getMongoDb();
    return db
      .collection<ProductListingDocument>(LISTINGS_COLLECTION)
      .find({}, { projection: { productId: 1, status: 1 } })
      .toArray()
      .then((docs) =>
        docs.map((doc) => ({ productId: doc.productId, status: doc.status }))
      );
  },
};

export const getProductListingRepository = async (): Promise<ProductListingRepository> => {
  // Use the same provider as products since listings are product-related
  const provider = await getProductDataProvider();
  return provider === "mongodb" ? mongoRepository : prismaRepository;
};

export const getIntegrationsWithConnections = async (): Promise<IntegrationWithConnectionsBasic[]> => {
  const provider = await getIntegrationDataProvider();

  if (provider === "mongodb") {
    const db = await getMongoDb();

    const integrations = await db
      .collection<{ _id: string; name: string; slug: string }>("integrations")
      .find({})
      .sort({ name: 1 })
      .toArray();

    const connections = await db
      .collection<{ _id: string; name: string; integrationId: string }>("integration_connections")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return integrations.map((integration) => ({
      id: integration._id,
      name: integration.name,
      slug: integration.slug,
      connections: connections
        .filter((c) => c.integrationId === integration._id)
        .map((c) => ({
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
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return integrations;
};
