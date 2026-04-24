import 'server-only';

import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import {
  recordRuntimeRunFinished,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { getAiPathsRuntimeFingerprint } from '@/features/ai/ai-paths/services/runtime-fingerprint';
import type {
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunRepository,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths';
import type {
  RuntimeProfileSummary,
  RuntimeTraceRecord,
} from '@/shared/contracts/ai-paths-runtime';
import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { GraphExecutionCancelled } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import { evaluateGraphWithIteratorAutoContinue } from '@/shared/lib/ai-paths/core/runtime/engine-server';
import { resolveAiPathsRuntimeValidationMiddleware } from '@/shared/lib/ai-paths/core/validation-engine';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { fetchEntityByType } from '../path-run-executor.entities';
import {
  buildRuntimeProfileSnapshot,
  computeDurationMs,
  mergeRuntimePortMaps,
  resolveTriggerNodeId,
  toRuntimeProfileHighlight,
} from '../path-run-executor.logic';
import { createCancellationMonitor } from '../path-run-executor.monitoring';
import { normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead } from '../path-run-runtime-kernel-metadata';
import { createCallbacks } from './callbacks';
import { createErrorReporting } from './error-reporting';
import { handleExecutionCompletion } from './execution-completion';
import {
  UPDATE_ELIGIBLE_RUN_STATUSES,
  LOG_NODE_START_EVENTS,
  INTERMEDIATE_SAVE_INTERVAL_MS,
  resolveCancellationPollIntervalMs,
  resolveGraphExecutionMaxDurationMs,
  isMissingRunUpdateError,
} from './helpers';
import { runExecutorPreflight } from './preflight';
import { createPathRunProfiling } from './profiling';
import { parseRuntimeState } from '../path-run-executor.runtime-state';
import { resolveRuntimeKernelConfigForPathRun } from './runtime-kernel-config';
import { PathRunRuntimeStateManager } from './runtime-state-manager';
import { createTracing } from './tracing';

export const executePathRun = async (
  run: AiPathRunRecord,
  externalSignal?: AbortSignal
): Promise<void> => {
  let repo: AiPathRunRepository;
  try {
    repo = await getPathRunRepository();
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-executor',
      action: 'getRepository',
      runId: run.id,
    });
    throw new Error('Database repository not available', { cause: error });
  }
  const runAbortController = new AbortController();

  if (externalSignal) {
    if (externalSignal.aborted) {
      runAbortController.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener(
        'abort',
        () => {
          runAbortController.abort(externalSignal.reason);
        },
        { once: true }
      );
    }
  }
  const cancellationPollIntervalMs = resolveCancellationPollIntervalMs();

  let dbRunMissing = false;
  const monitor = createCancellationMonitor({
    runId: run.id,
    repo,
    abortController: runAbortController,
    pollIntervalMs: cancellationPollIntervalMs,
    onMissingRun: () => {
      dbRunMissing = true;
    },
  });

  const updateRunSnapshot = async (
    data: Partial<Pick<AiPathRunRecord, 'status' | 'runtimeState' | 'meta' | 'errorMessage'>>
  ): Promise<boolean> => {
    try {
      const updated = await repo.updateRunIfStatus(run.id, UPDATE_ELIGIBLE_RUN_STATUSES, data);
      if (updated) {
        publishRunUpdate(run.id, 'run', data);
      }
      return Boolean(updated);
    } catch (error) {
      void ErrorSystem.captureException(error);
      if (isMissingRunUpdateError(error)) {
        return false;
      }
      throw error;
    }
  };

  const runStartedAt = typeof run.startedAt === 'string' ? run.startedAt : new Date().toISOString();
  const traceId = run.id;
  const runtimeFingerprint = getAiPathsRuntimeFingerprint();

  const publishNodeUpdate = (
    payload: Partial<AiPathRunNodeRecord> & {
      nodeId: string;
      status: AiPathRunNodeRecord['status'];
    }
  ): void => {
    publishRunUpdate(run.id, 'nodes', [
      {
        runId: run.id,
        ...payload,
      },
    ]);
  };

  const profiling = createPathRunProfiling();
  let runtimeProfileSummary: RuntimeProfileSummary | null = null;
  const runtimeTraceSpans = new Map<string, RuntimeTraceRecord['spans'][number]>();
  const runtimeTraceSpanOrder: string[] = [];

  const nodes = normalizeNodes(run.graph?.nodes ?? []);
  const edges = sanitizeEdges(nodes, run.graph?.edges ?? []);
  const triggerNodeId =
    resolveTriggerNodeId(nodes, edges, run.triggerEvent, run.triggerNodeId) ?? null;
  const runtimeState = parseRuntimeState(run.runtimeState);
  const runMetaRecord = normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead(run.meta).meta;

  const {
    nodeTypes: runtimeKernelNodeTypesRaw,
    resolverIds: runtimeKernelCodeObjectResolverIdsRaw,
    missingResolverIds: runtimeKernelMissingCodeObjectResolverIds,
    registeredResolverIds: registeredRuntimeKernelCodeObjectResolverIds,
    executionTelemetry: runtimeKernelExecutionTelemetry,
  } = await resolveRuntimeKernelConfigForPathRun({
    runId: run.id,
    runMetaRecord,
  });
  const runtimeKernelNodeTypes = runtimeKernelNodeTypesRaw ?? undefined;
  const runtimeKernelCodeObjectResolverIds = runtimeKernelCodeObjectResolverIdsRaw ?? undefined;

  const accInputs: Record<string, RuntimePortValues> = mergeRuntimePortMaps(
    {},
    runtimeState.inputs
  );
  const accOutputs: Record<string, RuntimePortValues> = mergeRuntimePortMaps(
    {},
    runtimeState.outputs
  );
  const resolvedRunStartedAt = runStartedAt;

  const stateManager = new PathRunRuntimeStateManager({
    run,
    initialRuntimeState: runtimeState,
    accInputs,
    accOutputs,
    repo,
    resolvedRunStartedAt
  });

  const saveIntermediateState = async (): Promise<void> => {
    try {
      await updateRunSnapshot({
        runtimeState: await stateManager.buildCurrentRuntimeStateSnapshot(),
      });
    } catch (error) {
      void ErrorSystem.captureException(error);
      void ErrorSystem.logWarning('Failed to save intermediate state', {
        service: 'ai-paths-executor',
        error,
        runId: run.id,
      });
    }
  };

  let lastIntermediateSaveMs = 0;
  let pendingIntermediateSave = false;
  const throttledSaveIntermediateState = async (): Promise<void> => {
    const now = Date.now();
    if (now - lastIntermediateSaveMs < INTERMEDIATE_SAVE_INTERVAL_MS) {
      pendingIntermediateSave = true;
      return;
    }
    lastIntermediateSaveMs = now;
    pendingIntermediateSave = false;
    await saveIntermediateState();
  };

  const runMetaWithRuntimeFingerprint = runMetaRecord ?? {};
  const baseRuntimeTraceRecord =
    runMetaWithRuntimeFingerprint['runtimeTrace'] &&
    typeof runMetaWithRuntimeFingerprint['runtimeTrace'] === 'object' &&
    !Array.isArray(runMetaWithRuntimeFingerprint['runtimeTrace'])
      ? (runMetaWithRuntimeFingerprint['runtimeTrace'] as Record<string, unknown>)
      : {};
  const runMetaWithRuntimeContext: Record<string, unknown> = {
    ...runMetaWithRuntimeFingerprint,
    runtimeKernel: runtimeKernelExecutionTelemetry,
  };
  const { upsertRuntimeTraceSpan, syncRuntimeTraceMeta } = createTracing({
    run,
    traceId,
    runStartedAt,
    runtimeTraceSpans,
    runtimeTraceSpanOrder,
    runMetaWithRuntimeContext,
    baseRuntimeTraceRecord,
  });

  const { reportAiPathsError: reportAiPathsErrorAsync } = createErrorReporting({
    run,
    repo,
    traceId,
    runtimeFingerprint,
    runStartedAt,
    runtimeKernelExecutionTelemetry,
  });
  const reportAiPathsError = (
    error: unknown,
    meta: Record<string, unknown>,
    summary?: string
  ): void => {
    reportAiPathsErrorAsync(error, meta, summary).catch(() => {});
  };

  const callbacks = createCallbacks({
    run,
    repo,
    traceId,
    profiling,
    upsertRuntimeTraceSpan,
    syncRuntimeTraceMeta,
    publishNodeUpdate,
    throttledSaveIntermediateState,
    reportAiPathsError,
    runtimeKernelExecutionTelemetry,
    accInputs,
    accOutputs,
    logNodeStartEvents: LOG_NODE_START_EVENTS,
    appendRuntimeHistoryEntry: (nodeId, entry) => {
      stateManager.appendHistoryEntry(nodeId, entry);
    },
    setRuntimeNodeStatus: (nodeId, status) => {
      stateManager.setNodeStatus(nodeId, status);
    },
  });

  syncRuntimeTraceMeta();
  const toast = (): void => {};

  try {
    if (runMetaRecord?.['runtimeFingerprint'] !== runtimeFingerprint) {
      await updateRunSnapshot({
        meta: runMetaWithRuntimeContext,
      });
    }

    if (runtimeKernelMissingCodeObjectResolverIds.length > 0) {
      await repo.createRunEvent({
        runId: run.id,
        level: 'warn',
        message:
          'Runtime kernel code-object resolver ids include unknown entries. Falling back to default resolver chain.',
        metadata: {
          traceId,
          ...runtimeKernelExecutionTelemetry,
          runtimeKernelCodeObjectResolverIdsMissing: runtimeKernelMissingCodeObjectResolverIds,
          runtimeKernelRegisteredCodeObjectResolverIds:
            registeredRuntimeKernelCodeObjectResolverIds,
        },
      });
    }

    const preflight = await runExecutorPreflight({
      run,
      nodes,
      edges,
      triggerNodeId,
      runtimeState,
      repo,
      runStartedAt,
      traceId,
    });
    const {
      validationConfig,
      strictFlowMode,
      nodeValidationEnabled,
      blockedRunPolicy,
      requiredProcessingNodeIds,
    } = preflight;

    const runtimeValidationMiddleware = resolveAiPathsRuntimeValidationMiddleware({
      runtimeValidationEnabled: nodeValidationEnabled,
      runtimeValidationConfig: validationConfig,
      nodes,
      edges,
    });
    const canceledBeforeExecution = await monitor.start();
    if (canceledBeforeExecution) {
      return;
    }

    let runtimeHaltReason:
      | 'blocked'
      | 'max_iterations'
      | 'completed'
      | 'failed'
      | 'canceled'
      | null = null;

    const latestRuntimeSnapshot: RuntimeState = await evaluateGraphWithIteratorAutoContinue({
      nodes,
      edges,
      activePathId: run.pathId ?? null,
      activePathName: run.pathName ?? null,
      runId: run.id,
      runStartedAt,
      runMeta: run.meta as Record<string, unknown>,
      ...(triggerNodeId ? { triggerNodeId } : {}),
      ...(run.triggerEvent ? { triggerEvent: run.triggerEvent } : {}),
      ...(run.triggerContext ? { triggerContext: run.triggerContext } : {}),
      strictFlowMode,
      recordHistory: true,
      historyLimit:
        ((run.meta as Record<string, unknown>)?.['historyRetentionPasses'] as number) ?? 20,
      fetchEntityByType,
      reportAiPathsError,
      toast,

      profile: {
        onEvent: (event): void => {
          profiling.captureRuntimeProfileEvent(event);
        },
        onSummary: (summary): void => {
          runtimeProfileSummary = summary;
        },
      },
      runtimeKernelNodeTypes,
      runtimeKernelCodeObjectResolverIds,
      maxDurationMs: resolveGraphExecutionMaxDurationMs(),
      validationMiddleware: runtimeValidationMiddleware,
      onRuntimeValidation: async ({
        node,
        stage,
        decision,
        message,
        issues,
        iteration,
        runtimeStrategy,
        runtimeResolutionSource,
        runtimeCodeObjectId,
      }) => {
        try {
          await repo.createRunEvent({
            runId: run.id,
            level: decision === 'block' ? 'error' : 'warn',
            message,
            metadata: {
              traceId,
              stage,
              decision,
              iteration,
              nodeId: node?.id ?? null,
              nodeType: node?.type ?? null,
              nodeTitle: node?.title ?? null,
              issueCount: issues.length,
              issues: issues.slice(0, 5),
              runtimeStrategy,
              runtimeResolutionSource,
              runtimeCodeObjectId,
            },
          });
        } catch (error) {
          void ErrorSystem.captureException(error);
          reportAiPathsError(error, {
            action: 'onRuntimeValidation',
            stage,
            nodeId: node?.id ?? null,
            decision,
            runId: run.id,
          });
        }
      },
      ...callbacks,
      onHalt: (halt: { reason: 'blocked' | 'max_iterations' | 'completed' | 'failed' }) => {
        runtimeHaltReason = halt.reason;
      },
    });

    stateManager.setLatestSnapshot(latestRuntimeSnapshot);
    if (pendingIntermediateSave) {
      await saveIntermediateState();
    }

    const profileSnapshot = buildRuntimeProfileSnapshot({
      traceId,
      eventCount: profiling.runtimeProfileHighlights.length,
      sampledHighlights: profiling.runtimeProfileHighlights.map(toRuntimeProfileHighlight),
      summary: runtimeProfileSummary,
      nodeSpans: profiling.getRuntimeNodeSpansSnapshot(),
    });

    const finalStatus = await handleExecutionCompletion({
      run,
      nodes,
      accOutputs,
      runtimeHaltReason,
      nodeValidationEnabled,
      blockedRunPolicy,
      requiredProcessingNodeIds,
      runMetaWithRuntimeContext,
      runStartedAt,
      traceId,
      profileSnapshot,
      stateManager,
      updateRunSnapshot,
    });

    const finishedAt = new Date().toISOString();
    recordRuntimeRunFinished({
      runId: run.id,
      status: finalStatus as 'completed' | 'failed' | 'canceled',
      durationMs: computeDurationMs(runStartedAt, finishedAt) ?? undefined,
    }).catch(() => {});
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (dbRunMissing) throw error;
    const finishedAt = new Date().toISOString();
    const isCancelled =
      error instanceof GraphExecutionCancelled || runAbortController.signal.aborted;
    const status = isCancelled ? 'canceled' : 'failed';

    const finalRuntimeState = await stateManager.buildCurrentRuntimeStateSnapshot();
    const errorMessage = error instanceof Error ? error.message : String(error);

    await updateRunSnapshot({
      status: status as AiPathRunRecord['status'],
      runtimeState: finalRuntimeState,
      errorMessage,
      meta: {
        ...runMetaWithRuntimeContext,
        finishedAt,
        durationMs: computeDurationMs(runStartedAt, finishedAt),
      },
    });

    if (!isCancelled) {
      void ErrorSystem.captureException(error, {
        service: 'ai-paths-executor',

        action: 'executePathRun',
        runId: run.id,
      });
    }

    throw error;
  } finally {
    monitor.stop();
  }
};
