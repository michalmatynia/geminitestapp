import 'server-only';

import { isTerminalAiPathRunStatus } from '@/features/ai/ai-paths/lib/path-run-status';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import { recordRuntimeRunFinished } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { resolveDurationMs } from '@/features/ai/ai-paths/workers/ai-path-run-queue-utils';

const LOG_SOURCE = 'ai-path-run-processor';

/**
 * Orchestrates the execution of a single AI path run.
 * Manages run state updates, analytics logging, and failure recovery.
 */
export const processRun = async (
  run: AiPathRunRecord,
  signal?: AbortSignal
): Promise<void> => {
  const runStartMs = Date.now();
  const repo = await getPathRunRepository();

  void logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: `AI-Paths run started: ${run.pathName ?? run.pathId}`,
    context: {
      event: 'run.started',
      runId: run.id,
      pathId: run.pathId,
      pathName: run.pathName,
      entityId: run.entityId,
      entityType: run.entityType,
      triggerEvent: run.triggerEvent,
      retryCount: run.retryCount ?? 0,
    },
  });

  try {
    await executePathRun(run, signal);
    const latest = await repo.findRunById(run.id);
    if (latest?.status === 'canceled') {
      void logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: `AI-Paths run canceled: ${run.pathName ?? run.pathId}`,
        context: {
          event: 'run.canceled',
          runId: run.id,
          pathId: run.pathId,
          durationMs: Date.now() - runStartMs,
        },
      });
      return;
    }
    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `AI-Paths run completed: ${run.pathName ?? run.pathId}`,
      context: {
        event: 'run.completed',
        runId: run.id,
        pathId: run.pathId,
        pathName: run.pathName,
        entityId: run.entityId,
        durationMs: Date.now() - runStartMs,
      },
    });
    return;
  } catch (error: unknown) {
    const wrappedError = new AppError(`Execution failed for path run: ${run.id}`, {
      code: AppErrorCodes.operationFailed,
      httpStatus: 500,
      meta: { runId: run.id, pathId: run.pathId, action: 'executePathRun' },
      cause: error,
      critical: true,
    });
    
    void ErrorSystem.captureException(wrappedError, {
      service: 'ai-paths-queue',
      pathRunId: run.id,
      pathId: run.pathId,
    });
    
    const latest = await repo.findRunById(run.id);
    if (latest !== null && (isTerminalAiPathRunStatus(latest.status) || (latest.status !== 'running' && latest.status !== 'queued'))) {
      return;
    }
    
    await handleFailure(run, wrappedError, latest, runStartMs, repo);
  }
};

const handleFailure = async (
  run: AiPathRunRecord,
  error: AppError,
  latest: AiPathRunRecord | null,
  runStartMs: number,
  repo: Awaited<ReturnType<typeof getPathRunRepository>>
): Promise<void> => {
  const errorMessage = error.message;
  const errorContext = error.meta ?? {};
  
  const finishedAt = new Date();
  await repo.finalizeRun(run.id, 'failed', {
    errorMessage,
    finishedAt: finishedAt.toISOString(),
    event: {
      level: 'error',
      message: `Run failed: ${errorMessage}`,
    },
  });
  await recordRuntimeRunFinished({
    runId: run.id,
    status: 'failed',
    durationMs: resolveDurationMs(latest?.startedAt ?? run.startedAt, finishedAt),
    timestamp: finishedAt,
  });
  publishRunUpdate(run.id, 'error', {
    error: errorMessage,
    status: 'failed',
  });
  publishRunUpdate(run.id, 'done', { status: 'failed', error: errorMessage });
  
  void logSystemEvent({
    level: 'error',
    source: LOG_SOURCE,
    message: `AI-Paths run failed: ${run.pathName ?? run.pathId}`,
    context: {
      event: 'run.failed',
      runId: run.id,
      pathId: run.pathId,
      pathName: run.pathName,
      entityId: run.entityId,
      durationMs: Date.now() - runStartMs,
      error: errorMessage,
      ...errorContext,
    },
  });
};
