import 'server-only';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const SINGLE_WRITER_ERROR_PATTERNS = [
  'Another write batch or compaction is already active',
  'Only a single write operations is allowed at a time',
] as const;

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_RETRY_DELAY_MS = 25;
const DEFAULT_MAX_RETRY_DELAY_MS = 150;
const DEFAULT_QUEUE_KEY = 'mongodb-single-writer';

const mongoWriteQueues = new Map<string, Promise<void>>();

const sleep = async (delayMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

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

export const isMongoSingleWriterConflictError = (error: unknown): boolean => {
  const message = readErrorMessage(error);
  return SINGLE_WRITER_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

export const executeMongoWriteWithRetry = async <T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    queueKey?: string;
    retryDelayMs?: number;
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
  const previous = mongoWriteQueues.get(queueKey) ?? Promise.resolve();
  let releaseQueue!: () => void;
  const activeWrite = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  const queuedWrite = previous.catch(() => {}).then(() => activeWrite);

  mongoWriteQueues.set(queueKey, queuedWrite);

  await previous.catch(() => {});

  try {
    while (true) {
      try {
        return await operation();
      } catch (error) {
        void ErrorSystem.captureException(error);
        attempt += 1;

        if (attempt >= maxAttempts || !isMongoSingleWriterConflictError(error)) {
          throw error;
        }

        await sleep(retryDelayMs);
        retryDelayMs = Math.min(retryDelayMs === 0 ? 0 : retryDelayMs * 2, maxRetryDelayMs);
      }
    }
  } finally {
    releaseQueue();
    if (mongoWriteQueues.get(queueKey) === queuedWrite) {
      mongoWriteQueues.delete(queueKey);
    }
  }
};
