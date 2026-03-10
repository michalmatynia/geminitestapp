import type { SyncHandler } from './types';
import type { Prisma } from '@prisma/client';

export const syncIntegrations: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('integrations').find({}).toArray();
  const warnings: string[] = [];
  const seenSlugs = new Set<string>();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.IntegrationCreateManyInput | null => {
      const id = normalizeId(doc);
      if (!id) return null;
      const rawName =
        typeof (doc as { name?: string }).name === 'string'
          ? ((doc as { name?: string }).name?.trim() ?? '')
          : '';
      const name = rawName || id;
      const rawSlug =
        typeof (doc as { slug?: string }).slug === 'string'
          ? ((doc as { slug?: string }).slug?.trim() ?? '')
          : '';
      const fallbackSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const slug = rawSlug || fallbackSlug || id;
      if (!slug) {
        warnings.push(`Integration ${id}: missing slug`);
        return null;
      }
      const slugKey = slug.toLowerCase();
      if (seenSlugs.has(slugKey)) {
        warnings.push(`Skipped duplicate integration slug: ${slug}`);
        return null;
      }
      seenSlugs.add(slugKey);
      return {
        id,
        name,
        slug,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.IntegrationCreateManyInput => item !== null);
  await prisma.productListing.deleteMany();
  await prisma.integrationConnection.deleteMany();
  const deleted = await prisma.integration.deleteMany();
  const created = data.length ? await prisma.integration.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncIntegrationConnections: SyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
}) => {
  const availableIntegrationIds = new Set<string>(
    (await prisma.integration.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const docs = await mongo.collection('integration_connections').find({}).toArray();
  const warnings: string[] = [];
  const byIntegration = new Map<string, { doc: Record<string, unknown>; updatedAt: Date }>();
  docs.forEach((doc: Record<string, unknown>) => {
    const id = normalizeId(doc);
    const integrationId = (doc as { integrationId?: string }).integrationId ?? '';
    if (!id || !integrationId) {
      warnings.push('Skipped integration connection with missing id/integrationId');
      return;
    }
    if (!availableIntegrationIds.has(integrationId)) {
      warnings.push(`Integration connection ${id}: missing integration ${integrationId}`);
      return;
    }
    const updatedAt = toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date();
    const existing = byIntegration.get(integrationId);
    if (existing && existing.updatedAt >= updatedAt) {
      warnings.push(`Skipped duplicate connection for integration ${integrationId}`);
      return;
    }
    if (existing) {
      warnings.push(`Replaced older connection for integration ${integrationId}`);
    }
    byIntegration.set(integrationId, { doc, updatedAt });
  });
  const data = Array.from(byIntegration.values()).map(({ doc }) => ({
    id: normalizeId(doc),
    integrationId: (doc as { integrationId?: string }).integrationId ?? '',
    name: (doc as { name?: string }).name ?? 'Connection',
    username: (doc as { username?: string }).username ?? '',
    password: (doc as { password?: string }).password ?? '',
    playwrightStorageState:
      (doc as { playwrightStorageState?: string | null }).playwrightStorageState ?? null,
    playwrightStorageStateUpdatedAt: toDate(
      (doc as { playwrightStorageStateUpdatedAt?: Date | string | null })
        .playwrightStorageStateUpdatedAt
    ),
    playwrightHeadless: (doc as { playwrightHeadless?: boolean | null }).playwrightHeadless ?? true,
    playwrightSlowMo: (doc as { playwrightSlowMo?: number | null }).playwrightSlowMo ?? 50,
    playwrightTimeout: (doc as { playwrightTimeout?: number | null }).playwrightTimeout ?? 15000,
    playwrightNavigationTimeout:
      (doc as { playwrightNavigationTimeout?: number | null }).playwrightNavigationTimeout ?? 30000,
    playwrightHumanizeMouse:
      (doc as { playwrightHumanizeMouse?: boolean | null }).playwrightHumanizeMouse ?? false,
    playwrightMouseJitter:
      (doc as { playwrightMouseJitter?: number | null }).playwrightMouseJitter ?? 6,
    playwrightClickDelayMin:
      (doc as { playwrightClickDelayMin?: number | null }).playwrightClickDelayMin ?? 30,
    playwrightClickDelayMax:
      (doc as { playwrightClickDelayMax?: number | null }).playwrightClickDelayMax ?? 120,
    playwrightInputDelayMin:
      (doc as { playwrightInputDelayMin?: number | null }).playwrightInputDelayMin ?? 20,
    playwrightInputDelayMax:
      (doc as { playwrightInputDelayMax?: number | null }).playwrightInputDelayMax ?? 120,
    playwrightActionDelayMin:
      (doc as { playwrightActionDelayMin?: number | null }).playwrightActionDelayMin ?? 200,
    playwrightActionDelayMax:
      (doc as { playwrightActionDelayMax?: number | null }).playwrightActionDelayMax ?? 900,
    playwrightProxyEnabled:
      (doc as { playwrightProxyEnabled?: boolean | null }).playwrightProxyEnabled ?? false,
    playwrightProxyServer:
      (doc as { playwrightProxyServer?: string | null }).playwrightProxyServer ?? null,
    playwrightProxyUsername:
      (doc as { playwrightProxyUsername?: string | null }).playwrightProxyUsername ?? null,
    playwrightProxyPassword:
      (doc as { playwrightProxyPassword?: string | null }).playwrightProxyPassword ?? null,
    playwrightEmulateDevice:
      (doc as { playwrightEmulateDevice?: boolean | null }).playwrightEmulateDevice ?? false,
    playwrightDeviceName:
      (doc as { playwrightDeviceName?: string | null }).playwrightDeviceName ?? null,
    allegroAccessToken: (doc as { allegroAccessToken?: string | null }).allegroAccessToken ?? null,
    allegroRefreshToken:
      (doc as { allegroRefreshToken?: string | null }).allegroRefreshToken ?? null,
    allegroTokenType: (doc as { allegroTokenType?: string | null }).allegroTokenType ?? null,
    allegroScope: (doc as { allegroScope?: string | null }).allegroScope ?? null,
    allegroExpiresAt: toDate((doc as { allegroExpiresAt?: Date | string | null }).allegroExpiresAt),
    allegroTokenUpdatedAt: toDate(
      (doc as { allegroTokenUpdatedAt?: Date | string | null }).allegroTokenUpdatedAt
    ),
    allegroUseSandbox: (doc as { allegroUseSandbox?: boolean | null }).allegroUseSandbox ?? false,
    baseApiToken: (doc as { baseApiToken?: string | null }).baseApiToken ?? null,
    baseTokenUpdatedAt: toDate(
      (doc as { baseTokenUpdatedAt?: Date | string | null }).baseTokenUpdatedAt
    ),
    baseLastInventoryId:
      (doc as { baseLastInventoryId?: string | null }).baseLastInventoryId ?? null,
    createdAt: toDate((doc as { createdAt?: Date | string }).createdAt) ?? new Date(),
    updatedAt: toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date(),
  }));
  const deleted = await prisma.integrationConnection.deleteMany();
  const created = data.length
    ? await prisma.integrationConnection.createMany({ data })
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncProductListings: SyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const productIds = new Set<string>(
    (await prisma.product.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const connections = await prisma.integrationConnection.findMany({
    select: { id: true, integrationId: true },
  });
  const connectionMap = new Map<string, string>(
    connections.map((entry: { id: string; integrationId: string }) => [
      entry.id,
      entry.integrationId,
    ])
  );
  const docs = await mongo.collection('product_listings').find({}).toArray();
  const warnings: string[] = [];
  const byKey = new Map<string, { doc: Record<string, unknown>; updatedAt: Date }>();
  docs.forEach((doc: Record<string, unknown>) => {
    const id = normalizeId(doc);
    const productId = (doc as { productId?: string }).productId ?? '';
    const connectionId = (doc as { connectionId?: string }).connectionId ?? '';
    if (!id || !productId || !connectionId) {
      warnings.push('Skipped product listing with missing id/product/connection');
      return;
    }
    if (!productIds.has(productId)) {
      warnings.push(`Product listing ${id}: missing product ${productId}`);
      return;
    }
    const integrationId = connectionMap.get(connectionId);
    if (!integrationId) {
      warnings.push(`Product listing ${id}: missing connection ${connectionId}`);
      return;
    }
    const updatedAt = toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date();
    const key = `${productId}::${connectionId}`;
    const existing = byKey.get(key);
    if (existing && existing.updatedAt >= updatedAt) {
      warnings.push(
        `Skipped duplicate listing for product ${productId} connection ${connectionId}`
      );
      return;
    }
    if (existing) {
      warnings.push(`Replaced older listing for product ${productId} connection ${connectionId}`);
    }
    byKey.set(key, { doc, updatedAt });
  });
  const data = Array.from(byKey.values()).map(({ doc }) => {
    const connectionId = (doc as { connectionId?: string }).connectionId ?? '';
    const resolvedIntegrationId =
      connectionMap.get(connectionId) ?? (doc as { integrationId?: string }).integrationId ?? '';
    if (
      (doc as { integrationId?: string }).integrationId &&
      (doc as { integrationId?: string }).integrationId !== resolvedIntegrationId
    ) {
      warnings.push(
        `Product listing ${normalizeId(doc)}: corrected integrationId to match connection`
      );
    }
    return {
      id: normalizeId(doc),
      productId: (doc as { productId?: string }).productId ?? '',
      integrationId: resolvedIntegrationId,
      connectionId,
      externalListingId: (doc as { externalListingId?: string | null }).externalListingId ?? null,
      inventoryId: (doc as { inventoryId?: string | null }).inventoryId ?? null,
      status: (doc as { status?: string }).status ?? 'pending',
      listedAt: toDate((doc as { listedAt?: Date | string | null }).listedAt),
      exportHistory: toJsonValue(
        (doc as { exportHistory?: unknown }).exportHistory ?? null
      ) as Prisma.InputJsonValue,
      createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
      updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
    };
  });
  const deleted = await prisma.productListing.deleteMany();
  const created = data.length ? await prisma.productListing.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

// --- Prisma to Mongo handlers ---

export const syncIntegrationsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.integration.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('integrations');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncIntegrationConnectionsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.integrationConnection.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    integrationId: row.integrationId,
    name: row.name,
    username: row.username,
    password: row.password,
    playwrightStorageState: row.playwrightStorageState ?? null,
    playwrightStorageStateUpdatedAt: row.playwrightStorageStateUpdatedAt ?? null,
    playwrightHeadless: row.playwrightHeadless,
    playwrightSlowMo: row.playwrightSlowMo,
    playwrightTimeout: row.playwrightTimeout,
    playwrightNavigationTimeout: row.playwrightNavigationTimeout,
    playwrightHumanizeMouse: row.playwrightHumanizeMouse,
    playwrightMouseJitter: row.playwrightMouseJitter,
    playwrightClickDelayMin: row.playwrightClickDelayMin,
    playwrightClickDelayMax: row.playwrightClickDelayMax,
    playwrightInputDelayMin: row.playwrightInputDelayMin,
    playwrightInputDelayMax: row.playwrightInputDelayMax,
    playwrightActionDelayMin: row.playwrightActionDelayMin,
    playwrightActionDelayMax: row.playwrightActionDelayMax,
    playwrightProxyEnabled: row.playwrightProxyEnabled,
    playwrightProxyServer: row.playwrightProxyServer ?? null,
    playwrightProxyUsername: row.playwrightProxyUsername ?? null,
    playwrightProxyPassword: row.playwrightProxyPassword ?? null,
    playwrightEmulateDevice: row.playwrightEmulateDevice,
    playwrightDeviceName: row.playwrightDeviceName ?? null,
    allegroAccessToken: row.allegroAccessToken ?? null,
    allegroRefreshToken: row.allegroRefreshToken ?? null,
    allegroTokenType: row.allegroTokenType ?? null,
    allegroScope: row.allegroScope ?? null,
    allegroExpiresAt: row.allegroExpiresAt ?? null,
    allegroTokenUpdatedAt: row.allegroTokenUpdatedAt ?? null,
    allegroUseSandbox: row.allegroUseSandbox,
    baseApiToken: row.baseApiToken ?? null,
    baseTokenUpdatedAt: row.baseTokenUpdatedAt ?? null,
    baseLastInventoryId: row.baseLastInventoryId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('integration_connections');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncProductListingsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.productListing.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    productId: row.productId,
    integrationId: row.integrationId,
    connectionId: row.connectionId,
    externalListingId: row.externalListingId ?? null,
    inventoryId: row.inventoryId ?? null,
    status: row.status,
    listedAt: row.listedAt ?? null,
    exportHistory: row.exportHistory ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('product_listings');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
