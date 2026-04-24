import 'server-only';

import { isTerminalAiPathRunStatus } from '@/features/ai/ai-paths/lib/path-run-status';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import { recordRuntimeRunFinished } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { resolveDurationMs } from '@/features/ai/ai-paths/workers/ai-path-run-queue-utils';

const LOG_SOURCE = 'ai-path-run-processor';

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
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'ai-paths-queue',
      pathRunId: run.id,
      pathId: run.pathId,
    });
    
    const latest = await repo.findRunById(run.id);
    if (latest !== null && isTerminalAiPathRunStatus(latest.status)) return;
    if (latest !== null && latest.status !== 'running' && latest.status !== 'queued') return;
    
    await handleFailure(run, error, latest, runStartMs, repo);
  }
};

const handleFailure = async (
  run: AiPathRunRecord,
  error: unknown,
  latest: AiPathRunRecord | null,
  runStartMs: number,
  repo: Awaited<ReturnType<typeof getPathRunRepository>>
): Promise<void> => {
  const message = error instanceof Error ? error.message : 'Run failed.';
  const finishedAt = new Date();
  await repo.finalizeRun(run.id, 'failed', {
    errorMessage: message,
    finishedAt: finishedAt.toISOString(),
    event: {
      level: 'error',
      message: `Run failed: ${message}`,
    },
  });
  await recordRuntimeRunFinished({
    runId: run.id,
    status: 'failed',
    durationMs: resolveDurationMs(latest?.startedAt ?? run.startedAt, finishedAt),
    timestamp: finishedAt,
  });
  publishRunUpdate(run.id, 'error', {
    error: message,
    status: 'failed',
  });
  publishRunUpdate(run.id, 'done', { status: 'failed', error: message });
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
      error: message,
    },
  });
};
