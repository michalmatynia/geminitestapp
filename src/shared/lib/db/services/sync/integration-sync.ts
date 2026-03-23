import type { DatabaseSyncHandler } from './types';
import type { Prisma } from '@prisma/client';

export const syncIntegrations: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('integrations').find({}).toArray();
  const warnings: string[] = [];
  const seenSlugs = new Set<string>();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.IntegrationCreateManyInput | null => {
      const id = normalizeId(doc);
      if (!id) return null;
      const rawName =
        typeof doc.name === 'string'
          ? (doc.name.trim() ?? '')
          : '';
      const name = rawName || id;
      const rawSlug =
        typeof doc.slug === 'string'
          ? (doc.slug.trim() ?? '')
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
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
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

export const syncIntegrationConnections: DatabaseSyncHandler = async ({
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
    const integrationId = (doc.integrationId as string) ?? '';
    if (!id || !integrationId) {
      warnings.push('Skipped integration connection with missing id/integrationId');
      return;
    }
    if (!availableIntegrationIds.has(integrationId)) {
      warnings.push(`Integration connection ${id}: missing integration ${integrationId}`);
      return;
    }
    const updatedAt = toDate(doc.updatedAt as Date | string) ?? new Date();
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
  const data = Array.from(byIntegration.values()).map(({ doc }): Prisma.IntegrationConnectionCreateManyInput => ({
    id: normalizeId(doc)!,
    integrationId: (doc.integrationId as string) ?? '',
    name: (doc.name as string) ?? 'Connection',
    username: (doc.username as string) ?? '',
    password: (doc.password as string) ?? '',
    playwrightStorageState:
      (doc.playwrightStorageState as string | null) ?? null,
    playwrightStorageStateUpdatedAt: toDate(
      doc.playwrightStorageStateUpdatedAt as Date | string | null
    ),
    playwrightHeadless: (doc.playwrightHeadless as boolean | null) ?? true,
    playwrightSlowMo: (doc.playwrightSlowMo as number | null) ?? 50,
    playwrightTimeout: (doc.playwrightTimeout as number | null) ?? 15000,
    playwrightNavigationTimeout:
      (doc.playwrightNavigationTimeout as number | null) ?? 30000,
    playwrightHumanizeMouse:
      (doc.playwrightHumanizeMouse as boolean | null) ?? false,
    playwrightMouseJitter:
      (doc.playwrightMouseJitter as number | null) ?? 6,
    playwrightClickDelayMin:
      (doc.playwrightClickDelayMin as number | null) ?? 30,
    playwrightClickDelayMax:
      (doc.playwrightClickDelayMax as number | null) ?? 120,
    playwrightInputDelayMin:
      (doc.playwrightInputDelayMin as number | null) ?? 20,
    playwrightInputDelayMax:
      (doc.playwrightInputDelayMax as number | null) ?? 120,
    playwrightActionDelayMin:
      (doc.playwrightActionDelayMin as number | null) ?? 200,
    playwrightActionDelayMax:
      (doc.playwrightActionDelayMax as number | null) ?? 900,
    playwrightProxyEnabled:
      (doc.playwrightProxyEnabled as boolean | null) ?? false,
    playwrightProxyServer:
      (doc.playwrightProxyServer as string | null) ?? null,
    playwrightProxyUsername:
      (doc.playwrightProxyUsername as string | null) ?? null,
    playwrightProxyPassword:
      (doc.playwrightProxyPassword as string | null) ?? null,
    playwrightEmulateDevice:
      (doc.playwrightEmulateDevice as boolean | null) ?? false,
    playwrightDeviceName:
      (doc.playwrightDeviceName as string | null) ?? null,
    allegroAccessToken: (doc.allegroAccessToken as string | null) ?? null,
    allegroRefreshToken:
      (doc.allegroRefreshToken as string | null) ?? null,
    allegroTokenType: (doc.allegroTokenType as string | null) ?? null,
    allegroScope: (doc.allegroScope as string | null) ?? null,
    allegroExpiresAt: toDate(doc.allegroExpiresAt as Date | string | null),
    allegroTokenUpdatedAt: toDate(
      doc.allegroTokenUpdatedAt as Date | string | null
    ),
    allegroUseSandbox: (doc.allegroUseSandbox as boolean | null) ?? false,
    baseApiToken: (doc.baseApiToken as string | null) ?? null,
    baseTokenUpdatedAt: toDate(
      doc.baseTokenUpdatedAt as Date | string | null
    ),
    baseLastInventoryId:
      (doc.baseLastInventoryId as string | null) ?? null,
    createdAt: toDate(doc.createdAt as Date | string) ?? new Date(),
    updatedAt: toDate(doc.updatedAt as Date | string) ?? new Date(),
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

export const syncProductListings: DatabaseSyncHandler = async ({
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
    const productId = (doc.productId as string) ?? '';
    const connectionId = (doc.connectionId as string) ?? '';
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
    const updatedAt = toDate(doc.updatedAt as Date | string) ?? new Date();
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
  const data = Array.from(byKey.values()).map(({ doc }): Prisma.ProductListingCreateManyInput => {
    const connectionId = (doc.connectionId as string) ?? '';
    const resolvedIntegrationId =
      connectionMap.get(connectionId) ?? (doc.integrationId as string) ?? '';
    if (
      doc.integrationId &&
      doc.integrationId !== resolvedIntegrationId
    ) {
      warnings.push(
        `Product listing ${normalizeId(doc)}: corrected integrationId to match connection`
      );
    }
    return {
      id: normalizeId(doc)!,
      productId: (doc.productId as string) ?? '',
      integrationId: resolvedIntegrationId,
      connectionId,
      externalListingId: (doc.externalListingId as string | null) ?? null,
      inventoryId: (doc.inventoryId as string | null) ?? null,
      status: (doc.status as string) ?? 'pending',
      listedAt: toDate(doc.listedAt as Date | string | null),
      exportHistory: toJsonValue(
        doc.exportHistory ?? null
      ) as Prisma.InputJsonValue,
      createdAt: (doc.createdAt as Date) ?? new Date(),
      updatedAt: (doc.updatedAt as Date) ?? new Date(),
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

export const syncIntegrationsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
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

export const syncIntegrationConnectionsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
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

export const syncProductListingsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
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
