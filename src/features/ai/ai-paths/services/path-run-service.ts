import 'server-only';

import { compileGraph, normalizeNodes, sanitizeEdges } from '@/features/ai/ai-paths/lib';
import {
  evaluateDisabledNodeTypesPolicy,
  formatDisabledNodeTypesPolicyMessage,
} from '@/features/ai/ai-paths/services/path-run-policy';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import {
  recordRuntimeRunFinished,
  recordRuntimeRunQueued,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  enqueuePathRunJob,
  removePathRunQueueEntries,
} from '@/features/jobs/workers/aiPathRunQueue';
import { ErrorSystem } from '@/features/observability/services/error-system';
import type {
  AiNode,
  Edge,
  AiPathRunListOptions,
  AiPathRunRecord,
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

const dispatchRun = async (
  runId: string,
  options?: { delayMs?: number }
): Promise<void> => {
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

const withIdempotencyLock = async <T>(
  key: string,
  task: () => Promise<T>
): Promise<T> => {
  const previous = enqueueIdempotencyLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  enqueueIdempotencyLocks.set(key, previous.then(() => current));

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
  const lockKey = requestId
    ? `${input.userId ?? 'anon'}:${input.pathId}:${requestId}`
    : null;

  const execute = async (): Promise<AiPathRunRecord> => {
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
        const meta =
          run.meta && typeof run.meta === 'object'
            ? (run.meta)
            : null;
        return meta?.['requestId'] === requestId;
      });
      if (matched) {
        return matched;
      }
    }

    const rawEdges = input.edges ?? [];
    const nodes = normalizeNodes(input.nodes ?? []);
    const edges = sanitizeEdges(nodes, rawEdges);
    const compileReport = compileGraph(nodes, edges);
    if (!compileReport.ok) {
      const primaryError = compileReport.findings.find(
        (finding): boolean => finding.severity === 'error'
      );
      throw new Error(
        primaryError?.message ??
          `Graph compile failed with ${compileReport.errors} blocking issue(s).`
      );
    }
    const policyReport = evaluateDisabledNodeTypesPolicy(nodes);
    if (policyReport.violations.length > 0) {
      throw new Error(formatDisabledNodeTypesPolicyMessage(policyReport.violations));
    }
    const meta = {
      ...(input.meta ?? {}),
      ...(requestId ? { requestId } : {}),
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
        errors: compileReport.errors,
        warnings: compileReport.warnings,
        findings: compileReport.findings,
        compiledAt: new Date().toISOString(),
      },
    };
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

    try {
      await repo.createRunNodes(run.id, nodes);
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

    await dispatchRun(run.id);

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
    const meta = {
      ...(run.meta ?? {}),
      resumeMode: mode,
      retryNodeIds: [],
    };
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
          metadata: { runStartedAt: resolveRunStartedAt(updated), traceId: runId },
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

    await dispatchRun(updated.id);
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
    const nodeInfo =
      run.graph?.nodes?.find((node: AiNode) => node.id === nodeId) ?? null;
    const meta = {
      ...(run.meta ?? {}),
      resumeMode: 'retry',
      retryNodeIds: [nodeId],
    };
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
          metadata: { runStartedAt: resolveRunStartedAt(updated), traceId: runId },
        }),
        recordRuntimeRunQueued({ runId: updated.id }),
      ]);
    } catch (auxError) {
      void ErrorSystem.logWarning(`Non-critical retry logging failure for run ${runId}, node ${nodeId}`, {
        service: 'ai-paths-service',
        error: auxError,
        runId,
        nodeId,
      });
    }

    await dispatchRun(updated.id);
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
    const startedAtMs =
      typeof run.startedAt === 'string'
        ? Date.parse(run.startedAt)
        : Number.NaN;
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
