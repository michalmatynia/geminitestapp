import type { AiNode, Edge, NodeCacheScope } from '@/shared/contracts/ai-paths';
import type {
  RuntimePortValues,
  RuntimeState,
  NodeHandlerContext,
  RuntimeHistoryEntry,
} from '@/shared/contracts/ai-paths-runtime';
import type { ToastOptions } from '@/shared/contracts/ui';

import {
  appendInputValue,
  cloneValue,
  getPortDataTypes,
  isValueCompatibleWithTypes,
  sanitizeEdges,
} from '../utils';
import { nowMs, resolveNodeTimeoutMs, withTimeout } from './execution-helpers';

// Modular imports
import {
  GraphExecutionError,
  GraphExecutionCancelled,
  type RuntimeProfileNodeStats,
  type RuntimeProfileSummary,
  type EvaluateGraphOptions,
} from './engine-modules/engine-types';
import {
  buildNodeInputHash,
  buildDatabaseInputHash,
  buildModelInputHash,
  buildPromptInputHash,
} from './engine-modules/engine-hashing';
import {
  orderNodesByDependencies,
  evaluateInputReadiness,
  pickString,
  readEntityTypeFromContext,
  readEntityIdFromContext,
  resolveEdgeFromNodeId,
  resolveEdgeToNodeId,
  resolveEdgeFromPort,
  resolveEdgeToPort,
  checkContextMatchesSimulation,
  hasValuableSimulationContext,
  isSimulationCapableFetcher,
} from './engine-modules/engine-utils';

export { GraphExecutionError, GraphExecutionCancelled };

const MAX_ITERATIONS = process.env['NODE_ENV'] === 'test' ? 10 : 500;
const DEFAULT_NODE_CACHE_SCOPE: NodeCacheScope = 'run';

const resolveNodeCacheScope = (node: AiNode): NodeCacheScope => {
  const scope = node.config?.runtime?.cache?.scope;
  if (scope === 'run' || scope === 'activation' || scope === 'session') {
    return scope;
  }
  return DEFAULT_NODE_CACHE_SCOPE;
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

  const collectNodeInputs = (
    nodeId: string,
    currentOutputs: Record<string, RuntimePortValues>
  ): RuntimePortValues => {
    const incoming = incomingEdgesByNode.get(nodeId) ?? [];
    if (incoming.length === 0) return {};
    const collected: RuntimePortValues = {};
    incoming.forEach((edge: Edge) => {
      const fromNodeId = resolveEdgeFromNodeId(edge);
      if (!fromNodeId) return;
      const fromOutput = currentOutputs[fromNodeId];
      const fromPort = resolveEdgeFromPort(edge);
      const toPort = resolveEdgeToPort(edge);
      if (!fromOutput || !fromPort || !toPort) return;
      const value = fromOutput[fromPort];
      if (value === undefined) return;
      const expectedTypes = getPortDataTypes(toPort);
      if (!isValueCompatibleWithTypes(value, expectedTypes)) return;
      const existing = collected[toPort];
      collected[toPort] = appendInputValue(existing, value);
    });
    return collected;
  };

  const seedHashes = options.seedHashes ?? {};

  const scopedNodeIds = (() => {
    if (!options.triggerNodeId || !nodeById.has(options.triggerNodeId)) {
      return new Set(nodes.map((node) => node.id));
    }
    const reachable = new Set<string>();
    const stack = [options.triggerNodeId];

    // Forward reachability
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || reachable.has(current)) continue;
      reachable.add(current);
      const outgoing = outgoingEdgesByNode.get(current) ?? [];
      outgoing.forEach((edge) => {
        const toNodeId = resolveEdgeToNodeId(edge);
        if (toNodeId && !reachable.has(toNodeId)) {
          stack.push(toNodeId);
        }
      });
    }

    // Include upstream simulation nodes if trigger requires simulation
    const triggerNode = nodeById.get(options.triggerNodeId);
    if (
      triggerNode?.config?.trigger?.contextMode === 'simulation_required' ||
      triggerNode?.config?.trigger?.contextMode === 'simulation_preferred'
    ) {
      const incoming = incomingEdgesByNode.get(options.triggerNodeId) ?? [];
      incoming.forEach((edge) => {
        const fromNodeId = resolveEdgeFromNodeId(edge);
        if (fromNodeId) {
          const fromNode = nodeById.get(fromNodeId);
          if (fromNode?.type === 'simulation' || isSimulationCapableFetcher(fromNode!)) {
            const config = fromNode?.config?.simulation;
            // Respect manual_only behavior
            if (
              fromNode?.type !== 'simulation' ||
              config?.runBehavior !== 'manual_only' ||
              fromNodeId === options.triggerNodeId ||
              seedHashes[fromNodeId]
            ) {
              reachable.add(fromNodeId);
            }
          }
        }
      });
    }

    return reachable;
  })();
  const executableNodeCount = scopedNodeIds.size;

  const inputs: Record<string, RuntimePortValues> = {};
  const outputs: Record<string, RuntimePortValues> = options.seedOutputs
    ? cloneValue(options.seedOutputs)
    : {};

  const history = new Map<string, RuntimeHistoryEntry[]>();
  const activeNodes = new Set<string>();
  const finishedNodes = new Set<string>();
  const errorNodes = new Set<string>();
  const blockedNodes = new Set<string>();
  const skippedNodes = new Set<string>(options.skipNodeIds ?? []);
  const nodeHashes = new Map<string, string>();

  Object.keys(outputs).forEach((nodeId) => {
    if (!scopedNodeIds.has(nodeId)) {
      delete outputs[nodeId];
    } else if (seedHashes[nodeId] === undefined) {
      // Re-validate if no seed hash provided.
    } else {
      // Validation will happen in the loop based on hash match.
    }
  });

  skippedNodes.forEach((id) => {
    if (nodeById.has(id)) {
      finishedNodes.add(id);
    }
  });

  // Initial input propagation
  nodes.forEach((node) => {
    inputs[node.id] = collectNodeInputs(node.id, outputs);
  });

  const executed: NodeHandlerContext['executed'] = {
    notification: new Set<string>(),
    updater: new Set<string>(),
    http: new Set<string>(),
    delay: new Set<string>(),
    poll: new Set<string>(),
    ai: new Set<string>(),
    schema: new Set<string>(),
    mapper: new Set<string>(),
  };

  const buildRuntimeStateSnapshot = (
    inputsSnapshot: Record<string, RuntimePortValues>
  ): RuntimeState => {
    const nodeStatuses = nodes.reduce<Record<string, RuntimeState['nodeStatuses'][string]>>(
      (acc, node) => {
        if (errorNodes.has(node.id)) {
          acc[node.id] = 'failed';
        } else if (skippedNodes.has(node.id)) {
          acc[node.id] = 'skipped';
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
          : finishedNodes.size >= executableNodeCount
            ? 'completed'
            : 'running',
      nodeStatuses,
      nodeOutputs: outputsSnapshot,
      variables: {},
      events: [],
      runId: resolvedRunId,
      runStartedAt: resolvedRunStartedAt,
      inputs: cloneValue(inputsSnapshot),
      outputs: outputsSnapshot,
      hashes: Object.fromEntries(nodeHashes),
      history: history.size
        ? (cloneValue(Object.fromEntries(history)) as Record<string, RuntimeHistoryEntry[]>)
        : undefined,
    };
  };

  const throwAbortIfCancelled = (
    nextInputs: Record<string, RuntimePortValues>,
    nodeId?: string
  ): void => {
    if (options.abortSignal?.aborted) {
      throw new GraphExecutionError(
        'Execution aborted by signal.',
        buildRuntimeStateSnapshot(nextInputs),
        nodeId
      );
    }
  };

  const triggerContext = options.triggerContext ?? null;
  const triggerContextRecord = triggerContext ?? null;

  const triggerSource = options.triggerNodeId ? nodeById.get(options.triggerNodeId) : null;

  const checkTriggerProvenance = (): boolean => {
    const simulationNodesInScope = Array.from(scopedNodeIds)
      .map((id) => nodeById.get(id))
      .filter((n) => n && (n.type === 'simulation' || isSimulationCapableFetcher(n)));
    const finishedSimulationNodes = simulationNodesInScope.filter((n) => finishedNodes.has(n!.id));
    const simulationOutputs = finishedSimulationNodes.map((n) => outputs[n!.id]).filter(Boolean);

    const hasLiveProvenance =
      triggerContextRecord && checkContextMatchesSimulation(triggerContextRecord);
    const hasSimNodeProvenance = simulationOutputs.some(
      (out) =>
        out && hasValuableSimulationContext((out['context'] as Record<string, unknown>) ?? {})
    );

    if (triggerSource?.type === 'simulation' || hasLiveProvenance || hasSimNodeProvenance) {
      return true;
    }

    const hasPotentialSimNode = simulationNodesInScope.some((n) => !finishedNodes.has(n!.id));
    return hasPotentialSimNode;
  };

  // Pre-Execution Simulation Context Feasibility Check
  const triggerCanEventuallyHaveSimulationProvenance =
    triggerSource?.type === 'simulation' ||
    (triggerContextRecord && checkContextMatchesSimulation(triggerContextRecord)) ||
    Array.from(scopedNodeIds).some((id) => {
      const n = nodeById.get(id);
      return n && (n.type === 'simulation' || isSimulationCapableFetcher(n));
    });

  if (
    triggerSource?.config?.trigger?.contextMode === 'simulation_required' &&
    !triggerCanEventuallyHaveSimulationProvenance
  ) {
    throw new GraphExecutionError(
      `Trigger "${triggerSource.title || triggerSource.id}" requires simulation context but none was provided or resolved.`,
      buildRuntimeStateSnapshot(inputs),
      triggerSource.id
    );
  }

  const deriveNodeInputs = (node: AiNode, rawInputs: RuntimePortValues): RuntimePortValues => {
    const next = { ...rawInputs };
    if (node.type === 'database') {
      if (!pickString(next['entityId'])) {
        const triggerEntityId =
          pickString(triggerContext?.['productId']) ?? pickString(triggerContext?.['entityId']);
        if (triggerEntityId) {
          next['entityId'] = triggerEntityId;
        }
      }
      if (!pickString(next['entityType'])) {
        const triggerEntityType =
          pickString(triggerContext?.['entityType']) ??
          (pickString(triggerContext?.['productId']) ? 'product' : undefined);
        if (triggerEntityType) {
          next['entityType'] = triggerEntityType;
        }
      }
    }
    if (node.type === 'model' || node.type === 'prompt') {
      const contextEntityId = readEntityIdFromContext(next);
      const contextEntityType = readEntityTypeFromContext(next);
      if (contextEntityId && contextEntityType && checkTriggerProvenance()) {
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

  let iteration = 0;
  let changedInLastIteration = true;
  const maxIterationsLimit = options.maxIterations ?? MAX_ITERATIONS;

  while (changedInLastIteration && iteration < maxIterationsLimit) {
    iteration += 1;
    changedInLastIteration = false;

    if (options.onIteration) {
      await options.onIteration({
        runId: resolvedRunId,
        iteration,
        activeNodes: Array.from(activeNodes),
      });
    }

    const readyNodes = orderedNodes.filter((node) => {
      if (!scopedNodeIds.has(node.id)) return false;
      if (finishedNodes.has(node.id) || errorNodes.has(node.id)) return false;

      const rawInputs = inputs[node.id] ?? {};
      const nodeInputs = deriveNodeInputs(node, rawInputs);

      const readiness = evaluateInputReadiness(
        node,
        nodeInputs,
        incomingEdgesByNode.get(node.id) ?? [],
        nodeById,
        (id) =>
          finishedNodes.has(id)
            ? 'completed'
            : errorNodes.has(id)
              ? 'failed'
              : blockedNodes.has(id)
                ? 'blocked'
                : 'pending',
        (id) => outputs[id] ?? {}
      );

      if (!readiness.ready) {
        if (!blockedNodes.has(node.id)) {
          blockedNodes.add(node.id);
          let message = `Upstream waiting diagnostics: ${readiness.waitingOnPorts.length > 0 ? `Waiting on ports: ${readiness.waitingOnPorts.join(', ')}` : 'Blocked by upstream nodes'}`;
          if (readiness.waitingOnDetails && readiness.waitingOnDetails.length > 0) {
            const detailsMsg = readiness.waitingOnDetails
              .map((d) => {
                const upstreamNodes = d.upstream
                  .map((u) => `${u.nodeTitle || u.nodeId} (${u.status})`)
                  .join(', ');
                return `Upstream status for ${d.port}: ${upstreamNodes}`;
              })
              .join('; ');
            message = `Upstream waiting diagnostics: ${detailsMsg}`;
          }

          outputs[node.id] = {
            status: 'blocked',
            skipReason: 'missing_inputs',
            message,
            waitingOnPorts: readiness.waitingOnPorts,
            waitingOnDetails: readiness.waitingOnDetails,
            requiredPorts: readiness.requiredPorts,
          };

          if (options['recordHistory']) {
            const entries = history.get(node.id) ?? [];
            entries.push({
              timestamp: new Date().toISOString(),
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              pathId: options.pathId ?? null,
              pathName: null,
              nodeId: node.id,
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: 'blocked',
              iteration,
              inputs: cloneValue(nodeInputs),
              outputs: cloneValue(outputs[node.id]),
              skipReason: 'missing_inputs',
              requiredPorts: readiness.requiredPorts,
              waitingOnPorts: readiness.waitingOnPorts,
            } as RuntimeHistoryEntry);
            history.set(node.id, entries);
          }

          if (options.profile?.onEvent) {
            options.profile.onEvent({
              type: 'node',
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              nodeId: node.id,
              nodeType: node.type,
              iteration,
              status: 'skipped',
              durationMs: 0,
              reason: 'missing_inputs',
              requiredPorts: readiness.requiredPorts,
              waitingOnPorts: readiness.waitingOnPorts,
            });
          }

          if (options.onNodeBlocked) {
            void options.onNodeBlocked({
              runId: resolvedRunId,
              node,
              reason: 'missing_inputs',
              message,
              waitingOnPorts: readiness.waitingOnPorts,
              waitingOnDetails: readiness.waitingOnDetails,
            });
          }
        }
        return false;
      }

      return true;
    });

    if (readyNodes.length > 0) {
      await Promise.all(
        readyNodes.map(async (node) => {
          throwAbortIfCancelled(inputs, node.id);

          const rawInputs = inputs[node.id] ?? {};
          const nodeInputs = deriveNodeInputs(node, rawInputs);

          // --- Cache Check Start ---
          const cacheScope = resolveNodeCacheScope(node);
          let cacheScopeFingerprint: Record<string, unknown> | undefined;
          
          if (cacheScope === 'run') {
            cacheScopeFingerprint = { runId: resolvedRunId };
          } else if (cacheScope === 'session' || cacheScope === 'activation') {
            // Bind session/activation scope to the primary entity context
            const entityId =
              pickString(triggerContext?.['entityId']) ??
              pickString(triggerContext?.['productId']);
            if (entityId) {
              cacheScopeFingerprint = { entityId };
            }
          }

          const nodeHash =
            node.type === 'database'
              ? buildDatabaseInputHash(node, nodeInputs, cacheScopeFingerprint)
              : node.type === 'model'
                ? buildModelInputHash(node, nodeInputs, cacheScopeFingerprint)
                : node.type === 'prompt'
                  ? buildPromptInputHash(node, nodeInputs, cacheScopeFingerprint)
                  : buildNodeInputHash(node, nodeInputs, cacheScopeFingerprint);

          if (nodeHash) {
            nodeHashes.set(node.id, nodeHash);
          }

          const prevOutputs = outputs[node.id] ?? null;
          const cachedOutputs = nodeHash ? options.cache?.get(nodeHash) : null;
          const isSeedMatch = Boolean(
            nodeHash && seedHashes[node.id] === nodeHash && options.seedOutputs?.[node.id]
          );

          const isEntryNode = node.id === options.triggerNodeId;
          const isImplicitTriggerNode = node.type === 'trigger' && !options.triggerNodeId;
          const cacheMode = node.config?.runtime?.cache?.mode ?? 'auto';
          const isCacheDisabled = cacheMode === 'disabled';
          
          let validCacheHit = false;
          let cacheSource: RuntimePortValues | null = null;

          if (!isEntryNode && !isImplicitTriggerNode && !isCacheDisabled) {
            if (isSeedMatch) {
              cacheSource = options.seedOutputs![node.id]!;
              validCacheHit = true;
            } else if (cachedOutputs) {
              cacheSource = cachedOutputs;
              validCacheHit = true;
            }

            // Guardrail: Reject status-only cache if node expects outputs
            if (validCacheHit && cacheSource) {
              const hasData = Object.keys(cacheSource).some(k => k !== 'status' && k !== 'context');
              const expectsData = (node.outputs ?? []).length > 0;
              if (!hasData && expectsData) {
                validCacheHit = false;
                cacheSource = null;
              }
            }
          }

          if (validCacheHit && cacheSource) {
            const out = cacheSource;
            outputs[node.id] = cloneValue(out);

            if (out['status'] === 'blocked') {
              blockedNodes.add(node.id);
            } else {
              finishedNodes.add(node.id);
            }

            if (options['recordHistory']) {
              const entries = history.get(node.id) ?? [];
              entries.push({
                timestamp: new Date().toISOString(),
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                pathId: options.pathId ?? null,
                pathName: null,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'cached',
                iteration,
                inputs: cloneValue(nodeInputs),
                outputs: cloneValue(outputs[node.id]),
              } as RuntimeHistoryEntry);
              history.set(node.id, entries);
            }

            if (options.profile?.onEvent) {
              options.profile.onEvent({
                type: 'node',
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                nodeId: node.id,
                nodeType: node.type,
                iteration,
                status: 'cached',
                durationMs: 0,
              });
            }

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
            return;
          }
          // --- Cache Check End ---

          // Final check for trigger provenance if ready
          if (
            node.id === options.triggerNodeId &&
            node.config?.trigger?.contextMode === 'simulation_required'
          ) {
            if (!checkTriggerProvenance()) {
              throw new GraphExecutionError(
                `Trigger "${node.title || node.id}" requires simulation context but none was provided or resolved.`,
                buildRuntimeStateSnapshot(inputs),
                node.id
              );
            }
          }

          if (blockedNodes.has(node.id)) {
            delete outputs[node.id];
          }
          blockedNodes.delete(node.id);
          activeNodes.add(node.id);

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
            const sideEffectPolicy = node.config?.runtime?.sideEffectPolicy ?? 'per_run';
            const activationHash = buildNodeInputHash(node, nodeInputs, {
              iteration,
            });

            let sideEffectDecision: 'executed' | 'skipped_policy' = 'executed';
            if (
              sideEffectPolicy === 'per_run' &&
              (executed as unknown as Record<string, Set<string> | undefined>)[node.type]?.has(
                node.id
              )
            ) {
              sideEffectDecision = 'skipped_policy';
            }

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
            const resolvedEntityType =
              readEntityTypeFromContext(nodeInputs) ??
              pickString(triggerContext?.['entityType']) ??
              (pickString(triggerContext?.['productId']) ? 'product' : null);
            const resolvedEntityId =
              readEntityIdFromContext(nodeInputs) ??
              pickString(triggerContext?.['productId']) ??
              pickString(triggerContext?.['entityId']) ??
              null;
            const fetchEntityResolver =
              options.fetchEntityByType ?? options.fetchEntityCached ?? (async () => null);

            const handlerContext: NodeHandlerContext = {
              node,
              nodeInputs,
              prevOutputs: prevOutputs && prevOutputs['status'] !== 'blocked' ? prevOutputs : {},
              edges: sanitizedEdges,
              nodes,
              nodeById,
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              runMeta: options.services,
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
              toast: (msg: string, opts?: ToastOptions) => {
                if (options.toast) {
                  options.toast(msg, opts);
                }
              },
              simulationEntityType:
                typeof resolvedEntityType === 'string' ? resolvedEntityType : null,
              simulationEntityId: typeof resolvedEntityId === 'string' ? resolvedEntityId : null,
              resolvedEntity: null,
              fallbackEntityId: null,
              strictFlowMode: options.strictFlowMode ?? true,
              sideEffectControl: {
                policy: sideEffectPolicy,
                decision: sideEffectDecision,
                activationHash,
                idempotencyKey: null,
              },
              executed,
            };

            const result = await withTimeout(
              Promise.resolve(handler(handlerContext)),
              timeoutMs,
              `${node.type}:${node.id}`
            );

            if (sideEffectPolicy === 'per_run') {
              (executed as unknown as Record<string, Set<string> | undefined>)[node.type]?.add(
                node.id
              );
            }

            const nodeFinishedAt = nowMs();
            const durationMs = nodeFinishedAt - nodeStartedAt;
            stats.totalMs += durationMs;
            stats.maxMs = Math.max(stats.maxMs, durationMs);

            outputs[node.id] = result;
            finishedNodes.add(node.id);
            if (nodeHash) options.cache?.set(nodeHash, cloneValue(result));

            if (options['recordHistory']) {
              const entries = history.get(node.id) ?? [];
              entries.push({
                timestamp: new Date().toISOString(),
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                pathId: options.pathId ?? null,
                pathName: null,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'completed',
                iteration,
                inputs: cloneValue(nodeInputs),
                outputs: cloneValue(result),
                sideEffectPolicy,
                sideEffectDecision,
                activationHash,
                durationMs,
              } as RuntimeHistoryEntry);
              history.set(node.id, entries);
            }

            if (options.profile?.onEvent) {
              options.profile.onEvent({
                type: 'node',
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                nodeId: node.id,
                nodeType: node.type,
                iteration,
                status: 'executed',
                durationMs,
                sideEffectPolicy,
                sideEffectDecision,
                activationHash,
              });
            }

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
                sideEffectDecision,
                sideEffectPolicy,
                activationHash,
              });
            }
          } catch (error) {
            errorNodes.add(node.id);
            stats.errorCount += 1;

            if (options['recordHistory']) {
              const entries = history.get(node.id) ?? [];
              entries.push({
                timestamp: new Date().toISOString(),
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                pathId: options.pathId ?? null,
                pathName: null,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'failed',
                iteration,
                inputs: cloneValue(nodeInputs),
                outputs: {},
                error: error instanceof Error ? error.message : String(error),
              } as RuntimeHistoryEntry);
              history.set(node.id, entries);
            }

            if (options.profile?.onEvent) {
              options.profile.onEvent({
                type: 'node',
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                nodeId: node.id,
                nodeType: node.type,
                iteration,
                status: 'error',
                durationMs: nowMs() - nodeStartedAt,
              });
            }

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
        })
      );
    }
    // Input propagation for next iteration
    nodes.forEach((n) => {
      const updatedInputs = collectNodeInputs(n.id, outputs);
      const currentInputsStr = JSON.stringify(inputs[n.id] ?? {});
      const updatedInputsStr = JSON.stringify(updatedInputs);
      if (updatedInputsStr !== currentInputsStr) {
        inputs[n.id] = updatedInputs;
        changedInLastIteration = true;
        if (finishedNodes.has(n.id)) {
          finishedNodes.delete(n.id);
        }
        blockedNodes.delete(n.id);
        errorNodes.delete(n.id);
      }
    });
  }

  const finalState = buildRuntimeStateSnapshot(inputs);

  const onHalt =
    options.onHalt ||
    ((options['control'] as Record<string, unknown> | undefined)?.[
      'onHalt'
    ] as typeof options.onHalt);

  if (finalState.status !== 'completed' && finalState.status !== 'failed' && onHalt) {
    const reason = iteration >= maxIterationsLimit ? 'max_iterations' : 'blocked';
    await onHalt({
      runId: resolvedRunId,
      reason,
      nodeStatuses: finalState.nodeStatuses,
    });
  }

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
