import 'server-only';

import {
  type AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

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

export const enqueuePathRun = async (input: EnqueueRunInput): Promise<AiPathRunRecord> => {
  const requestId = resolveRequestId(input);
  const lockKey = requestId ? `${input.userId ?? 'anon'}:${input.pathId}:${requestId}` : null;

  try {
    if (lockKey) {
      return await withIdempotencyLock(lockKey, () => executeEnqueue(input, requestId));
    }
    return await executeEnqueue(input, requestId);
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-service',
      action: 'enqueuePathRun',
      pathId: input.pathId,
    });
    throw error;
  }
};
