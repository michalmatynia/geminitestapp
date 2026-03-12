import 'server-only';

import type { DatabaseBackupResult } from './database-backup';

const DATABASE_JSON_BACKUP_REMOVED_MESSAGE =
  'JSON backup restore is unavailable because the legacy SQL backup pipeline has been removed.';

export async function createDatabaseJsonBackup(): Promise<DatabaseBackupResult> {
  throw new Error(DATABASE_JSON_BACKUP_REMOVED_MESSAGE);
}

export async function restoreDatabaseJsonBackup(
  _backupName: string
): Promise<DatabaseBackupResult> {
  throw new Error(DATABASE_JSON_BACKUP_REMOVED_MESSAGE);
}

export async function listJsonBackups(): Promise<string[]> {
  return [];
}
