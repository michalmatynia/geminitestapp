/**
 * MongoDB Write Retry Manager
 * 
 * Provides a specialized retry and queuing mechanism for MongoDB write operations
 * that may encounter "single writer" or compaction conflicts. This is particularly 
 * useful for storage engines or configurations that enforce strict single-writer 
 * constraints.
 * 
 * Features:
 * - Exponential backoff for conflict retries.
 * - Queue-based serialized execution per key.
 * - Automatic detection of single-writer conflict error patterns.
 * - Observability via the ErrorSystem.
 */

import 'server-only';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Known error message patterns that indicate a single-writer conflict.
 */
const SINGLE_WRITER_ERROR_PATTERNS = [
  'Another write batch or compaction is already active',
  'Only a single write operations is allowed at a time',
] as const;

/** Default maximum number of retry attempts. */
const DEFAULT_MAX_ATTEMPTS = 4;

/** Initial delay before the first retry. */
const DEFAULT_RETRY_DELAY_MS = 25;

/** Maximum allowed delay between retries. */
const DEFAULT_MAX_RETRY_DELAY_MS = 150;

/** Default key for the global write queue. */
const DEFAULT_QUEUE_KEY = 'mongodb-single-writer';

/** Map of active write queues (promises) identified by key. */
const mongoWriteQueues = new Map<string, Promise<void>>();

/** Simple async sleep helper. */
const sleep = async (delayMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

/** Normalizes and extracts the message from an unknown error object. */
const readErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return '';
};

/**
 * Determines if an error represents a MongoDB single-writer conflict.
 * 
 * @param error - The error to check.
 * @returns True if it's a conflict error.
 */
export const isMongoSingleWriterConflictError = (error: unknown): boolean => {
  const message = readErrorMessage(error);
  return SINGLE_WRITER_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

/**
 * Executes a MongoDB write operation with retry logic and queuing.
 * Operations with the same `queueKey` are serialized to prevent concurrent 
 * conflict errors.
 * 
 * @param operation - The async operation to execute.
 * @param options - Optional configuration for retry behavior.
 * @returns The result of the operation.
 * @throws The original error if max attempts are exceeded or if it's not a conflict error.
 */
export const executeMongoWriteWithRetry = async <T>(
  operation: () => Promise<T>,
  options?: {
    /** Maximum number of attempts (including the first). */
    maxAttempts?: number;
    /** Key to identify the serialization queue. */
    queueKey?: string;
    /** Initial retry delay in milliseconds. */
    retryDelayMs?: number;
    /** Maximum retry delay in milliseconds. */
    maxRetryDelayMs?: number;
  }
): Promise<T> => {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const queueKey = options?.queueKey?.trim() || DEFAULT_QUEUE_KEY;
  const maxRetryDelayMs = Math.max(
    0,
    options?.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS
  );
  let retryDelayMs = Math.max(0, options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  let attempt = 0;

  // --- Serialization Logic ---
  // We chain the current operation to the end of the existing queue promise.
  const previous = mongoWriteQueues.get(queueKey) ?? Promise.resolve();
  let releaseQueue!: () => void;
  const activeWrite = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  const queuedWrite = previous.catch(() => {}).then(() => activeWrite);

  mongoWriteQueues.set(queueKey, queuedWrite);

  // Wait for previous operations in this queue to finish.
  await previous.catch(() => {});

  try {
    // --- Retry Loop ---
    while (true) {
      try {
        return await operation();
      } catch (error) {
        void ErrorSystem.captureException(error);
        attempt += 1;

        if (attempt >= maxAttempts || !isMongoSingleWriterConflictError(error)) {
          throw error;
        }

        // Apply exponential backoff.
        await sleep(retryDelayMs);
        retryDelayMs = Math.min(retryDelayMs === 0 ? 0 : retryDelayMs * 2, maxRetryDelayMs);
      }
    }
  } finally {
    // Release the next operation in the queue.
    releaseQueue();
    // Cleanup the map entry if we are still the tail of the queue.
    if (mongoWriteQueues.get(queueKey) === queuedWrite) {
      mongoWriteQueues.delete(queueKey);
    }
  }
};
