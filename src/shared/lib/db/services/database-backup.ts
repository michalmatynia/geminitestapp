import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type { DatabaseBackupResult } from '@/shared/contracts/database';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
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
        message: 'Backup created with warnings',
        backupName,
        warning: details || message,
        log: logContent,
      };
    }

    throw operationFailedError('Failed to create MongoDB backup', error, { details });
  }
};
