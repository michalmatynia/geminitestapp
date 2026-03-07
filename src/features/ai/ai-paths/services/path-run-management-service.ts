import 'server-only';

import {
  getAiPathsRuntimeFingerprint,
  withRuntimeFingerprintMeta,
} from '@/features/ai/ai-paths/services/runtime-fingerprint';
import {
  recordRuntimeRunFinished,
  recordRuntimeRunQueued,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { removePathRunQueueEntries } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { buildAiPathErrorReport } from '@/shared/lib/ai-paths/error-reporting';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import type { AiNode, AiPathRunListOptions, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import {
  ACTIVE_RUN_STATUSES,
  dispatchRun,
  resolveDispatchErrorMessage,
  resolveRunStartedAt,
} from './path-run-enqueue-service';

const CANCELLABLE_RUN_STATUS_FILTER = ['queued', 'running', 'paused'] as const;

export const cleanupRunQueueEntries = async (runId: string): Promise<void> => {
  try {
    await removePathRunQueueEntries([runId]);
  } catch (error) {
    void ErrorSystem.logWarning(`Non-critical queue cleanup failure for run ${runId}`, {
      service: 'ai-paths-service',
      action: 'cleanupRunQueueEntries',
      runId,
      error,
    });
  }
};

export const cleanupRunQueueEntriesBatch = async (runIds: string[]): Promise<void> => {
  const uniqueRunIds = Array.from(
    new Set(
      runIds
        .map((runId: string): string => runId.trim())
        .filter((runId: string): boolean => runId.length > 0)
    )
  );
  if (uniqueRunIds.length === 0) return;
  try {
    await removePathRunQueueEntries(uniqueRunIds);
  } catch (error) {
    void ErrorSystem.logWarning('Non-critical queue cleanup failure for bulk run deletion', {
      service: 'ai-paths-service',
      action: 'cleanupRunQueueEntriesBatch',
      runCount: uniqueRunIds.length,
      error,
    });
  }
};

export const resumePathRun = async (
  runId: string,
  mode: 'resume' | 'replay' = 'resume'
): Promise<AiPathRunRecord> => {
  try {
    const repo = await getPathRunRepository();
    const run = await repo.findRunById(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    if (ACTIVE_RUN_STATUSES.has(run.status)) {
      if (run.status === 'queued') {
        await dispatchRun(run.id);
      }
      return run;
    }
    const runtimeFingerprint = getAiPathsRuntimeFingerprint();
    const meta = withRuntimeFingerprintMeta({
      ...(run.meta ?? {}),
      resumeMode: mode,
      retryNodeIds: [],
    });
    const updated = await repo.updateRunIfStatus(runId, [run.status], {
      status: 'queued',
      errorMessage: null,
      retryCount: 0,
      nextRetryAt: null,
      deadLetteredAt: null,
      meta,
    });
    if (!updated) {
      const latest = await repo.findRunById(runId);
      if (!latest) throw new Error(`Run ${runId} not found`);
      if (latest.status === 'queued') {
        await dispatchRun(latest.id);
      }
      return latest;
    }

    try {
      await Promise.all([
        repo.createRunEvent({
          runId,
          level: 'info',
          message: `Run resumed (${mode}).`,
          metadata: {
            runStartedAt: resolveRunStartedAt(updated),
            runtimeFingerprint,
            traceId: runId,
          },
        }),
        recordRuntimeRunQueued({ runId: updated.id }),
      ]);
    } catch (auxError) {
      void ErrorSystem.logWarning(`Non-critical resume logging failure for run ${runId}`, {
        service: 'ai-paths-service',
        error: auxError,
        runId,
      });
    }

    try {
      await dispatchRun(updated.id);
    } catch (dispatchError) {
      const dispatchMessage = resolveDispatchErrorMessage(dispatchError);
      const failedAt = new Date().toISOString();
      const errorReport = buildAiPathErrorReport({
        error: dispatchError,
        code: 'AI_PATHS_RESUME_DISPATCH_FAILED',
        category: 'runtime',
        scope: 'enqueue',
        severity: 'error',
        userMessage: `Run dispatch failed during resume: ${dispatchMessage}`,
        timestamp: failedAt,
        traceId: runId,
        runId,
        retryable: true,
        metadata: {
          resumeMode: mode,
          revertedToStatus: run.status,
          runtimeFingerprint,
        },
      });
      const revertMeta = withRuntimeFingerprintMeta({
        ...(updated.meta ?? {}),
        resumeDispatchFailure: {
          failedAt,
          reason: dispatchMessage,
          revertedToStatus: run.status,
          mode,
        },
      });
      const reverted = await repo.updateRunIfStatus(updated.id, ['queued'], {
        status: run.status,
        errorMessage: run.errorMessage ?? dispatchMessage,
        retryCount: run.retryCount ?? null,
        nextRetryAt: run.nextRetryAt ?? null,
        deadLetteredAt: run.deadLetteredAt ?? null,
        meta: revertMeta,
      });

      try {
        await repo.createRunEvent({
          runId,
          level: 'error',
          message: `Run dispatch failed during resume: ${dispatchMessage}`,
          metadata: {
            runStartedAt: resolveRunStartedAt(reverted ?? updated),
            runtimeFingerprint,
            resumeMode: mode,
            revertedToStatus: run.status,
            traceId: runId,
            errorCode: errorReport.code,
            errorCategory: errorReport.category,
            errorScope: errorReport.scope,
            retryable: errorReport.retryable,
            errorReport,
          },
        });
      } catch (eventError) {
        void ErrorSystem.logWarning(
          `Non-critical resume dispatch failure logging error for ${runId}`,
          {
            service: 'ai-paths-service',
            action: 'resumeDispatchFailureEvent',
            runId,
            error: eventError,
          }
        );
      }

      throw new Error(`Run dispatch failed: ${dispatchMessage}`, { cause: dispatchError });
    }

    publishRunUpdate(runId, 'run', { status: 'queued', mode, traceId: runId });

    return updated;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-service',
      action: 'resumePathRun',
      runId,
    });
    throw error;
  }
};

export const retryPathRunNode = async (runId: string, nodeId: string): Promise<AiPathRunRecord> => {
  try {
    const repo = await getPathRunRepository();
    const run = await repo.findRunById(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    if (ACTIVE_RUN_STATUSES.has(run.status)) {
      if (run.status === 'queued') {
        await dispatchRun(run.id);
      }
      return run;
    }
    const nodeInfo = run.graph?.nodes?.find((node: AiNode) => node.id === nodeId) ?? null;
    const runtimeFingerprint = getAiPathsRuntimeFingerprint();
    const meta = withRuntimeFingerprintMeta({
      ...(run.meta ?? {}),
      resumeMode: 'retry',
      retryNodeIds: [nodeId],
    });
    const updated = await repo.updateRunIfStatus(runId, [run.status], {
      status: 'queued',
      errorMessage: null,
      retryCount: 0,
      nextRetryAt: null,
      deadLetteredAt: null,
      meta,
    });
    if (!updated) {
      const latest = await repo.findRunById(runId);
      if (!latest) throw new Error(`Run ${runId} not found`);
      if (latest.status === 'queued') {
        await dispatchRun(latest.id);
      }
      return latest;
    }

    await repo.upsertRunNode(runId, nodeId, {
      nodeType: nodeInfo?.type ?? 'unknown',
      nodeTitle: nodeInfo?.title ?? null,
      status: 'pending',
      attempt: 0,
      inputs: undefined,
      outputs: undefined,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
    });

    try {
      await Promise.all([
        repo.createRunEvent({
          runId,
          level: 'info',
          message: `Retry node ${nodeId}.`,
          metadata: {
            runStartedAt: resolveRunStartedAt(updated),
            runtimeFingerprint,
            traceId: runId,
          },
        }),
        recordRuntimeRunQueued({ runId: updated.id }),
      ]);
    } catch (auxError) {
      void ErrorSystem.logWarning(
        `Non-critical retry logging failure for run ${runId}, node ${nodeId}`,
        {
          service: 'ai-paths-service',
          error: auxError,
          runId,
          nodeId,
        }
      );
    }

    try {
      await dispatchRun(updated.id);
    } catch (dispatchError) {
      const dispatchMessage = resolveDispatchErrorMessage(dispatchError);
      const failedAt = new Date().toISOString();
      const errorReport = buildAiPathErrorReport({
        error: dispatchError,
        code: 'AI_PATHS_RETRY_DISPATCH_FAILED',
        category: 'runtime',
        scope: 'enqueue',
        severity: 'error',
        userMessage: `Run dispatch failed during node retry: ${dispatchMessage}`,
        timestamp: failedAt,
        traceId: runId,
        runId,
        nodeId,
        retryable: true,
        metadata: {
          revertedToStatus: run.status,
          runtimeFingerprint,
        },
      });
      const revertMeta = withRuntimeFingerprintMeta({
        ...(updated.meta ?? {}),
        resumeDispatchFailure: {
          failedAt,
          reason: dispatchMessage,
          revertedToStatus: run.status,
          mode: 'retry',
        },
      });
      const reverted = await repo.updateRunIfStatus(updated.id, ['queued'], {
        status: run.status,
        errorMessage: run.errorMessage ?? dispatchMessage,
        retryCount: run.retryCount ?? null,
        nextRetryAt: run.nextRetryAt ?? null,
        deadLetteredAt: run.deadLetteredAt ?? null,
        meta: revertMeta,
      });

      try {
        await repo.createRunEvent({
          runId,
          level: 'error',
          message: `Run dispatch failed during node retry: ${dispatchMessage}`,
          metadata: {
            runStartedAt: resolveRunStartedAt(reverted ?? updated),
            runtimeFingerprint,
            traceId: runId,
            nodeId,
            errorCode: errorReport.code,
            errorCategory: errorReport.category,
            errorScope: errorReport.scope,
            retryable: errorReport.retryable,
            errorReport,
          },
        });
      } catch (eventError) {
        void ErrorSystem.logWarning(
          `Non-critical retry dispatch failure logging error for ${runId}`,
          {
            service: 'ai-paths-service',
            action: 'retryDispatchFailureEvent',
            runId,
            error: eventError,
          }
        );
      }

      throw new Error(`Run dispatch failed: ${dispatchMessage}`, { cause: dispatchError });
    }

    publishRunUpdate(runId, 'run', { status: 'queued', retryNodeId: nodeId, traceId: runId });

    return updated;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-service',
      action: 'retryPathRunNode',
      runId,
      nodeId,
    });
    throw new Error(error instanceof Error ? error.message : String(error), { cause: error });
  }
};

export const deletePathRun = async (runId: string): Promise<boolean> => {
  return deletePathRunWithRepository(await getPathRunRepository(), runId);
};

export const deletePathRunWithRepository = async (
  repo: AiPathRunRepository,
  runId: string
): Promise<boolean> => {
  try {
    await cleanupRunQueueEntries(runId);
    return await repo.deleteRun(runId);
  } catch (error) {
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
    await cleanupRunQueueEntriesBatch(runIds);
    return await repo.deleteRuns(options);
  } catch (error) {
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
    if (run.status === 'canceled') {
      await cleanupRunQueueEntries(runId);
      return run;
    }
    if (run.status === 'completed' || run.status === 'failed' || run.status === 'dead_lettered') {
      await cleanupRunQueueEntries(runId);
      return run;
    }
    const wasInFlight = run.status === 'running' || run.status === 'paused';
    const finishedAt = new Date();
    const startedAtMs = typeof run.startedAt === 'string' ? Date.parse(run.startedAt) : Number.NaN;
    const durationMs = Number.isFinite(startedAtMs)
      ? Math.max(0, finishedAt.getTime() - startedAtMs)
      : null;
    const nextMeta = {
      ...(run.meta ?? {}),
      cancellation: {
        requestedAt: finishedAt.toISOString(),
        previousStatus: run.status,
        phase: wasInFlight ? 'requested' : 'completed',
      },
    };
    const updated = await repo.updateRunIfStatus(runId, [...CANCELLABLE_RUN_STATUS_FILTER], {
      status: 'canceled',
      finishedAt: finishedAt.toISOString(),
      meta: nextMeta,
    });
    if (!updated) {
      const latest = await repo.findRunById(runId);
      if (!latest) throw new Error(`Run ${runId} not found`);
      await cleanupRunQueueEntries(runId);
      return latest;
    }

    const cancellationMessage = wasInFlight
      ? 'Cancellation requested. Run marked canceled while in-flight work stops.'
      : 'Run canceled.';
    try {
      await Promise.all([
        repo.createRunEvent({
          runId,
          level: 'warn',
          message: cancellationMessage,
          metadata: {
            runStartedAt: resolveRunStartedAt(updated),
            cancellationRequestedAt: finishedAt.toISOString(),
            cancellationPhase: wasInFlight ? 'requested' : 'completed',
            runtimeFingerprint: getAiPathsRuntimeFingerprint(),
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
      void ErrorSystem.logWarning(`Non-critical cancellation logging failure for run ${runId}`, {
        service: 'ai-paths-service',
        error: auxError,
        runId,
      });
    }

    publishRunUpdate(runId, 'done', { status: 'canceled', traceId: runId });
    await cleanupRunQueueEntries(runId);

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
