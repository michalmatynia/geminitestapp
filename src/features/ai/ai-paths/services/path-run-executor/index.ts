import 'server-only';

import { cloneJsonSafe, normalizeNodes, sanitizeEdges } from '@/shared/lib/ai-paths';
import { evaluateGraphWithIteratorAutoContinue } from '@/shared/lib/ai-paths/core/runtime/engine-server';
import { GraphExecutionCancelled } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { repairRuntimeStatePorts } from '@/features/ai/ai-paths/services/runtime-state-port-repair';
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
  RuntimeState,
} from '@/shared/contracts/ai-paths';
import type { RuntimeProfileSummary } from '@/shared/contracts/ai-paths-runtime';

import {
  EMPTY_RUNTIME_STATE,
  INTERMEDIATE_SAVE_INTERVAL_MS,
  LOG_NODE_START_EVENTS,
  UPDATE_ELIGIBLE_RUN_STATUSES,
  extractNodeErrorOutputs,
  isMissingRunUpdateError,
  parseRuntimeState,
  resolveCancellationPollIntervalMs,
} from '../path-run-executor.helpers';
import { fetchEntityByType } from '../path-run-executor.entities';
import {
  buildBlockedRunFailureMessage,
  buildFailedRunFailureMessage,
  collectBlockedNodeDiagnostics,
  collectFailedNodeDiagnostics,
  shouldFailBlockedRun,
} from '../path-run-executor.diagnostics';
import { createCancellationMonitor } from '../path-run-executor.monitoring';
import {
  buildRuntimeProfileSnapshot,
  buildSkipSet,
  computeDurationMs,
  mergeNodeOutputsForStatus,
  mergeRuntimePortMaps,
  resolveTriggerNodeId,
  sanitizeRuntimeState,
  toRuntimeNodeStatus,
  toRuntimeProfileHighlight,
} from '../path-run-executor.logic';
import { extractDatabaseRuntimeMetadata } from '../../components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers';

import { createPathRunProfiling } from './profiling';
import { runExecutorPreflight } from './preflight';

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

  const accInputs: Record<string, RuntimePortValues> = mergeRuntimePortMaps(
    {},
    runtimeState.inputs ?? {}
  );
  const accOutputs: Record<string, RuntimePortValues> = mergeRuntimePortMaps(
    {},
    runtimeState.outputs ?? {}
  );
  let latestRuntimeStateSnapshot: RuntimeState | null = null;

  let resolvedRunStartedAt = runStartedAt;

  const loadRunNodesForRuntimeRepair = async (): Promise<AiPathRunNodeRecord[]> => {
    try {
      return await repo.listRunNodes(run.id);
    } catch {
      return [];
    }
  };

  const buildCurrentRuntimeStateSnapshot = async (): Promise<RuntimeState> => {
    const currentRun = {
      ...run,
      status: 'running' as const,
      startedAt: resolvedRunStartedAt,
    };
    const statusFromLatest = latestRuntimeStateSnapshot?.status ?? runtimeState.status;
    const nodeStatusesFromLatest =
      latestRuntimeStateSnapshot?.nodeStatuses ?? runtimeState.nodeStatuses;
    const nodeOutputsFromLatest =
      latestRuntimeStateSnapshot?.nodeOutputs ?? runtimeState.nodeOutputs;
    const historyFromLatest = latestRuntimeStateSnapshot?.history ?? runtimeState.history;
    const hashesFromLatest = latestRuntimeStateSnapshot?.hashes ?? runtimeState.hashes;
    const hashTimestampsFromLatest =
      latestRuntimeStateSnapshot?.hashTimestamps ?? runtimeState.hashTimestamps;
    const nodeDurationsFromLatest =
      latestRuntimeStateSnapshot?.nodeDurations ?? runtimeState.nodeDurations;
    const candidate: RuntimeState = {
      ...EMPTY_RUNTIME_STATE,
      status: statusFromLatest ?? 'running',
      currentRun,
      inputs: accInputs,
      outputs: accOutputs,
      nodeOutputs: nodeOutputsFromLatest ?? accOutputs,
      ...(nodeStatusesFromLatest ? { nodeStatuses: nodeStatusesFromLatest } : {}),
      ...(historyFromLatest ? { history: historyFromLatest } : {}),
      ...(hashesFromLatest ? { hashes: hashesFromLatest } : {}),
      ...(hashTimestampsFromLatest ? { hashTimestamps: hashTimestampsFromLatest } : {}),
      ...(nodeDurationsFromLatest ? { nodeDurations: nodeDurationsFromLatest } : {}),
    };
    const repaired = repairRuntimeStatePorts({
      runtimeState: candidate,
      runNodes: await loadRunNodesForRuntimeRepair(),
    });
    return sanitizeRuntimeState(repaired.runtimeState);
  };

  const saveIntermediateState = async (): Promise<void> => {
    try {
      await updateRunSnapshot({
        runtimeState: await buildCurrentRuntimeStateSnapshot(),
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

  const runMetaRecord = run.meta && typeof run.meta === 'object' ? run.meta : null;
  const runMetaWithRuntimeFingerprint = withRuntimeFingerprintMeta(runMetaRecord);

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
    await ErrorSystem.captureException(error, {
      service: 'ai-paths-runtime',
      pathRunId: run.id,
      summary,
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
        message: summary ?? 'AI Paths runtime error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          runStartedAt,
          runtimeFingerprint,
          traceId,
          ...meta,
        },
      });
    } catch {
      // DB write failed — the error was already captured above; suppress to avoid crash.
    }
  };
  const toast = (): void => {};

  try {
    if (runMetaRecord?.['runtimeFingerprint'] !== runtimeFingerprint) {
      await updateRunSnapshot({
        meta: runMetaWithRuntimeFingerprint,
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

    const { strictFlowMode, nodeValidationEnabled, requiredProcessingNodeIds } = preflight;

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
    latestRuntimeStateSnapshot = await evaluateGraphWithIteratorAutoContinue({
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
      onNodeStart: async ({
        node,
        nodeInputs,
        prevOutputs,
        iteration,
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
      onNodeBlocked: async ({ node, reason, message, status, waitingOnPorts, waitingOnDetails }) => {
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
      onNodeError: async ({ node, nodeInputs, error, iteration, runStartedAt: cbRunStartedAt }) => {
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
      onHalt: (halt: {
        reason: 'blocked' | 'max_iterations' | 'completed' | 'failed';
      }) => {
        runtimeHaltReason = halt.reason;
      },
    });

    if (pendingIntermediateSave) {
      await saveIntermediateState();
    }

    const finishedAt = new Date().toISOString();
    let finalStatus: AiPathRunStatus = 'completed';
    let finalError = null;

    if (runtimeHaltReason === 'canceled') {
      finalStatus = 'canceled';
    } else if (runtimeHaltReason === 'blocked') {
      const blockedNodeDiagnostics = collectBlockedNodeDiagnostics(nodes, accOutputs);
      if (
        shouldFailBlockedRun({
          runBlocked: blockedNodeDiagnostics.length > 0,
          blockedRunPolicy:
            (run.meta?.['blockedRunPolicy'] as 'fail_run' | 'complete_with_warning') ??
            'complete_with_warning',
          nodeValidationEnabled,
        })
      ) {
        finalStatus = 'failed';
        finalError = buildBlockedRunFailureMessage(blockedNodeDiagnostics);
      }
    }
    if (finalStatus === 'completed') {
      const requiredProcessingNodeIdSet = new Set<string>(requiredProcessingNodeIds);
      const failedRequiredNodes = collectFailedNodeDiagnostics(nodes, accOutputs).filter(
        (node) =>
          requiredProcessingNodeIdSet.size === 0 || requiredProcessingNodeIdSet.has(node.nodeId)
      );
      if (failedRequiredNodes.length > 0) {
        finalStatus = 'failed';
        finalError = buildFailedRunFailureMessage(failedRequiredNodes);
      }
    }

    const profileSnapshot = buildRuntimeProfileSnapshot({
      traceId,
      eventCount: profiling.runtimeProfileHighlights.length,
      sampledHighlights: profiling.runtimeProfileHighlights.map(toRuntimeProfileHighlight),
      summary: runtimeProfileSummary,
      nodeSpans: profiling.getRuntimeNodeSpansSnapshot(),
    });

    const finalRuntimeState = await buildCurrentRuntimeStateSnapshot();

    await updateRunSnapshot({
      status: finalStatus,
      runtimeState: finalRuntimeState,
      errorMessage: finalError,
      meta: {
        ...(run.meta ?? {}),
        finishedAt,
        durationMs: computeDurationMs(runStartedAt, finishedAt),
        runtimeTrace: {
          profile: profileSnapshot,
        },
      },
    });

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

    const finalRuntimeState = await buildCurrentRuntimeStateSnapshot();
    const errorMessage = error instanceof Error ? error.message : String(error);

    await updateRunSnapshot({
      status,
      runtimeState: finalRuntimeState,
      errorMessage,
      meta: {
        ...(run.meta ?? {}),
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
