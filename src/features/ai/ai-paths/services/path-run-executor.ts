import 'server-only';

import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
  compileGraph,
  evaluateAiPathsValidationPreflight,
  evaluateGraphWithIteratorAutoContinue,
  GraphExecutionCancelled,
  inspectPathDependencies,
  normalizeAiPathsValidationConfig,
  sanitizeEdges,
} from '@/features/ai/ai-paths/lib';
import {
  evaluateDisabledNodeTypesPolicy,
  formatDisabledNodeTypesPolicyMessage,
} from '@/features/ai/ai-paths/services/path-run-policy';
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
} from '@/shared/contracts/ai-paths';
import type {
  AiPathRuntimeProfileEventDto,
  RuntimeProfileSummaryDto,
} from '@/shared/contracts/ai-paths-runtime';

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
const RUNTIME_PROFILE_SAMPLE_LIMIT = Math.max(
  5,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_PROFILE_SAMPLE_LIMIT'] ?? '', 10) || 30
);
const RUNTIME_PROFILE_HIGHLIGHT_LIMIT = Math.max(
  5,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_PROFILE_HIGHLIGHT_LIMIT'] ?? '', 10) || 10
);
const RUNTIME_TRACE_SPAN_LIMIT = Math.max(
  20,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_TRACE_SPAN_LIMIT'] ?? '', 10) || 200
);
const RUNTIME_PROFILE_SLOW_NODE_MS = Math.max(
  10,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_PROFILE_SLOW_NODE_MS'] ?? '', 10) || 600
);
const resolveCancellationPollIntervalMs = (): number => {
  const parsed = Number.parseInt(process.env['AI_PATHS_CANCEL_POLL_INTERVAL_MS'] ?? '', 10);
  if (!Number.isFinite(parsed)) return 750;
  return Math.max(100, Math.min(5000, Math.trunc(parsed)));
};

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

const EMPTY_RUNTIME_STATE: RuntimeState = {
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  inputs: {},
  outputs: {},
};

const parseRuntimeState = (value: unknown): RuntimeState => {
  if (!value) return EMPTY_RUNTIME_STATE;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as RuntimeState;
      return parsed && typeof parsed === 'object'
        ? {
          ...EMPTY_RUNTIME_STATE,
          ...parsed,
          inputs: parsed.inputs ?? {},
          outputs: parsed.outputs ?? {},
          nodeOutputs: parsed.nodeOutputs ?? {},
          nodeStatuses: parsed.nodeStatuses ?? {},
          variables: parsed.variables ?? {},
          events: parsed.events ?? [],
        }
        : EMPTY_RUNTIME_STATE;
    } catch {
      return EMPTY_RUNTIME_STATE;
    }
  }
  if (typeof value === 'object') {
    const parsed = value as RuntimeState;
    return {
      ...EMPTY_RUNTIME_STATE,
      ...parsed,
      inputs: parsed.inputs ?? {},
      outputs: parsed.outputs ?? {},
      nodeOutputs: parsed.nodeOutputs ?? {},
      nodeStatuses: parsed.nodeStatuses ?? {},
      variables: parsed.variables ?? {},
      events: parsed.events ?? [],
    };
  }
  return EMPTY_RUNTIME_STATE;
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
    const parsed = safe as RuntimeState;
    return {
      ...EMPTY_RUNTIME_STATE,
      ...parsed,
      inputs: parsed.inputs ?? {},
      outputs: parsed.outputs ?? {},
      nodeOutputs: parsed.nodeOutputs ?? {},
      nodeStatuses: parsed.nodeStatuses ?? {},
      variables: parsed.variables ?? {},
      events: parsed.events ?? [],
    };
  }
  return EMPTY_RUNTIME_STATE;
};

type RuntimeProfileHighlight = {
  type: 'run' | 'iteration' | 'node';
  phase?: 'start' | 'end' | undefined;
  nodeId?: string | undefined;
  nodeType?: string | undefined;
  status?: string | undefined;
  reason?: string | undefined;
  iteration?: number | undefined;
  durationMs?: number | undefined;
  hashMs?: number | undefined;
};

type RuntimeProfileNodeSpanStatus = 'running' | 'completed' | 'failed' | 'cached';

type RuntimeProfileNodeSpan = {
  spanId: string;
  nodeId: string;
  nodeType: string;
  nodeTitle: string | null;
  iteration: number;
  attempt: number;
  status: RuntimeProfileNodeSpanStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  error: string | null;
  cached: boolean;
};

type RuntimeProfileSnapshot = {
  traceId: string;
  recordedAt: string;
  eventCount: number;
  sampledEventCount: number;
  droppedEventCount: number;
  summary: {
    durationMs: number;
    iterationCount: number;
    nodeCount: number;
    edgeCount: number;
    hottestNodes: Array<{
      nodeId: string;
      nodeType: string;
      count: number;
      totalMs: number;
      maxMs: number;
      avgMs: number;
      errorCount: number;
      cachedCount: number;
      skippedCount: number;
    }>;
  } | null;
  highlights: RuntimeProfileHighlight[];
  nodeSpans: RuntimeProfileNodeSpan[];
};

const computeDurationMs = (
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined
): number | null => {
  if (!startedAt || !finishedAt) return null;
  const startMs = Date.parse(startedAt);
  const finishMs = Date.parse(finishedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(finishMs)) return null;
  return Math.max(0, finishMs - startMs);
};

const shouldCaptureRuntimeProfileHighlight = (
  event: AiPathRuntimeProfileEventDto
): boolean => {
  if (event.type !== 'node') {
    return event.type === 'run' && event.phase === 'end';
  }
  if (event.status === 'error' || event.status === 'skipped') return true;
  if ((event.durationMs ?? 0) >= RUNTIME_PROFILE_SLOW_NODE_MS) return true;
  if (event.sideEffectDecision === 'skipped_duplicate') return true;
  if (event.reason === 'missing_inputs') return true;
  return false;
};

const toRuntimeProfileHighlight = (
  event: AiPathRuntimeProfileEventDto
): RuntimeProfileHighlight => {
  if (event.type === 'run') {
    return {
      type: 'run',
      phase: event.phase,
      durationMs: event.durationMs,
    };
  }
  if (event.type === 'iteration') {
    return {
      type: 'iteration',
      iteration: event.iteration,
      durationMs: event.durationMs,
    };
  }
  return {
    type: 'node',
    nodeId: event.nodeId,
    nodeType: event.nodeType,
    status: event.status,
    reason: event.reason,
    iteration: event.iteration,
    durationMs: event.durationMs,
    hashMs: event.hashMs,
  };
};

const buildRuntimeProfileSnapshot = (input: {
  traceId: string;
  eventCount: number;
  sampledHighlights: RuntimeProfileHighlight[];
  summary: RuntimeProfileSummaryDto | null;
  nodeSpans: RuntimeProfileNodeSpan[];
}): RuntimeProfileSnapshot => {
  const hottestNodes = input.summary?.hottestNodes.slice(0, 5).map((node) => ({
    nodeId: node.nodeId,
    nodeType: node.nodeType,
    count: node.count,
    totalMs: node.totalMs,
    maxMs: node.maxMs,
    avgMs: node.avgMs,
    errorCount: node.errorCount,
    cachedCount: node.cachedCount,
    skippedCount: node.skippedCount,
  })) ?? [];
  return {
    traceId: input.traceId,
    recordedAt: new Date().toISOString(),
    eventCount: input.eventCount,
    sampledEventCount: input.sampledHighlights.length,
    droppedEventCount: Math.max(input.eventCount - input.sampledHighlights.length, 0),
    summary: input.summary
      ? {
        durationMs: input.summary.durationMs,
        iterationCount: input.summary.iterationCount,
        nodeCount: input.summary.nodeCount,
        edgeCount: input.summary.edgeCount,
        hottestNodes,
      }
      : null,
    highlights: input.sampledHighlights.slice(0, RUNTIME_PROFILE_HIGHLIGHT_LIMIT),
    nodeSpans: input.nodeSpans,
  };
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
  const runAbortController = new AbortController();
  const cancellationPollIntervalMs = resolveCancellationPollIntervalMs();
  let cancellationMonitorActive = false;
  let cancellationMonitorTimer: NodeJS.Timeout | null = null;

  const stopCancellationMonitor = (): void => {
    cancellationMonitorActive = false;
    if (cancellationMonitorTimer) {
      clearTimeout(cancellationMonitorTimer);
      cancellationMonitorTimer = null;
    }
  };

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
  const checkForCancellation = async (): Promise<boolean> => {
    if (runAbortController.signal.aborted) return true;
    if (dbRunMissing) return false;
    try {
      const latestRun = await repo.findRunById(run.id);
      if (latestRun?.status !== 'canceled') return false;
      runAbortController.abort();
      return true;
    } catch (error) {
      void ErrorSystem.logWarning('Failed to check cancellation status', {
        service: 'ai-paths-executor',
        error,
        runId: run.id,
      });
      return false;
    }
  };
  const startCancellationMonitor = async (): Promise<boolean> => {
    const cancelledBeforeStart = await checkForCancellation();
    if (cancelledBeforeStart) return true;
    cancellationMonitorActive = true;
    const scheduleNext = (): void => {
      if (!cancellationMonitorActive) return;
      cancellationMonitorTimer = setTimeout(() => {
        void (async () => {
          if (!cancellationMonitorActive) return;
          const cancelled = await checkForCancellation();
          if (!cancelled) {
            scheduleNext();
          }
        })();
      }, cancellationPollIntervalMs);
    };
    scheduleNext();
    return false;
  };

  const runStartedAt =
    typeof run.startedAt === 'string'
      ? run.startedAt
      : new Date().toISOString();
  const traceId = run.id;
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

  // Runs created before edge-canonicalization can still contain stale edges.
  // Re-sanitize defensively so compile/validation checks are stable.
  const nodes = graph.nodes;
  const edges = sanitizeEdges(nodes, graph.edges);
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
  const strictFlowMode =
    (run.meta as Record<string, unknown> | null)?.['strictFlowMode'] !== false;
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
        traceId,
        ...meta,
      },
    });
  };
  const toast = (): void => {};

  try {
    const compileReport = compileGraph(nodes, edges);
    if (!compileReport.ok) {
      await repo.createRunEvent({
        runId: run.id,
        level: 'error',
        message: 'Run blocked by graph compile validation.',
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
      throw new Error(
        `Graph compile blocked run: ${compileReport.errors} issue(s) detected.`
      );
    }
    if (compileReport.warnings > 0) {
      await repo.createRunEvent({
        runId: run.id,
        level: 'warn',
        message: `Graph compile warnings detected (${compileReport.warnings}).`,
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

    const validationReport = evaluateAiPathsValidationPreflight({
      nodes,
      edges,
      config: normalizeAiPathsValidationConfig(
        (
          run.meta as Record<string, unknown> | null
        )?.['aiPathsValidation'] as Record<string, unknown> | undefined
      ),
    });
    if (validationReport.enabled && validationReport.blocked) {
      await repo.createRunEvent({
        runId: run.id,
        level: 'error',
        message: 'Run blocked by AI Paths validation preflight.',
        metadata: {
          validation: {
            score: validationReport.score,
            policy: validationReport.policy,
            warnThreshold: validationReport.warnThreshold,
            blockThreshold: validationReport.blockThreshold,
            failedRules: validationReport.failedRules,
            findings: validationReport.findings.slice(0, 8),
          },
          runStartedAt,
          traceId,
        },
      });
      throw new Error(
        `Validation blocked run: score ${validationReport.score} below threshold ${validationReport.blockThreshold}.`
      );
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

    if (strictFlowMode) {
      const dependencyReport = inspectPathDependencies(nodes, edges);
      if (dependencyReport.errors > 0) {
        await repo.createRunEvent({
          runId: run.id,
          level: 'error',
          message: 'Run blocked by strict flow dependency validation.',
          metadata: {
            strictFlowMode: true,
            dependencyErrors: dependencyReport.errors,
            dependencyWarnings: dependencyReport.warnings,
            blockedRiskIds: dependencyReport.risks
              .filter((risk): boolean => risk.severity === 'error')
              .map((risk) => risk.id),
            blockedNodeIds: dependencyReport.risks
              .filter((risk): boolean => risk.severity === 'error')
              .map((risk) => risk.nodeId),
            runStartedAt,
            traceId,
          },
        });
        throw new Error(
          `Strict flow blocked run: ${dependencyReport.errors} dependency error(s) detected.`,
        );
      }
    }

    const cancelledBeforeExecution = await startCancellationMonitor();
    if (cancelledBeforeExecution) {
      return;
    }

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
      recordHistory: true,      historyLimit: resolvedHistoryLimit,
      skipNodeIds: skipNodes,
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
          accOutputs[node.id] = { ...(safeOutputs), status: 'completed' } as RuntimePortValues;
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
            status: cached ? 'cached' : 'completed',
            finishedAt: nodeFinishedAt,
            cached: Boolean(cached),
          });

          if (cached) {
            if (iteration === 0) {
              await Promise.all([
                repo.upsertRunNode(run.id, node.id, {
                  nodeType: node.type,
                  nodeTitle: node.title ?? null,
                  status: 'completed',
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
                    status: 'completed',
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
              attempt,
              inputs: safeInputs,
              outputs: safeOutputs,
              finishedAt: nodeFinishedAt,
              errorMessage: null,
            }),
            repo.createRunEvent({
              runId: run.id,
              level: 'info',
              message: `Node ${node.title ?? node.id} completed.`,
              metadata: {
                traceId,
                spanId: nodeSpanId,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'completed',
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
            status: 'completed',
          });
          publishRunUpdate(run.id, 'nodes', {
            traceId,
            spanId: nodeSpanId,
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
              outputs: safePrevOutputs,
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
      },
    });

    // Flush any throttled intermediate state before writing final status
    if (pendingIntermediateSave) {
      await saveIntermediateState();
    }

    const runtimeProfileSnapshot = await persistRuntimeProfile(
      'info',
      'Runtime profile summary recorded.'
    );
    const finishedAt = new Date();
    let finalizedAsCompleted = false;
    try {
      const latestRun = await repo.findRunById(run.id);
      if (latestRun?.status === 'canceled') {
        await updateRunSnapshot({
          runtimeState: sanitizeRuntimeState(resultState),
          ...(latestRun.finishedAt ? {} : { finishedAt: finishedAt.toISOString() }),
        });
      } else if (!latestRun || !TERMINAL_RUN_STATUSES.has(latestRun.status)) {
        const updated = await updateRunSnapshot({
          status: 'completed',
          runtimeState: sanitizeRuntimeState(resultState),
          finishedAt: finishedAt.toISOString(),
          errorMessage: null,
          meta: {
            ...(run.meta ?? {}),
            runtimeTrace: buildTraceMeta(runtimeProfileSnapshot),
            resumeMode: 'replay',
            retryNodeIds: [],
          },
        });
        if (updated) {
          await repo.createRunEvent({
            runId: run.id,
            level: 'info',
            message: 'Run completed successfully.',
            metadata: { runStartedAt, traceId },
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
      publishRunUpdate(run.id, 'done', { status: 'completed', traceId });
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
    if (
      error instanceof GraphExecutionCancelled ||
      (error instanceof Error && error.name === 'GraphExecutionCancelled')
    ) {
      let latestRun: AiPathRunRecord | null = null;
      try {
        latestRun = await repo.findRunById(run.id);
      } catch {
        latestRun = null;
      }
      if (latestRun?.status === 'canceled') {
        const finishedAt = new Date().toISOString();
        try {
          const cancelledRuntimeState =
            error instanceof GraphExecutionCancelled
              ? sanitizeRuntimeState(error.state)
              : undefined;
          await updateRunSnapshot({
            ...(cancelledRuntimeState ? { runtimeState: cancelledRuntimeState } : {}),
            ...(latestRun.finishedAt ? {} : { finishedAt }),
          });
        } catch (cancelUpdateError) {
          void ErrorSystem.logWarning('Failed to finalize canceled run snapshot', {
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

    let latestRun: AiPathRunRecord | null = null;
    try {
      latestRun = await repo.findRunById(run.id);
    } catch {
      latestRun = null;
    }
    if (latestRun && TERMINAL_RUN_STATUSES.has(latestRun.status)) {
      throw error;
    }
    const runtimeProfileSnapshot = await persistRuntimeProfile(
      'warn',
      'Runtime profile captured before run failure.'
    );
    
    try {
      await updateRunSnapshot({
        status: 'failed',
        finishedAt: finishedAt.toISOString(),
        errorMessage,
        meta: {
          ...(run.meta ?? {}),
          runtimeTrace: buildTraceMeta(runtimeProfileSnapshot),
        },
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
    stopCancellationMonitor();
  }
};
