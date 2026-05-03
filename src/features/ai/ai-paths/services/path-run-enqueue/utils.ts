import { type AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { enqueuePathRunJob, scheduleLocalFallbackRun } from '@/features/ai/ai-paths/workers/aiPathRunQueue';

const REQUIRE_DURABLE_QUEUE =
  process.env['AI_PATHS_REQUIRE_DURABLE_QUEUE'] === 'true' ||
  (process.env['NODE_ENV'] === 'production' &&
    process.env['AI_PATHS_ALLOW_LOCAL_QUEUE_FALLBACK'] !== 'true');
const rawGrace = Number.parseInt(process.env['AI_PATHS_LOCAL_FALLBACK_GRACE_MS'] ?? '1500', 10);
const LOCAL_FALLBACK_GRACE_MS = Math.max(0, Number.isFinite(rawGrace) && rawGrace !== 0 ? rawGrace : 1500);

export const resolveRunStartedAt = (run: AiPathRunRecord): string | null => {
  if (run.startedAt === null || run.startedAt === undefined || run.startedAt === '') return null;
  return run.startedAt;
};

export const resolveDispatchErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return String(error);
};

export const dispatchRun = async (runId: string, options?: { delayMs?: number }): Promise<void> => {
  try {
    await enqueuePathRunJob(runId, options);
    if (!REQUIRE_DURABLE_QUEUE) {
      const baseDelayMs =
        typeof options?.delayMs === 'number' && Number.isFinite(options.delayMs)
          ? Math.max(0, options.delayMs)
          : 0;
      scheduleLocalFallbackRun(runId, baseDelayMs + LOCAL_FALLBACK_GRACE_MS);
    }
  } catch (queueError) {
    void ErrorSystem.captureException(queueError);
    void ErrorSystem.captureException(queueError, {
      service: 'ai-paths-service',
      action: 'enqueueJob',
      runId,
      ...(options?.delayMs !== undefined ? { delayMs: options.delayMs } : {}),
    });
    throw new Error(
      `Failed to enqueue job: ${
        queueError instanceof Error ? queueError.message : String(queueError)
      }`,
      { cause: queueError }
    );
  }
};
