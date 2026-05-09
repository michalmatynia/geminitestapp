/**
 * Database Collection Copy (Legacy)
 * 
 * Legacy collection copy functionality that has been removed.
 * Provides:
 * - Stub implementations for removed SQL copy pipeline
 * - Error messages for unavailable functionality
 * - Migration guidance to MongoDB-only architecture
 * - Graceful degradation for legacy code paths
 */

import 'server-only';

import { operationFailedError } from '@/shared/errors/app-error';

/** Error message for removed collection copy functionality */
const DATABASE_COLLECTION_COPY_REMOVED_MESSAGE =
  'Collection copy is unavailable because the legacy SQL copy pipeline has been removed. The application is MongoDB-only.';

/**
 * Returns empty list of supported collections (legacy functionality removed)
 * @returns Empty array as collection copy is no longer supported
 */
export function getSupportedCollections(): string[] {
  return [];
}

/**
 * Throws error for removed collection copy functionality
 * @returns Promise that rejects with operation failed error
 */
export function copyCollection(): Promise<never> {
  return Promise.reject(operationFailedError(DATABASE_COLLECTION_COPY_REMOVED_MESSAGE));
}
