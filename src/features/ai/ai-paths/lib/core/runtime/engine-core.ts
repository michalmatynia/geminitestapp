import type {
  AiNode,
  Edge,
  NodeCacheScope,
} from '@/shared/contracts/ai-paths';
import type {
  RuntimePortValues,
  RuntimeState,
  NodeHandlerContext,
  NodeHandler,
  RuntimeHistoryEntry,
} from '@/shared/contracts/ai-paths-runtime';
import type { Toast } from '@/shared/contracts/ui';

import {
  appendInputValue,
  cloneValue,
  getPortDataTypes,
  isValueCompatibleWithTypes,
  sanitizeEdges,
} from '../utils';
import {
  nowMs,
  resolveNodeTimeoutMs,
  withTimeout,
} from './execution-helpers';

// Modular imports
import { 
  GraphExecutionError, 
  GraphExecutionCancelled,
  type RuntimeProfileOptions, 
  type RuntimeProfileNodeStats, 
  type RuntimeProfileSummary 
} from './engine-modules/engine-types';
import { 
  buildNodeInputHash, 
  buildDatabaseInputHash, 
  buildModelInputHash, 
  buildPromptInputHash 
} from './engine-modules/engine-hashing';
import { 
  orderNodesByDependencies, 
  evaluateInputReadiness,
} from './engine-modules/engine-utils';

export { GraphExecutionError, GraphExecutionCancelled };

const MAX_ITERATIONS = 500;
const DEFAULT_NODE_CACHE_SCOPE: NodeCacheScope = 'run';

const resolveNodeCacheScope = (node: AiNode): NodeCacheScope => {
  const scope = node.config?.runtime?.cache?.scope;
  if (scope === 'run' || scope === 'activation' || scope === 'session') {
    return scope;
  }
  return DEFAULT_NODE_CACHE_SCOPE;
};

const pickString = (val: unknown): string | undefined =>
  typeof val === 'string' && val.trim().length > 0 ? val.trim() : undefined;

const readEntityTypeFromContext = (context: Record<string, unknown>): string | null => {
  const type = pickString(context['entityType']);
  if (type) return type;
  if (pickString(context['productId'])) return 'product';
  return null;
};

const readEntityIdFromContext = (context: Record<string, unknown>): string | null =>
  pickString(context['productId']) ?? pickString(context['entityId']) ?? null;

const resolveEdgeNodeId = (
  primary: string | undefined,
  fallback: string | undefined
): string | null => {
  const first = pickString(primary);
  if (first) return first;
  return pickString(fallback) ?? null;
};

const resolveEdgeFromNodeId = (edge: Edge): string | null =>
  resolveEdgeNodeId(edge.from, edge.source);

const resolveEdgeToNodeId = (edge: Edge): string | null =>
  resolveEdgeNodeId(edge.to, edge.target);

const resolveEdgePort = (
  primary: string | null | undefined,
  fallback: string | null | undefined
): string | null => {
  const first = typeof primary === 'string' ? primary.trim() : '';
  if (first.length > 0) return first;
  const second = typeof fallback === 'string' ? fallback.trim() : '';
  return second.length > 0 ? second : null;
};

const resolveEdgeFromPort = (edge: Edge): string | null =>
  resolveEdgePort(edge.fromPort, edge.sourceHandle);

const resolveEdgeToPort = (edge: Edge): string | null =>
  resolveEdgePort(edge.toPort, edge.targetHandle);

const checkContextMatchesSimulation = (context: Record<string, unknown>): boolean => {
  const contextSource = context['contextSource'];
  if (typeof contextSource === 'string' && contextSource.trim().toLowerCase().startsWith('simulation')) {
    return true;
  }
  const source = context['source'];
  if (typeof source === 'string' && source.trim().toLowerCase() === 'simulation') {
    return true;
  }
  return false;
};

export type EvaluateGraphOptions = {
  runId?: string | undefined;
  pathId?: string | undefined;
  pathName?: string | undefined;
  userId?: string | null | undefined;
  triggerEvent?: string | null | undefined;
  triggerNodeId?: string | null | undefined;
  triggerContext?: Record<string, unknown> | null | undefined;
  strictFlowMode?: boolean | undefined;
  deferPoll?: boolean | undefined;
  skipAiJobs?: boolean | undefined;
  seedOutputs?: Record<string, RuntimePortValues> | undefined;
  cache?: Map<string, RuntimePortValues> | undefined;
  onNodeStart?: (event: {
    runId: string;
    runStartedAt: string;
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues | null;
    iteration: number;
  }) => Promise<void> | void;
  onNodeFinish?: (event: {
    runId: string;
    runStartedAt: string;
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues | null;
    nextOutputs: RuntimePortValues;
    changed: boolean;
    iteration: number;
    cached?: boolean;
    error?: string;
  }) => Promise<void> | void;
  onNodeError?: (event: {
    runId: string;
    runStartedAt: string;
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues | null;
    error: unknown;
    iteration: number;
  }) => Promise<void> | void;
  onNodeBlocked?: (event: {
    runId: string;
    node: AiNode;
    reason: 'missing_inputs' | 'flow_control' | 'error';
    waitingOnPorts?: string[];
    waitingOnDetails?: Array<Record<string, unknown>>;
    message?: string;
  }) => Promise<void> | void;
  onIteration?: (event: {
    runId: string;
    iteration: number;
    activeNodes: string[];
  }) => Promise<void> | void;
  profile?: RuntimeProfileOptions | undefined;
  abortSignal?: AbortSignal | undefined;
  toast?: Toast | undefined; // ToastFn signature mismatch? Check below.
  reportAiPathsError: (error: unknown, context: Record<string, unknown>, summary?: string) => void;
  // Handler Resolution
  resolveHandler?: (type: string) => NodeHandler | null;
  // Services
  fetchEntityCached?: (type: string, id: string) => Promise<Record<string, unknown> | null>;
  fetchEntityByType?: (type: string, id: string) => Promise<Record<string, unknown> | null>;
  services?: {
    prisma?: unknown;
    mongo?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type EvaluateGraphArgs = EvaluateGraphOptions & {
  nodes: AiNode[];
  edges: Edge[];
};

export async function evaluateGraphInternal(
  nodes: AiNode[],
  edges: Edge[],
  options: EvaluateGraphOptions
): Promise<RuntimeState> {
  const resolvedRunId = options.runId ?? `run_${nowMs()}`;
  const resolvedRunStartedAtMs = nowMs();
  const resolvedRunStartedAt = new Date(resolvedRunStartedAtMs).toISOString();
  
  const nodeStats = new Map<string, RuntimeProfileNodeStats>();

  const getOrCreateNodeStats = (node: AiNode): RuntimeProfileNodeStats => {
    let stats = nodeStats.get(node.id);
    if (!stats) {
      stats = {
        nodeId: node.id,
        nodeType: node.type,
        count: 0,
        totalMs: 0,
        maxMs: 0,
        cachedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        hashCount: 0,
        hashTotalMs: 0,
        hashMaxMs: 0,
      };
      nodeStats.set(node.id, stats);
    }
    return stats;
  };

  const sanitizedEdges = sanitizeEdges(nodes, edges);
  const orderedNodes = orderNodesByDependencies(nodes, sanitizedEdges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const incomingEdgesByNode = new Map<string, Edge[]>();
  const outgoingEdgesByNode = new Map<string, Edge[]>();

  sanitizedEdges.forEach((edge) => {
    const fromNodeId = resolveEdgeFromNodeId(edge);
    const toNodeId = resolveEdgeToNodeId(edge);
    if (!fromNodeId || !toNodeId) return;
    if (!incomingEdgesByNode.has(toNodeId)) incomingEdgesByNode.set(toNodeId, []);
    incomingEdgesByNode.get(toNodeId)!.push(edge);
    if (!outgoingEdgesByNode.has(fromNodeId)) outgoingEdgesByNode.set(fromNodeId, []);
    outgoingEdgesByNode.get(fromNodeId)!.push(edge);
  });

  const inputs: Record<string, RuntimePortValues> = options.seedOutputs
    ? cloneValue(options.seedOutputs)
    : {};
  const outputs: Record<string, RuntimePortValues> = options.seedOutputs
    ? cloneValue(options.seedOutputs)
    : {};
  const history = new Map<string, RuntimeHistoryEntry[]>();
  const activeNodes = new Set<string>();
  const finishedNodes = new Set<string>();
  const errorNodes = new Set<string>();
  const blockedNodes = new Set<string>();
  
  const executed = {
    notification: new Set<string>(),
    updater: new Set<string>(),
    http: new Set<string>(),
    delay: new Set<string>(),
    poll: new Set<string>(),
    ai: new Set<string>(),
    schema: new Set<string>(),
    mapper: new Set<string>(),
  };

  const isNodeActiveById = (id: string): boolean => activeNodes.has(id);

  const buildRuntimeStateSnapshot = (
    inputsSnapshot: Record<string, RuntimePortValues>
  ): RuntimeState => {
    const nodeStatuses = nodes.reduce<Record<string, RuntimeState['nodeStatuses'][string]>>(
      (acc, node) => {
        if (errorNodes.has(node.id)) {
          acc[node.id] = 'failed';
        } else if (finishedNodes.has(node.id)) {
          acc[node.id] = 'completed';
        } else if (blockedNodes.has(node.id)) {
          acc[node.id] = 'blocked';
        } else if (activeNodes.has(node.id)) {
          acc[node.id] = 'running';
        } else {
          acc[node.id] = 'pending';
        }
        return acc;
      },
      {}
    );

    const outputsSnapshot = cloneValue(outputs);
          return {
            status:
              errorNodes.size > 0
                ? 'failed'
                : finishedNodes.size === nodes.length
                  ? 'completed'
                  : 'running',
            nodeStatuses,      nodeOutputs: outputsSnapshot,
      variables: {},
      events: [],
      runId: resolvedRunId,
      runStartedAt: resolvedRunStartedAt,
      inputs: cloneValue(inputsSnapshot),
      outputs: outputsSnapshot,
      history: history.size
        ? (cloneValue(Object.fromEntries(history)) as Record<string, RuntimeHistoryEntry[]>)
        : undefined,
    };
  };

  const collectNodeInputs = (nodeId: string): RuntimePortValues => {
    const incoming = incomingEdgesByNode.get(nodeId) ?? [];
    if (incoming.length === 0) return {};
    const collected: RuntimePortValues = {};
    incoming.forEach((edge: Edge) => {
      const fromNodeId = resolveEdgeFromNodeId(edge);
      if (!fromNodeId) return;
      if (!isNodeActiveById(fromNodeId)) return;
      const fromOutput = outputs[fromNodeId];
      const fromPort = resolveEdgeFromPort(edge);
      const toPort = resolveEdgeToPort(edge);
      if (!fromOutput || !fromPort || !toPort) return;
      const value = (fromOutput)[fromPort];
      if (value === undefined) return;
      const expectedTypes = getPortDataTypes(toPort);
      if (!isValueCompatibleWithTypes(value, expectedTypes)) return;
      const existing = (collected)[toPort];
      (collected)[toPort] = appendInputValue(existing, value);
    });
    return collected;
  };

  const refreshDownstreamInputs = (
    sourceNodeId: string,
    nextInputs: Record<string, RuntimePortValues>
  ): void => {
    const outgoing = outgoingEdgesByNode.get(sourceNodeId) ?? [];
    if (outgoing.length === 0) return;
    const touched = new Set<string>();
    outgoing.forEach((edge: Edge) => {
      const toNodeId = resolveEdgeToNodeId(edge);
      if (toNodeId) touched.add(toNodeId);
    });
    touched.forEach((targetId: string) => {
      const updatedInputs = collectNodeInputs(targetId);
      nextInputs[targetId] = updatedInputs;
    });
  };

  const throwAbortIfCancelled = (nextInputs: Record<string, RuntimePortValues>, nodeId?: string): void => {
    if (options.abortSignal?.aborted) {
      throw new GraphExecutionError(
        'Execution aborted by signal.',
        buildRuntimeStateSnapshot(nextInputs),
        nodeId
      );
    }
  };

  const triggerSource = options.triggerNodeId ? nodeById.get(options.triggerNodeId) : null;
  const triggerContext = options.triggerContext ?? null;
  const triggerContextRecord = triggerContext ?? null;

  const connectedSimulationNodes: AiNode[] = (() => {
    if (!options.triggerNodeId) return [];
    const simulationNodeById = new Map<string, AiNode>(
      nodes.filter((n) => n.type === 'simulation').map((n) => [n.id, n])
    );
    const reachable = new Set<string>();
    const stack = [options.triggerNodeId];
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (reachable.has(currentId)) continue;
      reachable.add(currentId);
      const outgoing = outgoingEdgesByNode.get(currentId) ?? [];
      outgoing.forEach((e) => {
        const toNodeId = resolveEdgeToNodeId(e);
        if (toNodeId) stack.push(toNodeId);
      });
    }
    return Array.from(reachable)
      .map((id) => simulationNodeById.get(id))
      .filter((n): n is AiNode => Boolean(n));
  })();

  const triggerHasSimulationProvenance =
    triggerSource?.type === 'simulation' ||
    (triggerContextRecord && checkContextMatchesSimulation(triggerContextRecord)) ||
    connectedSimulationNodes.length > 0;

  const deriveDatabaseInputs = (
    node: AiNode,
    nodeInputs: RuntimePortValues
  ): RuntimePortValues => {
    const next = { ...nodeInputs };
    if (node.type === 'database') {
      if (!pickString(next['entityId'])) {
        next['entityId'] =
          pickString(triggerContext?.['productId']) ??
          pickString(triggerContext?.['entityId']) ??
          pickString(next['entityId']) ??
          undefined;
      }
      if (!pickString(next['entityType'])) {
        next['entityType'] =
          pickString(triggerContext?.['entityType']) ??
          readEntityTypeFromContext(next) ??
          undefined;
      }
    }
    return next;
  };

  const deriveModelInputs = (
    node: AiNode,
    nodeInputs: RuntimePortValues
  ): RuntimePortValues => {
    const next = { ...nodeInputs };
    if (node.type === 'model' || node.type === 'prompt') {
      const contextEntityId = readEntityIdFromContext(next);
      const contextEntityType = readEntityTypeFromContext(next);
      if (contextEntityId && contextEntityType && triggerHasSimulationProvenance) {
        const inheritedContextSource =
          typeof triggerContextRecord?.['contextSource'] === 'string'
            ? triggerContextRecord['contextSource']
            : null;
        const currentContext = (next['context'] as Record<string, unknown>) ?? {};
        next['context'] = {
          ...currentContext,
          entityId: contextEntityId,
          entityType: contextEntityType,
          contextSource: inheritedContextSource ?? 'simulation',
          provenance: 'trigger_simulation',
        };
      }
    }
    return next;
  };

  const deriveNodeInputs = (node: AiNode, rawInputs: RuntimePortValues): RuntimePortValues => {
    let next = deriveDatabaseInputs(node, rawInputs);
    next = deriveModelInputs(node, next);
    return next;
  };

  let iteration = 0;
  let changedInLastIteration = true;

  while (changedInLastIteration && iteration < MAX_ITERATIONS) {
    iteration += 1;
    changedInLastIteration = false;

    if (options.onIteration) {
      await options.onIteration({
        runId: resolvedRunId,
        iteration,
        activeNodes: Array.from(activeNodes),
      });
    }

    for (const node of orderedNodes) {
      throwAbortIfCancelled(inputs, node.id);
      if (finishedNodes.has(node.id) || errorNodes.has(node.id)) continue;

      const rawInputs = inputs[node.id] ?? {};
      const nodeInputs = deriveNodeInputs(node, rawInputs);
      
      const readiness = evaluateInputReadiness(
        node, 
        nodeInputs, 
        incomingEdgesByNode.get(node.id) ?? [], 
        nodeById,
        (id) => finishedNodes.has(id) ? 'completed' : errorNodes.has(id) ? 'failed' : blockedNodes.has(id) ? 'blocked' : 'pending',
        (id) => outputs[id] ?? {}
      );

      if (!readiness.ready) {
        if (!blockedNodes.has(node.id)) {
          blockedNodes.add(node.id);
          if (options.onNodeBlocked) {
            await options.onNodeBlocked({
              runId: resolvedRunId,
              node,
              reason: 'missing_inputs',
              waitingOnPorts: readiness.waitingOnPorts,
              waitingOnDetails: readiness.waitingOnDetails,
            });
          }
        }
        continue;
      }

      blockedNodes.delete(node.id);
      activeNodes.add(node.id);

      const cacheScope = resolveNodeCacheScope(node);
      const cacheScopeFingerprint = cacheScope === 'run' ? { runId: resolvedRunId } : undefined;
      
      const nodeHash =
        node.type === 'database'
          ? buildDatabaseInputHash(node, nodeInputs, cacheScopeFingerprint)
          : node.type === 'model'
            ? buildModelInputHash(node, nodeInputs, cacheScopeFingerprint)
            : node.type === 'prompt'
              ? buildPromptInputHash(node, nodeInputs, cacheScopeFingerprint)
              : buildNodeInputHash(node, nodeInputs, cacheScopeFingerprint);

      const prevOutputs = outputs[node.id] ?? null;
      const cachedOutputs = nodeHash ? options.cache?.get(nodeHash) : null;

      if (cachedOutputs) {
        outputs[node.id] = cloneValue(cachedOutputs);
        finishedNodes.add(node.id);
        refreshDownstreamInputs(node.id, inputs);
        changedInLastIteration = true;

        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            node,
            nodeInputs,
            prevOutputs,
            nextOutputs: outputs[node.id]!,
            changed: false,
            iteration,
            cached: true,
          });
        }
        continue;
      }

      const handler = options.resolveHandler ? options.resolveHandler(node.type) : null;
      if (!handler) {
        errorNodes.add(node.id);
        const handlerMissingError = new GraphExecutionError(
          `No handler found for node type: ${node.type}`,
          buildRuntimeStateSnapshot(inputs),
          node.id
        );
        if (options.onNodeError) {
          await options.onNodeError({
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            node,
            nodeInputs,
            prevOutputs,
            error: handlerMissingError,
            iteration,
          });
        }
        throw handlerMissingError;
      }

      const stats = getOrCreateNodeStats(node);
      stats.count += 1;
      const nodeStartedAt = nowMs();

      try {
        if (options.onNodeStart) {
          await options.onNodeStart({
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            node,
            nodeInputs,
            prevOutputs,
            iteration,
          });
        }

        const timeoutMs = resolveNodeTimeoutMs(node);
        const resolvedEntityType = readEntityTypeFromContext(nodeInputs) ?? triggerContext?.['entityType'];
        const resolvedEntityId = readEntityIdFromContext(nodeInputs) ?? triggerContext?.['entityId'];
        const fetchEntityResolver =
          options.fetchEntityCached ??
          options.fetchEntityByType ??
          (async (): Promise<Record<string, unknown> | null> => null);

        const handlerContext: NodeHandlerContext = {
          node,
          nodeInputs,
          prevOutputs: prevOutputs ?? {},
          edges: sanitizedEdges,
          nodes,
          nodeById,
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          runMeta: options.services, // Passing services as runMeta might be what was intended or abused
          activePathId: options.pathId ?? null,
          triggerNodeId: options.triggerNodeId ?? undefined,
          triggerEvent: options.triggerEvent ?? undefined,
          triggerContext: options.triggerContext,
          deferPoll: options.deferPoll,
          skipAiJobs: options.skipAiJobs,
          now: new Date().toISOString(),
          abortSignal: options.abortSignal,
          allOutputs: outputs,
          allInputs: inputs,
          fetchEntityCached: fetchEntityResolver,
          reportAiPathsError: options.reportAiPathsError,
          toast: (msg: string, opts?: unknown) => {
            if (options.toast && typeof options.toast === 'function') {
              options.toast(msg, opts as Record<string, unknown>);
            }
          },
          simulationEntityType: typeof resolvedEntityType === 'string' ? resolvedEntityType : null,
          simulationEntityId: typeof resolvedEntityId === 'string' ? resolvedEntityId : null,
          resolvedEntity: null, // Should be resolved from context?
          fallbackEntityId: null,
          strictFlowMode: options.strictFlowMode ?? true,
          executed,
        };

        const result = await withTimeout(
          Promise.resolve(handler(handlerContext)),
          timeoutMs,
          `${node.type}:${node.id}`
        );

        const nodeFinishedAt = nowMs();
        const durationMs = nodeFinishedAt - nodeStartedAt;
        stats.totalMs += durationMs;
        stats.maxMs = Math.max(stats.maxMs, durationMs);

        outputs[node.id] = result;
        finishedNodes.add(node.id);
        if (nodeHash) options.cache?.set(nodeHash, cloneValue(result));
        
        refreshDownstreamInputs(node.id, inputs);
        changedInLastIteration = true;

        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            node,
            nodeInputs,
            prevOutputs,
            nextOutputs: result,
            changed: true,
            iteration,
          });
        }
      } catch (error) {
        errorNodes.add(node.id);
        stats.errorCount += 1;
        if (options.onNodeError) {
          await options.onNodeError({
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            node,
            nodeInputs,
            prevOutputs,
            error,
            iteration,
          });
        }
        throw error;
      }
    }
  }

  const finalState = buildRuntimeStateSnapshot(inputs);
  
  if (options.profile?.onSummary) {
    const profileNodes = Array.from(nodeStats.values()).map((stats) => ({
      ...stats,
      avgMs: stats.count > 0 ? stats.totalMs / stats.count : 0,
      hashAvgMs: stats.hashCount > 0 ? stats.hashTotalMs / stats.hashCount : 0,
    }));
    const summary: RuntimeProfileSummary = {
      runId: resolvedRunId,
      durationMs: nowMs() - resolvedRunStartedAtMs,
      iterationCount: iteration,
      nodeCount: nodes.length,
      edgeCount: sanitizedEdges.length,
      nodes: profileNodes,
      hottestNodes: [...profileNodes]
        .sort((a, b) => b.totalMs - a.totalMs || b.maxMs - a.maxMs)
        .slice(0, 10),
    };
    options.profile.onSummary(summary);
  }

  return finalState;
}
