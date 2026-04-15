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
  return normalized.replace(/^-+|-+$/g, '') || 'backup';
};

const buildMongoBackupName = (
  databaseName: string,
  timestamp: number,
  descriptor?: string
): string => {
  if (!descriptor) {
    return `${databaseName}-backup-${timestamp}.archive`;
  }

  return `${sanitizeBackupSegment(databaseName)}-${sanitizeBackupSegment(descriptor)}-${timestamp}.archive`;
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
  const args = ['--uri', mongoUri, '--db', databaseName, `--archive=${  backupPath}`, '--gzip'];
  const commandString = `${command} ${args.join(' ')}`;

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
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'database-backup-mongo',
      databaseName,
    });
    const message = error instanceof Error ? error.message : 'Unknown error';
    const cause = (error as { cause?: { stdout?: string; stderr?: string } }).cause;
    stdout = cause?.stdout || '';
    stderr = cause?.stderr || '';

    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}\n\nerror:\n${message}`;
    await fs.writeFile(logPath, logContent);

    const details = stderr.trim() || message;
    const stat = await fs.stat(backupPath).catch(() => null);
    if (stat && stat.size > 0) {
      return {
        backupName,
        warning: details || message,
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
    message: result.warning ? 'Backup created with warnings' : 'Backup created',
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
  const result = await runMongoBackup({
    mongoUri: config.uri!,
    databaseName: config.dbName!,
    backupName: buildMongoBackupName(
      config.dbName!,
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
