import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type { DatabaseBackupResult, FullDatabaseBackupResult } from '@/shared/contracts/database';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import {
  backupsDir as mongoBackupsDir,
  ensureBackupsDir as ensureMongoBackupsDir,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoDumpCommand,
  execFileAsync as mongoExecFileAsync,
} from '@/shared/lib/db/utils/mongo';
import {
  backupsDir as pgBackupsDir,
  ensureBackupsDir as ensurePgBackupsDir,
  getDatabaseName,
  getPgConnectionUrl,
  getPgDumpCommand,
  execFileAsync as pgExecFileAsync,
} from '@/shared/lib/db/utils/postgres';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { DatabaseBackupResult, FullDatabaseBackupResult };

const shouldSkipBackups = (): boolean => process.env['SKIP_DB_BACKUP'] === 'true';

const assertBackupsAllowed = (): void => {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database backups are disabled in production.');
  }
};

export const createMongoBackup = async (): Promise<DatabaseBackupResult> => {
  assertBackupsAllowed();
  const mongoUri = getMongoConnectionUrl();
  const databaseName = getMongoDatabaseName();
  await ensureMongoBackupsDir();

  const backupName = `${databaseName}-backup-${Date.now()}.archive`;
  const backupPath = path.join(mongoBackupsDir, backupName);
  const logPath = path.join(mongoBackupsDir, `${backupName}.log`);

  const command = getMongoDumpCommand();
  const args = ['--uri', mongoUri, '--db', databaseName, '--archive=' + backupPath, '--gzip'];
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
      message: 'Backup created',
      backupName,
      log: logContent,
    };
  } catch (error) {
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
        message: 'Backup created with warnings',
        backupName,
        warning: details || message,
        log: logContent,
      };
    }

    throw operationFailedError('Failed to create MongoDB backup', error, { details });
  }
};

export const createPostgresBackup = async (): Promise<DatabaseBackupResult> => {
  assertBackupsAllowed();
  const databaseUrl = getPgConnectionUrl();
  const databaseName = getDatabaseName(databaseUrl);
  await ensurePgBackupsDir();

  const backupName = `${databaseName}-backup-${Date.now()}.dump`;
  const backupPath = path.join(pgBackupsDir, backupName);
  const logPath = path.join(pgBackupsDir, `${backupName}.log`);

  const command = getPgDumpCommand();
  const args = ['-Fc', '--file', backupPath, '--dbname', databaseUrl];
  const commandString = `${command} ${args.join(' ')}`;

  let stdout: string;
  let stderr: string;
  try {
    const result = await pgExecFileAsync(command, args);
    stdout = result.stdout;
    stderr = result.stderr;

    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
    await fs.writeFile(logPath, logContent);

    return {
      message: 'Backup created',
      backupName,
      log: logContent,
    };
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'database-backup-postgres',
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
        message: 'Backup created with warnings',
        backupName,
        warning: details || message,
        log: logContent,
      };
    }

    throw operationFailedError('Failed to create Postgres backup', error, { details });
  }
};

export const createFullDatabaseBackup = async (): Promise<FullDatabaseBackupResult> => {
  if (shouldSkipBackups()) {
    const timestamp = Date.now();
    const message = 'Backup skipped (SKIP_DB_BACKUP=true)';
    const log = `Skipped backup at ${new Date(timestamp).toISOString()}`;
    return {
      mongo: { message, backupName: `skipped-mongo-${timestamp}`, log },
      postgres: { message, backupName: `skipped-postgres-${timestamp}`, log },
    };
  }
  assertBackupsAllowed();
  const mongo = await createMongoBackup();
  const postgres = await createPostgresBackup();
  return { mongo, postgres };
};
