import { Prisma } from '@prisma/client';
import { ObjectId, type WithId } from 'mongodb';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import { 
  IntegrationRecord, 
  IntegrationConnectionRecord, 
  IntegrationRepository,
  IntegrationWithConnections
} from '../types/integrations';

const INTEGRATION_COLLECTION = 'integrations';
const INTEGRATION_CONNECTION_COLLECTION = 'integration_connections';

/**
 * MongoDB Documents
 */
type IntegrationDocument = {
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date | null;
};

type IntegrationConnectionDocument = {
  integrationId: string;
  name: string;
  username: string;
  password: string;
  playwrightStorageState?: string | null;
  playwrightStorageStateUpdatedAt?: Date | null;
  playwrightHeadless?: boolean;
  playwrightSlowMo?: number;
  playwrightTimeout?: number;
  playwrightNavigationTimeout?: number;
  playwrightHumanizeMouse?: boolean;
  playwrightMouseJitter?: number;
  playwrightClickDelayMin?: number;
  playwrightClickDelayMax?: number;
  playwrightInputDelayMin?: number;
  playwrightInputDelayMax?: number;
  playwrightActionDelayMin?: number;
  playwrightActionDelayMax?: number;
  playwrightProxyEnabled?: boolean;
  playwrightProxyServer?: string;
  playwrightProxyUsername?: string;
  playwrightProxyPassword?: string | null;
  playwrightEmulateDevice?: boolean;
  playwrightDeviceName?: string;
  playwrightPersonaId?: string | null;
  allegroAccessToken?: string | null;
  allegroRefreshToken?: string | null;
  allegroTokenType?: string | null;
  allegroScope?: string | null;
  allegroExpiresAt?: Date | null;
  allegroTokenUpdatedAt?: Date | null;
  allegroUseSandbox?: boolean;
  baseApiToken?: string | null;
  baseTokenUpdatedAt?: Date | null;
  baseLastInventoryId?: string | null;
  traderaDefaultTemplateId?: string;
  traderaDefaultDurationHours?: number;
  traderaAutoRelistEnabled?: boolean;
  traderaAutoRelistLeadMinutes?: number;
  traderaApiAppId?: number;
  traderaApiAppKey?: string;
  traderaApiPublicKey?: string;
  traderaApiUserId?: number;
  traderaApiToken?: string;
  traderaApiTokenUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

const CONNECTION_DEFAULTS = {
  playwrightHeadless: true,
  playwrightSlowMo: 0,
  playwrightTimeout: 30000,
  playwrightNavigationTimeout: 30000,
  playwrightHumanizeMouse: true,
  playwrightMouseJitter: 5,
  playwrightClickDelayMin: 50,
  playwrightClickDelayMax: 150,
  playwrightInputDelayMin: 20,
  playwrightInputDelayMax: 80,
  playwrightActionDelayMin: 500,
  playwrightActionDelayMax: 1500,
  playwrightProxyEnabled: false,
  playwrightProxyServer: '',
  playwrightProxyUsername: '',
  playwrightEmulateDevice: false,
  playwrightDeviceName: 'Desktop Chrome',
  playwrightPersonaId: null,
  traderaDefaultTemplateId: '',
  traderaDefaultDurationHours: 72,
  traderaAutoRelistEnabled: true,
  traderaAutoRelistLeadMinutes: 180,
  traderaApiAppId: 0,
  traderaApiAppKey: '',
  traderaApiPublicKey: '',
  traderaApiUserId: 0,
  traderaApiToken: '',
  traderaApiTokenUpdatedAt: null,
};

const toIntegrationRecord = (doc: WithId<IntegrationDocument> | Prisma.IntegrationGetPayload<Record<string, never>>): IntegrationRecord => ({
  id: 'id' in doc ? doc.id : doc._id.toString(),
  name: doc.name,
  slug: doc.slug,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
});

const toConnectionRecord = (
  doc: WithId<IntegrationConnectionDocument> | Prisma.IntegrationConnectionGetPayload<Record<string, never>>
): IntegrationConnectionRecord => {
  const isPrisma = 'id' in doc;
  return {
    id: isPrisma ? doc.id : (doc)._id.toString(),
    integrationId: doc.integrationId,
    name: doc.name,
    username: doc.username,
    password: doc.password,
    playwrightStorageState: doc.playwrightStorageState ?? null,
    playwrightStorageStateUpdatedAt: doc.playwrightStorageStateUpdatedAt
      ? doc.playwrightStorageStateUpdatedAt.toISOString()
      : null,
    playwrightHeadless:
      doc.playwrightHeadless ?? CONNECTION_DEFAULTS.playwrightHeadless,
    playwrightSlowMo:
      doc.playwrightSlowMo ?? CONNECTION_DEFAULTS.playwrightSlowMo,
    playwrightTimeout:
      doc.playwrightTimeout ?? CONNECTION_DEFAULTS.playwrightTimeout,
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
    playwrightPersonaId:
      doc.playwrightPersonaId ?? CONNECTION_DEFAULTS.playwrightPersonaId,
    allegroAccessToken: doc.allegroAccessToken ?? null,
    allegroRefreshToken: doc.allegroRefreshToken ?? null,
    allegroTokenType: doc.allegroTokenType ?? null,
    allegroScope: doc.allegroScope ?? null,
    allegroExpiresAt: doc.allegroExpiresAt
      ? doc.allegroExpiresAt.toISOString()
      : null,
    allegroTokenUpdatedAt: doc.allegroTokenUpdatedAt
      ? doc.allegroTokenUpdatedAt.toISOString()
      : null,
    allegroUseSandbox: doc.allegroUseSandbox ?? false,
    baseApiToken: doc.baseApiToken ?? null,
    baseTokenUpdatedAt: doc.baseTokenUpdatedAt
      ? doc.baseTokenUpdatedAt.toISOString()
      : null,
    baseLastInventoryId: doc.baseLastInventoryId ?? null,
    traderaDefaultTemplateId:
      doc.traderaDefaultTemplateId ?? CONNECTION_DEFAULTS.traderaDefaultTemplateId,
    traderaDefaultDurationHours:
      doc.traderaDefaultDurationHours ??
      CONNECTION_DEFAULTS.traderaDefaultDurationHours,
    traderaAutoRelistEnabled:
      doc.traderaAutoRelistEnabled ??
      CONNECTION_DEFAULTS.traderaAutoRelistEnabled,
    traderaAutoRelistLeadMinutes:
      doc.traderaAutoRelistLeadMinutes ??
      CONNECTION_DEFAULTS.traderaAutoRelistLeadMinutes,
    traderaApiAppId: doc.traderaApiAppId ?? CONNECTION_DEFAULTS.traderaApiAppId,
    traderaApiAppKey:
      doc.traderaApiAppKey ?? CONNECTION_DEFAULTS.traderaApiAppKey,
    traderaApiPublicKey:
      doc.traderaApiPublicKey ?? CONNECTION_DEFAULTS.traderaApiPublicKey,
    traderaApiUserId:
      doc.traderaApiUserId ?? CONNECTION_DEFAULTS.traderaApiUserId,
    traderaApiToken: doc.traderaApiToken ?? CONNECTION_DEFAULTS.traderaApiToken,
    traderaApiTokenUpdatedAt: doc.traderaApiTokenUpdatedAt
      ? doc.traderaApiTokenUpdatedAt.toISOString()
      : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
};

export async function getIntegrationRepository(): Promise<IntegrationRepository> {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    return getMongoIntegrationRepository();
  }
  return getPrismaIntegrationRepository();
}

export async function getIntegrationsWithConnections(): Promise<IntegrationWithConnections[]> {
  const repo = await getIntegrationRepository();
  const integrations = await repo.listIntegrations();
  
  return Promise.all(
    integrations.map(async (integration) => {
      const connections = await repo.listConnections(integration.id);
      return {
        ...integration,
        connections,
      } as IntegrationWithConnections;
    })
  );
}

export function getPrismaIntegrationRepository(): IntegrationRepository {
  return {
    async listIntegrations(): Promise<IntegrationRecord[]> {
      const docs = await prisma.integration.findMany({
        orderBy: { name: 'asc' },
      });
      return docs.map(toIntegrationRecord);
    },

    async upsertIntegration(input: {
      name: string;
      slug: string;
    }): Promise<IntegrationRecord> {
      const doc = await prisma.integration.upsert({
        where: { slug: input.slug },
        update: { name: input.name },
        create: { name: input.name, slug: input.slug },
      });
      return toIntegrationRecord(doc);
    },

    async getIntegrationById(id: string): Promise<IntegrationRecord | null> {
      const doc = await prisma.integration.findUnique({
        where: { id },
      });
      return doc ? toIntegrationRecord(doc) : null;
    },

    async listConnections(
      integrationId: string
    ): Promise<IntegrationConnectionRecord[]> {
      const docs = await prisma.integrationConnection.findMany({
        where: { integrationId },
        orderBy: { name: 'asc' },
      });
      return docs.map(toConnectionRecord);
    },

    async getConnectionById(
      id: string
    ): Promise<IntegrationConnectionRecord | null> {
      const doc = await prisma.integrationConnection.findUnique({
        where: { id },
      });
      return doc ? toConnectionRecord(doc) : null;
    },

    async getConnectionByIdAndIntegration(
      id: string,
      integrationId: string
    ): Promise<IntegrationConnectionRecord | null> {
      const doc = await prisma.integrationConnection.findFirst({
        where: { id, integrationId },
      });
      return doc ? toConnectionRecord(doc) : null;
    },

    async createConnection(
      integrationId: string,
      input: Record<string, unknown>
    ): Promise<IntegrationConnectionRecord> {
      const data: Prisma.IntegrationConnectionCreateInput = {
        integration: { connect: { id: integrationId } },
        name: String(input['name'] || 'New Connection'),
        username: String(input['username'] || ''),
        password: String(input['password'] || ''),
        ...input,
      } as any;
      const doc = await prisma.integrationConnection.create({ data });
      return toConnectionRecord(doc);
    },

    async updateConnection(
      id: string,
      input: Partial<IntegrationConnectionRecord>
    ): Promise<IntegrationConnectionRecord> {
      const updateData: Record<string, unknown> = { ...input };
      delete updateData['id'];
      delete updateData['createdAt'];
      
      const doc = await prisma.integrationConnection.update({
        where: { id },
        data: updateData as any,
      });
      return toConnectionRecord(doc);
    },

    async deleteConnection(id: string): Promise<void> {
      await prisma.integrationConnection.delete({ where: { id } });
    },
  };
}

export function getMongoIntegrationRepository(): IntegrationRepository {
  return {
    async listIntegrations(): Promise<IntegrationRecord[]> {
      const db = await getMongoDb();
      const docs = await db
        .collection<IntegrationDocument>(INTEGRATION_COLLECTION)
        .find()
        .sort({ name: 1 })
        .toArray();
      return docs.map(toIntegrationRecord);
    },

    async upsertIntegration(input: {
      name: string;
      slug: string;
    }): Promise<IntegrationRecord> {
      const db = await getMongoDb();
      const now = new Date();
      const res = await db
        .collection<IntegrationDocument>(INTEGRATION_COLLECTION)
        .findOneAndUpdate(
          { slug: input.slug },
          {
            $set: { name: input.name, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true, returnDocument: 'after' }
        );
      if (!res) throw new Error('Failed to upsert integration');
      return toIntegrationRecord(res);
    },

    async getIntegrationById(id: string): Promise<IntegrationRecord | null> {
      if (!ObjectId.isValid(id)) return null;
      const db = await getMongoDb();
      const doc = await db
        .collection<IntegrationDocument>(INTEGRATION_COLLECTION)
        .findOne({ _id: new ObjectId(id) });
      return doc ? toIntegrationRecord(doc) : null;
    },

    async listConnections(
      integrationId: string
    ): Promise<IntegrationConnectionRecord[]> {
      const db = await getMongoDb();
      const docs = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .find({ integrationId })
        .sort({ name: 1 })
        .toArray();
      return docs.map(toConnectionRecord);
    },

    async getConnectionById(
      id: string
    ): Promise<IntegrationConnectionRecord | null> {
      if (!ObjectId.isValid(id)) return null;
      const db = await getMongoDb();
      const doc = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .findOne({ _id: new ObjectId(id) });
      return doc ? toConnectionRecord(doc) : null;
    },

    async getConnectionByIdAndIntegration(
      id: string,
      integrationId: string
    ): Promise<IntegrationConnectionRecord | null> {
      if (!ObjectId.isValid(id)) return null;
      const db = await getMongoDb();
      const doc = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .findOne({ _id: new ObjectId(id), integrationId });
      return doc ? toConnectionRecord(doc) : null;
    },

    async createConnection(
      integrationId: string,
      input: Record<string, unknown>
    ): Promise<IntegrationConnectionRecord> {
      const db = await getMongoDb();
      const now = new Date();
      const doc: IntegrationConnectionDocument = {
        integrationId,
        name: String(input['name'] || 'New Connection'),
        username: String(input['username'] || ''),
        password: String(input['password'] || ''),
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      const res = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .insertOne(doc);
      return toConnectionRecord({ ...doc, _id: res.insertedId });
    },

    async updateConnection(
      id: string,
      input: Partial<IntegrationConnectionRecord>
    ): Promise<IntegrationConnectionRecord> {
      if (!ObjectId.isValid(id)) throw new Error('Invalid connection ID');
      const db = await getMongoDb();
      const now = new Date();
      const updateData: Record<string, unknown> = {
        ...input,
        updatedAt: now,
      };
      delete updateData['id'];
      delete updateData['_id'];
      delete updateData['createdAt'];

      const res = await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updateData },
          { returnDocument: 'after' }
        );
      if (!res) throw new Error('Connection not found');
      return toConnectionRecord(res);
    },

    async deleteConnection(id: string): Promise<void> {
      if (!ObjectId.isValid(id)) return;
      const db = await getMongoDb();
      await db
        .collection<IntegrationConnectionDocument>(
          INTEGRATION_CONNECTION_COLLECTION
        )
        .deleteOne({ _id: new ObjectId(id) });
    },
  };
}
