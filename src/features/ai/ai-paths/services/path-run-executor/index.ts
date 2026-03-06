import 'server-only';

import {
  cloneJsonSafe,
  normalizeNodes,
  sanitizeEdges,
} from '@/shared/lib/ai-paths';
import { resolveAiPathsRuntimeValidationMiddleware } from '@/shared/lib/ai-paths/core/validation-engine';
import { evaluateGraphWithIteratorAutoContinue } from '@/shared/lib/ai-paths/core/runtime/engine-server';
import { GraphExecutionCancelled } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import { buildAiPathErrorReport } from '@/shared/lib/ai-paths/error-reporting';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import {
  getAiPathsRuntimeFingerprint,
  withRuntimeFingerprintMeta,
} from '@/features/ai/ai-paths/services/runtime-fingerprint';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import {
  recordRuntimeNodeStatus,
  recordRuntimeRunFinished,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type {
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunRepository,
  AiPathRunStatus,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { RuntimeProfileSummary } from '@/shared/contracts/ai-paths-runtime';

import {
  INTERMEDIATE_SAVE_INTERVAL_MS,
  LOG_NODE_START_EVENTS,
  UPDATE_ELIGIBLE_RUN_STATUSES,
  extractNodeErrorOutputs,
  isMissingRunUpdateError,
  parseRuntimeState,
  resolveCancellationPollIntervalMs,
  toRuntimeNodeResolutionTelemetry,
} from '../path-run-executor.helpers';
import { fetchEntityByType } from '../path-run-executor.entities';
import { createCancellationMonitor } from '../path-run-executor.monitoring';
import {
  buildRuntimeProfileSnapshot,
  buildSkipSet,
  computeDurationMs,
  mergeNodeOutputsForStatus,
  mergeRuntimePortMaps,
  resolveTriggerNodeId,
  toRuntimeNodeStatus,
  toRuntimeProfileHighlight,
} from '../path-run-executor.logic';
import { normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead } from '../path-run-runtime-kernel-metadata';
import { extractDatabaseRuntimeMetadata } from '../../components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers';

import { createPathRunProfiling } from './profiling';
import { runExecutorPreflight } from './preflight';
import { resolveRuntimeKernelConfigForPathRun } from './runtime-kernel-config';
import { PathRunRuntimeStateManager } from './runtime-state-manager';
import { handleExecutionCompletion } from './execution-completion';

const normalizeRuntimeKernelTelemetryArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  if (!value.every((entry: unknown): entry is string => typeof entry === 'string')) {
    return null;
  }
  return value.map((entry: string) => entry.trim());
};

const normalizeRuntimeKernelTelemetrySource = (
  value: unknown
): 'env' | 'path' | 'settings' | 'default' | null =>
  value === 'env' || value === 'path' || value === 'settings' || value === 'default'
    ? value
    : null;

export const executePathRun = async (
  run: AiPathRunRecord,
  externalSignal?: AbortSignal
): Promise<void> => {
  let repo: AiPathRunRepository;
  try {
    repo = await getPathRunRepository();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-executor',
      action: 'getRepository',
      runId: run.id,
    });
    throw new Error('Database repository not available', { cause: error });
  }
  const runAbortController = new AbortController();

  // Forward an external timeout/abort signal (e.g. from the BullMQ job timeout)
  // into the run's own abort controller so the engine stops cleanly.
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
      return !!updated;
    } catch (error) {
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

  const nodes = normalizeNodes(run.graph?.nodes ?? []);

  const edges = sanitizeEdges(nodes, run.graph?.edges ?? []);
  const triggerNodeId =
    resolveTriggerNodeId(nodes, edges, run.triggerEvent, run.triggerNodeId) ?? null;
  const runtimeState = parseRuntimeState(run.runtimeState);
  const runMetaRecord = normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead(run.meta).meta;

  const {
    nodeTypes: runtimeKernelNodeTypes,
    resolverIds: runtimeKernelCodeObjectResolverIds,
    missingResolverIds: runtimeKernelMissingCodeObjectResolverIds,
    registeredResolverIds: registeredRuntimeKernelCodeObjectResolverIds,
    executionTelemetry: runtimeKernelExecutionTelemetry,
  } = await resolveRuntimeKernelConfigForPathRun({
    runId: run.id,
    runMetaRecord,
  });

  const toRunEventRuntimeKernelMetadata = (input?: {
    runtimeStrategy?: unknown;
    runtimeResolutionSource?: unknown;
    runtimeCodeObjectId?: unknown;
  }): Record<string, unknown> => ({
    ...runtimeKernelExecutionTelemetry,
    ...toRuntimeNodeResolutionTelemetry({
      runtimeStrategy: input?.runtimeStrategy,
      runtimeResolutionSource: input?.runtimeResolutionSource,
      runtimeCodeObjectId: input?.runtimeCodeObjectId,
    }),
  });

  const accInputs: Record<string, RuntimePortValues> = mergeRuntimePortMaps(
    {},
    runtimeState.inputs ?? {}
  );
  const accOutputs: Record<string, RuntimePortValues> = mergeRuntimePortMaps(
    {},
    runtimeState.outputs ?? {}
  );

  let resolvedRunStartedAt = runStartedAt;

  const stateManager = new PathRunRuntimeStateManager(
    run,
    runtimeState,
    accInputs,
    accOutputs,
    repo,
    resolvedRunStartedAt
  );

  const saveIntermediateState = async (): Promise<void> => {
    try {
      await updateRunSnapshot({
        runtimeState: await stateManager.buildCurrentRuntimeStateSnapshot(),
      });
    } catch (error) {
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

  const runMetaWithRuntimeFingerprint = withRuntimeFingerprintMeta(runMetaRecord);
  const runMetaRuntimeKernelRecord =
    runMetaRecord &&
    typeof runMetaRecord['runtimeKernel'] === 'object' &&
    runMetaRecord['runtimeKernel'] !== null &&
    !Array.isArray(runMetaRecord['runtimeKernel'])
      ? (runMetaRecord['runtimeKernel'] as Record<string, unknown>)
      : null;
  const runMetaRuntimeKernelNodeTypesSource = normalizeRuntimeKernelTelemetrySource(
    runMetaRuntimeKernelRecord?.['runtimeKernelNodeTypesSource']
  );
  const runMetaRuntimeKernelTelemetryNodeTypes = normalizeRuntimeKernelTelemetryArray(
    runMetaRuntimeKernelRecord?.['runtimeKernelNodeTypes']
  );
  const runMetaRuntimeKernelTelemetryResolverIds =
    normalizeRuntimeKernelTelemetryArray(
      runMetaRuntimeKernelRecord?.['runtimeKernelCodeObjectResolverIds']
    );
  const runMetaRuntimeKernelTelemetryMatches =
    runMetaRuntimeKernelNodeTypesSource === runtimeKernelExecutionTelemetry.runtimeKernelNodeTypesSource &&
    Array.isArray(runMetaRuntimeKernelTelemetryNodeTypes) &&
    runMetaRuntimeKernelTelemetryNodeTypes.join('|') ===
      runtimeKernelExecutionTelemetry.runtimeKernelNodeTypes.join('|') &&
    runMetaRuntimeKernelRecord?.['runtimeKernelCodeObjectResolverIdsSource'] ===
      runtimeKernelExecutionTelemetry.runtimeKernelCodeObjectResolverIdsSource &&
    Array.isArray(runMetaRuntimeKernelTelemetryResolverIds) &&
    runMetaRuntimeKernelTelemetryResolverIds.join('|') ===
      runtimeKernelExecutionTelemetry.runtimeKernelCodeObjectResolverIds.join('|');
  const runMetaWithRuntimeContext: Record<string, unknown> = {
    ...runMetaWithRuntimeFingerprint,
    runtimeKernel: runtimeKernelExecutionTelemetry,
  };

  const nodeRecords = await repo.listRunNodes(run.id);
  const nodeStatusMap = new Map<string, string>(
    nodeRecords.map((record: AiPathRunNodeRecord) => [record.nodeId, record.status])
  );
  const nodeAttemptMap = new Map<string, number>(
    nodeRecords.map((record: AiPathRunNodeRecord) => [record.nodeId, record.attempt ?? 0])
  );
  const skipNodes = buildSkipSet(run, edges, nodeStatusMap);
  const reportAiPathsError = async (
    error: unknown,
    meta: Record<string, unknown>,
    summary?: string
  ): Promise<void> => {
    const errorReport = buildAiPathErrorReport({
      error,
      code:
        typeof meta['errorCode'] === 'string'
          ? meta['errorCode']
          : 'AI_PATHS_RUNTIME_UNHANDLED_ERROR',
      category: typeof meta['errorCategory'] === 'string' ? meta['errorCategory'] : 'runtime',
      scope:
        typeof meta['errorScope'] === 'string'
          ? (meta['errorScope'] as
              | 'enqueue'
              | 'run'
              | 'node'
              | 'portable_engine'
              | 'stream'
              | 'api'
              | 'unknown')
          : typeof meta['nodeId'] === 'string'
            ? 'node'
            : 'run',
      severity:
        typeof meta['errorSeverity'] === 'string'
          ? (meta['errorSeverity'] as 'info' | 'warning' | 'error' | 'fatal')
          : 'error',
      userMessage: summary ?? undefined,
      traceId,
      runId: run.id,
      nodeId: typeof meta['nodeId'] === 'string' ? meta['nodeId'] : null,
      nodeType: typeof meta['nodeType'] === 'string' ? meta['nodeType'] : null,
      nodeTitle: typeof meta['nodeTitle'] === 'string' ? meta['nodeTitle'] : null,
      attempt: typeof meta['attempt'] === 'number' ? meta['attempt'] : null,
      iteration: typeof meta['iteration'] === 'number' ? meta['iteration'] : null,
      retryable: typeof meta['retryable'] === 'boolean' ? meta['retryable'] : null,
      retryAfterMs: typeof meta['retryAfterMs'] === 'number' ? meta['retryAfterMs'] : null,
      statusCode: typeof meta['statusCode'] === 'number' ? meta['statusCode'] : null,
      hints: Array.isArray(meta['hints']) ? (meta['hints'] as string[]) : null,
      metadata: {
        runStartedAt,
        runtimeFingerprint,
        traceId,
        ...meta,
      },
    });

    await ErrorSystem.captureException(error, {
      service: 'ai-paths-runtime',
      pathRunId: run.id,
      summary,
      errorCode: errorReport.code,
      errorCategory: errorReport.category,
      errorScope: errorReport.scope,
      ...meta,
    });
    // Persist the error event to MongoDB.  Guard with try/catch so that a MongoDB
    // connectivity failure (e.g. MongoNetworkTimeoutError) does not propagate as an
    // unhandled rejection — reportAiPathsError is called fire-and-forget (void) by all
    // runtime callbacks and ErrorSystem.captureException above already recorded it.
    try {
      await repo.createRunEvent({
        runId: run.id,
        level: 'error',
        message: summary ?? errorReport.userMessage,
        metadata: {
          runStartedAt,
          runtimeFingerprint,
          traceId,
          ...runtimeKernelExecutionTelemetry,
          ...meta,
          error: errorReport.message,
          errorCode: errorReport.code,
          errorCategory: errorReport.category,
          errorScope: errorReport.scope,
          retryable: errorReport.retryable,
          ...(typeof errorReport.retryAfterMs === 'number'
            ? { retryAfterMs: errorReport.retryAfterMs }
            : {}),
          ...(typeof errorReport.statusCode === 'number'
            ? { statusCode: errorReport.statusCode }
            : {}),
          errorReport,
        },
      });
    } catch {
      // DB write failed — the error was already captured above; suppress to avoid crash.
    }
  };
  const toast = (): void => {};

  try {
    if (
      runMetaRecord?.['runtimeFingerprint'] !== runtimeFingerprint ||
      !runMetaRuntimeKernelTelemetryMatches
    ) {
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

    const { validationConfig, strictFlowMode, nodeValidationEnabled, requiredProcessingNodeIds } =
      preflight;
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
    stateManager.setLatestSnapshot(await evaluateGraphWithIteratorAutoContinue({
      nodes,
      edges,
      activePathId: run.pathId ?? null,
      activePathName: run.pathName ?? null,
      runId: run.id,
      runStartedAt,
      runMeta: run.meta,
      ...(triggerNodeId ? { triggerNodeId } : {}),
      ...(run.triggerEvent ? { triggerEvent: run.triggerEvent } : {}),
      ...(run.triggerContext ? { triggerContext: run.triggerContext } : {}),
      strictFlowMode,
      seedOutputs: runtimeState.outputs,
      seedHashes: runtimeState.hashes,
      seedHashTimestamps: runtimeState.hashTimestamps,
      seedHistory: runtimeState.history,
      seedRunId: runtimeState.currentRun?.id ?? undefined,
      seedRunStartedAt: runtimeState.currentRun?.startedAt ?? undefined,
      recordHistory: true,
      historyLimit: (run.meta?.['historyRetentionPasses'] as number | undefined) ?? 20,
      skipNodeIds: Array.from(skipNodes),
      fetchEntityByType,
      reportAiPathsError: (error: unknown, meta: Record<string, unknown>, summary?: string) => {
        void reportAiPathsError(error, meta, summary);
      },
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
              ...toRunEventRuntimeKernelMetadata({
                runtimeStrategy,
                runtimeResolutionSource,
                runtimeCodeObjectId,
              }),
            },
          });
        } catch (error) {
          void reportAiPathsError(error, {
            action: 'onRuntimeValidation',
            stage,
            nodeId: node?.id ?? null,
            decision,
            runId: run.id,
          });
        }
      },
      onNodeStart: async ({
        node,
        nodeInputs,
        prevOutputs,
        iteration,
        runtimeStrategy,
        runtimeResolutionSource,
        runtimeCodeObjectId,
        runStartedAt: cbRunStartedAt,
      }) => {
        try {
          resolvedRunStartedAt = cbRunStartedAt;
          const nextAttempt = (nodeAttemptMap.get(node.id) ?? 0) + 1;
          nodeAttemptMap.set(node.id, nextAttempt);
          const nodeSpanId = `${node.id}:${nextAttempt}:${iteration}`;
          const nodeStartedAt = new Date().toISOString();
          profiling.beginRuntimeNodeSpan({
            spanId: nodeSpanId,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            iteration,
            attempt: nextAttempt,
            startedAt: nodeStartedAt,
          });

          const safeInputs = cloneJsonSafe(nodeInputs) as RuntimePortValues;
          const safePrevOutputs = cloneJsonSafe(prevOutputs ?? {}) as RuntimePortValues;
          accInputs[node.id] = safeInputs;
          accOutputs[node.id] = mergeNodeOutputsForStatus({
            previous: accOutputs[node.id],
            next: {},
            status: 'running',
          });

          publishNodeUpdate({
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: 'running',
            attempt: nextAttempt,
            inputs: safeInputs,
            outputs: safePrevOutputs,
            startedAt: nodeStartedAt,
            errorMessage: null,
            finishedAt: null,
            updatedAt: nodeStartedAt,
          });

          // These observability writes are non-critical: if MongoDB is degraded
          // the run must still continue.  Individual .catch keeps Promise.all
          // from short-circuiting on the first failure.
          await Promise.all([
            repo
              .upsertRunNode(run.id, node.id, {
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'running',
                attempt: nextAttempt,
                inputs: safeInputs,
                outputs: safePrevOutputs,
                startedAt: nodeStartedAt,
                error: null,
              })
              .catch(() => {}),
            throttledSaveIntermediateState().catch(() => {}),
            ...(LOG_NODE_START_EVENTS
              ? [
                repo
                  .createRunEvent({
                    runId: run.id,
                    level: 'info',
                    message: `Node ${node.title ?? node.id} started.`,
                    metadata: {
                      traceId,
                      spanId: nodeSpanId,
                      nodeId: node.id,
                      nodeType: node.type,
                      iteration,
                      attempt: nextAttempt,
                      ...toRunEventRuntimeKernelMetadata({
                        runtimeStrategy,
                        runtimeResolutionSource,
                        runtimeCodeObjectId,
                      }),
                    },
                  })
                  .catch(() => {}),
              ]
              : []),
          ]);
        } catch (error) {
          void reportAiPathsError(error, { nodeId: node.id, action: 'onNodeStart' });
        }
      },
      onNodeFinish: async ({
        node,
        nodeInputs,
        nextOutputs,
        iteration,
        cached,
        runtimeStrategy,
        runtimeResolutionSource,
        runtimeCodeObjectId,
        runStartedAt: cbRunStartedAt,
      }) => {
        try {
          resolvedRunStartedAt = cbRunStartedAt;
          const attempt = nodeAttemptMap.get(node.id) ?? 1;
          const nodeSpanId = `${node.id}:${attempt}:${iteration}`;
          const finishedAt = new Date().toISOString();
          const rawStatus = toRuntimeNodeStatus(nextOutputs['status']);
          const status = (cached ? 'cached' : rawStatus) ?? 'completed';

          profiling.finalizeRuntimeNodeSpan({
            spanId: nodeSpanId,
            status: status === 'failed' ? 'failed' : 'completed',
            finishedAt,
          });

          const safeInputs = cloneJsonSafe(nodeInputs) as RuntimePortValues;
          const safeOutputs = cloneJsonSafe(nextOutputs) as RuntimePortValues;
          accInputs[node.id] = safeInputs;
          accOutputs[node.id] = mergeNodeOutputsForStatus({
            previous: accOutputs[node.id],
            next: safeOutputs,
            status,
          });

          const metadata =
            node.type === 'database' ? extractDatabaseRuntimeMetadata(safeOutputs) : null;

          publishNodeUpdate({
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status,
            attempt,
            inputs: safeInputs,
            outputs: safeOutputs,
            finishedAt,
            updatedAt: finishedAt,
            errorMessage: status === 'failed' ? (nextOutputs['message'] as string) : null,
          });

          // Non-critical observability writes — individual .catch prevents
          // a MongoDB outage from aborting the run via Promise.all short-circuit.
          await Promise.all([
            repo
              .upsertRunNode(run.id, node.id, {
                status: status,
                outputs: safeOutputs,
                finishedAt,
                nodeType: node.type,
                error: status === 'failed' ? (nextOutputs['message'] as string) : null,
              })
              .catch(() => {}),
            repo
              .createRunEvent({
                runId: run.id,
                level: status === 'failed' ? 'error' : 'info',
                message:
                  status === 'cached'
                    ? `Node ${node.title ?? node.id} reused cached outputs.`
                    : `Node ${node.title ?? node.id} finished with status: ${status}.`,
                metadata: {
                  traceId,
                  spanId: nodeSpanId,
                  nodeId: node.id,
                  nodeType: node.type,
                  iteration,
                  attempt,
                  cached,
                  ...toRunEventRuntimeKernelMetadata({
                    runtimeStrategy,
                    runtimeResolutionSource,
                    runtimeCodeObjectId,
                  }),
                  ...(metadata ? { nodeMetadata: metadata } : {}),
                },
              })
              .catch(() => {}),
            throttledSaveIntermediateState().catch(() => {}),
          ]);
          void recordRuntimeNodeStatus({ runId: run.id, nodeId: node.id, status }).catch(() => {});
        } catch (error) {
          void reportAiPathsError(error, { nodeId: node.id, action: 'onNodeFinish' });
        }
      },
      onNodeBlocked: async ({
        node,
        reason,
        message,
        status,
        waitingOnPorts,
        waitingOnDetails,
        runtimeStrategy,
        runtimeResolutionSource,
        runtimeCodeObjectId,
      }) => {
        try {
          const finishedAt = new Date().toISOString();
          const attempt = nodeAttemptMap.get(node.id) ?? 0;
          const runtimeStatus = status === 'waiting_callback' ? 'waiting_callback' : 'blocked';
          const safeOutputs: RuntimePortValues = {
            status: runtimeStatus,
            skipReason: reason,
            message,
            blockedReason: reason,
            ...(waitingOnPorts ? { waitingOnPorts } : {}),
            ...(waitingOnDetails ? { waitingOnDetails } : {}),
          };
          accOutputs[node.id] = mergeNodeOutputsForStatus({
            previous: accOutputs[node.id],
            next: safeOutputs,
            status: runtimeStatus,
          });

          publishNodeUpdate({
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: runtimeStatus,
            attempt,
            outputs: safeOutputs,
            finishedAt,
            updatedAt: finishedAt,
            errorMessage: message,
          });

          await Promise.all([
            repo
              .upsertRunNode(run.id, node.id, {
                status: runtimeStatus,
                outputs: safeOutputs,
                finishedAt,
                nodeType: node.type,
                error: message,
              })
              .catch(() => {}),
            repo
              .createRunEvent({
                runId: run.id,
                level: runtimeStatus === 'waiting_callback' ? 'info' : 'warn',
                message:
                  runtimeStatus === 'waiting_callback'
                    ? `Node ${node.title ?? node.id} waiting: ${message}`
                    : `Node ${node.title ?? node.id} blocked: ${message}`,
                metadata: {
                  runId: run.id,
                  nodeId: node.id,
                  nodeType: node.type,
                  attempt,
                  reason,
                  status: runtimeStatus,
                  ...toRunEventRuntimeKernelMetadata({
                    runtimeStrategy,
                    runtimeResolutionSource,
                    runtimeCodeObjectId,
                  }),
                  ...(waitingOnPorts ? { waitingOnPorts } : {}),
                },
              })
              .catch(() => {}),
            throttledSaveIntermediateState().catch(() => {}),
          ]);
        } catch (error) {
          void reportAiPathsError(error, { nodeId: node.id, action: 'onNodeBlocked' });
        }
      },
      onNodeError: async ({
        node,
        nodeInputs,
        error,
        iteration,
        runtimeStrategy,
        runtimeResolutionSource,
        runtimeCodeObjectId,
        runStartedAt: cbRunStartedAt,
      }) => {
        try {
          resolvedRunStartedAt = cbRunStartedAt;
          const attempt = nodeAttemptMap.get(node.id) ?? 1;
          const nodeSpanId = `${node.id}:${attempt}:${iteration}`;
          const finishedAt = new Date().toISOString();
          const message = error instanceof Error ? error.message : String(error);

          profiling.finalizeRuntimeNodeSpan({
            spanId: nodeSpanId,
            status: 'failed',
            finishedAt,
          });

          const safeInputs = cloneJsonSafe(nodeInputs) as RuntimePortValues;
          const errorOutputs = extractNodeErrorOutputs(error);
          const errorCodeValue = errorOutputs?.['errorCode'];
          const errorCode =
            typeof errorCodeValue === 'string' ? errorCodeValue : 'AI_PATHS_NODE_EXECUTION_FAILED';
          const hints =
            Array.isArray(errorOutputs?.['hints']) && errorOutputs['hints'].length > 0
              ? (errorOutputs['hints'] as unknown[]).filter(
                (entry: unknown): entry is string => typeof entry === 'string'
              )
              : null;
          const errorOutputKeys = errorOutputs ? Object.keys(errorOutputs).slice(0, 30) : [];
          const errorReport = buildAiPathErrorReport({
            error,
            code: errorCode,
            category: 'runtime',
            scope: 'node',
            severity: 'error',
            userMessage: `Node ${node.title ?? node.id} failed: ${message}`,
            timestamp: finishedAt,
            traceId,
            runId: run.id,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            attempt,
            iteration,
            hints,
            metadata: {
              spanId: nodeSpanId,
              runtimeFingerprint,
              errorOutputKeys,
            },
          });
          accInputs[node.id] = safeInputs;
          accOutputs[node.id] = mergeNodeOutputsForStatus({
            previous: accOutputs[node.id],
            next: errorOutputs ?? {},
            status: 'failed',
          });

          publishNodeUpdate({
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: 'failed',
            attempt,
            inputs: safeInputs,
            outputs: errorOutputs ?? undefined,
            finishedAt,
            updatedAt: finishedAt,
            errorMessage: message,
          });

          await Promise.all([
            repo
              .upsertRunNode(run.id, node.id, {
                status: 'failed',
                outputs: errorOutputs ?? undefined,
                finishedAt,
                nodeType: node.type,
                error: message,
              })
              .catch(() => {}),
            repo
              .createRunEvent({
                runId: run.id,
                level: 'error',
                message: `Node ${node.title ?? node.id} failed: ${message}`,
                metadata: {
                  traceId,
                  spanId: nodeSpanId,
                  nodeId: node.id,
                  nodeType: node.type,
                  iteration,
                  attempt,
                  error: message,
                  ...toRunEventRuntimeKernelMetadata({
                    runtimeStrategy,
                    runtimeResolutionSource,
                    runtimeCodeObjectId,
                  }),
                  errorCode: errorReport.code,
                  errorCategory: errorReport.category,
                  errorScope: errorReport.scope,
                  errorReport,
                  ...(errorOutputKeys.length > 0 ? { errorOutputKeys } : {}),
                },
              })
              .catch(() => {}),
            throttledSaveIntermediateState().catch(() => {}),
          ]);
          void recordRuntimeNodeStatus({ runId: run.id, nodeId: node.id, status: 'failed' }).catch(
            () => {}
          );
        } catch (error) {
          void reportAiPathsError(error, { nodeId: node.id, action: 'onNodeError' });
        }
      },
      onHalt: (halt: { reason: 'blocked' | 'max_iterations' | 'completed' | 'failed' }) => {
        runtimeHaltReason = halt.reason;
      },
    }));

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
      requiredProcessingNodeIds,
      runMetaWithRuntimeContext,
      runStartedAt,
      traceId,
      profileSnapshot,
      stateManager,
      updateRunSnapshot,
    });

    const finishedAt = new Date().toISOString();
    void recordRuntimeRunFinished({
      runId: run.id,
      status: finalStatus as 'completed' | 'failed' | 'canceled' | 'dead_lettered',
      durationMs: computeDurationMs(runStartedAt, finishedAt) ?? undefined,
    }).catch(() => {});
  } catch (error) {
    if (dbRunMissing) throw error;
    const finishedAt = new Date().toISOString();
    const isCancelled =
      error instanceof GraphExecutionCancelled || runAbortController.signal.aborted;
    const status: AiPathRunStatus = isCancelled ? 'canceled' : 'failed';

    const finalRuntimeState = await stateManager.buildCurrentRuntimeStateSnapshot();
    const errorMessage = error instanceof Error ? error.message : String(error);

    await updateRunSnapshot({
      status,
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
