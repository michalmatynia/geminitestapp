import 'server-only';

import { operationFailedError } from '@/shared/errors/app-error';

const DATABASE_COLLECTION_COPY_REMOVED_MESSAGE =
  'Collection copy is unavailable because the legacy SQL copy pipeline has been removed. The application is MongoDB-only.';

export function getSupportedCollections(): string[] {
  return [];
}

export function copyCollection(): Promise<never> {
  return Promise.reject(operationFailedError(DATABASE_COLLECTION_COPY_REMOVED_MESSAGE));
}
