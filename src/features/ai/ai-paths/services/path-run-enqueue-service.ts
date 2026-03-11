import 'server-only';

import { parseRuntimeState } from '@/features/ai/ai-paths/services/path-run-executor.runtime-state';
import {
  evaluateDisabledNodeTypesPolicy,
  formatDisabledNodeTypesPolicyMessage,
} from '@/features/ai/ai-paths/services/path-run-policy';
import {
  recordRuntimeRunFinished,
  recordRuntimeRunQueued,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  getAiPathsRuntimeFingerprint,
  withRuntimeFingerprintMeta,
} from '@/features/ai/ai-paths/services/runtime-fingerprint';
import {
  enqueuePathRunJob,
  scheduleLocalFallbackRun,
} from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import type {
  AiNode,
  Edge,
  AiPathRunRecord,
  ParserSampleState,
  PathConfig,
  UpdaterSampleState,
} from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';
import {
  evaluateRunPreflight,
  findRemovedLegacyAiPathNodes,
  formatRemovedLegacyAiPathNodesMessage,
  normalizeNodes,
  normalizeAiPathsValidationConfig,
  palette,
  sanitizeEdges,
  stableStringify,
  validateCanonicalPathNodeIdentities,
} from '@/shared/lib/ai-paths';
import {
  remediateRemovedLegacyTriggerContextModes,
} from '@/shared/lib/ai-paths/core/utils/legacy-trigger-context-mode';
import { buildAiPathErrorReport } from '@/shared/lib/ai-paths/error-reporting';
import { resolvePathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type EnqueueRunInput = {
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

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toSampleStateMap = <T = unknown>(value: unknown): Record<string, T> | undefined => {
  const record = toRecord(value);
  if (!record) return undefined;
  return record as Record<string, T>;
};

export const ACTIVE_RUN_STATUSES = new Set(['queued', 'running']);
export const ACTIVE_RUN_STATUS_FILTER = ['queued', 'running', 'blocked_on_lease', 'handoff_ready', 'paused'] as const;
const enqueueIdempotencyLocks = new Map<string, Promise<void>>();
const REQUIRE_DURABLE_QUEUE =
  process.env['AI_PATHS_REQUIRE_DURABLE_QUEUE'] === 'true' ||
  (process.env['NODE_ENV'] === 'production' &&
    process.env['AI_PATHS_ALLOW_LOCAL_QUEUE_FALLBACK'] !== 'true');
const LOCAL_FALLBACK_GRACE_MS = Math.max(
  0,
  Number.parseInt(process.env['AI_PATHS_LOCAL_FALLBACK_GRACE_MS'] ?? '1500', 10) || 1500
);

export const resolveRunStartedAt = (run: AiPathRunRecord): string | null => {
  if (!run.startedAt) return null;
  return run.startedAt;
};

export const resolveDispatchErrorMessage = (error: unknown): string => {
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

const buildRunGraphValidationConfig = (
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

const assertCanonicalRunGraph = ({
  input,
  rawNodes,
  nodes,
  edges,
}: {
  input: EnqueueRunInput;
  rawNodes: AiNode[];
  nodes: AiNode[];
  edges: Edge[];
}): Edge[] => {
  const removedLegacyNodes = findRemovedLegacyAiPathNodes(rawNodes);
  if (removedLegacyNodes.length > 0) {
    throw validationError(formatRemovedLegacyAiPathNodesMessage(removedLegacyNodes, {
      surface: 'run graph',
    }), {
      source: 'ai_paths.run',
      reason: 'removed_legacy_node_type',
      pathId: input.pathId,
      removedNodes: removedLegacyNodes,
    });
  }
  const identityIssues = validateCanonicalPathNodeIdentities(
    buildRunGraphValidationConfig(input, nodes, edges),
    {
      palette,
    }
  );
  if (identityIssues.length > 0) {
    throw validationError('AI Paths run graph contains unsupported node identities.', {
      source: 'ai_paths.run',
      reason: 'unsupported_node_identities',
      pathId: input.pathId,
      issues: identityIssues,
    });
  }

  const canonicalEdges = sanitizeEdges(nodes, edges);
  if (stableStringify(canonicalEdges) !== stableStringify(edges)) {
    throw validationError('AI Paths run graph contains invalid or non-canonical edges.', {
      source: 'ai_paths.run',
      reason: 'invalid_edges',
      pathId: input.pathId,
    });
  }

  return canonicalEdges;
};

export const enqueuePathRun = async (input: EnqueueRunInput): Promise<AiPathRunRecord> => {
  const requestId = resolveRequestId(input);
  const lockKey = requestId ? `${input.userId ?? 'anon'}:${input.pathId}:${requestId}` : null;

  const execute = async (): Promise<AiPathRunRecord> => {
    const enqueueStartedAt = performance.now();
    const repoSelection = await resolvePathRunRepository();
    const repo = repoSelection.repo;
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
    }

    const rawNodes = (input.nodes ?? []);
    const rawEdges = input.edges ?? [];
    const remediatedNodes = remediateRemovedLegacyTriggerContextModes(rawNodes).value as AiNode[];
    const normalizedNodes = normalizeNodes(remediatedNodes);
    const nodes = normalizedNodes;
    const edges = assertCanonicalRunGraph({
      input,
      rawNodes: remediatedNodes,
      nodes,
      edges: rawEdges,
    });
    const validationConfig = normalizeAiPathsValidationConfig(
      (input.meta as Record<string, unknown> | null)?.['aiPathsValidation'] as
        | Record<string, unknown>
        | undefined
    );
    const strictFlowMode =
      ((input.meta as Record<string, unknown> | null)?.['strictFlowMode'] as
        | boolean
        | undefined) !== false;
    const preflightHints = toRecord(
      (input.meta as Record<string, unknown> | null)?.['preflightRuntimeHints']
    );
    const preflightRuntimeState = preflightHints
      ? parseRuntimeState(preflightHints['runtimeState'])
      : undefined;
    const parserSamples = toSampleStateMap<ParserSampleState>(preflightHints?.['parserSamples']);
    const updaterSamples = toSampleStateMap<UpdaterSampleState>(preflightHints?.['updaterSamples']);
    const runPreflight = evaluateRunPreflight({
      nodes,
      edges,
      aiPathsValidation: validationConfig,
      strictFlowMode,
      triggerNodeId: input.triggerNodeId ?? null,
      ...(preflightRuntimeState ? { runtimeState: preflightRuntimeState } : {}),
      ...(parserSamples ? { parserSamples } : {}),
      ...(updaterSamples ? { updaterSamples } : {}),
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
      runRepository: {
        collection: repoSelection.collection,
        provider: repoSelection.provider,
        routeMode: repoSelection.routeMode,
        selectedAt: new Date().toISOString(),
      },
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
      const errorReport = buildAiPathErrorReport({
        error: setupError,
        code: 'AI_PATHS_ENQUEUE_SETUP_FAILED',
        category: 'runtime',
        scope: 'enqueue',
        severity: 'error',
        userMessage: message,
        timestamp: finishedAt,
        traceId: run.id,
        runId: run.id,
        retryable: false,
        metadata: {
          pathId: run.pathId,
          runtimeFingerprint,
        },
      });
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
          errorCode: errorReport.code,
          errorCategory: errorReport.category,
          errorScope: errorReport.scope,
          errorReport,
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
      const errorReport = buildAiPathErrorReport({
        error: dispatchError,
        code: 'AI_PATHS_ENQUEUE_DISPATCH_FAILED',
        category: 'runtime',
        scope: 'enqueue',
        severity: 'error',
        userMessage: message,
        timestamp: finishedAt,
        traceId: run.id,
        runId: run.id,
        retryable: true,
        metadata: {
          pathId: run.pathId,
          runtimeFingerprint,
        },
      });

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
              errorCode: errorReport.code,
              errorCategory: errorReport.category,
              errorScope: errorReport.scope,
              retryable: errorReport.retryable,
              errorReport,
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
