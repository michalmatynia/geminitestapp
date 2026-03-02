import 'server-only';

import {
  evaluateRunPreflight,
  migrateTriggerToFetcherGraph,
  normalizeNodes,
  normalizeAiPathsValidationConfig,
  palette,
  repairPathNodeIdentities,
  sanitizeEdges,
} from '@/shared/lib/ai-paths';
import {
  evaluateDisabledNodeTypesPolicy,
  formatDisabledNodeTypesPolicyMessage,
} from '@/features/ai/ai-paths/services/path-run-policy';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import {
  getAiPathsRuntimeFingerprint,
  withRuntimeFingerprintMeta,
} from '@/features/ai/ai-paths/services/runtime-fingerprint';
import {
  recordRuntimeRunFinished,
  recordRuntimeRunQueued,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  enqueuePathRunJob,
  removePathRunQueueEntries,
} from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type {
  AiNode,
  Edge,
  AiPathRunListOptions,
  AiPathRunRecord,
  PathConfig,
} from '@/shared/contracts/ai-paths';
import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';

type EnqueueRunInput = {
  userId?: string | null;
  pathId: string;
  pathName?: string | null;
  nodes: AiNode[];
  edges: Edge[];
  triggerEvent?: string | null;
  triggerNodeId?: string | null;
  triggerContext?: Record<string, unknown> | null;
  entityId?: string | null;
  entityType?: string | null;
  maxAttempts?: number | null;
  backoffMs?: number | null;
  backoffMaxMs?: number | null;
  requestId?: string | null;
  meta?: Record<string, unknown> | null;
};

const ACTIVE_RUN_STATUSES = new Set(['queued', 'running']);
const ACTIVE_RUN_STATUS_FILTER = ['queued', 'running', 'paused'] as const;
const CANCELLABLE_RUN_STATUS_FILTER = ['queued', 'running', 'paused'] as const;
const enqueueIdempotencyLocks = new Map<string, Promise<void>>();

const resolveRunStartedAt = (run: AiPathRunRecord): string | null => {
  if (!run.startedAt) return null;
  return run.startedAt;
};

const resolveDispatchErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return String(error);
};

const shouldLogEnqueueTimings = (timings: {
  totalMs: number;
  persistRunMs: number;
  persistNodesMs: number;
  dispatchMs: number;
}): boolean =>
  timings.totalMs >= 200 ||
  timings.persistRunMs >= 100 ||
  timings.persistNodesMs >= 100 ||
  timings.dispatchMs >= 100;

const dispatchRun = async (runId: string, options?: { delayMs?: number }): Promise<void> => {
  try {
    await enqueuePathRunJob(runId, options);
  } catch (queueError) {
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

const cleanupRunQueueEntries = async (runId: string): Promise<void> => {
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

const cleanupRunQueueEntriesBatch = async (runIds: string[]): Promise<void> => {
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

const buildIdentityRepairSeed = (
  input: EnqueueRunInput,
  nodes: AiNode[],
  edges: Edge[]
): PathConfig => ({
  id: input.pathId,
  version: 1,
  name:
    typeof input.pathName === 'string' && input.pathName.trim().length > 0
      ? input.pathName.trim()
      : input.pathId,
  description: '',
  trigger:
    typeof input.triggerEvent === 'string' && input.triggerEvent.trim().length > 0
      ? input.triggerEvent.trim()
      : 'manual',
  nodes,
  edges,
  updatedAt: new Date().toISOString(),
});

export const enqueuePathRun = async (input: EnqueueRunInput): Promise<AiPathRunRecord> => {
  const requestId = resolveRequestId(input);
  const lockKey = requestId ? `${input.userId ?? 'anon'}:${input.pathId}:${requestId}` : null;

  const execute = async (): Promise<AiPathRunRecord> => {
    const enqueueStartedAt = performance.now();
    const repo = await getPathRunRepository();
    if (requestId) {
      const existingByRequestId = await repo.listRuns({
        ...(input.userId ? { userId: input.userId } : {}),
        pathId: input.pathId,
        statuses: [...ACTIVE_RUN_STATUS_FILTER],
        requestId,
        limit: 1,
        offset: 0,
      });
      if (existingByRequestId.runs[0]) {
        return existingByRequestId.runs[0];
      }

      // Provider-safe fallback when JSON-path filtering on meta is unavailable.
      const existingByScan = await repo.listRuns({
        ...(input.userId ? { userId: input.userId } : {}),
        pathId: input.pathId,
        statuses: [...ACTIVE_RUN_STATUS_FILTER],
        limit: 50,
        offset: 0,
      });
      const matched = existingByScan.runs.find((run: AiPathRunRecord) => {
        const meta = run.meta && typeof run.meta === 'object' ? run.meta : null;
        return meta?.['requestId'] === requestId;
      });
      if (matched) {
        return matched;
      }
    }

    const rawEdges = input.edges ?? [];
    const normalizedNodes = normalizeNodes(input.nodes ?? []);
    const migratedGraph = migrateTriggerToFetcherGraph(normalizedNodes, rawEdges);
    const identityRepair = repairPathNodeIdentities(
      buildIdentityRepairSeed(input, migratedGraph.nodes, migratedGraph.edges),
      { palette }
    );
    const nodes = normalizeNodes(identityRepair.config.nodes);
    const edges = sanitizeEdges(nodes, identityRepair.config.edges);
    const validationConfig = normalizeAiPathsValidationConfig(
      (input.meta as Record<string, unknown> | null)?.['aiPathsValidation'] as
        | Record<string, unknown>
        | undefined
    );
    const strictFlowMode =
      ((input.meta as Record<string, unknown> | null)?.['strictFlowMode'] as
        | boolean
        | undefined) !== false;
    const runPreflight = evaluateRunPreflight({
      nodes,
      edges,
      aiPathsValidation: validationConfig,
      strictFlowMode,
      triggerNodeId: input.triggerNodeId ?? null,
      mode: 'full',
    });
    if (runPreflight.shouldBlock) {
      throw new Error(runPreflight.blockMessage ?? 'Run blocked by preflight validation checks.');
    }
    const policyReport = evaluateDisabledNodeTypesPolicy(nodes);
    if (policyReport.violations.length > 0) {
      throw new Error(formatDisabledNodeTypesPolicyMessage(policyReport.violations));
    }
    const runtimeFingerprint = getAiPathsRuntimeFingerprint();
    const meta = withRuntimeFingerprintMeta({
      ...(input.meta ?? {}),
      ...(requestId ? { requestId } : {}),
      ...(identityRepair.warnings.length > 0
        ? {
          identityRepair: {
            warnings: identityRepair.warnings,
            repairedAt: new Date().toISOString(),
          },
        }
        : {}),
      backoffMs: input.backoffMs ?? undefined,
      backoffMaxMs: input.backoffMaxMs ?? undefined,
      nodePolicy:
        policyReport.disabledNodeTypes.length > 0
          ? {
            disabledNodeTypes: policyReport.disabledNodeTypes,
            blockedCount: policyReport.violations.length,
          }
          : undefined,
      graphCompile: {
        errors: runPreflight.compileReport.errors,
        warnings: runPreflight.compileReport.warnings,
        findings: runPreflight.compileReport.findings,
        compiledAt: new Date().toISOString(),
      },
      runPreflight: {
        strictFlowMode,
        validation: runPreflight.validationReport,
        dependency: runPreflight.dependencyReport
          ? {
            errors: runPreflight.dependencyReport.errors,
            warnings: runPreflight.dependencyReport.warnings,
            strictReady: runPreflight.dependencyReport.strictReady,
          }
          : null,
        dataContract: {
          errors: runPreflight.dataContractReport.errors,
          warnings: runPreflight.dataContractReport.warnings,
          issues: runPreflight.dataContractReport.issues.slice(0, 12),
        },
        warnings: runPreflight.warnings,
      },
    });
    const persistRunStartedAt = performance.now();
    const run = await repo.createRun({
      userId: input.userId ?? null,
      pathId: input.pathId,
      pathName: input.pathName ?? null,
      triggerEvent: input.triggerEvent ?? null,
      triggerNodeId: input.triggerNodeId ?? null,
      triggerContext: input.triggerContext ?? null,
      graph: { nodes, edges },
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      meta,
      maxAttempts: input.maxAttempts ?? null,
    });
    const persistRunMs = performance.now() - persistRunStartedAt;

    let persistNodesMs = 0;
    try {
      const persistNodesStartedAt = performance.now();
      await repo.createRunNodes(run.id, nodes);
      persistNodesMs = performance.now() - persistNodesStartedAt;
    } catch (setupError) {
      const finishedAt = new Date();
      const message = `Run setup failed: ${
        setupError instanceof Error ? setupError.message : String(setupError)
      }`;
      await repo.updateRunIfStatus(run.id, ['queued'], {
        status: 'failed',
        errorMessage: message,
        finishedAt: finishedAt.toISOString(),
      });
      await repo.createRunEvent({
        runId: run.id,
        level: 'error',
        message,
        metadata: {
          pathId: run.pathId,
          runStartedAt: resolveRunStartedAt(run),
          runtimeFingerprint,
          traceId: run.id,
        },
      });
      await recordRuntimeRunFinished({
        runId: run.id,
        status: 'failed',
        durationMs: 0,
        timestamp: finishedAt,
      });
      throw new Error(message, { cause: setupError });
    }

    try {
      await Promise.all([
        repo.createRunEvent({
          runId: run.id,
          level: 'info',
          message: 'Run queued.',
          metadata: {
            pathId: run.pathId,
            runStartedAt: resolveRunStartedAt(run),
            runtimeFingerprint,
            traceId: run.id,
          },
        }),
        recordRuntimeRunQueued({ runId: run.id }),
      ]);
    } catch (parallelError) {
      void ErrorSystem.logWarning(`Non-critical setup failure for run ${run.id}`, {
        service: 'ai-paths-service',
        error: parallelError,
        runId: run.id,
      });
    }

    let dispatchMs = 0;
    try {
      const dispatchStartedAt = performance.now();
      await dispatchRun(run.id);
      dispatchMs = performance.now() - dispatchStartedAt;
    } catch (dispatchError) {
      const finishedAt = new Date();
      const dispatchMessage = resolveDispatchErrorMessage(dispatchError);
      const message = `Run dispatch failed: ${dispatchMessage}`;

      await repo.updateRunIfStatus(run.id, ['queued'], {
        status: 'failed',
        errorMessage: message,
        finishedAt: finishedAt.toISOString(),
      });
      try {
        await Promise.all([
          repo.createRunEvent({
            runId: run.id,
            level: 'error',
            message,
            metadata: {
              pathId: run.pathId,
              runStartedAt: resolveRunStartedAt(run),
              runtimeFingerprint,
              traceId: run.id,
            },
          }),
          recordRuntimeRunFinished({
            runId: run.id,
            status: 'failed',
            durationMs: 0,
            timestamp: finishedAt,
          }),
        ]);
      } catch (auxError) {
        void ErrorSystem.logWarning(`Non-critical dispatch failure logging for run ${run.id}`, {
          service: 'ai-paths-service',
          action: 'dispatchFailureLogging',
          runId: run.id,
          error: auxError,
        });
      }

      throw new Error(message, { cause: dispatchError });
    }

    const enqueueTotalMs = performance.now() - enqueueStartedAt;
    if (
      shouldLogEnqueueTimings({
        totalMs: enqueueTotalMs,
        persistRunMs,
        persistNodesMs,
        dispatchMs,
      })
    ) {
      console.info('[ai-paths-service] enqueuePathRun timing', {
        pathId: input.pathId,
        runId: run.id,
        persistRunMs: Math.round(persistRunMs),
        persistNodesMs: Math.round(persistNodesMs),
        dispatchMs: Math.round(dispatchMs),
        enqueueTotalMs: Math.round(enqueueTotalMs),
      });
    }

    return run;
  };

  try {
    if (lockKey) {
      return await withIdempotencyLock(lockKey, execute);
    }
    return await execute();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-service',
      action: 'enqueuePathRun',
      pathId: input.pathId,
    });
    throw error;
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
          },
        });
      } catch (eventError) {
        void ErrorSystem.logWarning(`Non-critical resume dispatch failure logging error for ${runId}`, {
          service: 'ai-paths-service',
          action: 'resumeDispatchFailureEvent',
          runId,
          error: eventError,
        });
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
      const revertMeta = withRuntimeFingerprintMeta({
        ...(updated.meta ?? {}),
        retryDispatchFailure: {
          failedAt,
          reason: dispatchMessage,
          revertedToStatus: run.status,
          nodeId,
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
          level: 'warn',
          message: `Run dispatch failed during node retry: ${dispatchMessage}`,
          metadata: {
            runStartedAt: resolveRunStartedAt(reverted ?? updated),
            runtimeFingerprint,
            retryNodeId: nodeId,
            revertedToStatus: run.status,
            traceId: runId,
          },
        });
      } catch (eventError) {
        void ErrorSystem.logWarning(`Non-critical retry dispatch failure logging error for ${runId}`, {
          service: 'ai-paths-service',
          action: 'retryDispatchFailureEvent',
          runId,
          nodeId,
          error: eventError,
        });
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
