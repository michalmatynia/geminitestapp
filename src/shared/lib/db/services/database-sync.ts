import 'server-only';

import { operationFailedError } from '@/shared/errors/app-error';

const DATABASE_SYNC_REMOVED_MESSAGE =
  'Database sync is unavailable because Prisma/PostgreSQL has been removed. The application is MongoDB-only.';

export async function runDatabaseSync(): Promise<never> {
  throw operationFailedError(DATABASE_SYNC_REMOVED_MESSAGE);
}
