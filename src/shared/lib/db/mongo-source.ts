/**
 * MongoDB Source Management
 * 
 * Manages multiple MongoDB sources (Local vs Cloud) and their synchronization.
 * This module handles:
 * - Resolving and applying source-specific environment variables.
 * - Probing source reachability and health.
 * - Comparing sources for synchronization potential.
 * - Tracking last sync timestamps across different applications.
 * - Managing active source switching and default source resolution.
 * - Providing a comprehensive state of all configured sources.
 */

import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import { MongoClient, type MongoClientOptions } from 'mongodb';

import type {
  DatabaseEngineMongoAppSyncStatus,
  DatabaseEngineMongoAppSyncStatuses,
  DatabaseEngineMongoLastSync,
  DatabaseEngineMongoSourceState,
  MongoSource,
} from '@/shared/contracts/database';
import { databaseEngineMongoLastSyncSchema } from '@/shared/contracts/database';
import { configurationError } from '@/shared/errors/app-error';
import { readMongoSyncLock } from '@/shared/lib/db/mongo-sync-lock';
import {
  MONGO_BACKUP_APPLICATIONS,
  resolveArchMongoSourceConfig,
  resolveCmsBuilderMongoSourceConfig,
  resolveProductsMongoSourceConfig,
  resolveStudiqMongoSourceConfig,
  type MongoApplicationSourceConfig,
  type MongoBackupApplication,
} from '@/shared/lib/db/utils/mongo';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

/** Default environment variable for the default active source. */
const MONGODB_ACTIVE_SOURCE_DEFAULT_ENV = 'MONGODB_ACTIVE_SOURCE_DEFAULT';

/** Default file path for storing the last sync timestamp. */
const DEFAULT_MONGODB_LAST_SYNC_FILE_PATH = path.join(process.cwd(), 'mongo', 'runtime', 'last-sync.json');

/** Initial MONGODB_URI captured at startup. */
const INITIAL_MONGODB_URI = process.env['MONGODB_URI']?.trim() ?? '';

/** Initial MONGODB_DB captured at startup. */
const INITIAL_MONGODB_DB = process.env['MONGODB_DB']?.trim() ?? 'app';

/** Internal structure for MongoDB source configuration. */
type MongoSourceConfig = {
  /** The source identifier ('local' or 'cloud'). */
  source: MongoSource;
  /** Whether this source is configured in environment. */
  configured: boolean;
  /** The full MongoDB connection URI. */
  uri: string | null;
  /** The target database name. */
  dbName: string | null;
  /** Whether this source was derived from legacy environment variables. */
  usesLegacyEnv: boolean;
};

/** Internal structure for source reachability status. */
type MongoSourceReachability = {
  /** True if reachable, false if unreachable, null if not checked. */
  reachable: boolean | null;
  /** The error message if unreachable. */
  healthError: string | null;
};

type ApplicationMongoSourceConfig = MongoSourceConfig | MongoApplicationSourceConfig;

/** Human-readable labels for different applications managed by the sync process. */
const MONGO_APPLICATION_LABELS: Record<MongoBackupApplication, string> = {
  geminitestapp: 'GeminiTest App',
  studiq: 'StudiQ',
  'cms-builder': 'CMS Builder',
  products: 'Products',
  arch: 'Milkbar Designers',
};

/** Normalizes a raw value to a valid MongoSource. */
const normalizeMongoSource = (value: unknown): MongoSource | null =>
  value === 'local' || value === 'cloud' ? value : null;

/** Resolves the file path where sync metadata is stored. */
const getMongoSourceLastSyncFilePath = (): string => DEFAULT_MONGODB_LAST_SYNC_FILE_PATH;

/** Retrieves the explicit URI for a source from environment. */
const getExplicitMongoUri = (source: MongoSource): string => {
  const key = source === 'local' ? 'MONGODB_LOCAL_URI' : 'MONGODB_CLOUD_URI';
  return process.env[key]?.trim() ?? '';
};

/** Retrieves the explicit database name for a source from environment. */
const getExplicitMongoDb = (source: MongoSource): string => {
  const key = source === 'local' ? 'MONGODB_LOCAL_DB' : 'MONGODB_CLOUD_DB';
  return process.env[key]?.trim() ?? '';
};

/** Heuristic to determine if a URI points to a local instance. */
const isLikelyLocalMongoUri = (uri: string): boolean => {
  const trimmed = uri.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.trim().toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
  }
};

/** Heuristic to determine if a URI points to a single-node local instance. */
const isLikelySingleNodeLocalMongoUri = (uri: string): boolean => {
  const trimmed = uri.trim();
  if (trimmed.length === 0) return false;
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.trim().toLowerCase();
    return (
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      !parsed.searchParams.has('replicaSet')
    );
  } catch {
    return trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
  }
};

/** Options for probing MongoDB reachability. */
const getMongoClientOptions = (uri: string): MongoClientOptions => ({
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  ...(isLikelySingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
});

/** Masks sensitive information in a MongoDB URI for logging/display. */
const maskMongoUri = (uri: string | null): string | null => {
  if (!uri) return null;
  try {
    const parsed = new URL(uri);
    const protocol = parsed.protocol || 'mongodb:';
    const authPrefix = parsed.username ? `${parsed.username}@` : '';
    const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    const search = parsed.search || '';
    return `${protocol}//${authPrefix}${parsed.host}${pathname}${search}`;
  } catch {
  return uri.replace(/\/\/([^@/]+)@/, '//***@');
  }
};

/** Normalizes a URI for equality comparison by removing authentication details. */
const normalizeMongoSyncComparisonUri = (uri: string | null): string | null => {
  if (!uri) return null;
  return uri.trim().replace(/\/\/([^@/]+)@/, '//');
};

/**
 * Identifies potential synchronization issues between a source and target.
 * Prevents sync between identical instances.
 * 
 * @param sourceConfig - The source configuration.
 * @param targetConfig - The target configuration.
 * @returns An error string if there's an issue, null otherwise.
 */
export const getMongoSyncIssue = (
  sourceConfig: { source: MongoSource; configured: boolean; uri: string | null; dbName: string | null },
  targetConfig: { source: MongoSource; configured: boolean; uri: string | null; dbName: string | null }
): string | null => {
  if (!sourceConfig.configured || !targetConfig.configured) return null;

  const normalizedSourceUri = normalizeMongoSyncComparisonUri(sourceConfig.uri);
  const normalizedTargetUri = normalizeMongoSyncComparisonUri(targetConfig.uri);
  if (!normalizedSourceUri || !normalizedTargetUri) return null;

  const sourceDbName = sourceConfig.dbName?.trim() ?? '';
  const targetDbName = targetConfig.dbName?.trim() ?? '';
  if (!sourceDbName || !targetDbName) return null;

  if (normalizedSourceUri === normalizedTargetUri && sourceDbName === targetDbName) {
    return `MongoDB source sync is disabled because "${sourceConfig.source}" and "${targetConfig.source}" point to the same URI and database.`;
  }
  return null;
};

/** Checks for reachability issues during sync. */
const getMongoSyncReachabilityIssue = (
  config: MongoSourceConfig,
  reachability: MongoSourceReachability
): string | null => {
  if (!config.configured || reachability.reachable !== false) return null;
  return `MongoDB source sync is disabled because "${config.source}" is unreachable: ${reachability.healthError ?? 'Unable to reach MongoDB target.'}`;
};

/** Helper to extract error message. */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

/** Resolves the environment key for a source's URI. */
const getMongoSourceUriEnvKey = (source: MongoSource): 'MONGODB_LOCAL_URI' | 'MONGODB_CLOUD_URI' =>
  source === 'local' ? 'MONGODB_LOCAL_URI' : 'MONGODB_CLOUD_URI';

/**
 * Resolves configuration for a source based on explicit or legacy environment variables.
 * 
 * @param source - The source to resolve ('local' or 'cloud').
 * @returns The resolved MongoSourceConfig.
 */
const getMongoSourceConfig = (source: MongoSource): MongoSourceConfig => {
  const explicitUri = getExplicitMongoUri(source);
  const explicitDbName = getExplicitMongoDb(source);
  if (explicitUri) {
    return {
      source,
      configured: true,
      uri: explicitUri,
      dbName: explicitDbName || INITIAL_MONGODB_DB || 'app',
      usesLegacyEnv: false,
    };
  }

  // Fallback to legacy INITIAL_MONGODB_URI if it matches the source heuristic.
  if (!INITIAL_MONGODB_URI) {
    return {
      source,
      configured: false,
      uri: null,
      dbName: null,
      usesLegacyEnv: false,
    };
  }

  const legacyIsLocal = isLikelyLocalMongoUri(INITIAL_MONGODB_URI);
  if ((source === 'local' && legacyIsLocal) || (source === 'cloud' && !legacyIsLocal)) {
    return {
      source,
      configured: true,
      uri: INITIAL_MONGODB_URI,
      dbName: INITIAL_MONGODB_DB || 'app',
      usesLegacyEnv: true,
    };
  }

  return {
    source,
    configured: false,
    uri: null,
    dbName: null,
    usesLegacyEnv: false,
  };
};

/** Resolves application-specific source configuration. */
const resolveApplicationMongoSourceConfig = (
  application: MongoBackupApplication,
  source: MongoSource
): ApplicationMongoSourceConfig => {
  if (application === 'studiq') {
    return resolveStudiqMongoSourceConfig(source);
  }
  if (application === 'cms-builder') {
    return resolveCmsBuilderMongoSourceConfig(source);
  }
  if (application === 'products') {
    return resolveProductsMongoSourceConfig(source);
  }
  if (application === 'arch') {
    return resolveArchMongoSourceConfig(source);
  }
  return getMongoSourceConfig(source);
};

/** Checks if a config has all necessary sync parameters. */
const hasSyncConfig = (
  config: ApplicationMongoSourceConfig
): config is ApplicationMongoSourceConfig & { uri: string; dbName: string } =>
  config.configured &&
  typeof config.uri === 'string' &&
  config.uri.trim().length > 0 &&
  typeof config.dbName === 'string' &&
  config.dbName.trim().length > 0;

/** Identifies configuration issues for application-specific sources. */
const getApplicationSourceConfigIssue = (
  application: MongoBackupApplication,
  source: MongoSource,
  config: ApplicationMongoSourceConfig
): string | null => {
  if (hasSyncConfig(config)) return null;

  const label = MONGO_APPLICATION_LABELS[application];
  if (application === 'geminitestapp') {
    const prefix = source === 'local' ? 'MONGODB_LOCAL' : 'MONGODB_CLOUD';
    return `${label} ${source} MongoDB source is not configured. Set ${prefix}_URI and ${prefix}_DB in the effective env.`;
  }

  const prefix = `${
    application === 'cms-builder'
      ? 'CMS_BUILDER'
      : application === 'products'
        ? 'PRODUCTS'
        : application === 'arch'
          ? 'ARCH'
          : application.toUpperCase()
  }_MONGODB_${source.toUpperCase()}`;
  return `${label} ${source} MongoDB source is not configured. Set ${prefix}_URI and ${prefix}_DB in the effective env.`;
};

/** Probes a specific source configuration for reachability. */
const probeMongoConfigReachability = async (
  config: ApplicationMongoSourceConfig
): Promise<MongoSourceReachability> => {
  if (!hasSyncConfig(config)) {
    return {
      reachable: null,
      healthError: null,
    };
  }

  const client = new MongoClient(config.uri, getMongoClientOptions(config.uri));
  try {
    await client.connect();
    await client.db(config.dbName).admin().command({ ping: 1 });
    return {
      reachable: true,
      healthError: null,
    };
  } catch (error) {
    return {
      reachable: false,
      healthError: getErrorMessage(error),
    };
  } finally {
    await client.close().catch(() => undefined);
  }
};

/** Aggregates all sync issues for a specific application. */
const getApplicationSyncIssue = (params: {
  application: MongoBackupApplication;
  local: ApplicationMongoSourceConfig;
  cloud: ApplicationMongoSourceConfig;
  localReachability: MongoSourceReachability;
  cloudReachability: MongoSourceReachability;
}): string | null => {
  const { application, local, cloud, localReachability, cloudReachability } = params;
  const label = MONGO_APPLICATION_LABELS[application];
  const issues = [
    getApplicationSourceConfigIssue(application, 'local', local),
    getApplicationSourceConfigIssue(application, 'cloud', cloud),
    hasSyncConfig(local) && hasSyncConfig(cloud) ? getMongoSyncIssue(local, cloud) : null,
    localReachability.reachable === false
      ? `${label} local MongoDB source is unreachable: ${localReachability.healthError ?? 'Unable to reach MongoDB target.'}`
      : null,
    cloudReachability.reachable === false
      ? `${label} cloud MongoDB source is unreachable: ${cloudReachability.healthError ?? 'Unable to reach MongoDB target.'}`
      : null,
  ].filter((issue): issue is string => issue !== null && issue.trim().length > 0);

  return issues.length > 0 ? issues.join(' ') : null;
};

/** Resolves comprehensive sync status for a specific application. */
const getMongoApplicationSyncStatus = async (
  application: MongoBackupApplication
): Promise<DatabaseEngineMongoAppSyncStatus> => {
  const local = resolveApplicationMongoSourceConfig(application, 'local');
  const cloud = resolveApplicationMongoSourceConfig(application, 'cloud');
  const [localReachability, cloudReachability] = await Promise.all([
    probeMongoConfigReachability(local),
    probeMongoConfigReachability(cloud),
  ]);
  const issue = getApplicationSyncIssue({
    application,
    local,
    cloud,
    localReachability,
    cloudReachability,
  });

  return {
    application,
    localConfigured: hasSyncConfig(local),
    cloudConfigured: hasSyncConfig(cloud),
    localReachable: localReachability.reachable,
    cloudReachable: cloudReachability.reachable,
    canSync:
      hasSyncConfig(local) &&
      hasSyncConfig(cloud) &&
      localReachability.reachable === true &&
      cloudReachability.reachable === true &&
      issue === null,
    issue,
  };
};

/** Resolves sync statuses for all managed applications. */
const getMongoApplicationSyncStatuses =
  async (): Promise<DatabaseEngineMongoAppSyncStatuses> => {
    const statuses = await Promise.all(
      MONGO_BACKUP_APPLICATIONS.map((application) => getMongoApplicationSyncStatus(application))
    );
    return Object.fromEntries(
      statuses.map((status) => [status.application, status])
    ) as DatabaseEngineMongoAppSyncStatuses;
  };

/** Reads the last sync timestamp from the file system. */
const readMongoSourceLastSync = async (): Promise<DatabaseEngineMongoLastSync | null> => {
  try {
    const raw = await fs.readFile(getMongoSourceLastSyncFilePath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const result = databaseEngineMongoLastSyncSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

/** Probes reachability for a specific source identifier ('local' or 'cloud'). */
const probeMongoSourceReachability = async (
  source: MongoSource
): Promise<MongoSourceReachability> => {
  const config = getMongoSourceConfig(source);
  return probeMongoConfigReachability(config);
};

/** Heuristically resolves the first available source. */
const resolveAvailableMongoSource = (): MongoSource | null => {
  const localConfig = getMongoSourceConfig('local');
  const cloudConfig = getMongoSourceConfig('cloud');
  if (localConfig.configured && !cloudConfig.configured) return 'local';
  if (cloudConfig.configured && !localConfig.configured) return 'cloud';
  if (localConfig.configured) return 'local';
  if (cloudConfig.configured) return 'cloud';
  return null;
};

/** Ensures a requested source is properly configured. */
const resolveRequestedMongoSource = (requested: MongoSource): MongoSource => {
  const requestedConfig = getMongoSourceConfig(requested);
  if (requestedConfig.configured) return requested;
  throw configurationError(
    `MongoDB source "${requested}" is not configured. Set ${getMongoSourceUriEnvKey(requested)}.`
  );
};

/** Resolves the default source based on environment override or availability. */
const resolveDefaultMongoSource = (): MongoSource | null => {
  const requested = normalizeMongoSource(process.env[MONGODB_ACTIVE_SOURCE_DEFAULT_ENV]?.trim());
  if (requested) {
    return resolveRequestedMongoSource(requested);
  }
  return resolveAvailableMongoSource();
};

/**
 * Applies a source configuration to the process environment variables.
 * This is critical for parts of the app that rely directly on MONGODB_URI.
 */
const applyMongoSourceEnvSnapshot = (source: MongoSource | null): void => {
  if (!source) return;
  const config = getMongoSourceConfig(source);
  if (!config.configured || !config.uri || !config.dbName) return;
  process.env['MONGODB_URI'] = config.uri;
  process.env['MONGODB_DB'] = config.dbName;
  process.env['MONGODB_ACTIVE_SOURCE'] = source;
};

// Initial boot logic: apply the default source to the environment.
const bootSource = resolveDefaultMongoSource();
applyMongoSourceEnvSnapshot(bootSource);

/**
 * Retrieves the currently active MongoDB source.
 * @returns Active source or null.
 */
export const getActiveMongoSource = async (): Promise<MongoSource | null> => {
  return resolveDefaultMongoSource();
};

/**
 * Resolves configuration for a source, preferring a specified override.
 * 
 * @param preferredSource - Optional preferred source.
 * @returns Resolved MongoSourceConfig.
 * @throws {ConfigurationError} If no valid source can be resolved.
 */
export const resolveMongoSourceConfig = async (
  preferredSource?: MongoSource
): Promise<MongoSourceConfig> => {
  const source = preferredSource
    ? resolveRequestedMongoSource(preferredSource)
    : (await getActiveMongoSource()) ?? resolveAvailableMongoSource();
  if (!source) {
    throw configurationError(
      'No MongoDB source is configured. Set MONGODB_LOCAL_URI or MONGODB_CLOUD_URI.'
    );
  }

  const config = getMongoSourceConfig(source);
  if (!config.configured || !config.uri || !config.dbName) {
    throw configurationError(
      `MongoDB source "${source}" is not configured. Set the corresponding URI and database name.`
    );
  }
  return config;
};

/**
 * Applies a source configuration to the environment variables and returns the config.
 * 
 * @param preferredSource - Optional preferred source.
 * @returns Applied MongoSourceConfig.
 */
export const applyActiveMongoSourceEnv = async (preferredSource?: MongoSource): Promise<MongoSourceConfig> => {
  const config = await resolveMongoSourceConfig(preferredSource);
  process.env['MONGODB_URI'] = config.uri ?? '';
  process.env['MONGODB_DB'] = config.dbName ?? 'app';
  process.env['MONGODB_ACTIVE_SOURCE'] = config.source;
  return config;
};

/**
 * Retrieves the complete state of the MongoDB source subsystem.
 * This includes configuration, reachability, sync status, and managed application health.
 * 
 * @returns Full DatabaseEngineMongoSourceState.
 */
export const getMongoSourceState = async (): Promise<DatabaseEngineMongoSourceState> => {
  const activeSource = await getActiveMongoSource();
  const defaultSource = resolveDefaultMongoSource();
  const lastSync = await readMongoSourceLastSync();
  const syncInProgress = await readMongoSyncLock({ pruneStale: true });
  const local = getMongoSourceConfig('local');
  const cloud = getMongoSourceConfig('cloud');
  const [localReachability, cloudReachability, appStatuses] = await Promise.all([
    probeMongoSourceReachability('local'),
    probeMongoSourceReachability('cloud'),
    getMongoApplicationSyncStatuses(),
  ]);
  const syncIssue =
    getMongoSyncIssue(local, cloud) ??
    getMongoSyncReachabilityIssue(local, localReachability) ??
    getMongoSyncReachabilityIssue(cloud, cloudReachability);
  const sourceToRestore = activeSource ?? defaultSource;
  if (sourceToRestore) {
    await applyActiveMongoSourceEnv(sourceToRestore);
  }

  return {
    timestamp: new Date().toISOString(),
    activeSource,
    defaultSource,
    lastSync,
    syncInProgress,
    local: {
      source: 'local',
      configured: local.configured,
      dbName: local.dbName,
      maskedUri: maskMongoUri(local.uri),
      isActive: activeSource === 'local',
      usesLegacyEnv: local.usesLegacyEnv,
      reachable: localReachability.reachable,
      healthError: localReachability.healthError,
    },
    cloud: {
      source: 'cloud',
      configured: cloud.configured,
      dbName: cloud.dbName,
      maskedUri: maskMongoUri(cloud.uri),
      isActive: activeSource === 'cloud',
      usesLegacyEnv: cloud.usesLegacyEnv,
      reachable: cloudReachability.reachable,
      healthError: cloudReachability.healthError,
    },
    appStatuses,
    canSwitch: local.configured && cloud.configured,
    canSync:
      local.configured &&
      cloud.configured &&
      localReachability.reachable === true &&
      cloudReachability.reachable === true &&
      !syncIssue,
    syncIssue,
  };
};

/** Ensures at least one MongoDB source is available and applies it. */
export const ensureMongoSourceAvailable = async (): Promise<void> => {
  try {
    await applyActiveMongoSourceEnv();
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.mongo-source',
      action: 'ensureMongoSourceAvailable',
    });
    throw error;
  }
};

/** Records a successful sync timestamp to the file system. */
export const recordMongoSourceSync = async (
  lastSync: DatabaseEngineMongoLastSync
): Promise<void> => {
  const filePath = getMongoSourceLastSyncFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(lastSync, null, 2)  }\n`, 'utf8');
};

export const __testOnly = {
  getMongoSourceConfig,
  getMongoSourceLastSyncFilePath,
  isLikelyLocalMongoUri,
  maskMongoUri,
  normalizeMongoSource,
  resolveAvailableMongoSource,
  resolveRequestedMongoSource,
  resolveDefaultMongoSource,
  normalizeMongoSyncComparisonUri,
  probeMongoSourceReachability,
  getMongoApplicationSyncStatus,
  getMongoApplicationSyncStatuses,
};
