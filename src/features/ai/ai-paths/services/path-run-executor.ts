import 'server-only';

import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
  evaluateGraphWithIteratorAutoContinue,
} from '@/features/ai/ai-paths/lib';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import {
  recordRuntimeNodeStatus,
  recordRuntimeRunFinished,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { noteService } from '@/features/notesapp/server';
import { ErrorSystem } from '@/features/observability/services/error-system';
import { getProductRepository } from '@/features/products/services/product-repository';
import type {
  AiNode,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunStatus,
  Edge,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/types/domain/ai-paths';

const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);
const UPDATE_ELIGIBLE_RUN_STATUSES: AiPathRunStatus[] = [
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
];
const LOG_NODE_START_EVENTS = process.env['AI_PATHS_LOG_NODE_START_EVENTS'] === 'true';
const INTERMEDIATE_SAVE_INTERVAL_MS = Math.max(
  500,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_STATE_FLUSH_INTERVAL_MS'] ?? '', 10) || 2000
);

const isMissingRunUpdateError = (error: unknown): boolean => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2025'
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  return (
    normalized.includes('no record was found for an update') ||
    normalized.includes('record to update not found') ||
    normalized.includes('run not found')
  );
};

const parseRuntimeState = (value: unknown): RuntimeState => {
  if (!value) return { inputs: {}, outputs: {} };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as RuntimeState;
      return parsed && typeof parsed === 'object' ? parsed : { inputs: {}, outputs: {} };
    } catch {
      return { inputs: {}, outputs: {} };
    }
  }
  if (typeof value === 'object') {
    return value as RuntimeState;
  }
  return { inputs: {}, outputs: {} };
};

const toJsonSafe = (value: unknown): unknown => {
  const seen = new WeakSet();
  const replacer = (_key: string, val: unknown): unknown => {
    if (typeof val === 'bigint') return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Set) return Array.from(val.values()) as unknown[];
    if (val instanceof Map) return Object.fromEntries(val.entries()) as Record<string, unknown>;
    if (typeof val === 'function' || typeof val === 'symbol') return undefined;
    if (val && typeof val === 'object') {
      if (seen.has(val)) return undefined;
      seen.add(val);
    }
    
    return val;
  };
  try {
    return JSON.parse(JSON.stringify(value, replacer)) as unknown;
  } catch {
    return null;
  }
};

const sanitizeRuntimeState = (state: RuntimeState): RuntimeState => {
  const safe = toJsonSafe(state);
  if (safe && typeof safe === 'object') {
    return safe as RuntimeState;
  }
  return { inputs: {}, outputs: {} };
};

const computeDownstreamNodes = (
  edges: Edge[],
  startNodes: Set<string>
): Set<string> => {
  const adjacency = new Map<string, Set<string>>();
  edges.forEach((edge: Edge) => {
    if (!edge.from || !edge.to) return;
    const set = adjacency.get(edge.from) ?? new Set<string>();
    set.add(edge.to);
    adjacency.set(edge.from, set);
  });
  const queue = Array.from(startNodes);
  const visited = new Set<string>(startNodes);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const next = adjacency.get(current);
    if (!next) continue;
    next.forEach((nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      queue.push(nodeId);
    });
  }
  return visited;
};

const resolveTriggerNodeId = (
  nodes: AiNode[],
  edges: Edge[],
  triggerEvent?: string | null,
  explicit?: string | null
): string | undefined => {
  if (explicit && nodes.some((node: AiNode) => node.id === explicit)) return explicit;
  const triggerNodes = nodes.filter((node: AiNode) => node.type === 'trigger');
  if (triggerNodes.length === 0) return undefined;
  const matching = triggerEvent
    ? triggerNodes.filter(
      (node: AiNode) => (node.config?.trigger?.event ?? '').trim() === triggerEvent
    )
    : triggerNodes;
  const candidates = matching.length > 0 ? matching : triggerNodes;
  const connected = candidates.find((node: AiNode) =>
    edges.some((edge: Edge) => edge.from === node.id || edge.to === node.id)
  );
  return connected?.id ?? candidates[0]?.id;
};

const buildSkipSet = (
  run: AiPathRunRecord,
  edges: Edge[],
  nodeStatusMap: Map<string, string>
): Set<string> => {
  const meta = (run.meta ?? {}) as {
    resumeMode?: string;
    retryNodeIds?: string[];
  };
  const mode = meta.resumeMode ?? 'replay';
  if (mode === 'replay') return new Set<string>();

  const completed = new Set(
    Array.from(nodeStatusMap.entries())
      .filter(([, status]: [string, string]) => status === 'completed')
      .map(([nodeId]: [string, string]) => nodeId)
  );
  if (mode === 'resume') {
    const failedNodes = new Set(
      Array.from(nodeStatusMap.entries())
        .filter(([, status]: [string, string]) => status === 'failed')
        .map(([nodeId]: [string, string]) => nodeId)
    );
    if (failedNodes.size === 0) {
      return completed;
    }
    const affected = computeDownstreamNodes(edges, failedNodes);
    return new Set(Array.from(completed).filter((nodeId: string) => !affected.has(nodeId)));
  }
  if (mode === 'retry') {
    const retryNodes = new Set(meta.retryNodeIds ?? []);
    const affected = computeDownstreamNodes(edges, retryNodes);
    return new Set(Array.from(completed).filter((nodeId: string) => !affected.has(nodeId)));
  }
  return new Set<string>();
};

const normalizeEntityType = (value?: string | null): string | null => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'product' || normalized === 'products') return 'product';
  if (normalized === 'note' || normalized === 'notes') return 'note';
  return normalized;
};

const parseHistoryRetentionPasses = (value: unknown): number | null => {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(typeof value === 'string' ? value : '', 10);
  if (!Number.isFinite(parsed) || parsed < AI_PATHS_HISTORY_RETENTION_MIN) {
    return null;
  }
  return Math.min(
    AI_PATHS_HISTORY_RETENTION_MAX,
    Math.max(AI_PATHS_HISTORY_RETENTION_MIN, Math.trunc(parsed))
  );
};

const fetchEntityByType = async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
  if (!entityType || !entityId) return null;
  const normalized = normalizeEntityType(entityType);
  try {
    if (normalized === 'product') {
      const repo = await getProductRepository();
      return (await repo.getProductById(entityId)) as Record<string, unknown> | null;
    }
    if (normalized === 'note') {
      return (await noteService.getById(entityId)) as Record<string, unknown> | null;
    }
  } catch (error) {
    void ErrorSystem.logWarning(`Failed to fetch entity ${entityType} ${entityId}`, {
      service: 'ai-paths-runtime',
      error,
      entityType,
      entityId,
    });
    // We return null to indicate the entity couldn't be fetched, but the run might still proceed depending on node logic.
    return null;
  }
  return null;
};

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
    throw new Error('Database repository not available');
  }
  let dbRunMissing = false;
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
          metadata: { runStartedAt, graphPresent: !!graph },
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

  // Nodes and edges are already normalized/sanitized at enqueue time
  // (path-run-service.ts:39-40), so skip redundant re-normalization.
  const nodes = graph.nodes;
  const edges = graph.edges;
  const triggerNodeId = resolveTriggerNodeId(
    nodes,
    edges,
    run.triggerEvent ?? undefined,
    run.triggerNodeId ?? undefined
  );

  const runtimeState = parseRuntimeState(run.runtimeState);

  // Accumulated state: tracks per-node inputs/outputs for intermediate DB saves.
  // This lets the SSE stream deliver per-node progress to the client.
  const accInputs: Record<string, RuntimePortValues> = { ...(runtimeState.inputs ?? {}) };
  const accOutputs: Record<string, RuntimePortValues> = { ...(runtimeState.outputs ?? {}) };
  let resolvedRunId = run.id;
  let resolvedRunStartedAt = runStartedAt;

  const saveIntermediateState = async (): Promise<void> => {
    try {
      await updateRunSnapshot({
        runtimeState: sanitizeRuntimeState({
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          inputs: accInputs,
          outputs: accOutputs,
        }),
      });
    } catch (error) {
      void ErrorSystem.logWarning('Failed to save intermediate state', {
        service: 'ai-paths-executor',
        error,
        runId: run.id,
      });
      // We don't throw here to avoid stopping the run just because a state sync failed.
    }
  };

  // Throttled variant: at most one intermediate save per second to reduce DB writes.
  // Flushed before final status update to ensure no state is lost.
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

  const envHistoryLimit = parseHistoryRetentionPasses(process.env['AI_PATHS_HISTORY_LIMIT']);
  const metaHistoryLimit = parseHistoryRetentionPasses(
    (run.meta as Record<string, unknown> | null)?.['historyRetentionPasses']
  );
  const resolvedHistoryLimit =
    metaHistoryLimit ?? envHistoryLimit ?? AI_PATHS_HISTORY_RETENTION_DEFAULT;
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
        ...meta,
      },
    });
  };
  const toast = (): void => {};

  try {
    const resultState = await evaluateGraphWithIteratorAutoContinue({
      nodes,
      edges,
      activePathId: run.pathId ?? null,
      activePathName: run.pathName ?? null,
      runId: run.id,
      runStartedAt,
      ...(triggerNodeId ? { triggerNodeId } : {}),
      ...(run.triggerEvent ? { triggerEvent: run.triggerEvent } : {}),
      ...(run.triggerContext ? { triggerContext: run.triggerContext } : {}),
      seedOutputs: runtimeState.outputs,
      seedHashes: runtimeState.hashes ?? undefined,
      seedHashTimestamps: runtimeState.hashTimestamps ?? undefined,
      seedHistory: runtimeState.history ?? undefined,
      seedRunId: runtimeState.runId ?? undefined,
      seedRunStartedAt: runtimeState.runStartedAt ?? undefined,
      recordHistory: true,
      historyLimit: resolvedHistoryLimit,
      skipNodeIds: skipNodes,
      fetchEntityByType,
      reportAiPathsError: (error: unknown, meta: Record<string, unknown>, summary?: string) => {
        void reportAiPathsError(error, meta, summary);
      },
      toast,
      onNodeStart: async ({
        node,
        nodeInputs,
        prevOutputs,
        iteration,
        runStartedAt: cbRunStartedAt,
      }: {
        node: AiNode;
        nodeInputs: RuntimePortValues;
        prevOutputs: RuntimePortValues;
        iteration: number;
        runStartedAt: string;
      }) => {
        try {
          resolvedRunId = run.id;
          resolvedRunStartedAt = cbRunStartedAt;
          const nextAttempt = (nodeAttemptMap.get(node.id) ?? 0) + 1;
          nodeAttemptMap.set(node.id, nextAttempt);

          // Track intermediate state so SSE stream can deliver per-node progress
          const safeInputs = toJsonSafe(nodeInputs) as RuntimePortValues;
          const safePrevOutputs = toJsonSafe(prevOutputs) as RuntimePortValues;
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
              startedAt: new Date().toISOString(),
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
        runId: _runId,
      }: {
        node: AiNode;
        nodeInputs: RuntimePortValues;
        nextOutputs: RuntimePortValues;
        cached?: boolean;
        iteration: number;
        runStartedAt: string;
        runId: string;
      }) => {
        try {
          // Update accumulated state with completed outputs
          const safeInputs = toJsonSafe(nodeInputs) as RuntimePortValues;
          const safeOutputs = toJsonSafe(nextOutputs) as RuntimePortValues;
          accInputs[node.id] = safeInputs;
          accOutputs[node.id] = { ...(safeOutputs as Record<string, unknown>), status: 'completed' } as RuntimePortValues;

          if (cached) {
            if (iteration === 0) {
              await Promise.all([
                repo.upsertRunNode(run.id, node.id, {
                  nodeType: node.type,
                  nodeTitle: node.title ?? null,
                  status: 'completed',
                  attempt: nodeAttemptMap.get(node.id) ?? 0,
                  inputs: safeInputs,
                  outputs: safeOutputs,
                  finishedAt: new Date().toISOString(),
                  errorMessage: null,
                }),
                repo.createRunEvent({
                  runId: run.id,
                  level: 'info',
                  message: `Node ${node.title ?? node.id} reused cached outputs.`,
                  metadata: {
                    nodeId: node.id,
                    nodeType: node.type,
                    nodeTitle: node.title ?? null,
                    status: 'completed',
                    cached: true,
                    attempt: nodeAttemptMap.get(node.id) ?? 0,
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
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'completed',
                cached: true,
                outputs: safeOutputs,
              });
            }
            return;
          }
          await Promise.all([
            repo.upsertRunNode(run.id, node.id, {
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: 'completed',
              attempt: nodeAttemptMap.get(node.id) ?? 0,
              inputs: safeInputs,
              outputs: safeOutputs,
              finishedAt: new Date().toISOString(),
              errorMessage: null,
            }),
            repo.createRunEvent({
              runId: run.id,
              level: 'info',
              message: `Node ${node.title ?? node.id} completed.`,
              metadata: {
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'completed',
                attempt: nodeAttemptMap.get(node.id) ?? 0,
                iteration,
                runStartedAt: cbRunStartedAt,
              },
            }),
            throttledSaveIntermediateState(),
          ]);
          await recordRuntimeNodeStatus({
            runId: run.id,
            nodeId: node.id,
            status: 'completed',
          });
          publishRunUpdate(run.id, 'nodes', {
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: 'completed',
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
      onNodeError: async ({
        node,
        nodeInputs,
        prevOutputs,
        error,
        iteration,
        runStartedAt: cbRunStartedAt,
      }: {
        node: AiNode;
        nodeInputs: RuntimePortValues;
        prevOutputs: RuntimePortValues;
        error: unknown;
        iteration: number;
        runStartedAt: string;
      }) => {
        try {
          const safeInputs = toJsonSafe(nodeInputs) as RuntimePortValues;
          const safePrevOutputs = toJsonSafe(prevOutputs) as RuntimePortValues;
          accOutputs[node.id] = { ...(accOutputs[node.id] ?? {}), status: 'failed' } as RuntimePortValues;

          await Promise.all([
            repo.upsertRunNode(run.id, node.id, {
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: 'failed',
              attempt: nodeAttemptMap.get(node.id) ?? 0,
              inputs: safeInputs,
              outputs: safePrevOutputs,
              finishedAt: new Date().toISOString(),
              errorMessage: error instanceof Error ? error.message : String(error),
            }),
            repo.createRunEvent({
              runId: run.id,
              level: 'error',
              message: `Node ${node.title ?? node.id} failed.`,
              metadata: {
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'failed',
                attempt: nodeAttemptMap.get(node.id) ?? 0,
                error: error instanceof Error ? error.message : String(error),
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
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
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
        iteration: _iteration,
        inputs,
        outputs,
        hashes,
        history,
      }: {
        runId: string;
        runStartedAt: string;
        iteration: number;
        inputs: Record<string, RuntimePortValues>;
        outputs: Record<string, RuntimePortValues>;
        hashes?: Record<string, string> | undefined;
        history?: Record<string, RuntimeHistoryEntry[]> | undefined;
      }) => {
        try {
          // Sync accumulated state with the full engine state
          Object.assign(accInputs, inputs);
          Object.assign(accOutputs, outputs);
          resolvedRunId = cbRunId;
          resolvedRunStartedAt = cbRunStartedAt;

          await updateRunSnapshot({
            runtimeState: sanitizeRuntimeState({
              runId: cbRunId,
              runStartedAt: cbRunStartedAt,
              inputs,
              outputs,
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
    });

    // Flush any throttled intermediate state before writing final status
    if (pendingIntermediateSave) {
      await saveIntermediateState();
    }

    const finishedAt = new Date();
    let finalizedAsCompleted = false;
    try {
      const latestRun = await repo.findRunById(run.id);
      if (latestRun?.status === 'canceled') {
        await updateRunSnapshot({
          runtimeState: sanitizeRuntimeState(resultState),
        });
      } else if (!latestRun || !TERMINAL_RUN_STATUSES.has(latestRun.status)) {
        const updated = await updateRunSnapshot({
          status: 'completed',
          runtimeState: sanitizeRuntimeState(resultState),
          finishedAt: finishedAt.toISOString(),
          errorMessage: null,
          meta: {
            ...(run.meta ?? {}),
            resumeMode: 'replay',
            retryNodeIds: [],
          },
        });
        if (updated) {
          await repo.createRunEvent({
            runId: run.id,
            level: 'info',
            message: 'Run completed successfully.',
            metadata: { runStartedAt },
          });
          finalizedAsCompleted = true;
        }
      }
    } catch (finalDbError) {
      void ErrorSystem.logWarning('Failed to record run completion in DB', {
        service: 'ai-paths-executor',
        error: finalDbError,
        runId: run.id,
      });
    }

    if (finalizedAsCompleted) {
      publishRunUpdate(run.id, 'done', { status: 'completed' });
      try {
        const startedAtMs = Date.parse(runStartedAt);
        const durationMs = Number.isFinite(startedAtMs)
          ? Math.max(0, finishedAt.getTime() - startedAtMs)
          : null;
        await recordRuntimeRunFinished({
          runId: run.id,
          status: 'completed',
          durationMs,
          timestamp: finishedAt,
        });
      } catch (analyticsError) {
        void ErrorSystem.logWarning('Failed to record completion analytics', {
          service: 'ai-paths-executor',
          error: analyticsError,
          runId: run.id,
        });
      }
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'ai-paths-executor',
      action: 'executePathRun',
      runId: run.id,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date();

    let latestRun: AiPathRunRecord | null = null;
    try {
      latestRun = await repo.findRunById(run.id);
    } catch {
      latestRun = null;
    }
    if (latestRun && TERMINAL_RUN_STATUSES.has(latestRun.status)) {
      throw error;
    }
    
    try {
      await updateRunSnapshot({
        status: 'failed',
        finishedAt: finishedAt.toISOString(),
        errorMessage,
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

    publishRunUpdate(run.id, 'error', { error: errorMessage });

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
  }
};
