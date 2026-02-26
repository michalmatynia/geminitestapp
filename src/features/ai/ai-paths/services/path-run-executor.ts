/* eslint-disable */
import 'server-only';

import {
  cloneJsonSafe,
  evaluateRunPreflight,
  GraphExecutionCancelled,
  migrateTriggerToFetcherGraph,
  normalizeNodes,
  normalizeAiPathsValidationConfig,
  sanitizeEdges,
} from '@/features/ai/ai-paths/lib';
import { evaluateGraphWithIteratorAutoContinue } from '@/features/ai/ai-paths/lib/core/runtime/engine-server';
import { buildCompileWarningMessage } from '@/features/ai/ai-paths/lib/core/utils/compile-warning-message';
import {
  evaluateDisabledNodeTypesPolicy,
  formatDisabledNodeTypesPolicyMessage,
} from '@/features/ai/ai-paths/services/path-run-policy';
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
import { ErrorSystem } from '@/features/observability/services/error-system';
import type {
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunStatus,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths';
import type {
  AiPathRuntimeProfileEventDto,
  RuntimeProfileSummaryDto,
} from '@/shared/contracts/ai-paths-runtime';

import {
  EMPTY_RUNTIME_STATE,
  INTERMEDIATE_SAVE_INTERVAL_MS,
  LOG_NODE_START_EVENTS,
  RUNTIME_PROFILE_SAMPLE_LIMIT,
  RUNTIME_PROFILE_SLOW_NODE_MS,
  RUNTIME_TRACE_SPAN_LIMIT,
  TERMINAL_RUN_STATUSES,
  UPDATE_ELIGIBLE_RUN_STATUSES,
  extractNodeErrorOutputs,
  isMissingRunUpdateError,
  isRecord,
  parseRuntimeState,
  resolveCancellationPollIntervalMs,
  collectDroppedRuntimePorts,
} from './path-run-executor.helpers';
import { fetchEntityByType } from './path-run-executor.entities';
import {
  buildBlockedRunFailureMessage,
  collectBlockedNodeDiagnostics,
} from './path-run-executor.diagnostics';
import { createCancellationMonitor } from './path-run-executor.monitoring';
import {
  buildRuntimeProfileSnapshot,
  buildSkipSet,
  computeDurationMs,
  mergeRuntimePortMaps,
  resolveTriggerNodeId,
  sanitizeRuntimeState,
  shouldCaptureRuntimeProfileHighlight,
  toRuntimeLifecycleStatus,
  toRuntimeProfileHighlight,
} from './path-run-executor.logic';
import type {
  RuntimeProfileHighlight,
  RuntimeProfileNodeSpan,
  RuntimeProfileNodeSpanStatus,
  RuntimeProfileSnapshot,
} from './path-run-executor.types';

export const executePathRun = async (run: AiPathRunRecord): Promise<void> => {
  let repo;
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
  let dbRunMissing = false;
  const runAbortController = new AbortController();
  const cancellationPollIntervalMs = resolveCancellationPollIntervalMs();

  const monitor = createCancellationMonitor({
    runId: run.id,
    repo,
    abortController: runAbortController,
    pollIntervalMs: cancellationPollIntervalMs,
    onMissingRun: () => { dbRunMissing = true; },
  });

  const updateRunSnapshot = async (
    data: Parameters<typeof repo.updateRun>[1]
  ): Promise<AiPathRunRecord | null> => {
    if (dbRunMissing) return null;
    try {
      const updated = await repo.updateRunIfStatus(run.id, UPDATE_ELIGIBLE_RUN_STATUSES, data);
      if (!updated) {
        dbRunMissing = true;
      }
      return updated;
    } catch (error) {
      if (isMissingRunUpdateError(error)) {
        dbRunMissing = true;
        return null;
      }
      throw error;
    }
  };

  const runStartedAt =
    typeof run.startedAt === 'string'
      ? run.startedAt
      : new Date().toISOString();
  const traceId = run.id;
  const runtimeFingerprint = getAiPathsRuntimeFingerprint();
  let runtimeProfileEventCount = 0;
  const runtimeProfileHighlights: RuntimeProfileHighlight[] = [];
  let runtimeProfileSummary: RuntimeProfileSummaryDto | null = null;
  let runtimeProfilePersisted = false;
  const runtimeNodeSpans = new Map<string, RuntimeProfileNodeSpan>();
  const runtimeNodeSpanOrder: string[] = [];

  const setRuntimeNodeSpan = (span: RuntimeProfileNodeSpan): void => {
    if (!runtimeNodeSpans.has(span.spanId)) {
      runtimeNodeSpanOrder.push(span.spanId);
    }
    runtimeNodeSpans.set(span.spanId, span);
    while (runtimeNodeSpanOrder.length > RUNTIME_TRACE_SPAN_LIMIT) {
      const dropped = runtimeNodeSpanOrder.shift();
      if (dropped) {
        runtimeNodeSpans.delete(dropped);
      }
    }
  };

  const beginRuntimeNodeSpan = (input: {
    spanId: string;
    nodeId: string;
    nodeType: string;
    nodeTitle: string | null;
    iteration: number;
    attempt: number;
    startedAt: string;
  }): void => {
    setRuntimeNodeSpan({
      spanId: input.spanId,
      nodeId: input.nodeId,
      nodeType: input.nodeType,
      nodeTitle: input.nodeTitle,
      iteration: input.iteration,
      attempt: input.attempt,
      status: 'running',
      startedAt: input.startedAt,
      finishedAt: null,
      durationMs: null,
      error: null,
      cached: false,
    });
  };

  const finalizeRuntimeNodeSpan = (input: {
    spanId: string;
    nodeId: string;
    nodeType: string;
    nodeTitle: string | null;
    iteration: number;
    attempt: number;
    status: Exclude<RuntimeProfileNodeSpanStatus, 'running'>;
    finishedAt: string;
    error?: string | null;
    cached?: boolean;
  }): void => {
    const existing = runtimeNodeSpans.get(input.spanId);
    const startedAt = existing?.startedAt ?? null;
    setRuntimeNodeSpan({
      spanId: input.spanId,
      nodeId: input.nodeId,
      nodeType: input.nodeType,
      nodeTitle: input.nodeTitle,
      iteration: input.iteration,
      attempt: input.attempt,
      status: input.status,
      startedAt,
      finishedAt: input.finishedAt,
      durationMs: computeDurationMs(startedAt, input.finishedAt),
      error: input.error ?? null,
      cached: input.cached ?? input.status === 'cached',
    });
  };

  const getRuntimeNodeSpansSnapshot = (): RuntimeProfileNodeSpan[] =>
    runtimeNodeSpanOrder
      .map((spanId: string): RuntimeProfileNodeSpan | undefined => runtimeNodeSpans.get(spanId))
      .filter((span: RuntimeProfileNodeSpan | undefined): span is RuntimeProfileNodeSpan =>
        Boolean(span)
      );

  const captureRuntimeProfileEvent = (event: AiPathRuntimeProfileEventDto): void => {
    runtimeProfileEventCount += 1;
    if (
      runtimeProfileHighlights.length >= RUNTIME_PROFILE_SAMPLE_LIMIT ||
      !shouldCaptureRuntimeProfileHighlight(event)
    ) {
      return;
    }
    runtimeProfileHighlights.push(toRuntimeProfileHighlight(event));
  };

  const buildTraceMeta = (
    snapshot: RuntimeProfileSnapshot | null
  ): Record<string, unknown> => ({
    traceId,
    profile: snapshot,
  });

  const persistRuntimeProfile = async (
    level: 'info' | 'warn' | 'error',
    message: string
  ): Promise<RuntimeProfileSnapshot | null> => {
    if (runtimeProfilePersisted) return null;
    const nodeSpans = getRuntimeNodeSpansSnapshot();
    const snapshot =
      runtimeProfileEventCount > 0 || runtimeProfileSummary || nodeSpans.length > 0
        ? buildRuntimeProfileSnapshot({
          traceId,
          eventCount: runtimeProfileEventCount,
          sampledHighlights: runtimeProfileHighlights,
          summary: runtimeProfileSummary,
          nodeSpans,
        })
        : null;
    runtimeProfilePersisted = true;
    if (!snapshot || dbRunMissing) return snapshot;
    try {
      await repo.createRunEvent({
        runId: run.id,
        level,
        message,
        metadata: {
          traceId,
          kind: 'runtime_profile_summary',
          runtimeProfile: snapshot,
          runStartedAt,
        },
      });
      publishRunUpdate(run.id, 'events', {
        level,
        message,
        traceId,
        kind: 'runtime_profile_summary',
        runtimeProfile: snapshot,
      });
    } catch (error) {
      void ErrorSystem.logWarning('Failed to persist runtime profile snapshot', {
        service: 'ai-paths-executor',
        error,
        runId: run.id,
      });
    }
    return snapshot;
  };
  
  const graph = run.graph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    try {
      const errorMsg = 'Run graph is missing or invalid. This usually indicates a corrupted path configuration or a breaking change in node definitions.';
      await updateRunSnapshot({
        status: 'failed',
        errorMessage: errorMsg,
        finishedAt: new Date().toISOString(),
      });
      if (!dbRunMissing) {
        await repo.createRunEvent({
          runId: run.id,
          level: 'error',
          message: errorMsg,
          metadata: { runStartedAt, graphPresent: !!graph, traceId },
        });
      }
    } catch (dbError) {
      void ErrorSystem.logWarning('Failed to update failed status for invalid graph', {
        service: 'ai-paths-executor',
        error: dbError,
        runId: run.id,
      });
    }
    return;
  }

  const normalizedNodes = normalizeNodes(graph.nodes);
  const migratedTriggerGraph = migrateTriggerToFetcherGraph(normalizedNodes, graph.edges);
  const nodes = normalizeNodes(migratedTriggerGraph.nodes);
  const edges = sanitizeEdges(nodes, migratedTriggerGraph.edges);
  const triggerNodeId = resolveTriggerNodeId(
    nodes,
    edges,
    run.triggerEvent ?? undefined,
    run.triggerNodeId ?? undefined
  );

  const runtimeState = parseRuntimeState(run.runtimeState);

  const accInputs: Record<string, RuntimePortValues> = { ...(runtimeState.inputs ?? {}) };
  const accOutputs: Record<string, RuntimePortValues> = { ...(runtimeState.outputs ?? {}) };
  let resolvedRunId = run.id;
  let resolvedRunStartedAt = runStartedAt;
  let runtimeRepairNodes: AiPathRunNodeRecord[] | null = null;

  const loadRunNodesForRuntimeRepair = async (): Promise<AiPathRunNodeRecord[]> => {
    if (runtimeRepairNodes) return runtimeRepairNodes;
    if (dbRunMissing) return [];
    try {
      runtimeRepairNodes = await repo.listRunNodes(run.id);
      return runtimeRepairNodes;
    } catch (error) {
      void ErrorSystem.logWarning('Failed to load run nodes for runtime state repair', {
        service: 'ai-paths-executor',
        error,
        runId: run.id,
      });
      return [];
    }
  };

  const buildPersistedRuntimeState = async (
    baseState: unknown,
    runStatus: AiPathRunStatus,
  ): Promise<RuntimeState> => {
    const parsedBase = parseRuntimeState(baseState);
    const mergedInputs = mergeRuntimePortMaps(accInputs, parsedBase.inputs);
    const mergedOutputs = mergeRuntimePortMaps(accOutputs, parsedBase.outputs);
    const mergedNodeOutputs = mergeRuntimePortMaps(parsedBase.nodeOutputs, mergedOutputs);
    const candidate: RuntimeState = {
      ...EMPTY_RUNTIME_STATE,
      ...parsedBase,
      status: toRuntimeLifecycleStatus(runStatus),
      runId: resolvedRunId,
      runStartedAt: resolvedRunStartedAt,
      inputs: mergedInputs,
      outputs: mergedOutputs,
      nodeOutputs: mergedNodeOutputs,
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
        runtimeState: sanitizeRuntimeState({
          ...EMPTY_RUNTIME_STATE,
          status: 'running',
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          inputs: accInputs,
          outputs: accOutputs,
          nodeOutputs: accOutputs,
        }),
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

  const runMetaRecord =
    run.meta && typeof run.meta === 'object'
      ? run.meta as any
      : null;
  const runMetaWithRuntimeFingerprint = withRuntimeFingerprintMeta(
    runMetaRecord
  );
  
  const strictFlowMode = runMetaRecord?.['strictFlowMode'] !== false;
  const blockedRunPolicy = (runMetaRecord?.['blockedRunPolicy'] === 'complete_with_warning' ? 'complete_with_warning' : 'fail_run') as 'fail_run' | 'complete_with_warning';
  const validationConfig = normalizeAiPathsValidationConfig(
    runMetaRecord?.['aiPathsValidation'] as Record<string, unknown> | undefined
  );
  const nodeValidationEnabled = validationConfig.enabled !== false;
  const resolvedHistoryLimit = typeof runMetaRecord?.['historyRetentionPasses'] === 'number' ? runMetaRecord['historyRetentionPasses'] : 20;
  
  const nodeRecords = await repo.listRunNodes(run.id);
  const nodeStatusMap = new Map<string, string>(
    nodeRecords.map((record: AiPathRunNodeRecord) => [record.nodeId, record.status])
  );
  const nodeAttemptMap = new Map<string, number>(
    nodeRecords.map((record: AiPathRunNodeRecord) => [record.nodeId, record.attempt ?? 0])
  );
  const skipNodes = buildSkipSet(run, edges, nodeStatusMap);
  const reportAiPathsError = async (error: unknown, meta: Record<string, unknown>, summary?: string): Promise<void> => {
    await ErrorSystem.captureException(error, {
      service: 'ai-paths-runtime',
      pathRunId: run.id,
      summary,
      ...meta,
    });
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
  };
  const toast = (): void => {};

  try {
    if (runMetaRecord?.['runtimeFingerprint'] !== runtimeFingerprint) {
      await updateRunSnapshot({
        meta: runMetaWithRuntimeFingerprint,
      });
    }

    const runPreflight = evaluateRunPreflight({
      nodes,
      edges,
      aiPathsValidation: validationConfig,
      strictFlowMode,
      triggerNodeId,
      runtimeState,
      mode: 'full',
    });
    const compileReport = runPreflight.compileReport;
    const validationReport = runPreflight.validationReport;
    const dataContractReport = runPreflight.dataContractReport;
    if (runPreflight.shouldBlock) {
      const blockedMessageByReason: Record<string, string> = {
        validation: 'Run blocked by AI Paths validation preflight.',
        compile: 'Run blocked by graph compile validation.',
        dependency: 'Run blocked by strict flow dependency validation.',
        data_contract: 'Run blocked by data-contract preflight validation.',
      };
      const blockedEventMessage =
        blockedMessageByReason[runPreflight.blockReason ?? ''] ??
        'Run blocked by preflight validation.';
      await repo.createRunEvent({
        runId: run.id,
        level: 'error',
        message: blockedEventMessage,
        metadata: {
          preflight: {
            reason: runPreflight.blockReason,
            message: runPreflight.blockMessage,
            validation: validationReport,
            compile: {
              errors: compileReport.errors,
              warnings: compileReport.warnings,
              findings: compileReport.findings.slice(0, 10),
            },
            dataContract: {
              errors: dataContractReport.errors,
              warnings: dataContractReport.warnings,
              issues: dataContractReport.issues.slice(0, 10),
            },
          },
          runStartedAt,
          traceId,
        },
      });
      throw new Error(
        runPreflight.blockMessage ?? blockedEventMessage
      );
    }
    if (nodeValidationEnabled && compileReport.warnings > 0) {
      const warningMessage = buildCompileWarningMessage(compileReport);
      await repo.createRunEvent({
        runId: run.id,
        level: 'warn',
        message: warningMessage,
        metadata: {
          compile: {
            errors: compileReport.errors,
            warnings: compileReport.warnings,
            findings: compileReport.findings.slice(0, 10),
          },
          runStartedAt,
          traceId,
        },
      });
    }
    const policyReport = evaluateDisabledNodeTypesPolicy(nodes);
    if (policyReport.violations.length > 0) {
      await repo.createRunEvent({
        runId: run.id,
        level: 'error',
        message: 'Run blocked by node policy.',
        metadata: {
          traceId,
          runStartedAt,
          disabledNodeTypes: policyReport.disabledNodeTypes,
          blockedNodes: policyReport.violations.slice(0, 10),
        },
      });
      throw new Error(formatDisabledNodeTypesPolicyMessage(policyReport.violations));
    }

    if (validationReport.enabled && validationReport.shouldWarn) {
      await repo.createRunEvent({
        runId: run.id,
        level: 'warn',
        message: `Validation warning: score ${validationReport.score} with ${validationReport.failedRules} failed rule(s).`,
        metadata: {
          validation: {
            score: validationReport.score,
            policy: validationReport.policy,
            warnThreshold: validationReport.warnThreshold,
            blockThreshold: validationReport.blockThreshold,
            failedRules: validationReport.failedRules,
            findings: validationReport.findings.slice(0, 5),
          },
          runStartedAt,
          traceId,
        },
      });
    }

    const cancelledBeforeExecution = await monitor.start();
    if (cancelledBeforeExecution) {
      return;
    }

    let runtimeHaltReason: 'step_limit' | 'completed' | 'cancelled' | 'blocked' | null = null;
    let runtimeHaltIteration: number | null = null;
    const resultState = await evaluateGraphWithIteratorAutoContinue({
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
      seedRunId: runtimeState.runId ?? undefined,
      seedRunStartedAt: runtimeState.runStartedAt ?? undefined,
      recordHistory: true,      historyLimit: resolvedHistoryLimit,      skipNodeIds: skipNodes,
      fetchEntityByType,
      reportAiPathsError: (error: unknown, meta: Record<string, unknown>, summary?: string) => {
        void reportAiPathsError(error, meta, summary);
      },
      toast,
      profile: {
        onEvent: (event): void => {
          captureRuntimeProfileEvent(event);
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
          resolvedRunId = run.id;
          resolvedRunStartedAt = cbRunStartedAt;
          const nextAttempt = (nodeAttemptMap.get(node.id) ?? 0) + 1;
          nodeAttemptMap.set(node.id, nextAttempt);
          const nodeSpanId = `${node.id}:${nextAttempt}:${iteration}`;
          const nodeStartedAt = new Date().toISOString();
          beginRuntimeNodeSpan({
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
          accOutputs[node.id] = { ...(accOutputs[node.id] ?? {}), status: 'running' } as RuntimePortValues;

          const tasks: Promise<unknown>[] = [
            repo.upsertRunNode(run.id, node.id, {
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: 'running',
              attempt: nextAttempt,
              inputs: safeInputs,
              outputs: safePrevOutputs,
              startedAt: nodeStartedAt,
              errorMessage: null,
            }),
            throttledSaveIntermediateState(),
          ];
          if (LOG_NODE_START_EVENTS) {
            tasks.push(
              repo.createRunEvent({
                runId: run.id,
                level: 'info',
                message: `Node ${node.title ?? node.id} started.`,
                metadata: {
                  traceId,
                  spanId: nodeSpanId,
                  nodeId: node.id,
                  nodeType: node.type,
                  nodeTitle: node.title ?? null,
                  status: 'running',
                  attempt: nextAttempt,
                  iteration,
                  runStartedAt: cbRunStartedAt,
                },
              })
            );
          }
          await Promise.all(tasks);
          await recordRuntimeNodeStatus({
            runId: run.id,
            nodeId: node.id,
            status: 'running',
          });
          publishRunUpdate(run.id, 'nodes', {
            traceId,
            spanId: nodeSpanId,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: 'running',
            attempt: nextAttempt,
            iteration,
          });
        } catch (error) {
          void ErrorSystem.logWarning(`onNodeStart failed for node ${node.id}`, {
            service: 'ai-paths-executor',
            error,
            runId: run.id,
            nodeId: node.id,
          });
        }
      },
      onNodeFinish: async ({
        node,
        nodeInputs,
        nextOutputs,
        cached,
        iteration,
        runStartedAt: cbRunStartedAt,
      }) => {
        try {
          const safeInputs = cloneJsonSafe(nodeInputs) as RuntimePortValues;
          const safeOutputs = cloneJsonSafe(nextOutputs) as RuntimePortValues;
          const rawOutputStatus =
            typeof safeOutputs?.['status'] === 'string'
              ? safeOutputs['status'].trim().toLowerCase()
              : null;
          const resolvedStatus =
            cached
              ? 'cached'
              : rawOutputStatus === 'blocked' || rawOutputStatus === 'skipped'
                ? rawOutputStatus
                : 'completed';
          accInputs[node.id] = safeInputs;
          accOutputs[node.id] = {
            ...(safeOutputs),
            status: resolvedStatus,
          } as RuntimePortValues;
          const attempt = nodeAttemptMap.get(node.id) ?? 0;
          const nodeSpanId = `${node.id}:${attempt}:${iteration}`;
          const nodeFinishedAt = new Date().toISOString();
          finalizeRuntimeNodeSpan({
            spanId: nodeSpanId,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            iteration,
            attempt,
            status: resolvedStatus,
            finishedAt: nodeFinishedAt,
            cached: Boolean(cached),
          });

          if (resolvedStatus === 'cached') {
            if (iteration === 0) {
              await Promise.all([
                repo.upsertRunNode(run.id, node.id, {
                  nodeType: node.type,
                  nodeTitle: node.title ?? null,
                  status: 'cached',
                  attempt,
                  inputs: safeInputs,
                  outputs: safeOutputs,
                  finishedAt: nodeFinishedAt,
                  errorMessage: null,
                }),
                repo.createRunEvent({
                  runId: run.id,
                  level: 'info',
                  message: `Node ${node.title ?? node.id} reused cached outputs.`,
                  metadata: {
                    traceId,
                    spanId: nodeSpanId,
                    nodeId: node.id,
                    nodeType: node.type,
                    nodeTitle: node.title ?? null,
                    status: 'cached',
                    cached: true,
                    attempt,
                    iteration,
                    runStartedAt: cbRunStartedAt,
                  },
                }),
                throttledSaveIntermediateState(),
              ]);
              await recordRuntimeNodeStatus({
                runId: run.id,
                nodeId: node.id,
                status: 'cached',
              });
              publishRunUpdate(run.id, 'nodes', {
                traceId,
                spanId: nodeSpanId,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'cached',
                cached: true,
                outputs: safeOutputs,
              });
            }
            return;
          }
          const terminalLevel =
            resolvedStatus === 'blocked' || resolvedStatus === 'skipped'
              ? 'warn'
              : 'info';
          const terminalMessage =
            resolvedStatus === 'blocked'
              ? `Node ${node.title ?? node.id} blocked.`
              : resolvedStatus === 'skipped'
                ? `Node ${node.title ?? node.id} skipped.`
                : `Node ${node.title ?? node.id} completed.`;
          await Promise.all([
            repo.upsertRunNode(run.id, node.id, {
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: resolvedStatus,
              attempt,
              inputs: safeInputs,
              outputs: safeOutputs,
              finishedAt: nodeFinishedAt,
              errorMessage: null,
            }),
            repo.createRunEvent({
              runId: run.id,
              level: terminalLevel,
              message: terminalMessage,
              metadata: {
                traceId,
                spanId: nodeSpanId,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: resolvedStatus,
                attempt,
                iteration,
                runStartedAt: cbRunStartedAt,
              },
            }),
            throttledSaveIntermediateState(),
          ]);
          await recordRuntimeNodeStatus({
            runId: run.id,
            nodeId: node.id,
            status: resolvedStatus,
          });
          publishRunUpdate(run.id, 'nodes', {
            traceId,
            spanId: nodeSpanId,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: resolvedStatus,
            outputs: safeOutputs,
            iteration,
          });
        } catch (error) {
          void ErrorSystem.logWarning(`onNodeFinish failed for node ${node.id}`, {
            service: 'ai-paths-executor',
            error,
            runId: run.id,
            nodeId: node.id,
          });
        }
      },
      onNodeBlocked: async ({ node, reason, waitingOnPorts }) => {
        try {
          const attempt = nodeAttemptMap.get(node.id) ?? 0;
          const nodeSpanId = `${node.id}:${attempt}:blocked`;
          
          await Promise.all([
            repo.upsertRunNode(run.id, node.id, {
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: 'blocked',
              attempt,
              errorMessage: `Node blocked: ${reason}`,
            }),
            repo.createRunEvent({
              runId: run.id,
              level: 'warn',
              message: `Node ${node.title ?? node.id} blocked: ${reason}.`,
              metadata: {
                traceId,
                spanId: nodeSpanId,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'blocked',
                reason,
                waitingOnPorts,
                attempt,
              },
            }),
          ]);
          await recordRuntimeNodeStatus({
            runId: run.id,
            nodeId: node.id,
            status: 'blocked',
          });
          publishRunUpdate(run.id, 'nodes', {
            traceId,
            spanId: nodeSpanId,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: 'blocked',
            reason,
            waitingOnPorts,
          });
        } catch (error) {
          void ErrorSystem.logWarning(`onNodeBlocked failed for node ${node.id}`, {
            service: 'ai-paths-executor',
            error,
            runId: run.id,
            nodeId: node.id,
          });
        }
      },
      onNodeError: async ({
        node,
        nodeInputs,
        prevOutputs,
        error,
        iteration,
        runStartedAt: cbRunStartedAt,
      }) => {
        try {
          const safeInputs = cloneJsonSafe(nodeInputs) as RuntimePortValues;
          const safePrevOutputs = cloneJsonSafe(prevOutputs ?? {}) as RuntimePortValues;
          const safeErrorOutputs = extractNodeErrorOutputs(error);
          const failedNodeOutputs = safeErrorOutputs ?? safePrevOutputs;
          accOutputs[node.id] = {
            ...(accOutputs[node.id] ?? {}),
            ...failedNodeOutputs,
            status: 'failed',
          } as RuntimePortValues;
          const attempt = nodeAttemptMap.get(node.id) ?? 0;
          const nodeSpanId = `${node.id}:${attempt}:${iteration}`;
          const nodeFinishedAt = new Date().toISOString();
          const errorMessage = error instanceof Error ? error.message : String(error);
          finalizeRuntimeNodeSpan({
            spanId: nodeSpanId,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            iteration,
            attempt,
            status: 'failed',
            finishedAt: nodeFinishedAt,
            error: errorMessage,
          });

          await Promise.all([
            repo.upsertRunNode(run.id, node.id, {
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: 'failed',
              attempt,
              inputs: safeInputs,
              outputs: failedNodeOutputs,
              finishedAt: nodeFinishedAt,
              errorMessage,
            }),
            repo.createRunEvent({
              runId: run.id,
              level: 'error',
              message: `Node ${node.title ?? node.id} failed.`,
              metadata: {
                traceId,
                spanId: nodeSpanId,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'failed',
                attempt,
                error: errorMessage,
                iteration,
                runStartedAt: cbRunStartedAt,
              },
            }),
            saveIntermediateState(),
          ]);
          await recordRuntimeNodeStatus({
            runId: run.id,
            nodeId: node.id,
            status: 'failed',
          });
          publishRunUpdate(run.id, 'nodes', {
            traceId,
            spanId: nodeSpanId,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: 'failed',
            error: errorMessage,
            outputs: failedNodeOutputs,
            iteration,
          });
        } catch (dbError) {
          void ErrorSystem.logWarning(`onNodeError failed for node ${node.id}`, {
            service: 'ai-paths-executor',
            error: dbError,
            runId: run.id,
            nodeId: node.id,
          });
        }
      },
      onIterationEnd: async ({
        runId: cbRunId,
        runStartedAt: cbRunStartedAt,
        inputs,
        outputs,
        hashes,
        history,
      }: {
        runId: string;
        runStartedAt: string;
        inputs: Record<string, RuntimePortValues>;
        outputs: Record<string, RuntimePortValues>;
        hashes?: RuntimeState['hashes'];
        history?: RuntimeState['history'];
      }) => {
        try {
          Object.assign(accInputs, inputs);
          Object.assign(accOutputs, outputs);
          resolvedRunId = cbRunId;
          resolvedRunStartedAt = cbRunStartedAt;

          await updateRunSnapshot({
            runtimeState: sanitizeRuntimeState({
              ...EMPTY_RUNTIME_STATE,
              status: 'running',
              runId: cbRunId,
              runStartedAt: cbRunStartedAt,
              inputs,
              outputs,
              nodeOutputs: outputs,
              hashes,
              history,
            }),
          });
        } catch (error) {
          void ErrorSystem.logWarning(`onIterationEnd failed for run ${run.id}`, {
            service: 'ai-paths-executor',
            error,
            runId: run.id,
          });
        }
      },
      control: {
        signal: runAbortController.signal,
        onHalt: ({
          reason,
          iteration,
        }: {
          reason: 'step_limit' | 'completed' | 'cancelled' | 'blocked';
          iteration?: number;
        }): void => {
          runtimeHaltReason = reason;
          runtimeHaltIteration = typeof iteration === 'number' ? iteration : null;
        },
      },
    });

    if (pendingIntermediateSave) {
      await saveIntermediateState();
    }

    const runtimeProfileSnapshot = await persistRuntimeProfile(
      'info',
      'Runtime profile summary recorded.'
    );
    const finishedAt = new Date();
    const blockedNodeDiagnostics = collectBlockedNodeDiagnostics(nodes, resultState.outputs);
    const haltedAsBlocked = runtimeHaltReason === 'blocked';
    const runBlocked = haltedAsBlocked || blockedNodeDiagnostics.length > 0;
    const shouldFailOnBlocked = runBlocked && blockedRunPolicy === 'fail_run';
    const blockedFailureMessage = buildBlockedRunFailureMessage(blockedNodeDiagnostics);
    let finalizedTerminalStatus: AiPathRunStatus | null = null;
    let finalizedErrorMessage: string | null = null;
    try {
      const latestRun = await repo.findRunById(run.id);
      if (latestRun?.status === 'canceled') {
        const canceledRuntimeState = await buildPersistedRuntimeState(resultState, 'canceled');
        await updateRunSnapshot({
          runtimeState: canceledRuntimeState,
          ...(latestRun.finishedAt ? {} : { finishedAt: finishedAt.toISOString() }),
        });
      } else if (!latestRun || !TERMINAL_RUN_STATUSES.has(latestRun.status)) {
        const terminalRunStatus: AiPathRunStatus = shouldFailOnBlocked ? 'failed' : 'completed';
        const terminalRuntimeState = await buildPersistedRuntimeState(
          resultState,
          terminalRunStatus
        );
        const updated = shouldFailOnBlocked
          ? await updateRunSnapshot({
            status: 'failed',
            runtimeState: terminalRuntimeState,
            finishedAt: finishedAt.toISOString(),
            errorMessage: blockedFailureMessage,
            meta: withRuntimeFingerprintMeta({
              ...(run.meta as Record<string, unknown> ?? {}),
              runtimeTrace: buildTraceMeta(runtimeProfileSnapshot),
              resumeMode: 'replay',
              retryNodeIds: [],
            }),
          })
          : await updateRunSnapshot({
            status: 'completed',
            runtimeState: terminalRuntimeState,
            finishedAt: finishedAt.toISOString(),
            errorMessage: null,
            meta: withRuntimeFingerprintMeta({
              ...(run.meta as Record<string, unknown> ?? {}),
              runtimeTrace: buildTraceMeta(runtimeProfileSnapshot),
              resumeMode: 'replay',
              retryNodeIds: [],
            }),
          });
        if (updated) {
          await repo.createRunEvent({
            runId: run.id,
            level:
              shouldFailOnBlocked
                ? 'error'
                : runBlocked
                  ? 'warn'
                  : 'info',
            message:
              shouldFailOnBlocked
                ? 'Run failed: blocked node inputs detected.'
                : runBlocked
                  ? 'Run completed with blocked node warnings.'
                  : 'Run completed successfully.',
            metadata: {
              runStartedAt,
              runtimeFingerprint,
              traceId,
              ...(runBlocked
                ? {
                  haltReason: runtimeHaltReason,
                  haltIteration: runtimeHaltIteration,
                  blockedRunPolicy,
                  blockedNodes: blockedNodeDiagnostics.slice(0, 10),
                }
                : {}),
            },
          });
          finalizedTerminalStatus = shouldFailOnBlocked ? 'failed' : 'completed';
          finalizedErrorMessage = shouldFailOnBlocked ? blockedFailureMessage : null;
        }
      }
    } catch (finalDbError) {
      void ErrorSystem.logWarning('Failed to record run completion in DB', {
        service: 'ai-paths-executor',
        error: finalDbError,
        runId: run.id,
      });
    }

    if (finalizedTerminalStatus) {
      if (finalizedTerminalStatus === 'failed') {
        publishRunUpdate(run.id, 'error', {
          error: finalizedErrorMessage ?? blockedFailureMessage,
          traceId,
        });
      }
      publishRunUpdate(run.id, 'done', {
        status: finalizedTerminalStatus,
        traceId,
      });
      try {
        const startedAtMs = Date.parse(runStartedAt);
        const durationMs = Number.isFinite(startedAtMs)
          ? Math.max(0, finishedAt.getTime() - startedAtMs)
          : null;
        await recordRuntimeRunFinished({
          runId: run.id,
          status: finalizedTerminalStatus,
          durationMs,
          timestamp: finishedAt,
        });
      } catch (analyticsError) {
        void ErrorSystem.logWarning('Failed to record finalization analytics', {
          service: 'ai-paths-executor',
          error: analyticsError,
          runId: run.id,
        });
      }
    }
  } catch (error) {
    if (
      error instanceof GraphExecutionCancelled ||
      (error instanceof Error && error.name === 'GraphExecutionCancelled')
    ) {
      const latestRun = await repo.findRunById(run.id).catch((): AiPathRunRecord | null => null);
      if (latestRun?.status === 'canceled') {
        const finishedAt = new Date().toISOString();
        try {
          const cancelledRuntimeState =
            error instanceof GraphExecutionCancelled
              ? await buildPersistedRuntimeState(error.state, 'canceled')
              : await buildPersistedRuntimeState(runtimeState, 'canceled');
          await updateRunSnapshot({
            runtimeState: cancelledRuntimeState,
            ...(latestRun.finishedAt ? {} : { finishedAt }),
          });
        } catch (cancelUpdateError) {
          void ErrorSystem.logWarning('Failed to finalize cancelled run snapshot', {
            service: 'ai-paths-executor',
            error: cancelUpdateError,
            runId: run.id,
          });
        }
        return;
      }
    }

    void ErrorSystem.captureException(error, {
      service: 'ai-paths-executor',
      action: 'executePathRun',
      runId: run.id,
      traceId,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date();

    const latestRun = await repo.findRunById(run.id).catch((): AiPathRunRecord | null => null);
    if (latestRun && TERMINAL_RUN_STATUSES.has(latestRun.status)) {
      throw error;
    }
    const runtimeProfileSnapshot = await persistRuntimeProfile(
      'warn',
      'Runtime profile captured before run failure.'
    );
    
    try {
      const failedRuntimeState =
        error instanceof Error && error.name === 'GraphExecutionError' && 'state' in error
          ? await buildPersistedRuntimeState((error as { state: unknown }).state, 'failed')
          : await buildPersistedRuntimeState(runtimeState, 'failed');
      await updateRunSnapshot({
        status: 'failed',
        runtimeState: failedRuntimeState,
        finishedAt: finishedAt.toISOString(),
        errorMessage,
        meta: withRuntimeFingerprintMeta({
          ...(run.meta as Record<string, unknown> ?? {}),
          runtimeTrace: buildTraceMeta(runtimeProfileSnapshot),
        }),
      });
    } catch (dbUpdateError) {
      void ErrorSystem.logWarning('Failed to update run status to failed in DB', {
        service: 'ai-paths-executor',
        error: dbUpdateError,
        runId: run.id,
      });
    }

    if (!dbRunMissing) {
      try {
        await repo.createRunEvent({
          runId: run.id,
          level: 'error',
          message: `Run failed: ${errorMessage}`,
          metadata: {
            error: errorMessage,
            runStartedAt,
            runtimeFingerprint,
            traceId,
          },
        });
      } catch (eventError) {
        void ErrorSystem.logWarning('Failed to create error event for run failure', {
          service: 'ai-paths-executor',
          error: eventError,
          runId: run.id,
        });
      }
    }

    publishRunUpdate(run.id, 'error', { error: errorMessage, traceId });

    try {
      const startedAtMs = Date.parse(runStartedAt);
      const durationMs = Number.isFinite(startedAtMs)
        ? Math.max(0, finishedAt.getTime() - startedAtMs)
        : null;
      await recordRuntimeRunFinished({
        runId: run.id,
        status: 'failed',
        durationMs,
        timestamp: finishedAt,
      });
    } catch (analyticsError) {
      void ErrorSystem.logWarning('Failed to record failure analytics', {
        service: 'ai-paths-executor',
        error: analyticsError,
        runId: run.id,
      });
    }
    throw error;
  } finally {
    monitor.stop();
  }
};
