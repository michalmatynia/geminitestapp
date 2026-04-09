import 'server-only';

import { readFileSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';

import type { DatabaseEngineMongoSourceState, MongoSource } from '@/shared/contracts/database';
import { configurationError } from '@/shared/errors/app-error';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

const MONGODB_ACTIVE_SOURCE_FILE_ENV = 'MONGODB_ACTIVE_SOURCE_FILE';
const MONGODB_ACTIVE_SOURCE_DEFAULT_ENV = 'MONGODB_ACTIVE_SOURCE_DEFAULT';
const DEFAULT_MONGODB_SOURCE_FILE_PATH = path.join(
  process.cwd(),
  'mongo',
  'runtime',
  'active-source.json'
);
const INITIAL_MONGODB_URI = process.env['MONGODB_URI']?.trim() ?? '';
const INITIAL_MONGODB_DB = process.env['MONGODB_DB']?.trim() ?? 'app';

type MongoSourceConfig = {
  source: MongoSource;
  configured: boolean;
  uri: string | null;
  dbName: string | null;
  usesLegacyEnv: boolean;
};

const normalizeMongoSource = (value: unknown): MongoSource | null =>
  value === 'local' || value === 'cloud' ? value : null;

const getMongoSourceFilePath = (): string =>
  process.env[MONGODB_ACTIVE_SOURCE_FILE_ENV]?.trim() || DEFAULT_MONGODB_SOURCE_FILE_PATH;

const getExplicitMongoUri = (source: MongoSource): string => {
  const key = source === 'local' ? 'MONGODB_LOCAL_URI' : 'MONGODB_CLOUD_URI';
  return process.env[key]?.trim() ?? '';
};

const getExplicitMongoDb = (source: MongoSource): string => {
  const key = source === 'local' ? 'MONGODB_LOCAL_DB' : 'MONGODB_CLOUD_DB';
  return process.env[key]?.trim() ?? '';
};

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

const readStoredMongoSourceSync = (): MongoSource | null => {
  try {
    const raw = readFileSync(getMongoSourceFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as { source?: unknown } | null;
    return normalizeMongoSource(parsed?.source);
  } catch {
    return null;
  }
};

const readStoredMongoSource = async (): Promise<MongoSource | null> => {
  try {
    const raw = await fs.readFile(getMongoSourceFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as { source?: unknown } | null;
    return normalizeMongoSource(parsed?.source);
  } catch {
    return null;
  }
};

const resolveConfiguredMongoSource = (requested: MongoSource | null): MongoSource | null => {
  if (requested) {
    const requestedConfig = getMongoSourceConfig(requested);
    if (requestedConfig.configured) return requested;
  }

  const localConfig = getMongoSourceConfig('local');
  const cloudConfig = getMongoSourceConfig('cloud');
  if (localConfig.configured && !cloudConfig.configured) return 'local';
  if (cloudConfig.configured && !localConfig.configured) return 'cloud';
  if (localConfig.configured) return 'local';
  if (cloudConfig.configured) return 'cloud';
  return null;
};

const resolveDefaultMongoSource = (): MongoSource | null =>
  resolveConfiguredMongoSource(
    normalizeMongoSource(process.env[MONGODB_ACTIVE_SOURCE_DEFAULT_ENV]?.trim())
  );

const applyMongoSourceEnvSnapshot = (source: MongoSource | null): void => {
  if (!source) return;
  const config = getMongoSourceConfig(source);
  if (!config.configured || !config.uri || !config.dbName) return;
  process.env['MONGODB_URI'] = config.uri;
  process.env['MONGODB_DB'] = config.dbName;
  process.env['MONGODB_ACTIVE_SOURCE'] = source;
};

const bootSource = resolveConfiguredMongoSource(readStoredMongoSourceSync()) ?? resolveDefaultMongoSource();
applyMongoSourceEnvSnapshot(bootSource);

export const getActiveMongoSource = async (): Promise<MongoSource | null> => {
  const storedSource = await readStoredMongoSource();
  const resolvedStoredSource = resolveConfiguredMongoSource(storedSource);
  if (resolvedStoredSource) return resolvedStoredSource;
  return resolveDefaultMongoSource();
};

export const resolveMongoSourceConfig = async (
  preferredSource?: MongoSource
): Promise<MongoSourceConfig> => {
  const source =
    resolveConfiguredMongoSource(preferredSource ?? null) ?? (await getActiveMongoSource());
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

export const applyActiveMongoSourceEnv = async (preferredSource?: MongoSource): Promise<MongoSourceConfig> => {
  const config = await resolveMongoSourceConfig(preferredSource);
  process.env['MONGODB_URI'] = config.uri ?? '';
  process.env['MONGODB_DB'] = config.dbName ?? 'app';
  process.env['MONGODB_ACTIVE_SOURCE'] = config.source;
  return config;
};

export const setActiveMongoSource = async (source: MongoSource): Promise<void> => {
  const config = getMongoSourceConfig(source);
  if (!config.configured || !config.uri || !config.dbName) {
    throw configurationError(
      `MongoDB source "${source}" is not configured. Set the corresponding URI and database name.`
    );
  }

  const filePath = getMongoSourceFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        source,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  await applyActiveMongoSourceEnv(source);
};

export const getMongoSourceState = async (): Promise<DatabaseEngineMongoSourceState> => {
  const activeSource = await getActiveMongoSource();
  const defaultSource = resolveDefaultMongoSource();
  const local = getMongoSourceConfig('local');
  const cloud = getMongoSourceConfig('cloud');

  return {
    timestamp: new Date().toISOString(),
    activeSource,
    defaultSource,
    sourceFilePath: getMongoSourceFilePath(),
    local: {
      source: 'local',
      configured: local.configured,
      dbName: local.dbName,
      maskedUri: maskMongoUri(local.uri),
      isActive: activeSource === 'local',
      usesLegacyEnv: local.usesLegacyEnv,
    },
    cloud: {
      source: 'cloud',
      configured: cloud.configured,
      dbName: cloud.dbName,
      maskedUri: maskMongoUri(cloud.uri),
      isActive: activeSource === 'cloud',
      usesLegacyEnv: cloud.usesLegacyEnv,
    },
    canSwitch: local.configured && cloud.configured,
  };
};

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

export const __testOnly = {
  getMongoSourceConfig,
  getMongoSourceFilePath,
  isLikelyLocalMongoUri,
  maskMongoUri,
  normalizeMongoSource,
  resolveConfiguredMongoSource,
  resolveDefaultMongoSource,
};
