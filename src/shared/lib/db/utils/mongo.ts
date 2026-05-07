/**
 * MongoDB Utilities
 * 
 * Server-side utilities for MongoDB operations and management.
 * Provides:
 * - Backup directory management
 * - Child process execution for MongoDB tools
 * - File system operations for backups
 * - Configuration validation
 * - Error handling for MongoDB operations
 */

import 'server-only';

import { execFile } from 'child_process';
import { existsSync, readFileSync, promises as fs } from 'fs';
import path from 'path';

import type { MongoSource } from '@/shared/contracts/database';
import { badRequestError, configurationError } from '@/shared/errors/app-error';

export const MONGO_BACKUP_APPLICATIONS = ['geminitestapp', 'studiq', 'cms-builder'] as const;
export type MongoBackupApplication = (typeof MONGO_BACKUP_APPLICATIONS)[number];

export type MongoApplicationSourceConfig = {
  source: MongoSource;
  configured: boolean;
  uri: string | null;
  dbName: string | null;
  usesLegacyEnv: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const findWorkspaceRoot = (startDir: string): string => {
  let current = path.resolve(startDir);

  for (let index = 0; index < 8; index += 1) {
    const packageJsonPath = path.join(current, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as unknown;
        if (isRecord(parsed) && Array.isArray(parsed['workspaces'])) {
          return current;
        }
      } catch {
        return current;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return path.resolve(startDir);
};

export const workspaceRoot = findWorkspaceRoot(process.cwd());
export const legacyBackupsDir = path.join(workspaceRoot, 'mongo', 'backups');

const resolveBackupsDir = (): string => {
  const configured =
    process.env['MONGO_BACKUPS_DIR']?.trim() || process.env['DATABASE_BACKUPS_DIR']?.trim();
  if (configured) {
    return path.resolve(workspaceRoot, configured);
  }

  return path.resolve(workspaceRoot, '..', 'database', 'mongo-backups');
};

export const backupsDir = resolveBackupsDir();

export const ensureBackupsDir = async (): Promise<void> => {
  await fs.mkdir(backupsDir, { recursive: true });
  await Promise.all(
    MONGO_BACKUP_APPLICATIONS.map((application) =>
      fs.mkdir(path.join(backupsDir, application), { recursive: true })
    )
  );
};

export const getMongoConnectionUrl = (): string => {
  const mongoUri = process.env['MONGODB_URI']?.trim();
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) {
    throw configurationError('MONGODB_URI is not set.');
  }
  return mongoUri;
};

export const getMongoDatabaseName = (): string => {
  const dbName = process.env['MONGODB_DB']?.trim();
  if (typeof dbName !== 'string' || dbName.length === 0) {
    throw configurationError('MONGODB_DB is not set.');
  }
  return dbName;
};

export const getMongoDumpCommand = (): string => process.env['MONGODUMP_PATH'] ?? 'mongodump';

export const getMongoRestoreCommand = (): string =>
  process.env['MONGORESTORE_PATH'] ?? 'mongorestore';

const firstTrimmedEnvValue = (...keys: string[]): string => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value !== undefined && value.length > 0) return value;
  }
  return '';
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

const getDatabaseNameFromMongoUri = (uri: string): string | null => {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\/+/, '').trim();
    return dbName.length > 0 ? dbName : null;
  } catch {
    return null;
  }
};

export const resolveStudiqMongoSourceConfig = (
  source: MongoSource
): MongoApplicationSourceConfig => {
  const explicitUri =
    source === 'local'
      ? firstTrimmedEnvValue('STUDIQ_MONGODB_LOCAL_URI', 'MONGODB_STUDIQ_LOCAL_URI')
      : firstTrimmedEnvValue('STUDIQ_MONGODB_CLOUD_URI', 'MONGODB_STUDIQ_CLOUD_URI');
  const explicitDbName =
    source === 'local'
      ? firstTrimmedEnvValue('STUDIQ_MONGODB_LOCAL_DB', 'MONGODB_STUDIQ_LOCAL_DB')
      : firstTrimmedEnvValue('STUDIQ_MONGODB_CLOUD_DB', 'MONGODB_STUDIQ_CLOUD_DB');

  if (explicitUri.length > 0) {
    return {
      source,
      configured: true,
      uri: explicitUri,
      dbName: explicitDbName || getDatabaseNameFromMongoUri(explicitUri),
      usesLegacyEnv: false,
    };
  }

  const legacyUri = firstTrimmedEnvValue('STUDIQ_MONGODB_URI', 'MONGODB_STUDIQ_URI');
  const legacyDbName = firstTrimmedEnvValue('STUDIQ_MONGODB_DB', 'MONGODB_STUDIQ_DB');
  if (legacyUri.length > 0) {
    const legacyIsLocal = isLikelyLocalMongoUri(legacyUri);
    if ((source === 'local' && legacyIsLocal) || (source === 'cloud' && !legacyIsLocal)) {
      return {
        source,
        configured: true,
        uri: legacyUri,
        dbName: legacyDbName || getDatabaseNameFromMongoUri(legacyUri),
        usesLegacyEnv: true,
      };
    }
  }

  if (source === 'local') {
    return {
      source,
      configured: true,
      uri: 'mongodb://127.0.0.1:27018/studiq_local',
      dbName: 'studiq_local',
      usesLegacyEnv: false,
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

export const getStudiqMongoConnectionUrl = (): string =>
  resolveStudiqMongoSourceConfig('local').uri ?? 'mongodb://127.0.0.1:27018/studiq_local';

export const getStudiqMongoDatabaseName = (): string =>
  resolveStudiqMongoSourceConfig('local').dbName ?? 'studiq_local';

export const resolveCmsBuilderMongoSourceConfig = (
  source: MongoSource
): MongoApplicationSourceConfig => {
  const explicitUri =
    source === 'local'
      ? firstTrimmedEnvValue('CMS_BUILDER_MONGODB_LOCAL_URI', 'MONGODB_CMS_BUILDER_LOCAL_URI')
      : firstTrimmedEnvValue('CMS_BUILDER_MONGODB_CLOUD_URI', 'MONGODB_CMS_BUILDER_CLOUD_URI');
  const explicitDbName =
    source === 'local'
      ? firstTrimmedEnvValue('CMS_BUILDER_MONGODB_LOCAL_DB', 'MONGODB_CMS_BUILDER_LOCAL_DB')
      : firstTrimmedEnvValue('CMS_BUILDER_MONGODB_CLOUD_DB', 'MONGODB_CMS_BUILDER_CLOUD_DB');

  if (explicitUri.length > 0) {
    return {
      source,
      configured: true,
      uri: explicitUri,
      dbName: explicitDbName || getDatabaseNameFromMongoUri(explicitUri),
      usesLegacyEnv: false,
    };
  }

  const legacyUri = firstTrimmedEnvValue('CMS_BUILDER_MONGODB_URI', 'MONGODB_CMS_BUILDER_URI');
  const legacyDbName = firstTrimmedEnvValue('CMS_BUILDER_MONGODB_DB', 'MONGODB_CMS_BUILDER_DB');
  if (legacyUri.length > 0) {
    const legacyIsLocal = isLikelyLocalMongoUri(legacyUri);
    if ((source === 'local' && legacyIsLocal) || (source === 'cloud' && !legacyIsLocal)) {
      return {
        source,
        configured: true,
        uri: legacyUri,
        dbName: legacyDbName || getDatabaseNameFromMongoUri(legacyUri),
        usesLegacyEnv: true,
      };
    }
  }

  if (source === 'local') {
    return {
      source,
      configured: true,
      uri: 'mongodb://127.0.0.1:27019/cms_builder_local',
      dbName: 'cms_builder_local',
      usesLegacyEnv: false,
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

export const getCmsBuilderMongoConnectionUrl = (): string =>
  resolveCmsBuilderMongoSourceConfig('local').uri ??
  'mongodb://127.0.0.1:27019/cms_builder_local';

export const getCmsBuilderMongoDatabaseName = (): string =>
  resolveCmsBuilderMongoSourceConfig('local').dbName ?? 'cms_builder_local';

const DEFAULT_MONGO_TOOL_MAX_BUFFER_BYTES = 128 * 1024 * 1024;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const TRANSIENT_MONGO_ERROR_CONSTRUCTORS = new Set([
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoTopologyClosedError',
  'MongoServerClosedError',
]);

const TRANSIENT_MONGO_ERROR_FRAGMENTS = [
  'server selection',
  'topology closed',
  'econn',
  'connection refused',
  'connection closed',
];

export const isTransientMongoConnectionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const constructorName = error.constructor.name;
  const normalized = `${constructorName} ${error.name} ${error.message}`.toLowerCase();

  return (
    TRANSIENT_MONGO_ERROR_CONSTRUCTORS.has(constructorName) ||
    TRANSIENT_MONGO_ERROR_FRAGMENTS.some((fragment) => normalized.includes(fragment)) ||
    (normalized.includes('connection') && normalized.includes('timed out'))
  );
};

export const execFileAsync = (
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> =>
  new Promise(
    (
      resolve: (value: { stdout: string; stderr: string }) => void,
      reject: (reason?: unknown) => void
    ) => {
      execFile(
        command,
        args,
        {
          maxBuffer: parsePositiveInt(
            process.env['MONGO_TOOL_MAX_BUFFER_BYTES'],
            DEFAULT_MONGO_TOOL_MAX_BUFFER_BYTES
          ),
        },
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            const wrapped = new Error(error.message);
            (wrapped as { cause?: { stdout: string; stderr: string } }).cause = {
              stdout,
              stderr,
            };
            reject(wrapped);
            return;
          }
          resolve({ stdout, stderr });
        }
      );
    }
  );

export const assertValidBackupName = (backupName: string): void => {
  if (backupName.includes('\\') || path.isAbsolute(backupName)) {
    throw badRequestError('Invalid backup name.');
  }

  const segments = backupName.split('/');
  const basename = segments.at(-1) ?? '';
  const hasUnsafeSegment = segments.some(
    (segment) => segment.length === 0 || segment === '.' || segment === '..'
  );
  if (hasUnsafeSegment || segments.length > 2) {
    throw badRequestError('Invalid backup name.');
  }

  if (
    segments.length === 2 &&
    !MONGO_BACKUP_APPLICATIONS.includes(segments[0] as MongoBackupApplication)
  ) {
    throw badRequestError('Invalid backup application folder.');
  }

  if (path.basename(basename) !== basename) {
    throw badRequestError('Invalid backup name.');
  }

  if (path.extname(basename) !== '.archive') {
    throw badRequestError('Invalid backup file type.');
  }
};

export const getMongoBackupApplication = (backupName: string): MongoBackupApplication => {
  const [firstSegment] = backupName.split('/');
  return MONGO_BACKUP_APPLICATIONS.includes(firstSegment as MongoBackupApplication)
    ? (firstSegment as MongoBackupApplication)
    : 'geminitestapp';
};

export const buildMongoBackupName = (
  application: MongoBackupApplication,
  archiveName: string
): string => {
  assertValidBackupName(archiveName);
  return `${application}/${path.basename(archiveName)}`;
};

export const getMongoBackupPath = (backupName: string): string => {
  assertValidBackupName(backupName);
  return path.join(backupsDir, backupName);
};

export const resolveMongoBackupPath = async (backupName: string): Promise<string> => {
  assertValidBackupName(backupName);
  const primaryPath = getMongoBackupPath(backupName);
  try {
    await fs.access(primaryPath);
    return primaryPath;
  } catch {
    if (!backupName.includes('/')) {
      return path.join(legacyBackupsDir, backupName);
    }
    return primaryPath;
  }
};
