import 'server-only';

import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import { recordRuntimeRunFinished } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { removePathRunQueueEntries } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import type {
  AiPathRunListOptions,
  AiPathRunRecord,
  AiPathRunRepository,
} from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const FORWARD_ONLY_ERROR =
  'AI Paths is forward-only. Resume, retry, and handoff operations have been removed.';
const CANCELLABLE_RUN_STATUS_FILTER = ['queued', 'running'] as const;

const cleanupRunQueueEntries = (runId: string): void => {
  void removePathRunQueueEntries([runId]).catch((error) => {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning(`Non-critical queue cleanup failure for run ${runId}`, {
      service: 'ai-paths-service',
      action: 'cleanupRunQueueEntries',
      runId,
      error,
    });
  });
};

const cleanupRunQueueEntriesBatch = (runIds: string[]): void => {
  const uniqueRunIds = Array.from(
    new Set(
      runIds
        .map((runId: string): string => runId.trim())
        .filter((runId: string): boolean => runId.length > 0)
    )
  );
  if (uniqueRunIds.length === 0) return;
  void removePathRunQueueEntries(uniqueRunIds).catch((error) => {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Non-critical queue cleanup failure for bulk run deletion', {
      service: 'ai-paths-service',
      action: 'cleanupRunQueueEntriesBatch',
      runCount: uniqueRunIds.length,
      error,
    });
  });
};

const resolveDurationMs = (startedAt: string | null | undefined): number | null => {
  const startedAtMs = typeof startedAt === 'string' ? Date.parse(startedAt) : Number.NaN;
  return Number.isFinite(startedAtMs) ? Math.max(0, Date.now() - startedAtMs) : null;
};

export function resumePathRun(
  _runId: string,
  _mode: 'resume' | 'replay' = 'resume'
): Promise<AiPathRunRecord> {
  return Promise.reject(new Error(FORWARD_ONLY_ERROR));
}

export const retryPathRunNode = (
  _runId: string,
  _nodeId: string
): Promise<AiPathRunRecord> => {
  return Promise.reject(new Error(FORWARD_ONLY_ERROR));
};

export function markPathRunHandoffReady(_input: {
  runId: string;
  reason?: string | null;
  checkpointLineageId?: string | null;
  requestedBy?: string | null;
}): Promise<AiPathRunRecord | null> {
  return Promise.reject(new Error(FORWARD_ONLY_ERROR));
}

export const deletePathRun = async (runId: string): Promise<boolean> => {
  return deletePathRunWithRepository(await getPathRunRepository(), runId);
};

export const deletePathRunWithRepository = async (
  repo: AiPathRunRepository,
  runId: string
): Promise<boolean> => {
  try {
    cleanupRunQueueEntries(runId);
    return await repo.deleteRun(runId);
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-service',
      action: 'deletePathRun',
      runId,
    });
    throw error;
  }
};

export const deletePathRunsWithRepository = async (
  repo: AiPathRunRepository,
  options: AiPathRunListOptions = {}
): Promise<{ count: number }> => {
  try {
    const { runs } = await repo.listRuns(options);
    const runIds = runs
      .map((run: AiPathRunRecord): string | undefined => run.id)
      .filter((runId: string | undefined): runId is string => Boolean(runId));
    cleanupRunQueueEntriesBatch(runIds);
    return await repo.deleteRuns(options);
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-service',
      action: 'deletePathRuns',
      options,
    });
    throw error;
  }
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
      void ErrorSystem.captureException(auxError);
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
    void ErrorSystem.captureException(error);
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-service',
      action: 'cancelPathRun',
      runId,
    });
    throw error;
  }
};
