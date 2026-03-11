import 'server-only';

import type {
  DatabaseSyncCollectionResult,
  DatabaseSyncDirection,
  DatabaseSyncOptions,
  DatabaseSyncResult,
} from '@/shared/contracts/database';
import { operationFailedError } from '@/shared/errors/app-error';

export type { DatabaseSyncCollectionResult };

const DATABASE_SYNC_REMOVED_MESSAGE =
  'Database sync is unavailable because Prisma/PostgreSQL has been removed. The application is MongoDB-only.';

export async function runDatabaseSync(
  _direction: DatabaseSyncDirection,
  _options?: DatabaseSyncOptions
): Promise<DatabaseSyncResult> {
  throw operationFailedError(DATABASE_SYNC_REMOVED_MESSAGE);
}
