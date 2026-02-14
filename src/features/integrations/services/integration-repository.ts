import 'server-only';

import { randomUUID } from 'crypto';

import { getIntegrationDataProvider } from '@/features/integrations/services/integration-provider';
import type {
  IntegrationRecord,
  IntegrationConnectionRecord,
  IntegrationRepository,
} from '@/features/integrations/types/integrations';
import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { Prisma } from '@prisma/client';
import type { WithId } from 'mongodb';

export type { IntegrationRecord, IntegrationConnectionRecord, IntegrationRepository };

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
  playwrightDeviceName: 'Desktop Chrome',
  playwrightPersonaId: null,
  allegroUseSandbox: false,
  traderaDefaultTemplateId: null,
  traderaDefaultDurationHours: 72,
  traderaAutoRelistEnabled: true,
  traderaAutoRelistLeadMinutes: 180,
  traderaApiAppId: null,
  traderaApiAppKey: null,
  traderaApiPublicKey: null,
  traderaApiUserId: null,
  traderaApiToken: null,
  traderaApiTokenUpdatedAt: null,
  traderaApiSandbox: false,
} as const;

const INTEGRATIONS_COLLECTION = 'integrations';
const CONNECTIONS_COLLECTION = 'integration_connections';

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
  playwrightPersonaId?: string | null;
  allegroAccessToken?: string | null;
  allegroRefreshToken?: string | null;
  allegroTokenType?: string | null;
  allegroScope?: string | null;
  allegroExpiresAt?: Date | null;
  allegroTokenUpdatedAt?: Date | null;
  allegroUseSandbox?: boolean | null;
  baseApiToken?: string | null;
  baseTokenUpdatedAt?: Date | null;
  baseLastInventoryId?: string | null;
  traderaDefaultTemplateId?: string | null;
  traderaDefaultDurationHours?: number | null;
  traderaAutoRelistEnabled?: boolean | null;
  traderaAutoRelistLeadMinutes?: number | null;
  traderaApiAppId?: number | null;
  traderaApiAppKey?: string | null;
  traderaApiPublicKey?: string | null;
  traderaApiUserId?: number | null;
  traderaApiToken?: string | null;
  traderaApiTokenUpdatedAt?: Date | null;
  traderaApiSandbox?: boolean | null;
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
  playwrightPersonaId:
    doc.playwrightPersonaId ?? CONNECTION_DEFAULTS.playwrightPersonaId,
  allegroAccessToken: doc.allegroAccessToken ?? null,
  allegroRefreshToken: doc.allegroRefreshToken ?? null,
  allegroTokenType: doc.allegroTokenType ?? null,
  allegroScope: doc.allegroScope ?? null,
  allegroExpiresAt: doc.allegroExpiresAt ?? null,
  allegroTokenUpdatedAt: doc.allegroTokenUpdatedAt ?? null,
  allegroUseSandbox: doc.allegroUseSandbox ?? false,
  baseApiToken: doc.baseApiToken ?? null,
  baseTokenUpdatedAt: doc.baseTokenUpdatedAt ?? null,
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
  traderaApiTokenUpdatedAt:
    doc.traderaApiTokenUpdatedAt ??
    CONNECTION_DEFAULTS.traderaApiTokenUpdatedAt,
  traderaApiSandbox:
    doc.traderaApiSandbox ?? CONNECTION_DEFAULTS.traderaApiSandbox,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const prismaRepository: IntegrationRepository = {
  listIntegrations: async (): Promise<IntegrationRecord[]> => {
    const integrations = await prisma.integration.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return integrations;
  },
  upsertIntegration: async (input: { name: string; slug: string }): Promise<IntegrationRecord> => {
    const integration = await prisma.integration.upsert({
      where: { slug: input.slug },
      update: { name: input.name },
      create: input,
    });
    return integration;
  },
  getIntegrationById: async (id: string): Promise<IntegrationRecord | null> => {
    return prisma.integration.findUnique({ where: { id } });
  },
  listConnections: async (integrationId: string): Promise<IntegrationConnectionRecord[]> => {
    return prisma.integrationConnection.findMany({
      where: { integrationId },
      orderBy: { createdAt: 'desc' },
    });
  },
  getConnectionById: async (id: string): Promise<IntegrationConnectionRecord | null> => {
    return prisma.integrationConnection.findUnique({ where: { id } });
  },
  getConnectionByIdAndIntegration: async (id: string, integrationId: string): Promise<IntegrationConnectionRecord | null> => {
    return prisma.integrationConnection.findFirst({
      where: { id, integrationId },
    });
  },
  createConnection: async (
    integrationId: string,
    input: {
      name: string;
      username: string;
      password: string;
      traderaDefaultTemplateId?: string | null;
      traderaDefaultDurationHours?: number;
      traderaAutoRelistEnabled?: boolean;
      traderaAutoRelistLeadMinutes?: number;
      traderaApiAppId?: number | null;
      traderaApiAppKey?: string | null;
      traderaApiPublicKey?: string | null;
      traderaApiUserId?: number | null;
      traderaApiToken?: string | null;
      traderaApiTokenUpdatedAt?: Date | null;
      traderaApiSandbox?: boolean;
    }
  ): Promise<IntegrationConnectionRecord> => {
    return prisma.integrationConnection.create({
      data: {
        integrationId,
        name: input.name,
        username: input.username,
        password: input.password,
        ...(typeof input.traderaDefaultTemplateId === 'string' ||
        input.traderaDefaultTemplateId === null
          ? { traderaDefaultTemplateId: input.traderaDefaultTemplateId ?? null }
          : {}),
        ...(typeof input.traderaDefaultDurationHours === 'number'
          ? { traderaDefaultDurationHours: input.traderaDefaultDurationHours }
          : {}),
        ...(typeof input.traderaAutoRelistEnabled === 'boolean'
          ? { traderaAutoRelistEnabled: input.traderaAutoRelistEnabled }
          : {}),
        ...(typeof input.traderaAutoRelistLeadMinutes === 'number'
          ? { traderaAutoRelistLeadMinutes: input.traderaAutoRelistLeadMinutes }
          : {}),
        ...(typeof input.traderaApiAppId === 'number'
          ? { traderaApiAppId: input.traderaApiAppId }
          : {}),
        ...(typeof input.traderaApiAppKey === 'string' ||
        input.traderaApiAppKey === null
          ? { traderaApiAppKey: input.traderaApiAppKey ?? null }
          : {}),
        ...(typeof input.traderaApiPublicKey === 'string' ||
        input.traderaApiPublicKey === null
          ? { traderaApiPublicKey: input.traderaApiPublicKey ?? null }
          : {}),
        ...(typeof input.traderaApiUserId === 'number'
          ? { traderaApiUserId: input.traderaApiUserId }
          : {}),
        ...(typeof input.traderaApiToken === 'string' ||
        input.traderaApiToken === null
          ? { traderaApiToken: input.traderaApiToken ?? null }
          : {}),
        ...(input.traderaApiTokenUpdatedAt instanceof Date
          ? { traderaApiTokenUpdatedAt: input.traderaApiTokenUpdatedAt }
          : {}),
        ...(typeof input.traderaApiSandbox === 'boolean'
          ? { traderaApiSandbox: input.traderaApiSandbox }
          : {}),
      },
    });
  },
  updateConnection: async (id: string, input: Partial<IntegrationConnectionRecord>): Promise<IntegrationConnectionRecord> => {
    const {
      id: _ignoredId,
      integrationId: _ignoredIntegrationId,
      createdAt: _ignoredCreatedAt,
      updatedAt: _ignoredUpdatedAt,
      ...rest
    } = input;
    return prisma.integrationConnection.update({
      where: { id },
      data: rest as Prisma.IntegrationConnectionUpdateInput,
    });
  },
  deleteConnection: async (id: string): Promise<void> => {
    await prisma.integrationConnection.delete({ where: { id } });
  },
};

const mongoRepository: IntegrationRepository = {
  listIntegrations: async (): Promise<IntegrationRecord[]> => {
    const db = await getMongoDb();
    const docs = await db
      .collection<IntegrationDocument>(INTEGRATIONS_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toIntegrationRecord);
  },
  upsertIntegration: async (input: { name: string; slug: string }): Promise<IntegrationRecord> => {
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
    return toIntegrationRecord(doc as WithId<IntegrationDocument>);
  },
  getIntegrationById: async (id: string): Promise<IntegrationRecord | null> => {
    const db = await getMongoDb();
    const doc = await db
      .collection<IntegrationDocument>(INTEGRATIONS_COLLECTION)
      .findOne({ _id: id });
    return doc ? toIntegrationRecord(doc) : null;
  },
  listConnections: async (integrationId: string): Promise<IntegrationConnectionRecord[]> => {
    const db = await getMongoDb();
    const docs = await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .find({ integrationId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toConnectionRecord);
  },
  getConnectionById: async (id: string): Promise<IntegrationConnectionRecord | null> => {
    const db = await getMongoDb();
    const doc = await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .findOne({ _id: id });
    return doc ? toConnectionRecord(doc) : null;
  },
  getConnectionByIdAndIntegration: async (id: string, integrationId: string): Promise<IntegrationConnectionRecord | null> => {
    const db = await getMongoDb();
    const doc = await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .findOne({ _id: id, integrationId });
    return doc ? toConnectionRecord(doc) : null;
  },
  createConnection: async (
    integrationId: string,
    input: {
      name: string;
      username: string;
      password: string;
      traderaDefaultTemplateId?: string | null;
      traderaDefaultDurationHours?: number;
      traderaAutoRelistEnabled?: boolean;
      traderaAutoRelistLeadMinutes?: number;
      traderaApiAppId?: number | null;
      traderaApiAppKey?: string | null;
      traderaApiPublicKey?: string | null;
      traderaApiUserId?: number | null;
      traderaApiToken?: string | null;
      traderaApiTokenUpdatedAt?: Date | null;
      traderaApiSandbox?: boolean;
    }
  ): Promise<IntegrationConnectionRecord> => {
    const db = await getMongoDb();
    const now = new Date();
    const id = randomUUID();
    const doc: IntegrationConnectionDocument = {
      _id: id,
      integrationId,
      name: input.name,
      username: input.username,
      password: input.password,
      ...CONNECTION_DEFAULTS,
      ...(typeof input.traderaDefaultTemplateId === 'string' ||
      input.traderaDefaultTemplateId === null
        ? { traderaDefaultTemplateId: input.traderaDefaultTemplateId ?? null }
        : {}),
      ...(typeof input.traderaDefaultDurationHours === 'number'
        ? { traderaDefaultDurationHours: input.traderaDefaultDurationHours }
        : {}),
      ...(typeof input.traderaAutoRelistEnabled === 'boolean'
        ? { traderaAutoRelistEnabled: input.traderaAutoRelistEnabled }
        : {}),
      ...(typeof input.traderaAutoRelistLeadMinutes === 'number'
        ? { traderaAutoRelistLeadMinutes: input.traderaAutoRelistLeadMinutes }
        : {}),
      ...(typeof input.traderaApiAppId === 'number'
        ? { traderaApiAppId: input.traderaApiAppId }
        : {}),
      ...(typeof input.traderaApiAppKey === 'string' ||
      input.traderaApiAppKey === null
        ? { traderaApiAppKey: input.traderaApiAppKey ?? null }
        : {}),
      ...(typeof input.traderaApiPublicKey === 'string' ||
      input.traderaApiPublicKey === null
        ? { traderaApiPublicKey: input.traderaApiPublicKey ?? null }
        : {}),
      ...(typeof input.traderaApiUserId === 'number'
        ? { traderaApiUserId: input.traderaApiUserId }
        : {}),
      ...(typeof input.traderaApiToken === 'string' ||
      input.traderaApiToken === null
        ? { traderaApiToken: input.traderaApiToken ?? null }
        : {}),
      ...(input.traderaApiTokenUpdatedAt instanceof Date
        ? { traderaApiTokenUpdatedAt: input.traderaApiTokenUpdatedAt }
        : {}),
      ...(typeof input.traderaApiSandbox === 'boolean'
        ? { traderaApiSandbox: input.traderaApiSandbox }
        : {}),
      createdAt: now,
      updatedAt: now,
    };
    await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .insertOne(doc);
    return toConnectionRecord(doc as WithId<IntegrationConnectionDocument>);
  },
  updateConnection: async (id: string, input: Partial<IntegrationConnectionRecord>): Promise<IntegrationConnectionRecord> => {
    const db = await getMongoDb();
    const now = new Date();
    const { id: _ignoredId, integrationId: _ignoredIntegrationId, ...rest } =
      input;
    const update: Partial<IntegrationConnectionDocument> = {
      ...rest,
      updatedAt: now,
    };
    await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .updateOne({ _id: id }, { $set: update });
    const updated = await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .findOne({ _id: id });
    if (!updated) {
      throw notFoundError('Connection not found', { id });
    }
    return toConnectionRecord(updated);
  },
  deleteConnection: async (id: string): Promise<void> => {
    const db = await getMongoDb();
    await db
      .collection<IntegrationConnectionDocument>(CONNECTIONS_COLLECTION)
      .deleteOne({ _id: id });
  },
};

export const getIntegrationRepository = async (): Promise<IntegrationRepository> => {
  const provider = await getIntegrationDataProvider();
  return provider === 'mongodb' ? mongoRepository : prismaRepository;
};
