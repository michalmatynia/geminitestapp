import 'server-only';

import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export const backupsDir = path.join(process.cwd(), 'prisma', 'backups');

export const ensureBackupsDir = async (): Promise<void> => {
  await fs.mkdir(backupsDir, { recursive: true });
};

export const getDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }
  return databaseUrl;
};

export const getPgConnectionUrl = (): string => {
  const databaseUrl = getDatabaseUrl();
  try {
    const url = new URL(databaseUrl);
    url.searchParams.delete('schema');
    return url.toString();
  } catch {
    return databaseUrl;
  }
};

export const getDatabaseName = (databaseUrl: string): string => {
  try {
    const url = new URL(databaseUrl);
    return url.pathname.replace(/^\//, '') || 'database';
  } catch {
    return 'database';
  }
};

export const getPgDumpCommand = (): string =>
  process.env.PG_DUMP_PATH ?? 'pg_dump';

export const getPgRestoreCommand = (): string =>
  process.env.PG_RESTORE_PATH ?? 'pg_restore';

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
  if (path.extname(backupName) !== '.dump') {
    throw new Error('Invalid backup file type.');
  }
};
