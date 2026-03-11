import 'server-only';

import { operationFailedError } from '@/shared/errors/app-error';

const DATABASE_COLLECTION_COPY_REMOVED_MESSAGE =
  'Collection copy is unavailable because Prisma/PostgreSQL has been removed. The application is MongoDB-only.';

export function getSupportedCollections(): string[] {
  return [];
}

export async function copyCollection(): Promise<never> {
  throw operationFailedError(DATABASE_COLLECTION_COPY_REMOVED_MESSAGE);
}
