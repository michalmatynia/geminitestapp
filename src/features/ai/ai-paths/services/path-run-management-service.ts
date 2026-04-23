import 'server-only';

import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import {
  recordRuntimeRunFinished,
  recordRuntimeRunQueued,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  getAiPathsRuntimeFingerprint,
  withRuntimeFingerprintMeta,
} from '@/features/ai/ai-paths/services/runtime-fingerprint';
import { removePathRunQueueEntries } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import type { AiNode, AiPathRunListOptions, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { buildAiPathErrorReport } from '@/shared/lib/ai-paths/error-reporting';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  ACTIVE_RUN_STATUSES,
  dispatchRun,
  resolveDispatchErrorMessage,
  resolveRunStartedAt,
} from './path-run-enqueue-service';

const CANCELLABLE_RUN_STATUS_FILTER = ['queued', 'running', 'blocked_on_lease', 'handoff_ready', 'paused'] as const;

export const cleanupRunQueueEntries = (runId: string): void => {
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

export const cleanupRunQueueEntriesBatch = (runIds: string[]): void => {
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

const getResumeMeta = (run: AiPathRunRecord, mode: 'resume' | 'replay'): Record<string, unknown> => {
  return withRuntimeFingerprintMeta({
    ...(run.meta ?? {}),
    resumeMode: mode,
    retryNodeIds: [],
  });
};
export async function resumePathRun(
  runId: string,
  mode: 'resume' | 'replay' = 'resume'
): Promise<AiPathRunRecord> {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (run === null) throw new Error(`Run ${runId} not found`);

  if (ACTIVE_RUN_STATUSES.has(run.status)) {
    if (run.status === 'queued') {
      await dispatchRun(run.id);
    }
    return run;
  }

  const meta = getResumeMeta(run, mode);
  const updated = await repo.updateRunIfStatus(runId, [run.status], {
    status: 'queued',
    errorMessage: null,
    retryCount: 0,
    nextRetryAt: null,
    deadLetteredAt: null,
    meta,
  });

  if (updated === null) {
    const latest = await repo.findRunById(runId);
    if (latest === null) throw new Error(`Run ${runId} not found`);
    if (latest.status === 'queued') {
      await dispatchRun(latest.id);
    }
    return latest;
  }

  await recordResumeEvents(updated, mode);

  try {
    await dispatchRun(updated.id);
  } catch (dispatchError) {
    await handleResumeDispatchFailure(repo, updated, run, mode, dispatchError);
    throw new Error(`Run dispatch failed: ${resolveDispatchErrorMessage(dispatchError)}`, { cause: dispatchError });
  }

  publishRunUpdate(runId, 'run', { status: 'queued', mode, traceId: runId });
  return updated;
}

const recordResumeEvents = async (run: AiPathRunRecord, mode: string): Promise<void> => {
  try {
    const repo = await getPathRunRepository();
    await Promise.all([
      repo.createRunEvent({
        runId: run.id,
        level: 'info',
        message: `Run resumed (${mode}).`,
        metadata: {
          runStartedAt: resolveRunStartedAt(run),
          runtimeFingerprint: getAiPathsRuntimeFingerprint(),
          traceId: run.id,
        },
      }),
      recordRuntimeRunQueued({ runId: run.id }),
    ]);
  } catch (auxError) {
    void ErrorSystem.captureException(auxError);
    void ErrorSystem.logWarning(`Non-critical resume logging failure for run ${run.id}`, {
      service: 'ai-paths-service',
      error: auxError,
      runId: run.id,
    });
  }
};

const handleResumeDispatchFailure = async (
  repo: AiPathRunRepository,
  updated: AiPathRunRecord,
  originalRun: AiPathRunRecord,
  mode: 'resume' | 'replay',
  dispatchError: unknown
): Promise<void> => {
  void ErrorSystem.captureException(dispatchError);
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
    traceId: originalRun.id,
    runId: originalRun.id,
    retryable: true,
    metadata: {
      resumeMode: mode,
      revertedToStatus: originalRun.status,
      runtimeFingerprint: getAiPathsRuntimeFingerprint(),
    },
  });
  
  const revertMeta = withRuntimeFingerprintMeta({
    ...(updated.meta ?? {}),
    resumeDispatchFailure: {
      failedAt,
      reason: dispatchMessage,
      revertedToStatus: originalRun.status,
      mode,
    },
  });

  const reverted = await repo.updateRunIfStatus(updated.id, ['queued'], {
    status: originalRun.status,
    errorMessage: originalRun.errorMessage ?? dispatchMessage,
    retryCount: originalRun.retryCount ?? null,
    nextRetryAt: originalRun.nextRetryAt ?? null,
    deadLetteredAt: originalRun.deadLetteredAt ?? null,
    meta: revertMeta,
  });

  try {
    await repo.createRunEvent({
      runId: originalRun.id,
      level: 'error',
      message: `Run dispatch failed during resume: ${dispatchMessage}`,
      metadata: {
        runStartedAt: resolveRunStartedAt(reverted ?? updated),
        runtimeFingerprint: getAiPathsRuntimeFingerprint(),
        resumeMode: mode,
        revertedToStatus: originalRun.status,
        traceId: originalRun.id,
        errorCode: errorReport.code,
        errorCategory: errorReport.category,
        errorScope: errorReport.scope,
        retryable: errorReport.retryable,
        errorReport,
      },
    });
  } catch (eventError) {
    void ErrorSystem.captureException(eventError);
    void ErrorSystem.logWarning(`Non-critical resume dispatch failure logging error for ${originalRun.id}`, {
      service: 'ai-paths-service',
      action: 'resumeDispatchFailureEvent',
      runId: originalRun.id,
      error: eventError,
    });
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
      void ErrorSystem.captureException(auxError);
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
      void ErrorSystem.captureException(dispatchError);
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
        void ErrorSystem.captureException(eventError);
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
    void ErrorSystem.captureException(error);
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
    if (run.status === 'canceled') {
      cleanupRunQueueEntries(runId);
      return run;
    }
    if (run.status === 'completed' || run.status === 'failed' || run.status === 'dead_lettered') {
      cleanupRunQueueEntries(runId);
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
      cleanupRunQueueEntries(runId);
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

const resolveHandoffReadyMeta = (
  run: AiPathRunRecord,
  reason: string | null,
  checkpointLineageId: string | null,
  requestedBy: string | null
): Record<string, unknown> => {
  const normalizedReason = reason !== null && reason.trim() !== '' 
      ? reason.trim() 
      : (run.status === 'blocked_on_lease' ? 'Execution lease is still owned by another worker.' : 'Run requires delegated continuation.');
  
  const lineageId = checkpointLineageId !== null && checkpointLineageId.trim() !== ''
    ? checkpointLineageId.trim()
    : `${run.id}:${Date.now()}`;
    
  return {
    ...(isObjectRecord(run.meta) ? { ...run.meta } : {}),
    handoff: {
      readyAt: new Date().toISOString(),
      reason: normalizedReason,
      previousStatus: run.status,
      checkpointLineageId: lineageId,
      requestedBy,
    },
  };
};

const handleHandoffLogging = async (
  runId: string,
  repo: AiPathRunRepository,
  reason: string,
  status: string,
  lineageId: string,
  requestedBy: string | null
): Promise<void> => {
  try {
    const { recordRuntimeRunHandoffReady } = await import(
      '@/features/ai/ai-paths/services/runtime-analytics-service'
    );
    await Promise.all([
      repo.createRunEvent({
        runId,
        level: 'warn',
        message: 'Run marked handoff-ready for delegated continuation.',
        metadata: {
          reason,
          previousStatus: status,
          checkpointLineageId: lineageId,
          requestedBy: requestedBy ?? null,
          runtimeFingerprint: getAiPathsRuntimeFingerprint(),
          traceId: runId,
        },
      }),
      recordRuntimeRunHandoffReady({ runId }),
    ]);
  } catch (auxError) {
    void ErrorSystem.captureException(auxError);
    void ErrorSystem.logWarning(`Non-critical handoff logging failure for run ${runId}`, {
      service: 'ai-paths-service',
      error: auxError,
      runId,
    });
  }
};

export async function markPathRunHandoffReady({
  runId,
  reason,
  checkpointLineageId,
  requestedBy,
}: {
  runId: string;
  reason?: string | null;
  checkpointLineageId?: string | null;
  requestedBy?: string | null;
}): Promise<AiPathRunRecord | null> {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (run === null) return null;
  if (run.status !== 'blocked_on_lease' && run.status !== 'paused' && run.status !== 'failed') return run;

  const nextMeta = resolveHandoffReadyMeta(run, reason ?? null, checkpointLineageId ?? null, requestedBy ?? null);
  const updated = await repo.updateRunIfStatus(run.id, [run.status], { status: 'handoff_ready', meta: nextMeta });
  const current = updated ?? (await repo.findRunById(run.id));
  if (current === null) return null;

  await handleHandoffLogging(run.id, repo, (nextMeta['handoff'] as any).reason, run.status, (nextMeta['handoff'] as any).checkpointLineageId, requestedBy ?? null);

  publishRunUpdate(run.id, 'run', {
    status: 'handoff_ready',
    reason: (nextMeta['handoff'] as any).reason,
    checkpointLineageId: (nextMeta['handoff'] as any).checkpointLineageId,
    traceId: run.id,
  });
  cleanupRunQueueEntries(run.id);

  return current;
}
