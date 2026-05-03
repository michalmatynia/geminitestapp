import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type {
  DatabaseBackupResult,
  DatabaseEngineMongoSyncBackup,
  DatabaseEngineMongoSyncBackupRole,
  DatabaseEngineMongoSyncDirection,
  MongoSource,
} from '@/shared/contracts/database';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import { resolveMongoSourceConfig } from '@/shared/lib/db/mongo-source';
import {
  backupsDir as mongoBackupsDir,
  ensureBackupsDir as ensureMongoBackupsDir,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoDumpCommand,
  execFileAsync as mongoExecFileAsync,
} from '@/shared/lib/db/utils/mongo';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { DatabaseBackupResult };

type MongoBackupExecutionResult = {
  backupName: string;
  backupPath: string;
  logPath: string;
  logContent: string;
  warning: string | null;
};

const assertBackupsAllowed = (): void => {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database backups are disabled in production.');
  }
};

const sanitizeBackupSegment = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sanitized = normalized.replace(/^-+|-+$/g, '');
  return sanitized.length > 0 ? sanitized : 'backup';
};

const buildMongoBackupName = (
  databaseName: string,
  timestamp: number,
  descriptor?: string
): string => {
  if (descriptor === undefined || descriptor.trim().length === 0) {
    return `${databaseName}-backup-${timestamp}.archive`;
  }

  return `${sanitizeBackupSegment(databaseName)}-${sanitizeBackupSegment(descriptor)}-${timestamp}.archive`;
};

const redactMongoUri = (value: string): string =>
  value.replace(
    /(mongodb(?:\+srv)?:\/\/)([^@/\s]+)@/g,
    (_match, prefix: string, auth: string) => {
      const [rawUsername] = auth.split(':');
      const username = rawUsername === undefined || rawUsername === '' ? '***' : rawUsername;
      return `${prefix}${username}:***@`;
    }
  );

const readMongoToolOutput = (
  error: unknown
): { stdout: string; stderr: string } => {
  const cause = (error as { cause?: { stdout?: unknown; stderr?: unknown } }).cause;
  return {
    stdout: typeof cause?.stdout === 'string' ? cause.stdout : '',
    stderr: typeof cause?.stderr === 'string' ? cause.stderr : '',
  };
};

const requireMongoConfigValue = (value: string | null, label: string): string => {
  if (value === null || value.trim().length === 0) {
    throw operationFailedError(`MongoDB source backup requires ${label} to be configured.`);
  }
  return value;
};

const runMongoBackup = async (params: {
  mongoUri: string;
  databaseName: string;
  backupName: string;
}): Promise<MongoBackupExecutionResult> => {
  await ensureMongoBackupsDir();
  const { mongoUri, databaseName, backupName } = params;
  const backupPath = path.join(mongoBackupsDir, backupName);
  const logPath = path.join(mongoBackupsDir, `${backupName}.log`);

  const command = getMongoDumpCommand();
  const args = ['--uri', mongoUri, '--db', databaseName, `--archive=${backupPath}`, '--gzip'];
  const commandString = `${command} ${args.map(redactMongoUri).join(' ')}`;

  let stdout: string;
  let stderr: string;
  try {
    const result = await mongoExecFileAsync(command, args);
    stdout = result.stdout;
    stderr = result.stderr;

    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
    await fs.writeFile(logPath, logContent);

    return {
      backupName,
      backupPath,
      logPath,
      logContent,
      warning: null,
    };
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'database-backup-mongo',
      databaseName,
    });
    const message = error instanceof Error ? error.message : 'Unknown error';
    const output = readMongoToolOutput(error);
    stdout = output.stdout;
    stderr = output.stderr;

    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}\n\nerror:\n${message}`;
    await fs.writeFile(logPath, logContent);

    const trimmedStderr = stderr.trim();
    const details = trimmedStderr.length > 0 ? trimmedStderr : message;
    const stat = await fs.stat(backupPath).catch(() => null);
    if (stat !== null && stat.size > 0) {
      return {
        backupName,
        warning: details,
        backupPath,
        logPath,
        logContent,
      };
    }

    throw operationFailedError('Failed to create MongoDB backup', error, { details });
  }
};

export const createMongoBackup = async (): Promise<DatabaseBackupResult> => {
  assertBackupsAllowed();
  const mongoUri = getMongoConnectionUrl();
  const databaseName = getMongoDatabaseName();
  const timestamp = Date.now();
  const result = await runMongoBackup({
    mongoUri,
    databaseName,
    backupName: buildMongoBackupName(databaseName, timestamp),
  });

  return {
    message:
      result.warning !== null && result.warning !== ''
        ? 'Backup created with warnings'
        : 'Backup created',
    backupName: result.backupName,
    warning: result.warning ?? undefined,
    log: result.logContent,
  };
};

export const createMongoSourceBackup = async (params: {
  source: MongoSource;
  role: DatabaseEngineMongoSyncBackupRole;
  direction: DatabaseEngineMongoSyncDirection;
  timestamp?: number;
}): Promise<DatabaseEngineMongoSyncBackup> => {
  assertBackupsAllowed();

  const { source, role, direction } = params;
  const timestamp = params.timestamp ?? Date.now();
  const createdAt = new Date(timestamp).toISOString();
  const config = await resolveMongoSourceConfig(source);
  const databaseName = requireMongoConfigValue(config.dbName, `${source} database name`);
  const result = await runMongoBackup({
    mongoUri: requireMongoConfigValue(config.uri, `${source} URI`),
    databaseName,
    backupName: buildMongoBackupName(
      databaseName,
      timestamp,
      `${source}-${role}-pre-sync-${direction}`
    ),
  });

  return {
    role,
    source,
    backupName: result.backupName,
    backupPath: result.backupPath,
    logPath: result.logPath,
    createdAt,
    warning: result.warning,
  };
};
