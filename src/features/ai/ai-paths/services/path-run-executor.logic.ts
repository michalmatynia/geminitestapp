import { cloneJsonSafe } from '@/shared/lib/ai-paths';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type {
  AiPathNodeStatus,
  AiNode,
  AiPathRunRecord,
  Edge,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths';
import type {
  AiPathRuntimeProfileEvent,
  RuntimeProfileSummary,
} from '@/shared/contracts/ai-paths-runtime';
import {
  EMPTY_RUNTIME_STATE,
  RUNTIME_PROFILE_HIGHLIGHT_LIMIT,
  RUNTIME_PROFILE_SLOW_NODE_MS,
  collectDroppedRuntimePorts,
} from './path-run-executor.helpers';
import { isObjectRecord } from '@/shared/utils/object-utils';
import type {
  RuntimeProfileHighlight,
  RuntimeProfileNodeSpan,
  RuntimeProfileSnapshot,
} from './path-run-executor.types';

let sanitizeDropWarningCount = 0;
const SANITIZE_DROP_WARNING_LIMIT = 20;

export const sanitizeRuntimeState = (state: RuntimeState): RuntimeState => {
  const safe = cloneJsonSafe(state);
  if (safe && typeof safe === 'object' && !Array.isArray(safe)) {
    const parsed = safe as Record<string, unknown>;
    const sanitized: RuntimeState = {
      ...EMPTY_RUNTIME_STATE,
      ...parsed,
      status: (parsed['status'] as RuntimeState['status']) ?? EMPTY_RUNTIME_STATE.status,
      inputs: (parsed['inputs'] as Record<string, RuntimePortValues>) ?? {},
      outputs: (parsed['outputs'] as Record<string, RuntimePortValues>) ?? {},
      nodeOutputs: (parsed['nodeOutputs'] as Record<string, RuntimePortValues>) ?? {},
      nodeStatuses: (parsed['nodeStatuses'] as RuntimeState['nodeStatuses']) ?? {},
      variables: (parsed['variables'] as Record<string, unknown>) ?? {},
      events: (Array.isArray(parsed['events']) ? parsed['events'] : []) as RuntimeState['events'],
    };
    const dropSummary = collectDroppedRuntimePorts(state, sanitized);
    if (dropSummary.total > 0 && sanitizeDropWarningCount < SANITIZE_DROP_WARNING_LIMIT) {
      sanitizeDropWarningCount += 1;
      void ErrorSystem.logWarning('sanitizeRuntimeState dropped runtime port keys', {
        service: 'ai-paths-executor',
        droppedPortCounts: {
          inputs: dropSummary.inputs,
          outputs: dropSummary.outputs,
          nodeOutputs: dropSummary.nodeOutputs,
          total: dropSummary.total,
        },
        droppedPortSamples: dropSummary.samples,
      });
    }
    return sanitized;
  }
  return EMPTY_RUNTIME_STATE;
};

export const toRuntimeNodeStatus = (value: unknown): AiPathNodeStatus | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'idle':
    case 'queued':
    case 'running':
    case 'completed':
    case 'cached':
    case 'failed':
    case 'canceled':
    case 'skipped':
    case 'blocked':
    case 'polling':
    case 'waiting_callback':
    case 'advance_pending':
    case 'pending':
    case 'processing':
    case 'timeout':
      return normalized;
    default:
      return null;
  }
};

export const mergeRuntimePortMaps = (
  ...maps: Array<Record<string, RuntimePortValues> | undefined>
): Record<string, RuntimePortValues> => {
  const merged: Record<string, RuntimePortValues> = {};
  maps.forEach((map) => {
    if (!isObjectRecord(map)) return;
    Object.entries(map).forEach(([nodeId, nodePorts]) => {
      if (!isObjectRecord(nodePorts)) return;
      merged[nodeId] = {
        ...(merged[nodeId] ?? {}),
        ...nodePorts,
      } as RuntimePortValues;
    });
  });
  return merged;
};

export const mergeNodeOutputsForStatus = (input: {
  previous: RuntimePortValues | undefined;
  next: RuntimePortValues;
  status: AiPathNodeStatus;
}): RuntimePortValues => {
  const merged = {
    ...(input.previous ?? {}),
    ...input.next,
    status: input.status,
  } as RuntimePortValues;

  const hasOwn = (key: string): boolean => Object.prototype.hasOwnProperty.call(input.next, key);

  // Drop stale blocking diagnostics when the node moved out of blocked state.
  if (input.status !== 'blocked') {
    delete merged['blockedReason'];
    delete merged['requiredPorts'];
    delete merged['waitingOnPorts'];
    delete merged['skipReason'];
    if (!hasOwn('message')) {
      delete merged['message'];
    }
  }

  // Keep only explicit error payloads from the latest update.
  if (!hasOwn('error')) {
    delete merged['error'];
  }

  return merged;
};

export const computeDurationMs = (
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined
): number | null => {
  if (!startedAt || !finishedAt) return null;
  const startMs = Date.parse(startedAt);
  const finishMs = Date.parse(finishedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(finishMs)) return null;
  return Math.max(0, finishMs - startMs);
};

export const shouldCaptureRuntimeProfileHighlight = (event: AiPathRuntimeProfileEvent): boolean => {
  if (event.type !== 'node') {
    return event.type === 'run' && event.phase === 'end';
  }
  if (event.status === 'error' || event.status === 'skipped') return true;
  if ((event.durationMs ?? 0) >= RUNTIME_PROFILE_SLOW_NODE_MS) return true;
  if (event.sideEffectDecision === 'skipped_duplicate') return true;
  if (event.reason === 'missing_inputs') return true;
  return false;
};

export const toRuntimeProfileHighlight = (
  event: AiPathRuntimeProfileEvent
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

export const buildRuntimeProfileSnapshot = (input: {
  traceId: string;
  eventCount: number;
  sampledHighlights: RuntimeProfileHighlight[];
  summary: RuntimeProfileSummary | null;
  nodeSpans: RuntimeProfileNodeSpan[];
}): RuntimeProfileSnapshot => {
  const hottestNodes =
    input.summary?.hottestNodes.slice(0, 5).map((node) => ({
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

export const computeDownstreamNodes = (edges: Edge[], startNodes: Set<string>): Set<string> => {
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

export const resolveTriggerNodeId = (
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

export const buildSkipSet = (
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
      .filter(([, status]: [string, string]) => status === 'completed' || status === 'cached')
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
