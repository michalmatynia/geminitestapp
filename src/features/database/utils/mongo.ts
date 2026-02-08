import 'server-only';

import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export const backupsDir = path.join(process.cwd(), 'mongo', 'backups');

export const ensureBackupsDir = async (): Promise<void> => {
  await fs.mkdir(backupsDir, { recursive: true });
};

export const getMongoConnectionUrl = (): string => {
  const mongoUri = process.env['MONGODB_URI'];
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set.');
  }
  return mongoUri;
};

export const getMongoDatabaseName = (): string => {
  const dbName = process.env['MONGODB_DB'];
  if (!dbName) {
    throw new Error('MONGODB_DB is not set.');
  }
  return dbName;
};

export const getMongoDumpCommand = (): string =>
  process.env['MONGODUMP_PATH'] ?? 'mongodump';

export const getMongoRestoreCommand = (): string =>
  process.env['MONGORESTORE_PATH'] ?? 'mongorestore';

export const execFileAsync = (
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve: (value: { stdout: string; stderr: string }) => void, reject: (reason?: unknown) => void) => {
    execFile(command, args, (error: Error | null, stdout: string, stderr: string) => {
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
    });
  });

export const assertValidBackupName = (backupName: string): void => {
  const basename = path.basename(backupName);
  if (basename !== backupName) {
    throw new Error('Invalid backup name.');
  }
  if (path.extname(backupName) !== '.archive') {
    throw new Error('Invalid backup file type.');
  }
};
