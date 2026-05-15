import 'server-only';

import {
  type AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';

import { type EnqueueRunInput, ACTIVE_RUN_STATUS_FILTER } from './path-run-enqueue/types';
import { resolveRunStartedAt, resolveDispatchErrorMessage, dispatchRun } from './path-run-enqueue/utils';
import { executeEnqueue } from './path-run-enqueue/execute';

export type { EnqueueRunInput };
export { ACTIVE_RUN_STATUS_FILTER, resolveRunStartedAt, resolveDispatchErrorMessage, dispatchRun };

const enqueueIdempotencyLocks = new Map<string, Promise<void>>();

const withIdempotencyLock = async <T>(key: string, task: () => Promise<T>): Promise<T> => {
  const previous = enqueueIdempotencyLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  enqueueIdempotencyLocks.set(
    key,
    previous.then(() => current)
  );

  await previous;
  try {
    return await task();
  } catch (error) {
    throw new AppError('An active processing lock prevented duplicate job submission.', {
      code: AppErrorCodes.conflict,
      httpStatus: 409,
      cause: error,
    });
  } finally {
    release();
    if (enqueueIdempotencyLocks.get(key) === current) {
      enqueueIdempotencyLocks.delete(key);
    }
  }
};

const resolveRequestId = (input: EnqueueRunInput): string | null => {
  if (typeof input.requestId === 'string' && input.requestId.trim().length > 0) {
    return input.requestId.trim();
  }
  const fromMeta = input.meta?.['requestId'];
  if (typeof fromMeta === 'string' && fromMeta.trim().length > 0) {
    return fromMeta.trim();
  }
  return null;
};

/**
 * Enqueues a new AI Path run job.
 * 
 * @param input - The run configuration and metadata.
 * @returns The resulting run record.
 * @throws AppError with actionable context on failure (e.g., locking conflicts, execution errors).
 */
export const enqueuePathRun = async (input: EnqueueRunInput): Promise<AiPathRunRecord> => {
  const requestId = resolveRequestId(input);
  const lockKey = requestId ? `${input.userId ?? 'anon'}:${input.pathId}:${requestId}` : null;

  try {
    if (lockKey) {
      return await withIdempotencyLock(lockKey, () => executeEnqueue(input, requestId));
    }
    return await executeEnqueue(input, requestId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-service',
      action: 'enqueuePathRun',
      pathId: input.pathId,
    });

    throw new AppError(`Failed to enqueue AI Path run: ${input.pathId}`, {
      code: AppErrorCodes.internal,
      httpStatus: 500,
      cause: error,
      meta: { pathId: input.pathId, userId: input.userId },
    });
  }
};
