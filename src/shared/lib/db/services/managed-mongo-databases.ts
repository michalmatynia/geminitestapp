import 'server-only';

import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoCollectionStats,
  DatabaseEngineManagedMongoDatabase,
  DatabaseEngineManagedMongoDatabasesResponse,
  DatabaseEngineManagedMongoEndpoint,
  MongoSource,
} from '@/shared/contracts/database';
import { configurationError } from '@/shared/errors/app-error';
import { getMongoSyncIssue, resolveMongoSourceConfig } from '@/shared/lib/db/mongo-source';
import {
  backupsDir,
  MONGO_BACKUP_APPLICATIONS,
  resolveCmsBuilderMongoSourceConfig,
  resolveStudiqMongoSourceConfig,
  type MongoApplicationSourceConfig,
  type MongoBackupApplication,
} from '@/shared/lib/db/utils/mongo';

const MANAGED_MONGO_APPLICATION_LABELS: Record<MongoBackupApplication, string> = {
  geminitestapp: 'GeminiTest App',
  studiq: 'StudiQ',
  'cms-builder': 'CMS Builder',
};

const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 5_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const getNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, value);
};

const sumNullableNumbers = (...values: Array<number | null>): number | null => {
  const finiteValues = values.filter((value): value is number => value !== null);
  if (finiteValues.length === 0) return null;
  return finiteValues.reduce((sum, value) => sum + value, 0);
};

const maskMongoUri = (uri: string | null): string | null => {
  if (!uri) return null;
  try {
    const parsed = new URL(uri);
    const authPrefix = parsed.username ? `${parsed.username}@` : '';
    const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    return `${parsed.protocol}//${authPrefix}${parsed.host}${pathname}${parsed.search}`;
  } catch {
    return uri.replace(/\/\/([^@/]+)@/, '//***@');
  }
};

const isSingleNodeLocalMongoUri = (uri: string): boolean => {
  try {
    const parsed = new URL(uri);
    const hostname = parsed.hostname.trim().toLowerCase();
    return (
      (hostname === '127.0.0.1' || hostname === 'localhost') &&
      !parsed.searchParams.has('replicaSet')
    );
  } catch {
    return uri.includes('127.0.0.1') || uri.includes('localhost');
  }
};

const getMongoClientOptions = (uri: string): MongoClientOptions => ({
  connectTimeoutMS: DEFAULT_CONNECT_TIMEOUT_MS,
  serverSelectionTimeoutMS: DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
  ...(isSingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
});

const buildUnavailableEndpoint = (
  source: MongoSource,
  config: MongoApplicationSourceConfig,
  healthError: string | null
): DatabaseEngineManagedMongoEndpoint => ({
  source,
  configured: config.configured,
  dbName: config.dbName,
  maskedUri: maskMongoUri(config.uri),
  usesLegacyEnv: config.usesLegacyEnv,
  reachable: config.configured ? false : null,
  healthError,
  databaseSizeBytes: null,
  storageSizeBytes: null,
  dataSizeBytes: null,
  indexSizeBytes: null,
  collectionsSizeBytes: null,
  collectionCount: 0,
  collections: [],
});

export const getManagedMongoApplicationLabel = (
  application: DatabaseEngineManagedMongoApplication
): string => MANAGED_MONGO_APPLICATION_LABELS[application];

export const resolveManagedMongoSourceConfig = async (
  application: DatabaseEngineManagedMongoApplication,
  source: MongoSource
): Promise<MongoApplicationSourceConfig> => {
  if (application === 'studiq') {
    return resolveStudiqMongoSourceConfig(source);
  }
  if (application === 'cms-builder') {
    return resolveCmsBuilderMongoSourceConfig(source);
  }
  return resolveMongoSourceConfig(source);
};

export const resolveOptionalManagedMongoSourceConfig = async (
  application: DatabaseEngineManagedMongoApplication,
  source: MongoSource
): Promise<MongoApplicationSourceConfig> => {
  try {
    return await resolveManagedMongoSourceConfig(application, source);
  } catch {
    return {
      source,
      configured: false,
      uri: null,
      dbName: null,
      usesLegacyEnv: false,
    };
  }
};

export const createManagedMongoClient = async (
  application: DatabaseEngineManagedMongoApplication,
  source: MongoSource
): Promise<{
  client: MongoClient;
  db: Db;
  dbName: string;
  config: MongoApplicationSourceConfig;
}> => {
  const config = await resolveManagedMongoSourceConfig(application, source);
  if (!config.configured || !config.uri || !config.dbName) {
    throw configurationError(
      `${getManagedMongoApplicationLabel(application)} ${source} MongoDB source is not configured.`
    );
  }

  const client = new MongoClient(config.uri, getMongoClientOptions(config.uri));
  await client.connect();
  return {
    client,
    db: client.db(config.dbName),
    dbName: config.dbName,
    config,
  };
};

const getCollectionStats = async (
  db: Db,
  collectionName: string
): Promise<DatabaseEngineManagedMongoCollectionStats> => {
  const collection = db.collection(collectionName);
  const [statsResult, countResult] = await Promise.allSettled([
    db.command({ collStats: collectionName, scale: 1 }),
    collection.estimatedDocumentCount(),
  ]);
  const stats =
    statsResult.status === 'fulfilled' ? (statsResult.value as Record<string, unknown>) : null;
  const documentCount =
    countResult.status === 'fulfilled'
      ? countResult.value
      : getNumber(stats?.['count']);
  const storageSizeBytes = getNumber(stats?.['storageSize']);
  const dataSizeBytes = getNumber(stats?.['size']);
  const indexSizeBytes = getNumber(stats?.['totalIndexSize']);
  const totalSizeBytes =
    getNumber(stats?.['totalSize']) ?? sumNullableNumbers(storageSizeBytes, indexSizeBytes);
  const statsError =
    statsResult.status === 'rejected' ? getErrorMessage(statsResult.reason) : null;

  return {
    name: collectionName,
    documentCount,
    storageSizeBytes,
    dataSizeBytes,
    indexSizeBytes,
    totalSizeBytes,
    statsError,
  };
};

const inspectManagedMongoEndpoint = async (
  source: MongoSource,
  config: MongoApplicationSourceConfig
): Promise<DatabaseEngineManagedMongoEndpoint> => {
  if (!config.configured) {
    return buildUnavailableEndpoint(source, config, null);
  }
  if (!config.uri || config.uri.trim() === '') {
    return buildUnavailableEndpoint(source, config, `${source} MongoDB URI is not configured.`);
  }
  if (!config.dbName || config.dbName.trim() === '') {
    return buildUnavailableEndpoint(
      source,
      config,
      `${source} MongoDB database name is not configured.`
    );
  }

  const client = new MongoClient(config.uri, getMongoClientOptions(config.uri));
  try {
    await client.connect();
    const db = client.db(config.dbName);
    await db.admin().command({ ping: 1 });

    const [databaseStatsResult, collectionInfos] = await Promise.all([
      db.command({ dbStats: 1, scale: 1 }).catch((error: unknown) => ({ statsError: error })),
      db.listCollections({}, { nameOnly: true }).toArray(),
    ]);
    const databaseStats = databaseStatsResult as Record<string, unknown>;
    const collectionNames = collectionInfos
      .map((collection) => collection.name)
      .filter((name): name is string => Boolean(name && !name.startsWith('system.')))
      .sort((a, b) => a.localeCompare(b));
    const collections = await Promise.all(
      collectionNames.map((collectionName) => getCollectionStats(db, collectionName))
    );
    const collectionsSizeBytes = collections.reduce<number | null>((sum, collection) => {
      if (collection.totalSizeBytes === null) return sum;
      return (sum ?? 0) + collection.totalSizeBytes;
    }, null);
    const storageSizeBytes = getNumber(databaseStats['storageSize']);
    const dataSizeBytes = getNumber(databaseStats['dataSize']);
    const indexSizeBytes = getNumber(databaseStats['indexSize']);
    const databaseSizeBytes =
      getNumber(databaseStats['totalSize']) ??
      sumNullableNumbers(storageSizeBytes, indexSizeBytes) ??
      collectionsSizeBytes;

    return {
      source,
      configured: true,
      dbName: config.dbName,
      maskedUri: maskMongoUri(config.uri),
      usesLegacyEnv: config.usesLegacyEnv,
      reachable: true,
      healthError: null,
      databaseSizeBytes,
      storageSizeBytes,
      dataSizeBytes,
      indexSizeBytes,
      collectionsSizeBytes,
      collectionCount: collections.length,
      collections,
    };
  } catch (error) {
    return buildUnavailableEndpoint(source, config, getErrorMessage(error));
  } finally {
    await client.close().catch(() => undefined);
  }
};

const getEndpointStatus = async (
  application: DatabaseEngineManagedMongoApplication,
  source: MongoSource
): Promise<DatabaseEngineManagedMongoEndpoint> => {
  const config = await resolveOptionalManagedMongoSourceConfig(application, source);
  return inspectManagedMongoEndpoint(source, config);
};

const buildManagedDatabaseStatus = async (
  application: DatabaseEngineManagedMongoApplication
): Promise<DatabaseEngineManagedMongoDatabase> => {
  const [local, cloud] = await Promise.all([
    getEndpointStatus(application, 'local'),
    getEndpointStatus(application, 'cloud'),
  ]);
  const syncIssue =
    local.configured && cloud.configured
      ? getMongoSyncIssue(
          {
            source: 'local',
            configured: local.configured,
            uri: local.maskedUri,
            dbName: local.dbName,
          },
          {
            source: 'cloud',
            configured: cloud.configured,
            uri: cloud.maskedUri,
            dbName: cloud.dbName,
          }
        )
      : local.configured
        ? `${getManagedMongoApplicationLabel(application)} cloud MongoDB source is not configured.`
        : `${getManagedMongoApplicationLabel(application)} local MongoDB source is not configured.`;

  return {
    application,
    label: getManagedMongoApplicationLabel(application),
    local,
    cloud,
    canBackupLocal: local.configured && local.reachable === true,
    canPushToCloud:
      local.configured && cloud.configured && local.reachable === true && cloud.reachable === true && !syncIssue,
    canPullFromCloud:
      local.configured && cloud.configured && local.reachable === true && cloud.reachable === true && !syncIssue,
    syncIssue,
  };
};

const collectManagedMongoIssues = (
  databases: DatabaseEngineManagedMongoDatabase[]
): string[] => {
  const issues: string[] = [];
  for (const database of databases) {
    if (database.syncIssue) {
      issues.push(`${database.label}: ${database.syncIssue}`);
    }
    for (const endpoint of [database.local, database.cloud]) {
      if (endpoint.configured && endpoint.reachable === false && endpoint.healthError) {
        issues.push(`${database.label} ${endpoint.source}: ${endpoint.healthError}`);
      }
    }
  }
  return issues;
};

export async function getManagedMongoDatabasesStatus(): Promise<DatabaseEngineManagedMongoDatabasesResponse> {
  const databases = await Promise.all(
    MONGO_BACKUP_APPLICATIONS.map((application) =>
      buildManagedDatabaseStatus(application)
    )
  );

  return {
    timestamp: new Date().toISOString(),
    backupRoot: backupsDir,
    databases,
    canBackupAllLocal: databases.every((database) => database.canBackupLocal),
    canPushAllToCloud: databases.every((database) => database.canPushToCloud),
    canPullAllFromCloud: databases.every((database) => database.canPullFromCloud),
    issues: collectManagedMongoIssues(databases),
  };
}
