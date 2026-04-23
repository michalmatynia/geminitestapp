import 'server-only';

import { isTerminalAiPathRunStatus } from '@/features/ai/ai-paths/lib/path-run-status';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import { recordRuntimeRunFinished, recordRuntimeRunStarted } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { processStaleRunRecovery } from './ai-path-run-recovery/recovery';
import { DEFAULT_MAX_ATTEMPTS } from '@/features/ai/ai-paths/workers/ai-path-run-queue/config';
import { computeBackoffMs, isNonRetryableRunError, resolveDurationMs } from '@/features/ai/ai-paths/workers/ai-path-run-queue-utils';

export { processStaleRunRecovery };

const LOG_SOURCE = 'ai-path-run-processor';

export type ProcessRunResult = {
  requeueDelayMs?: number;
};

export const processRun = async (
  run: AiPathRunRecord,
  signal?: AbortSignal
): Promise<ProcessRunResult | void> => {
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
    void ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : 'Run failed.';
    await ErrorSystem.captureException(error, {
      service: 'ai-paths-queue',
      pathRunId: run.id,
      pathId: run.pathId,
    });
    
    const latest = await repo.findRunById(run.id);
    if (latest !== null && isTerminalAiPathRunStatus(latest.status)) return;
    if (latest !== null && latest.status !== 'running' && latest.status !== 'queued') return;
    
    return await handleFailure(run, error, latest, runStartMs, repo);
  }
};

const handleFailure = async (
  run: AiPathRunRecord,
  error: unknown,
  latest: AiPathRunRecord | null,
  runStartMs: number,
  repo: Awaited<ReturnType<typeof getPathRunRepository>>
): Promise<ProcessRunResult | void> => {
  const message = error instanceof Error ? error.message : 'Run failed.';
  if (isNonRetryableRunError(error)) {
    const finishedAt = new Date();
    await repo.finalizeRun(run.id, 'failed', {
      errorMessage: message,
      finishedAt: finishedAt.toISOString(),
      event: {
        level: 'error',
        message: `Run stopped: non-retryable error — ${message}`,
        metadata: { nonRetryable: true, reason: 'non_retryable_error' },
      },
    });
    await recordRuntimeRunFinished({
      runId: run.id,
      status: 'failed',
      durationMs: resolveDurationMs(latest?.startedAt ?? run.startedAt, finishedAt),
      timestamp: finishedAt,
    });
    publishRunUpdate(run.id, 'error', { error: message, nonRetryable: true });
    return;
  }
  
  const retrySource = latest ?? run;
  const maxAttempts =
    typeof retrySource.maxAttempts === 'number' && retrySource.maxAttempts > 0
      ? retrySource.maxAttempts
      : DEFAULT_MAX_ATTEMPTS;
  const retryCount = (retrySource.retryCount ?? 0) + 1;
  if (retryCount < maxAttempts) {
    const delayMs = computeBackoffMs(retryCount - 1, retrySource.meta ?? undefined);
    const nextRetryAt = new Date(Date.now() + delayMs);
    const requeued = await repo.updateRunIfStatus(run.id, ['running', 'queued'], {
      status: 'queued',
      retryCount,
      nextRetryAt: nextRetryAt.toISOString(),
      errorMessage: message,
      startedAt: null,
      finishedAt: null,
    });
    if (requeued) {
      return { requeueDelayMs: delayMs };
    }
    return;
  }

  const finishedAt = new Date();
  await repo.finalizeRun(run.id, 'dead_lettered', {
    errorMessage: message,
    finishedAt: finishedAt.toISOString(),
    event: {
      level: 'error',
      message: 'Run moved to dead-letter after max retries.',
      metadata: { retryCount, maxAttempts },
    },
  });
  await recordRuntimeRunFinished({
    runId: run.id,
    status: 'dead_lettered',
    durationMs: resolveDurationMs(latest?.startedAt ?? run.startedAt, finishedAt),
    timestamp: finishedAt,
  });
  publishRunUpdate(run.id, 'error', {
    error: 'Max retries exceeded',
    status: 'dead_lettered',
    retryCount,
    maxAttempts,
  });
  publishRunUpdate(run.id, 'events', {
    event: 'run.dead_lettered',
    runId: run.id,
    pathId: run.pathId,
    pathName: run.pathName,
    entityId: run.entityId,
    retryCount,
    maxAttempts,
    error: message,
    durationMs: Date.now() - runStartMs,
  });
  void logSystemEvent({
    level: 'error',
    source: LOG_SOURCE,
    message: `AI-Paths run dead-lettered: ${run.pathName ?? run.pathId} (${retryCount}/${maxAttempts} attempts)`,
    context: {
      event: 'run.dead_lettered',
      runId: run.id,
      pathId: run.pathId,
      pathName: run.pathName,
      entityId: run.entityId,
      durationMs: Date.now() - runStartMs,
      retryCount,
      maxAttempts,
      error: message,
    },
  });
};
