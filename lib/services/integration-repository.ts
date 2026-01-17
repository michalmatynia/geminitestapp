import { randomUUID } from "crypto";
import type { WithId } from "mongodb";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getIntegrationDataProvider } from "@/lib/services/integration-provider";

export type IntegrationRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationConnectionRecord = {
  id: string;
  integrationId: string;
  name: string;
  username: string;
  password: string;
  playwrightStorageState?: string | null;
  playwrightStorageStateUpdatedAt?: Date | null;
  playwrightHeadless?: boolean | null;
  playwrightSlowMo?: number | null;
  playwrightTimeout?: number | null;
  playwrightNavigationTimeout?: number | null;
  playwrightHumanizeMouse?: boolean | null;
  playwrightMouseJitter?: number | null;
  playwrightClickDelayMin?: number | null;
  playwrightClickDelayMax?: number | null;
  playwrightInputDelayMin?: number | null;
  playwrightInputDelayMax?: number | null;
  playwrightActionDelayMin?: number | null;
  playwrightActionDelayMax?: number | null;
  playwrightProxyEnabled?: boolean | null;
  playwrightProxyServer?: string | null;
  playwrightProxyUsername?: string | null;
  playwrightProxyPassword?: string | null;
  playwrightEmulateDevice?: boolean | null;
  playwrightDeviceName?: string | null;
  allegroAccessToken?: string | null;
  allegroRefreshToken?: string | null;
  allegroTokenType?: string | null;
  allegroScope?: string | null;
  allegroExpiresAt?: Date | null;
  allegroTokenUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationRepository = {
  listIntegrations: () => Promise<IntegrationRecord[]>;
  upsertIntegration: (input: { name: string; slug: string }) => Promise<IntegrationRecord>;
  getIntegrationById: (id: string) => Promise<IntegrationRecord | null>;
  listConnections: (integrationId: string) => Promise<IntegrationConnectionRecord[]>;
  getConnectionById: (id: string) => Promise<IntegrationConnectionRecord | null>;
  getConnectionByIdAndIntegration: (
    id: string,
    integrationId: string
  ) => Promise<IntegrationConnectionRecord | null>;
  createConnection: (
    integrationId: string,
    input: { name: string; username: string; password: string }
  ) => Promise<IntegrationConnectionRecord>;
  updateConnection: (
    id: string,
    input: Partial<IntegrationConnectionRecord>
  ) => Promise<IntegrationConnectionRecord>;
  deleteConnection: (id: string) => Promise<void>;
};

const CONNECTION_DEFAULTS = {
  playwrightHeadless: true,
  playwrightSlowMo: 50,
  playwrightTimeout: 15000,
  playwrightNavigationTimeout: 30000,
  playwrightHumanizeMouse: false,
  playwrightMouseJitter: 6,
  playwrightClickDelayMin: 30,
  playwrightClickDelayMax: 120,
  playwrightInputDelayMin: 20,
  playwrightInputDelayMax: 120,
  playwrightActionDelayMin: 200,
  playwrightActionDelayMax: 900,
  playwrightProxyEnabled: false,
  playwrightProxyServer: null,
  playwrightProxyUsername: null,
  playwrightProxyPassword: null,
  playwrightEmulateDevice: false,
  playwrightDeviceName: "Desktop Chrome",
} as const;

const INTEGRATIONS_COLLECTION = "integrations";
const CONNECTIONS_COLLECTION = "integration_connections";

type IntegrationDocument = {
  _id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

type IntegrationConnectionDocument = {
  _id: string;
  integrationId: string;
  name: string;
  username: string;
  password: string;
  playwrightStorageState?: string | null;
  playwrightStorageStateUpdatedAt?: Date | null;
  playwrightHeadless?: boolean | null;
  playwrightSlowMo?: number | null;
  playwrightTimeout?: number | null;
  playwrightNavigationTimeout?: number | null;
  playwrightHumanizeMouse?: boolean | null;
  playwrightMouseJitter?: number | null;
  playwrightClickDelayMin?: number | null;
  playwrightClickDelayMax?: number | null;
  playwrightInputDelayMin?: number | null;
  playwrightInputDelayMax?: number | null;
  playwrightActionDelayMin?: number | null;
  playwrightActionDelayMax?: number | null;
  playwrightProxyEnabled?: boolean | null;
  playwrightProxyServer?: string | null;
  playwrightProxyUsername?: string | null;
  playwrightProxyPassword?: string | null;
  playwrightEmulateDevice?: boolean | null;
  playwrightDeviceName?: string | null;
  allegroAccessToken?: string | null;
  allegroRefreshToken?: string | null;
  allegroTokenType?: string | null;
  allegroScope?: string | null;
  allegroExpiresAt?: Date | null;
  allegroTokenUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const toIntegrationRecord = (doc: WithId<IntegrationDocument>): IntegrationRecord => ({
  id: doc._id.toString(),
  name: doc.name,
  slug: doc.slug,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toConnectionRecord = (
  doc: WithId<IntegrationConnectionDocument>
): IntegrationConnectionRecord => ({
  id: doc._id.toString(),
  integrationId: doc.integrationId,
  name: doc.name,
  username: doc.username,
  password: doc.password,
  playwrightStorageState: doc.playwrightStorageState ?? null,
  playwrightStorageStateUpdatedAt: doc.playwrightStorageStateUpdatedAt ?? null,
  playwrightHeadless: doc.playwrightHeadless ?? CONNECTION_DEFAULTS.playwrightHeadless,
  playwrightSlowMo: doc.playwrightSlowMo ?? CONNECTION_DEFAULTS.playwrightSlowMo,
  playwrightTimeout: doc.playwrightTimeout ?? CONNECTION_DEFAULTS.playwrightTimeout,
  playwrightNavigationTimeout:
    doc.playwrightNavigationTimeout ??
    CONNECTION_DEFAULTS.playwrightNavigationTimeout,
  playwrightHumanizeMouse:
    doc.playwrightHumanizeMouse ?? CONNECTION_DEFAULTS.playwrightHumanizeMouse,
  playwrightMouseJitter:
    doc.playwrightMouseJitter ?? CONNECTION_DEFAULTS.playwrightMouseJitter,
  playwrightClickDelayMin:
    doc.playwrightClickDelayMin ?? CONNECTION_DEFAULTS.playwrightClickDelayMin,
  playwrightClickDelayMax:
    doc.playwrightClickDelayMax ?? CONNECTION_DEFAULTS.playwrightClickDelayMax,
  playwrightInputDelayMin:
    doc.playwrightInputDelayMin ?? CONNECTION_DEFAULTS.playwrightInputDelayMin,
  playwrightInputDelayMax:
    doc.playwrightInputDelayMax ?? CONNECTION_DEFAULTS.playwrightInputDelayMax,
  playwrightActionDelayMin:
    doc.playwrightActionDelayMin ?? CONNECTION_DEFAULTS.playwrightActionDelayMin,
  playwrightActionDelayMax:
    doc.playwrightActionDelayMax ?? CONNECTION_DEFAULTS.playwrightActionDelayMax,
  playwrightProxyEnabled:
    doc.playwrightProxyEnabled ?? CONNECTION_DEFAULTS.playwrightProxyEnabled,
  playwrightProxyServer:
    doc.playwrightProxyServer ?? CONNECTION_DEFAULTS.playwrightProxyServer,
  playwrightProxyUsername:
    doc.playwrightProxyUsername ?? CONNECTION_DEFAULTS.playwrightProxyUsername,
  playwrightProxyPassword: doc.playwrightProxyPassword ?? null,
  playwrightEmulateDevice:
    doc.playwrightEmulateDevice ?? CONNECTION_DEFAULTS.playwrightEmulateDevice,
  playwrightDeviceName:
    doc.playwrightDeviceName ?? CONNECTION_DEFAULTS.playwrightDeviceName,
  allegroAccessToken: doc.allegroAccessToken ?? null,
  allegroRefreshToken: doc.allegroRefreshToken ?? null,
  allegroTokenType: doc.allegroTokenType ?? null,
  allegroScope: doc.allegroScope ?? null,
  allegroExpiresAt: doc.allegroExpiresAt ?? null,
  allegroTokenUpdatedAt: doc.allegroTokenUpdatedAt ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const prismaRepository: IntegrationRepository = {
  listIntegrations: async () => {
    const integrations = await prisma.integration.findMany({
      orderBy: { createdAt: "desc" },
    });
    return integrations;
  },
  upsertIntegration: async (input) => {
    const integration = await prisma.integration.upsert({
      where: { slug: input.slug },
      update: { name: input.name },
      create: input,
    });
    return integration;
  },
  getIntegrationById: async (id) => {
    return prisma.integration.findUnique({ where: { id } });
  },
  listConnections: async (integrationId) => {
    return prisma.integrationConnection.findMany({
      where: { integrationId },
      orderBy: { createdAt: "desc" },
    });
  },
  getConnectionById: async (id) => {
    return prisma.integrationConnection.findUnique({ where: { id } });
  },
  getConnectionByIdAndIntegration: async (id, integrationId) => {
    return prisma.integrationConnection.findFirst({
      where: { id, integrationId },
    });
  },
  createConnection: async (integrationId, input) => {
    return prisma.integrationConnection.create({
      data: {
        integrationId,
        name: input.name,
        username: input.username,
        password: input.password,
      },
    });
  },
  updateConnection: async (id, input) => {
    return prisma.integrationConnection.update({
      where: { id },
      data: input,
    });
  },
  deleteConnection: async (id) => {
    await prisma.integrationConnection.delete({ where: { id } });
  },
};

const mongoRepository: IntegrationRepository = {
  listIntegrations: async () => {
    const db = await getMongoDb();
    const docs = await db
      .collection<IntegrationDocument>(INTEGRATIONS_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toIntegrationRecord);
  },
  upsertIntegration: async (input) => {
    const db = await getMongoDb();
    const now = new Date();
    const existing = await db
      .collection<IntegrationDocument>(INTEGRATIONS_COLLECTION)
      .findOne({ slug: input.slug });

    if (existing) {
      await db.collection<IntegrationDocument>(INTEGRATIONS_COLLECTION).updateOne(
        { _id: existing._id },
        { $set: { name: input.name, updatedAt: now } }
      );
      return {
        id: existing._id.toString(),
        name: input.name,
        slug: existing.slug,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    }

    const id = randomUUID();
    const doc: IntegrationDocument = {
      _id: id,
      name: input.name,
      slug: input.slug,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<IntegrationDocument>(INTEGRATIONS_COLLECTION).insertOne(doc);
    return toIntegrationRecord(doc);
  },
  getIntegrationById: async (id) => {
    const db = await getMongoDb();
    const doc = await db
      .collection<IntegrationDocument>(INTEGRATIONS_COLLECTION)
      .findOne({ _id: id });
    return doc ? toIntegrationRecord(doc) : null;
  },
  listConnections: async (integrationId) => {
    const db = await getMongoDb();
    const docs = await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .find({ integrationId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toConnectionRecord);
  },
  getConnectionById: async (id) => {
    const db = await getMongoDb();
    const doc = await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .findOne({ _id: id });
    return doc ? toConnectionRecord(doc) : null;
  },
  getConnectionByIdAndIntegration: async (id, integrationId) => {
    const db = await getMongoDb();
    const doc = await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .findOne({ _id: id, integrationId });
    return doc ? toConnectionRecord(doc) : null;
  },
  createConnection: async (integrationId, input) => {
    const db = await getMongoDb();
    const now = new Date();
    const existing = await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .findOne({ integrationId });
    if (existing) {
      throw new Error("Connection already exists");
    }
    const id = randomUUID();
    const doc: IntegrationConnectionDocument = {
      _id: id,
      integrationId,
      name: input.name,
      username: input.username,
      password: input.password,
      ...CONNECTION_DEFAULTS,
      createdAt: now,
      updatedAt: now,
    };
    await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .insertOne(doc);
    return toConnectionRecord(doc);
  },
  updateConnection: async (id, input) => {
    const db = await getMongoDb();
    const now = new Date();
    const { id: _ignoredId, integrationId: _ignoredIntegrationId, ...rest } =
      input;
    const update: Partial<IntegrationConnectionDocument> = {
      ...rest,
      updatedAt: now,
    };
    const result = await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .findOneAndUpdate({ _id: id }, { $set: update }, { returnDocument: "after" });
    if (!result.value) {
      throw new Error("Connection not found");
    }
    return toConnectionRecord(result.value);
  },
  deleteConnection: async (id) => {
    const db = await getMongoDb();
    await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .deleteOne({ _id: id });
  },
};

export const getIntegrationRepository = async (): Promise<IntegrationRepository> => {
  const provider = await getIntegrationDataProvider();
  return provider === "mongodb" ? mongoRepository : prismaRepository;
};
