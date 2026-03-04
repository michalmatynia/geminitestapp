import 'dotenv/config';

import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';
import { promisify } from 'util';

import { MongoClient, ObjectId, type Document, type OptionalId } from 'mongodb';

const LOG_PREFIX = '[restore-base-listing-statuses]';
const BASE_SLUGS = new Set(['baselinker', 'base', 'base-com']);
const DEFAULT_BACKUP_ARCHIVE = 'mongo/backups/app-backup-1771831928964.archive';
const DEFAULT_STAGING_DB = 'app_restore_status_fix';
const DEFAULT_SOURCE_DB = 'app';
const DEFAULT_SAFETY_DB_PREFIX = 'app_restore_safety';

const DEFAULT_CONNECTION_KEY = 'base_export_default_connection_id';
const DEFAULT_INVENTORY_KEY = 'base_export_default_inventory_id';
const PRODUCT_SYNC_PROFILES_KEY = 'product_sync_profiles';

const SNAPSHOT_COLLECTIONS = [
  'product_listings',
  'category_mappings',
  'external_categories',
  'producer_mappings',
  'external_producers',
  'tag_mappings',
  'external_tags',
] as const;

type IntegrationDoc = {
  _id: string | ObjectId;
  slug?: string | null;
  name?: string | null;
};

type IntegrationConnectionDoc = {
  _id: string | ObjectId;
  integrationId: string;
  name?: string;
  baseApiToken?: string | null;
  password?: string | null;
  baseLastInventoryId?: string | null;
  createdAt?: Date;
};

type ProductListingDoc = {
  _id?: string | ObjectId;
  productId?: string | ObjectId;
  integrationId?: string | ObjectId;
  connectionId?: string | ObjectId;
  status?: string;
  externalListingId?: string | null;
  inventoryId?: string | null;
  marketplaceData?: Record<string, unknown> | null;
  exportHistory?: unknown[] | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  [key: string]: unknown;
};

type RestoreArgs = {
  backupArchivePath: string;
  sourceDbName: string;
  stagingDbName: string;
  safetyDbPrefix: string;
  preferredConnectionId: string | null;
  skipBackfill: boolean;
};

type RestoreSummary = {
  sourceDbName: string;
  stagingDbName: string;
  backupArchivePath: string;
  baseIntegrationId: string;
  baseConnectionId: string;
  safetySnapshotDbName: string;
  safetySnapshotCounts: Record<string, number>;
  stagingCount: number;
  stagingValidCount: number;
  stagedBaseCandidates: number;
  dedupedListings: number;
  importedListings: number;
  backfillResult: {
    scanned: number;
    created: number;
    updated: number;
    unchanged: number;
  } | null;
  finalCounts: {
    liveProductListingsCount: number;
    baseListingsForCurrentConnectionCount: number;
    orphanConnectionCount: number;
    orphanIntegrationCount: number;
  };
};

const execFileAsync = promisify(execFile);

const parseArgs = (): RestoreArgs => {
  const entries = process.argv.slice(2);
  const values = new Map<string, string>();
  let skipBackfill = false;

  for (const entry of entries) {
    if (entry === '--skip-backfill') {
      skipBackfill = true;
      continue;
    }
    if (!entry.startsWith('--')) continue;
    const [key, rawValue] = entry.slice(2).split('=');
    if (!key || rawValue === undefined) continue;
    values.set(key, rawValue);
  }

  const backupArchivePath = values.get('backup') || DEFAULT_BACKUP_ARCHIVE;
  const sourceDbName = values.get('source-db') || DEFAULT_SOURCE_DB;
  const stagingDbName = values.get('staging-db') || DEFAULT_STAGING_DB;
  const safetyDbPrefix = values.get('safety-db-prefix') || DEFAULT_SAFETY_DB_PREFIX;
  const preferredConnectionIdRaw =
    values.get('connectionId') ?? values.get('connection-id') ?? null;
  const preferredConnectionId = preferredConnectionIdRaw?.trim() || null;

  return {
    backupArchivePath,
    sourceDbName,
    stagingDbName,
    safetyDbPrefix,
    preferredConnectionId,
    skipBackfill,
  };
};

const requireEnv = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const toIdString = (value: unknown): string => {
  if (value instanceof ObjectId) return value.toHexString();
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
};

const parseJsonArray = (value: unknown): unknown[] => {
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const findSetting = async (
  db: ReturnType<MongoClient['db']>,
  key: string
): Promise<{ value?: string } | null> => {
  return db.collection<{ value?: string }>('settings').findOne({
    $or: [{ _id: key }, { key }],
  } as Record<string, unknown>);
};

const upsertSettingValue = async (
  db: ReturnType<MongoClient['db']>,
  key: string,
  value: string
): Promise<void> => {
  await db.collection('settings').updateMany(
    {
      $or: [{ _id: key }, { key }],
    } as Record<string, unknown>,
    {
      $set: {
        key,
        value,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
};

const resolveBaseIntegration = async (
  db: ReturnType<MongoClient['db']>
): Promise<IntegrationDoc> => {
  const candidates = await db
    .collection<IntegrationDoc>('integrations')
    .find({})
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  const baseIntegration = candidates.find((entry) =>
    BASE_SLUGS.has((entry.slug ?? '').trim().toLowerCase())
  );
  if (!baseIntegration) {
    throw new Error('No Base.com integration found in integrations collection.');
  }
  return baseIntegration;
};

const resolveBaseConnection = async (
  db: ReturnType<MongoClient['db']>,
  integrationId: string,
  preferredConnectionId: string | null
): Promise<IntegrationConnectionDoc> => {
  const connections = await db
    .collection<IntegrationConnectionDoc>('integration_connections')
    .find({ integrationId })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  if (connections.length === 0) {
    throw new Error('No Base.com integration connections found.');
  }

  if (preferredConnectionId) {
    const explicit = connections.find((entry) => toIdString(entry._id) === preferredConnectionId);
    if (!explicit) {
      throw new Error(
        `Preferred connectionId "${preferredConnectionId}" was not found for integration ${integrationId}.`
      );
    }
    return explicit;
  }

  const defaultConnectionId = normalizeOptionalString(
    (await findSetting(db, DEFAULT_CONNECTION_KEY))?.value
  );
  if (defaultConnectionId) {
    const preferred = connections.find((entry) => toIdString(entry._id) === defaultConnectionId);
    if (preferred) return preferred;
  }

  return connections.find((entry) => Boolean(entry.baseApiToken)) ?? connections[0]!;
};

const copyCollectionSnapshot = async (
  sourceDb: ReturnType<MongoClient['db']>,
  targetDb: ReturnType<MongoClient['db']>,
  collectionName: string
): Promise<number> => {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);
  await targetCollection.deleteMany({});

  let copied = 0;
  let batch: OptionalId<Document>[] = [];
  const cursor = sourceCollection.find({});
  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length < 500) continue;
    await targetCollection.insertMany(batch, { ordered: false });
    copied += batch.length;
    batch = [];
  }
  if (batch.length > 0) {
    await targetCollection.insertMany(batch, { ordered: false });
    copied += batch.length;
  }
  return copied;
};

const statusRank = (statusRaw: unknown): number => {
  const value = typeof statusRaw === 'string' ? statusRaw.trim().toLowerCase() : '';
  if (!value) return 0;
  if (['active', 'success', 'completed', 'listed', 'synced', 'ok'].includes(value)) return 3;
  if (['queued', 'pending', 'processing', 'running', 'in_progress'].includes(value)) return 2;
  if (['failed', 'error', 'removed', 'inactive', 'canceled', 'cancelled'].includes(value)) return 1;
  return 1;
};

const listingUpdatedTimestamp = (listing: ProductListingDoc): number => {
  const updated = toDateOrNull(listing.updatedAt);
  if (updated) return updated.getTime();
  const created = toDateOrNull(listing.createdAt);
  if (created) return created.getTime();
  return 0;
};

const isBaseListingCandidate = (
  listing: ProductListingDoc,
  integrationSlugById: Map<string, string>
): boolean => {
  const integrationId = toIdString(listing.integrationId);
  const integrationSlug = integrationSlugById.get(integrationId) ?? '';
  if (BASE_SLUGS.has(integrationSlug)) return true;

  const marketplace = normalizeOptionalString(
    listing.marketplaceData?.['marketplace']
  )?.toLowerCase();
  return Boolean(
    marketplace &&
    (marketplace === 'base' ||
      marketplace === 'base.com' ||
      marketplace === 'baselinker' ||
      marketplace === 'base-com')
  );
};

const normalizeListingForRebind = (
  listing: ProductListingDoc,
  baseIntegrationId: string,
  baseConnectionId: string
): ProductListingDoc => {
  const createdAt = toDateOrNull(listing.createdAt) ?? new Date();
  const updatedAt = toDateOrNull(listing.updatedAt) ?? createdAt;
  const marketplaceData = {
    ...(listing.marketplaceData ?? {}),
    marketplace: normalizeOptionalString(listing.marketplaceData?.['marketplace']) ?? 'base',
  };

  const next: ProductListingDoc = {
    ...listing,
    integrationId: baseIntegrationId,
    connectionId: baseConnectionId,
    marketplaceData,
    createdAt,
    updatedAt,
  };
  delete next['_id'];
  return next;
};

const restoreStagingListings = async (input: {
  uri: string;
  backupArchivePath: string;
  sourceDbName: string;
  stagingDbName: string;
}): Promise<void> => {
  const restoreCommand = process.env['MONGORESTORE_PATH']?.trim() || 'mongorestore';
  const args = [
    '--uri',
    input.uri,
    `--archive=${input.backupArchivePath}`,
    '--gzip',
    '--drop',
    '--nsInclude',
    `${input.sourceDbName}.product_listings`,
    '--nsFrom',
    `${input.sourceDbName}.product_listings`,
    '--nsTo',
    `${input.stagingDbName}.product_listings`,
  ];

  try {
    const { stdout, stderr } = await execFileAsync(restoreCommand, args, {
      maxBuffer: 1024 * 1024 * 32,
    });
    if (stdout.trim()) {
      console.log(`${LOG_PREFIX} mongorestore stdout:\n${stdout}`);
    }
    if (stderr.trim()) {
      console.log(`${LOG_PREFIX} mongorestore stderr:\n${stderr}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown mongorestore error.';
    throw new Error(`mongorestore failed: ${message}`);
  }
};

const writeSystemLog = async (
  db: ReturnType<MongoClient['db']>,
  level: 'info' | 'warning' | 'error',
  message: string,
  context: Record<string, unknown>
): Promise<void> => {
  await db.collection('system_logs').insertOne({
    id: randomUUID(),
    level,
    message,
    source: 'scripts.restore-base-listing-statuses',
    category: 'maintenance',
    context,
    createdAt: new Date(),
    updatedAt: null,
  });
};

const runListingBackfill = async (input: {
  db: ReturnType<MongoClient['db']>;
  integrationId: string;
  connectionId: string;
  inventoryId: string;
}): Promise<{
  scanned: number;
  created: number;
  updated: number;
  unchanged: number;
}> => {
  const productsCollection = input.db.collection('products');
  const listingsCollection = input.db.collection<ProductListingDoc>('product_listings');

  let scanned = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  const cursor = productsCollection.find({});
  for await (const product of cursor) {
    const productId = toIdString((product as Record<string, unknown>)['_id']);
    const baseProductId = normalizeOptionalString(
      (product as Record<string, unknown>)['baseProductId']
    );
    if (!productId || !baseProductId) continue;

    scanned += 1;

    const listing = await listingsCollection.findOne({
      productId: { $in: [productId] },
      connectionId: { $in: [input.connectionId] },
    } as Record<string, unknown>);

    if (!listing) {
      await listingsCollection.insertOne({
        productId,
        integrationId: input.integrationId,
        connectionId: input.connectionId,
        status: 'active',
        externalListingId: baseProductId,
        inventoryId: input.inventoryId,
        listedAt: null,
        expiresAt: null,
        nextRelistAt: null,
        lastRelistedAt: null,
        lastStatusCheckAt: null,
        failureReason: null,
        exportHistory: null,
        marketplaceData: {
          marketplace: 'base',
          source: 'restore-base-listing-statuses-backfill',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OptionalId<ProductListingDoc>);
      created += 1;
      continue;
    }

    const patch: Record<string, unknown> = {};
    if ((listing.externalListingId ?? '') !== baseProductId) {
      patch['externalListingId'] = baseProductId;
    }
    if ((listing.inventoryId ?? '') !== input.inventoryId) {
      patch['inventoryId'] = input.inventoryId;
    }
    if ((listing.status ?? '').toLowerCase() !== 'active') {
      patch['status'] = 'active';
    }
    patch['marketplaceData'] = {
      ...(listing.marketplaceData ?? {}),
      marketplace: 'base',
      source: 'restore-base-listing-statuses-backfill',
    };

    const keys = Object.keys(patch);
    if (keys.length === 1 && keys[0] === 'marketplaceData') {
      unchanged += 1;
      continue;
    }

    await listingsCollection.updateOne({ _id: listing._id } as Record<string, unknown>, {
      $set: {
        ...patch,
        updatedAt: new Date(),
      },
    });
    updated += 1;
  }

  return { scanned, created, updated, unchanged };
};

const run = async (): Promise<void> => {
  const args = parseArgs();
  const mongoUri = requireEnv('MONGODB_URI');
  const activeDbName = process.env['MONGODB_DB']?.trim() || 'app';
  const backupArchivePath = path.resolve(process.cwd(), args.backupArchivePath);
  const safetySnapshotDbName = `${args.safetyDbPrefix}_${Date.now()}`;

  console.log(`${LOG_PREFIX} activeDb=${activeDbName}`);
  console.log(`${LOG_PREFIX} sourceDb=${args.sourceDbName}`);
  console.log(`${LOG_PREFIX} stagingDb=${args.stagingDbName}`);
  console.log(`${LOG_PREFIX} backupArchive=${backupArchivePath}`);

  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 30_000,
    socketTimeoutMS: 180_000,
  });
  await client.connect();

  const liveDb = client.db(activeDbName);
  const stagingDb = client.db(args.stagingDbName);
  const safetyDb = client.db(safetySnapshotDbName);

  let summary: RestoreSummary | null = null;

  try {
    const baseIntegration = await resolveBaseIntegration(liveDb);
    const baseIntegrationId = toIdString(baseIntegration._id);
    const baseConnection = await resolveBaseConnection(
      liveDb,
      baseIntegrationId,
      args.preferredConnectionId
    );
    const baseConnectionId = toIdString(baseConnection._id);

    await writeSystemLog(liveDb, 'info', 'Base listing restore started', {
      backupArchivePath,
      sourceDbName: args.sourceDbName,
      stagingDbName: args.stagingDbName,
      baseIntegrationId,
      baseConnectionId,
      preferredConnectionId: args.preferredConnectionId,
    });

    const safetySnapshotCounts: Record<string, number> = {};
    for (const collectionName of SNAPSHOT_COLLECTIONS) {
      const count = await copyCollectionSnapshot(liveDb, safetyDb, collectionName);
      safetySnapshotCounts[collectionName] = count;
      console.log(`${LOG_PREFIX} safety snapshot ${collectionName}: ${count} docs`);
    }

    await restoreStagingListings({
      uri: mongoUri,
      backupArchivePath,
      sourceDbName: args.sourceDbName,
      stagingDbName: args.stagingDbName,
    });

    const stagingCollection = stagingDb.collection<ProductListingDoc>('product_listings');
    const stagingCount = await stagingCollection.countDocuments({});
    if (stagingCount === 0) {
      throw new Error('Staging restore produced 0 product_listings documents.');
    }
    const stagingValidCount = await stagingCollection.countDocuments({
      productId: { $exists: true },
      integrationId: { $exists: true },
      connectionId: { $exists: true },
      status: { $exists: true },
      externalListingId: { $exists: true },
    });
    if (stagingValidCount === 0) {
      throw new Error(
        'Staging product_listings do not contain required fields (productId/integrationId/connectionId/status/externalListingId).'
      );
    }

    const integrationRows = await liveDb
      .collection<IntegrationDoc>('integrations')
      .find({})
      .toArray();
    const integrationSlugById = new Map<string, string>(
      integrationRows.map((entry) => [
        toIdString(entry._id),
        (entry.slug ?? '').trim().toLowerCase(),
      ])
    );

    const stagedRows = await stagingCollection.find({}).toArray();
    const stagedBaseRows = stagedRows.filter((row) =>
      isBaseListingCandidate(row, integrationSlugById)
    );
    if (stagedBaseRows.length === 0) {
      throw new Error('No Base.com listing candidates found in staging restore.');
    }

    const liveListingsCollection = liveDb.collection<ProductListingDoc>('product_listings');
    const existingLiveRows = await liveListingsCollection
      .find({
        connectionId: { $in: [baseConnectionId] },
      })
      .toArray();
    const existingBaseRows = existingLiveRows.filter((row) =>
      isBaseListingCandidate(row, integrationSlugById)
    );

    const dedupeMap = new Map<string, ProductListingDoc>();
    const applyListing = (listing: ProductListingDoc): void => {
      const normalized = normalizeListingForRebind(listing, baseIntegrationId, baseConnectionId);
      const productId = toIdString(normalized.productId);
      if (!productId) return;
      const key = `${productId}::${baseConnectionId}`;
      const current = dedupeMap.get(key);
      if (!current) {
        dedupeMap.set(key, normalized);
        return;
      }

      const currentRank = statusRank(current.status);
      const nextRank = statusRank(normalized.status);
      if (nextRank > currentRank) {
        dedupeMap.set(key, normalized);
        return;
      }
      if (nextRank < currentRank) {
        return;
      }

      const currentUpdated = listingUpdatedTimestamp(current);
      const nextUpdated = listingUpdatedTimestamp(normalized);
      if (nextUpdated > currentUpdated) {
        dedupeMap.set(key, normalized);
      }
    };

    [...existingBaseRows, ...stagedBaseRows].forEach(applyListing);
    const finalListings = Array.from(dedupeMap.values());
    if (finalListings.length === 0) {
      throw new Error('No listings remained after dedupe/rebind transform.');
    }

    await liveListingsCollection.deleteMany({
      connectionId: { $in: [baseConnectionId] },
      integrationId: { $in: [baseIntegrationId] },
    });
    await liveListingsCollection.insertMany(finalListings as OptionalId<ProductListingDoc>[], {
      ordered: false,
    });

    await upsertSettingValue(liveDb, DEFAULT_CONNECTION_KEY, baseConnectionId);

    const profilesSettingRaw = (await findSetting(liveDb, PRODUCT_SYNC_PROFILES_KEY))?.value;
    const parsedProfiles = parseJsonArray(profilesSettingRaw);
    const resolvedInventoryId =
      normalizeOptionalString((await findSetting(liveDb, DEFAULT_INVENTORY_KEY))?.value) ??
      normalizeOptionalString(baseConnection.baseLastInventoryId);

    const remappedProfiles = parsedProfiles
      .map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
        const profile = entry as Record<string, unknown>;
        const nextProfile: Record<string, unknown> = {
          ...profile,
          connectionId: baseConnectionId,
        };
        if (!normalizeOptionalString(nextProfile['inventoryId']) && resolvedInventoryId) {
          nextProfile['inventoryId'] = resolvedInventoryId;
        }
        return nextProfile;
      })
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
    if (profilesSettingRaw || remappedProfiles.length > 0) {
      await upsertSettingValue(liveDb, PRODUCT_SYNC_PROFILES_KEY, JSON.stringify(remappedProfiles));
    }

    if (resolvedInventoryId) {
      const currentDefaultInventory = normalizeOptionalString(
        (await findSetting(liveDb, DEFAULT_INVENTORY_KEY))?.value
      );
      if (!currentDefaultInventory) {
        await upsertSettingValue(liveDb, DEFAULT_INVENTORY_KEY, resolvedInventoryId);
      }
    }

    let backfillResult: RestoreSummary['backfillResult'] = null;
    if (!args.skipBackfill && resolvedInventoryId) {
      backfillResult = await runListingBackfill({
        db: liveDb,
        integrationId: baseIntegrationId,
        connectionId: baseConnectionId,
        inventoryId: resolvedInventoryId,
      });
    }

    const liveProductListingsCount = await liveListingsCollection.countDocuments({});
    const baseListingsForCurrentConnectionCount = await liveListingsCollection.countDocuments({
      connectionId: { $in: [baseConnectionId] },
      integrationId: { $in: [baseIntegrationId] },
    });
    const orphanConnectionCount = await liveListingsCollection.countDocuments({
      integrationId: { $in: [baseIntegrationId] },
      connectionId: { $nin: [baseConnectionId] },
    });
    const orphanIntegrationCount = await liveListingsCollection.countDocuments({
      connectionId: { $in: [baseConnectionId] },
      integrationId: { $nin: [baseIntegrationId] },
    });

    summary = {
      sourceDbName: args.sourceDbName,
      stagingDbName: args.stagingDbName,
      backupArchivePath,
      baseIntegrationId,
      baseConnectionId,
      safetySnapshotDbName,
      safetySnapshotCounts,
      stagingCount,
      stagingValidCount,
      stagedBaseCandidates: stagedBaseRows.length,
      dedupedListings: finalListings.length,
      importedListings: finalListings.length,
      backfillResult,
      finalCounts: {
        liveProductListingsCount,
        baseListingsForCurrentConnectionCount,
        orphanConnectionCount,
        orphanIntegrationCount,
      },
    };

    await writeSystemLog(liveDb, 'info', 'Base listing restore completed', summary);
  } catch (error) {
    const context = {
      backupArchivePath,
      sourceDbName: args.sourceDbName,
      stagingDbName: args.stagingDbName,
      safetySnapshotDbName,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
    };
    await writeSystemLog(liveDb, 'error', 'Base listing restore failed', context);
    throw error;
  } finally {
    await client.close();
  }

  console.log(`${LOG_PREFIX} restore completed`);
  console.log(JSON.stringify(summary, null, 2));
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${LOG_PREFIX} ${message}`);
  process.exit(1);
});
