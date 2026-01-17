import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getIntegrationDataProvider } from "@/lib/services/integration-provider";

export type ProductListingRecord = {
  id: string;
  productId: string;
  integrationId: string;
  connectionId: string;
  externalListingId: string | null;
  status: string;
  listedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductListingWithDetails = ProductListingRecord & {
  integration: {
    id: string;
    name: string;
    slug: string;
  };
  connection: {
    id: string;
    name: string;
  };
};

export type CreateProductListingInput = {
  productId: string;
  integrationId: string;
  connectionId: string;
};

export type ProductListingRepository = {
  getListingsByProductId: (productId: string) => Promise<ProductListingWithDetails[]>;
  getListingById: (id: string) => Promise<ProductListingRecord | null>;
  createListing: (input: CreateProductListingInput) => Promise<ProductListingWithDetails>;
  deleteListing: (id: string) => Promise<void>;
  listingExists: (productId: string, connectionId: string) => Promise<boolean>;
  listAllListings: () => Promise<Array<Pick<ProductListingRecord, "productId">>>;
};

const LISTINGS_COLLECTION = "product_listings";

type ProductListingDocument = {
  _id: string;
  productId: string;
  integrationId: string;
  connectionId: string;
  externalListingId: string | null;
  status: string;
  listedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const toListingRecord = (doc: ProductListingDocument): ProductListingRecord => ({
  id: doc._id,
  productId: doc.productId,
  integrationId: doc.integrationId,
  connectionId: doc.connectionId,
  externalListingId: doc.externalListingId,
  status: doc.status,
  listedAt: doc.listedAt,
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
    return listings;
  },

  getListingById: async (id) => {
    return prisma.productListing.findUnique({ where: { id } });
  },

  createListing: async (input) => {
    const listing = await prisma.productListing.create({
      data: {
        productId: input.productId,
        integrationId: input.integrationId,
        connectionId: input.connectionId,
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
    return listing;
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
      select: { productId: true },
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
    const integrationIds = [...new Set(listings.map((l) => l.integrationId))];
    const connectionIds = [...new Set(listings.map((l) => l.connectionId))];

    const integrations = await db
      .collection<{ _id: string; name: string; slug: string }>("integrations")
      .find({ _id: { $in: integrationIds } })
      .toArray();

    const connections = await db
      .collection<{ _id: string; name: string }>("integration_connections")
      .find({ _id: { $in: connectionIds } })
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
      externalListingId: null,
      status: "pending",
      listedAt: null,
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
      .find({}, { projection: { productId: 1 } })
      .toArray()
      .then((docs) => docs.map((doc) => ({ productId: doc.productId })));
  },
};

export const getProductListingRepository = async (): Promise<ProductListingRepository> => {
  // Use the same provider as products since listings are product-related
  const provider = await getProductDataProvider();
  return provider === "mongodb" ? mongoRepository : prismaRepository;
};

// Helper to get integrations with connections (supports both providers)
export type IntegrationWithConnectionsBasic = {
  id: string;
  name: string;
  slug: string;
  connections: { id: string; name: string; integrationId: string }[];
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
