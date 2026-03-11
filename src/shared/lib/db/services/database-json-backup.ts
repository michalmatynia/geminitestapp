import 'server-only';

import type { DatabaseBackupResult } from './database-backup';

const DATABASE_JSON_BACKUP_REMOVED_MESSAGE =
  'JSON backup restore for Prisma/PostgreSQL is unavailable because Prisma/PostgreSQL has been removed.';

export async function createPrismaJsonBackup(): Promise<DatabaseBackupResult> {
  throw new Error(DATABASE_JSON_BACKUP_REMOVED_MESSAGE);
}

export async function restorePrismaJsonBackup(
  _backupName: string
): Promise<DatabaseBackupResult> {
  throw new Error(DATABASE_JSON_BACKUP_REMOVED_MESSAGE);
}

export async function listJsonBackups(): Promise<string[]> {
  return [];
}
