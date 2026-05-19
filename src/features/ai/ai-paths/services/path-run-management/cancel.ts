import 'server-only';

import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import { recordRuntimeRunFinished } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import type { AiPathRunRecord, AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { cleanupRunQueueEntries } from './cleanup';

const CANCELLABLE_RUN_STATUS_FILTER = ['queued', 'running'] as const;

const resolveDurationMs = (startedAt: string | null | undefined): number | null => {
  const startedAtMs = typeof startedAt === 'string' ? Date.parse(startedAt) : Number.NaN;
  return Number.isFinite(startedAtMs) ? Math.max(0, Date.now() - startedAtMs) : null;
};

export const cancelPathRun = async (runId: string): Promise<AiPathRunRecord> => {
  return cancelPathRunWithRepository(await getPathRunRepository(), runId);
};

export const cancelPathRunWithRepository = async (
  repo: AiPathRunRepository,
  runId: string
): Promise<AiPathRunRecord> => {
  try {
    const run = await repo.findRunById(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    if (run.status === 'canceled' || run.status === 'completed' || run.status === 'failed') {
      cleanupRunQueueEntries(runId);
      return run;
    }

    const wasInFlight = run.status === 'running';
    const finishedAt = new Date().toISOString();
    const durationMs = resolveDurationMs(run.startedAt);
    const updated = await repo.updateRunIfStatus(runId, [...CANCELLABLE_RUN_STATUS_FILTER], {
      status: 'canceled',
      finishedAt,
      meta: {
        ...(run.meta ?? {}),
        cancellation: {
          requestedAt: finishedAt,
          previousStatus: run.status,
          phase: wasInFlight ? 'requested' : 'completed',
        },
      },
    });

    if (!updated) {
      const latest = await repo.findRunById(runId);
      if (!latest) throw new Error(`Run ${runId} not found`);
      cleanupRunQueueEntries(runId);
      return latest;
    }

    try {
      await Promise.all([
        repo.createRunEvent({
          runId,
          level: 'warn',
          message: wasInFlight
            ? 'Cancellation requested. Run marked canceled while in-flight work stops.'
            : 'Run canceled.',
          metadata: {
            cancellationRequestedAt: finishedAt,
            cancellationPhase: wasInFlight ? 'requested' : 'completed',
            traceId: runId,
          },
        }),
        recordRuntimeRunFinished({
          runId: updated.id,
          status: 'canceled',
          durationMs,
          timestamp: finishedAt,
        }),
      ]);
    } catch (auxError) {
      void ErrorSystem.captureException(auxError, {
        service: 'ai-paths-service',
        action: 'cancelPathRun.auxLogging',
        runId,
      });
      void ErrorSystem.logWarning(`Non-critical cancellation logging failure for run ${runId}`, {
        service: 'ai-paths-service',
        error: auxError,
        runId,
      });
    }

    publishRunUpdate(runId, 'done', { status: 'canceled', traceId: runId });
    cleanupRunQueueEntries(runId);
    return updated;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-service',
      action: 'cancelPathRun',
      runId,
    });
    throw error;
  }
};
