import 'server-only';

import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

import { badRequestError, configurationError } from '@/shared/errors/app-error';

export const backupsDir = path.join(process.cwd(), 'mongo', 'backups');

export const ensureBackupsDir = async (): Promise<void> => {
  await fs.mkdir(backupsDir, { recursive: true });
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
  const basename = path.basename(backupName);
  if (basename !== backupName) {
    throw badRequestError('Invalid backup name.');
  }
  if (path.extname(backupName) !== '.archive') {
    throw badRequestError('Invalid backup file type.');
  }
};
