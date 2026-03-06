import { AiNode, Edge } from '@/shared/contracts/ai-paths';
import {
  RuntimeState,
  RuntimeHistoryEntry,
  RuntimePortValues,
  NodeHandlerContext,
} from '@/shared/contracts/ai-paths-runtime';
import { ToastOptions } from '@/shared/contracts/ui';

import { cloneValue } from '../utils';
import { nowMs, resolveNodeTimeoutMs, withTimeout, withRetries } from './execution-helpers';

// Modular imports
import {
  GraphExecutionError,
  GraphExecutionCancelled,
  type EvaluateGraphOptions,
} from './engine-modules/engine-types';
import {
  buildNodeInputHash,
  buildNodeHash,
} from './engine-modules/engine-hashing';
import {
  evaluateInputReadiness,
  resolveMissingInputStatus,
  pickString,
  resolveEdgeToNodeId,
} from './engine-modules/engine-utils';
import { EngineStateManager, resolveNodeCacheScope } from './engine-modules/engine-state-manager';
import { MAX_ITERATIONS } from './engine-modules/engine-constants';
import { collectNodeInputs } from './engine-modules/engine-input-collector';
import { deriveNodeInputs } from './engine-modules/engine-node-input-deriver';
import {
  applyCachedNodeRuntimeStatus,
  readRuntimeRetryPolicy,
  resolveBlockedNodeStatus,
  resolveDeclaredNodeStatus,
  resolveRecoverableNodeWaitState,
} from './engine-modules/engine-runtime-status';
import {
  applyValidationBlockedNodeState,
  runRuntimeValidation,
} from './engine-modules/engine-validation-helpers';
import {
  prepareGraphForExecution,
} from './engine-modules/engine-execution-preparation';
import {
  checkTriggerProvenance,
  validateTriggerProvenanceFeasibility,
} from './engine-modules/engine-execution-provenance';
import {
  resolveNodeHandlerOrThrow,
} from './engine-modules/engine-execution-handlers';
import {
  buildRuntimeTelemetryFields,
  RuntimeTelemetryResolver,
} from './engine-modules/engine-execution-telemetry';

export { GraphExecutionError, GraphExecutionCancelled };

export async function evaluateGraphInternal(
  nodes: AiNode[],
  edges: Edge[],
  options: EvaluateGraphOptions
): Promise<RuntimeState> {
  const resolvedRunId = options.runId ?? `run_${nowMs()}`;
  const resolvedRunStartedAtMs = nowMs();
  const resolvedRunStartedAt = new Date(resolvedRunStartedAtMs).toISOString();

  const {
    sanitizedEdges,
    nodeById,
    incomingEdgesByNode,
    outgoingEdgesByNode,
    orderedNodes,
    scopedNodeIds,
  } = prepareGraphForExecution({
    nodes,
    edges,
    triggerNodeId: options.triggerNodeId,
    seedHashes: options.seedHashes,
  });
  const seedHashes: Record<string, string> = options.seedHashes ?? {};

  const state = new EngineStateManager(nodes, scopedNodeIds.size, options);

  Object.keys(state.outputs).forEach((nodeId) => {
    if (!scopedNodeIds.has(nodeId)) {
      delete state.outputs[nodeId];
    }
  });

  state.skippedNodes.forEach((id) => {
    if (nodeById.has(id)) {
      state.finishedNodes.add(id);
    }
  });

  // Initial input propagation
  nodes.forEach((node) => {
    state.inputs[node.id] = collectNodeInputs(node.id, state.outputs, incomingEdgesByNode);
  });

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

  const triggerContext = options.triggerContext ?? null;
  const triggerSource = options.triggerNodeId ? (nodeById.get(options.triggerNodeId) ?? null) : null;
  const resolvedOnHalt = options.onHalt;
  const telemetryResolver = new RuntimeTelemetryResolver(options);

  const emitHalt = async (
    reason: 'blocked' | 'max_iterations' | 'completed' | 'failed'
  ): Promise<void> => {
    if (!resolvedOnHalt) return;
    try {
      const snapshot = state.buildRuntimeStateSnapshot(state.inputs);
      await resolvedOnHalt({
        runId: resolvedRunId,
        reason,
        nodeStatuses: snapshot.nodeStatuses,
      });
    } catch (error) {
      options.reportAiPathsError(error, {
        action: 'onHalt',
        reason,
        runId: resolvedRunId,
      });
    }
  };

  const resolveCacheScopeFingerprint = (node: AiNode): Record<string, unknown> | undefined => {
    const cacheScope = resolveNodeCacheScope(node);
    if (cacheScope === 'run') {
      return { runId: resolvedRunId };
    }
    if (cacheScope === 'session' || cacheScope === 'activation') {
      const entityId =
        pickString(triggerContext?.['entityId']) ?? pickString(triggerContext?.['productId']);
      if (entityId) {
        return { entityId };
      }
    }
    return undefined;
  };

  const internalBuildNodeHash = (node: AiNode, nodeInputs: RuntimePortValues): string =>
    buildNodeHash(node, nodeInputs, resolveCacheScopeFingerprint(node));

  const provenanceContext = {
    scopedNodeIds,
    nodeById,
    state,
    triggerContext,
    triggerSource,
  };

  const internalCheckTriggerProvenance = (): boolean => checkTriggerProvenance(provenanceContext);

  try {
    validateTriggerProvenanceFeasibility(provenanceContext);
  } catch (error) {
    throw new GraphExecutionError(
      (error as Error).message,
      state.buildRuntimeStateSnapshot(state.inputs),
      triggerSource?.id
    );
  }

  const graphParseValidation = await runRuntimeValidation({
    stage: 'graph_parse',
    iteration: 0,
    node: null,
    options,
    resolvedRunId,
    resolvedRunStartedAt,
    nodes,
    sanitizedEdges,
  });
  if (graphParseValidation?.decision === 'block') {
    throw new GraphExecutionError(
      graphParseValidation.message,
      state.buildRuntimeStateSnapshot(state.inputs)
    );
  }

  const graphBindValidation = await runRuntimeValidation({
    stage: 'graph_bind',
    iteration: 0,
    node: null,
    options,
    resolvedRunId,
    resolvedRunStartedAt,
    nodes,
    sanitizedEdges,
  });
  if (graphBindValidation?.decision === 'block') {
    throw new GraphExecutionError(
      graphBindValidation.message,
      state.buildRuntimeStateSnapshot(state.inputs)
    );
  }

  let iteration = 0;
  let changedInLastIteration = true;
  const maxIterationsLimit = options.maxIterations ?? MAX_ITERATIONS;

  while (changedInLastIteration && iteration < maxIterationsLimit) {
    iteration += 1;
    changedInLastIteration = false;

    // Warn at 80% of max iterations
    const warningThreshold = Math.floor(maxIterationsLimit * 0.8);
    if (iteration === warningThreshold && options.onIterationLimitWarning) {
      await options.onIterationLimitWarning({
        runId: resolvedRunId,
        iteration,
        maxIterations: maxIterationsLimit,
        remaining: maxIterationsLimit - iteration,
      });
    }

    if (options.onIteration) {
      await options.onIteration({
        runId: resolvedRunId,
        iteration,
        activeNodes: Array.from(state.activeNodes),
      });
    }

    const readyNodes = orderedNodes.filter((node) => {
      if (!scopedNodeIds.has(node.id)) return false;
      if (state.finishedNodes.has(node.id) || state.errorNodes.has(node.id)) return false;

      const rawInputs = state.inputs[node.id] ?? {};
      const nodeInputs = deriveNodeInputs({
        node,
        rawInputs,
        triggerContext,
        checkTriggerProvenance: internalCheckTriggerProvenance
      });
      const runtimeTelemetry = telemetryResolver.resolve(node.type);

      const readiness = evaluateInputReadiness(
        node,
        nodeInputs,
        incomingEdgesByNode.get(node.id) ?? [],
        nodeById,
        (id) => {
          if (state.errorNodes.has(id)) {
            return 'failed';
          }
          if (state.finishedNodes.has(id)) {
            return resolveDeclaredNodeStatus(state.outputs[id]) ?? 'completed';
          }
          if (state.activeNodes.has(id)) {
            return 'running';
          }
          if (state.blockedNodes.has(id)) {
            return resolveBlockedNodeStatus(state.outputs[id]);
          }
          return 'pending';
        },
        (id) => state.outputs[id] ?? {}
      );

      if (!readiness.ready) {
        const blockedStatus =
          readiness.waitingOnDetails.length > 0
            ? resolveMissingInputStatus({
              waitingOnDetails: readiness.waitingOnDetails,
            })
            : 'blocked';
        let message =
          readiness.waitingOnPorts.length > 0
            ? `Upstream waiting diagnostics: Waiting on ports: ${readiness.waitingOnPorts.join(', ')}`
            : 'Upstream waiting diagnostics: Blocked by upstream nodes';

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

        const previousStatus =
          typeof state.outputs[node.id]?.['status'] === 'string'
            ? String(state.outputs[node.id]?.['status']).trim().toLowerCase()
            : null;
        const previousMessage =
          typeof state.outputs[node.id]?.['message'] === 'string'
            ? String(state.outputs[node.id]?.['message'])
            : null;
        const previousWaitingPorts = Array.isArray(state.outputs[node.id]?.['waitingOnPorts'])
          ? (state.outputs[node.id]?.['waitingOnPorts'] as unknown[])
          : [];
        const previousWaitingDetails = Array.isArray(state.outputs[node.id]?.['waitingOnDetails'])
          ? (state.outputs[node.id]?.['waitingOnDetails'] as unknown[])
          : [];
        const waitingPortsChanged =
          JSON.stringify(previousWaitingPorts) !== JSON.stringify(readiness.waitingOnPorts);
        const waitingDetailsChanged =
          JSON.stringify(previousWaitingDetails) !== JSON.stringify(readiness.waitingOnDetails);

        if (
          !state.blockedNodes.has(node.id) ||
          previousStatus !== blockedStatus ||
          previousMessage !== message ||
          waitingPortsChanged ||
          waitingDetailsChanged
        ) {
          state.blockedNodes.add(node.id);
          state.outputs[node.id] = {
            status: blockedStatus,
            skipReason: 'missing_inputs',
            blockedReason: 'missing_inputs',
            message,
            waitingOnPorts: readiness.waitingOnPorts,
            waitingOnDetails: readiness.waitingOnDetails,
            requiredPorts: readiness.requiredPorts,
          };

          if (options['recordHistory']) {
            const entries = state.history.get(node.id) ?? [];
            entries.push({
              timestamp: new Date().toISOString(),
              pathId: options.pathId ?? null,
              pathName: null,
              nodeId: node.id,
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: blockedStatus,
              iteration,
              inputs: cloneValue(nodeInputs),
              outputs: cloneValue(state.outputs[node.id]),
              skipReason: 'missing_inputs',
              requiredPorts: readiness.requiredPorts,
              waitingOnPorts: readiness.waitingOnPorts,
              ...buildRuntimeTelemetryFields(runtimeTelemetry),
            } as RuntimeHistoryEntry);
            state.history.set(node.id, entries);
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
              ...buildRuntimeTelemetryFields(runtimeTelemetry),
            });
          }

          if (options.onNodeBlocked) {
            void options.onNodeBlocked({
              runId: resolvedRunId,
              node,
              reason: 'missing_inputs',
              status: blockedStatus,
              message,
              waitingOnPorts: readiness.waitingOnPorts,
              waitingOnDetails: readiness.waitingOnDetails,
              ...buildRuntimeTelemetryFields(runtimeTelemetry),
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
          if (options.abortSignal?.aborted) {
            throw new GraphExecutionError(
              'Execution aborted by signal.',
              state.buildRuntimeStateSnapshot(state.inputs),
              node.id
            );
          }

          const rawInputs = state.inputs[node.id] ?? {};
          const nodeInputs = deriveNodeInputs({
            node,
            rawInputs,
            triggerContext,
            checkTriggerProvenance: internalCheckTriggerProvenance
          });
          const runtimeTelemetry = telemetryResolver.resolve(node.type);

          // --- Cache Check Start ---
          const nodeHash = internalBuildNodeHash(node, nodeInputs);

          if (nodeHash) {
            state.nodeHashes.set(node.id, nodeHash);
          }

          const prevOutputs = state.outputs[node.id] ?? null;
          const cachedOutputs = nodeHash ? state.effectiveCache?.get(nodeHash) : null;
          const isSeedMatch = Boolean(
            nodeHash && seedHashes[node.id] === nodeHash && options.seedOutputs?.[node.id]
          );

          const isEntryNode = node.id === options.triggerNodeId;
          const isImplicitTriggerNode = node.type === 'trigger' && !options.triggerNodeId;
          const cacheMode = node.config?.runtime?.cache?.mode ?? 'auto';
          const isCacheDisabled = cacheMode === 'disabled';

          let validCacheHit = false;
          let cacheSource: (typeof state.outputs)[string] | null = null;

          if (!isEntryNode && !isImplicitTriggerNode && !isCacheDisabled) {
            if (isSeedMatch) {
              cacheSource = options.seedOutputs![node.id]!;
              validCacheHit = true;
            } else if (cachedOutputs) {
              cacheSource = cachedOutputs;
              validCacheHit = true;
            }

            if (validCacheHit && cacheSource) {
              const hasData = Object.keys(cacheSource).some(
                (k) => k !== 'status' && k !== 'context'
              );
              const expectsData = (node.outputs ?? []).length > 0;
              if (!hasData && expectsData) {
                validCacheHit = false;
                cacheSource = null;
              }
            }
          }

          if (validCacheHit && cacheSource) {
            const out = cacheSource;
            state.outputs[node.id] = cloneValue(out);

            applyCachedNodeRuntimeStatus(state, node.id, out);

            if (options['recordHistory']) {
              const entries = state.history.get(node.id) ?? [];
              entries.push({
                timestamp: new Date().toISOString(),
                pathId: options.pathId ?? null,
                pathName: null,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'cached',
                iteration,
                inputs: cloneValue(nodeInputs),
                outputs: cloneValue(state.outputs[node.id]),
                ...buildRuntimeTelemetryFields(runtimeTelemetry),
              } as RuntimeHistoryEntry);
              state.history.set(node.id, entries);
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
                ...buildRuntimeTelemetryFields(runtimeTelemetry),
              });
            }

            if (options.onNodeFinish) {
              await options.onNodeFinish({
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                node,
                nodeInputs,
                prevOutputs,
                nextOutputs: state.outputs[node.id]!,
                changed: false,
                iteration,
                cached: true,
                ...buildRuntimeTelemetryFields(runtimeTelemetry),
              });
            }
            return;
          }
          // --- Cache Check End ---

          if (
            node.id === options.triggerNodeId &&
            node.config?.trigger?.contextMode === 'simulation_required'
          ) {
            if (!internalCheckTriggerProvenance()) {
              throw new GraphExecutionError(
                `Trigger "${node.title || node.id}" requires simulation context but none was provided or resolved.`,
                state.buildRuntimeStateSnapshot(state.inputs),
                node.id
              );
            }
          }

          state.blockedNodes.delete(node.id);
          state.activeNodes.add(node.id);

          const handler = await resolveNodeHandlerOrThrow({
            node,
            options,
            state,
            resolvedRunId,
            resolvedRunStartedAt,
            iteration,
            nodeInputs,
            prevOutputs,
            runtimeTelemetry,
          });

          const stats = state.getOrCreateNodeStats(node);
          stats.count += 1;
          const nodeStartedAt = nowMs();

          if (options.onNodeStart) {
            await options.onNodeStart({
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              node,
              nodeInputs,
              prevOutputs,
              iteration,
              ...buildRuntimeTelemetryFields(runtimeTelemetry),
            });
          }

          try {
            const preExecuteValidation = await runRuntimeValidation({
              stage: 'node_pre_execute',
              iteration,
              node,
              nodeInputs,
              nodeOutputs: prevOutputs ?? undefined,
              runtimeTelemetry,
              options,
              resolvedRunId,
              resolvedRunStartedAt,
              nodes,
              sanitizedEdges,
            });
            if (preExecuteValidation?.decision === 'block') {
              const nodeDurationMs = nowMs() - nodeStartedAt;
              state.nodeDurationsMap.set(node.id, nodeDurationMs);
              state.activeNodes.delete(node.id);
              await applyValidationBlockedNodeState({
                node,
                nodeInputs,
                iteration,
                nodeDurationMs,
                runtimeTelemetry,
                stage: 'node_pre_execute',
                message: preExecuteValidation.message,
                issues: preExecuteValidation.issues,
                state,
                options,
                resolvedRunId,
                resolvedRunStartedAt,
              });
              return;
            }

            const sideEffectPolicy = node.config?.runtime?.sideEffectPolicy ?? 'per_run';
            const activationHash = buildNodeInputHash(node, nodeInputs, {
              iteration,
            });

            let sideEffectDecision: 'executed' | 'skipped_policy' = 'executed';
            if (
              sideEffectPolicy === 'per_run' &&
              executed[node.type as keyof typeof executed]?.has(node.id)
            ) {
              sideEffectDecision = 'skipped_policy';
            }

            const ctx: NodeHandlerContext = {
              node,
              nodeId: node.id,
              nodeTitle: node.title,
              nodeInputs,
              prevOutputs: prevOutputs ?? {},
              edges: sanitizedEdges,
              nodes: nodes,
              nodeById: nodeById,
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              activePathId: options.pathId ?? null,
              triggerContext,
              triggerNodeId: options.triggerNodeId ?? undefined,
              triggerEvent: options.triggerEvent ?? undefined,
              deferPoll: Boolean(options.deferPoll),
              skipAiJobs: Boolean(options.skipAiJobs),
              variables: state.variables,
              iteration,
              executed,
              isDryRun: Boolean(options['isDryRun']),
              sideEffectDecision,
              activationHash,
              timeoutMs: resolveNodeTimeoutMs(node),
              abortSignal: options.abortSignal,
              now: new Date().toISOString(),
              allOutputs: state.outputs,
              allInputs: state.inputs,
              fetchEntityCached: async (type, id) => {
                if (typeof options.fetchEntityCached === 'function') {
                  return options.fetchEntityCached(type, id);
                }
                if (typeof options.fetchEntityByType === 'function') {
                  return options.fetchEntityByType(type, id);
                }
                return null;
              },
              reportAiPathsError: (error, meta, summary) => {
                options.reportAiPathsError(error, meta, summary);
              },
              toast: (message: string, toastOptions?: ToastOptions): void => {
                options.toast?.(message, toastOptions);
                if (options.onToast) {
                  void options.onToast({
                    runId: resolvedRunId,
                    nodeId: node.id,
                    message,
                    options: toastOptions,
                  });
                }
              },
              simulationEntityType:
                typeof triggerContext?.['entityType'] === 'string'
                  ? triggerContext['entityType']
                  : null,
              simulationEntityId:
                (typeof triggerContext?.['entityId'] === 'string'
                  ? triggerContext['entityId']
                  : null) ??
                (typeof triggerContext?.['productId'] === 'string'
                  ? triggerContext['productId']
                  : null),
              resolvedEntity: null,
              fallbackEntityId: null,
              strictFlowMode: Boolean(options.strictFlowMode),
              setVariable: (key, value) => {
                state.variables[key] = value;
              },
            };

            const retryPolicy = readRuntimeRetryPolicy(node);

            const nodeResult = await withRetries(
              () =>
                withTimeout(
                  Promise.resolve(handler(ctx)),
                  ctx.timeoutMs,
                  `Node ${node.title || node.id}`
                ),
              retryPolicy.enabled ? retryPolicy.attempts : 1,
              retryPolicy.backoffMs,
              `Node ${node.title || node.id}`,
              options.abortSignal
            );

            const nextOutputs = cloneValue(nodeResult);
            const postExecuteValidation = await runRuntimeValidation({
              stage: 'node_post_execute',
              iteration,
              node,
              nodeInputs,
              nodeOutputs: nextOutputs,
              runtimeTelemetry,
              options,
              resolvedRunId,
              resolvedRunStartedAt,
              nodes,
              sanitizedEdges,
            });
            if (postExecuteValidation?.decision === 'block') {
              const nodeDurationMs = nowMs() - nodeStartedAt;
              state.nodeDurationsMap.set(node.id, nodeDurationMs);
              state.activeNodes.delete(node.id);
              await applyValidationBlockedNodeState({
                node,
                nodeInputs,
                iteration,
                nodeDurationMs,
                runtimeTelemetry,
                stage: 'node_post_execute',
                message: postExecuteValidation.message,
                issues: postExecuteValidation.issues,
                state,
                options,
                resolvedRunId,
                resolvedRunStartedAt,
              });
              return;
            }

            const nodeDurationMs = nowMs() - nodeStartedAt;
            state.nodeDurationsMap.set(node.id, nodeDurationMs);
            stats.totalMs += nodeDurationMs;
            stats.maxMs = Math.max(stats.maxMs, nodeDurationMs);

            state.outputs[node.id] = nextOutputs;

            if (nodeHash && state.effectiveCache && !isCacheDisabled) {
              state.effectiveCache.set(nodeHash, cloneValue(nextOutputs));
            }

            if (executed[node.type as keyof typeof executed]) {
              executed[node.type as keyof typeof executed].add(node.id);
            }

            state.finishedNodes.add(node.id);
            state.activeNodes.delete(node.id);
            changedInLastIteration = true;

            if (options['recordHistory']) {
              const entries = state.history.get(node.id) ?? [];
              entries.push({
                timestamp: new Date().toISOString(),
                pathId: options.pathId ?? null,
                pathName: null,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'executed',
                iteration,
                inputs: cloneValue(nodeInputs),
                outputs: cloneValue(nextOutputs),
                inputHash: activationHash,
                inputsFrom: [],
                outputsTo: [],
                durationMs: nodeDurationMs,
                ...buildRuntimeTelemetryFields(runtimeTelemetry),
              } as RuntimeHistoryEntry);
              state.history.set(node.id, entries);
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
                durationMs: nodeDurationMs,
                ...buildRuntimeTelemetryFields(runtimeTelemetry),
              });
            }

            if (options.onNodeFinish) {
              await options.onNodeFinish({
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                node,
                nodeInputs,
                prevOutputs,
                nextOutputs: state.outputs[node.id]!,
                changed: true,
                iteration,
                cached: false,
                ...buildRuntimeTelemetryFields(runtimeTelemetry),
              });
            }

            // Propagate outputs to connected inputs
            const outgoing = outgoingEdgesByNode.get(node.id) ?? [];
            outgoing.forEach((edge) => {
              const toNodeId = resolveEdgeToNodeId(edge);
              if (toNodeId) {
                state.inputs[toNodeId] = collectNodeInputs(
                  toNodeId,
                  state.outputs,
                  incomingEdgesByNode
                );
                if (state.finishedNodes.has(toNodeId)) {
                  const targetNode = nodeById.get(toNodeId);
                  if (targetNode) {
                    const targetInputs = deriveNodeInputs({
                      node: targetNode,
                      rawInputs: state.inputs[toNodeId] ?? {},
                      triggerContext,
                      checkTriggerProvenance: internalCheckTriggerProvenance
                    });
                    const previousHash = state.nodeHashes.get(toNodeId) ?? null;
                    const nextHash = internalBuildNodeHash(targetNode, targetInputs);
                    if (previousHash && nextHash && previousHash !== nextHash) {
                      state.finishedNodes.delete(toNodeId);
                      state.blockedNodes.delete(toNodeId);
                    }
                  }
                }
              }
            });
          } catch (error) {
            const nodeDurationMs = nowMs() - nodeStartedAt;
            state.nodeDurationsMap.set(node.id, nodeDurationMs);
            state.activeNodes.delete(node.id);

            const recoverableWaitState = resolveRecoverableNodeWaitState(node, error);
            if (recoverableWaitState) {
              state.blockedNodes.add(node.id);
              state.errorNodes.delete(node.id);
              state.timeoutNodes.delete(node.id);
              state.finishedNodes.delete(node.id);
              state.outputs[node.id] = {
                status: 'waiting_callback',
                skipReason: 'missing_inputs',
                blockedReason: 'missing_inputs',
                message: recoverableWaitState.message,
                waitingOnPorts: recoverableWaitState.waitingOnPorts,
                requiredPorts: recoverableWaitState.waitingOnPorts,
              };

              if (options['recordHistory']) {
                const entries = state.history.get(node.id) ?? [];
                entries.push({
                  timestamp: new Date().toISOString(),
                  pathId: options.pathId ?? null,
                  pathName: null,
                  nodeId: node.id,
                  nodeType: node.type,
                  nodeTitle: node.title ?? null,
                  status: 'waiting_callback',
                  iteration,
                  inputs: cloneValue(nodeInputs),
                  outputs: cloneValue(state.outputs[node.id]),
                  skipReason: 'missing_inputs',
                  requiredPorts: recoverableWaitState.waitingOnPorts,
                  waitingOnPorts: recoverableWaitState.waitingOnPorts,
                  ...buildRuntimeTelemetryFields(runtimeTelemetry),
                } as RuntimeHistoryEntry);
                state.history.set(node.id, entries);
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
                  durationMs: nodeDurationMs,
                  reason: 'missing_inputs',
                  requiredPorts: recoverableWaitState.waitingOnPorts,
                  waitingOnPorts: recoverableWaitState.waitingOnPorts,
                  ...buildRuntimeTelemetryFields(runtimeTelemetry),
                });
              }

              if (options.onNodeBlocked) {
                await options.onNodeBlocked({
                  runId: resolvedRunId,
                  node,
                  reason: 'missing_inputs',
                  status: 'waiting_callback',
                  message: recoverableWaitState.message,
                  waitingOnPorts: recoverableWaitState.waitingOnPorts,
                  waitingOnDetails: [],
                  ...buildRuntimeTelemetryFields(runtimeTelemetry),
                });
              }

              return;
            }

            state.errorNodes.add(node.id);
            state.finishedNodes.delete(node.id);
            state.blockedNodes.delete(node.id);
            if (error instanceof Error && error.message.includes('timed out')) {
              state.timeoutNodes.add(node.id);
            }

            const errorMessage = error instanceof Error ? error.message : String(error);
            state.outputs[node.id] = {
              status: 'failed',
              error: errorMessage,
            };
            const errorSnapshot = state.buildRuntimeStateSnapshot(state.inputs);
            const graphError = new GraphExecutionError(
              errorMessage,
              errorSnapshot,
              node.id,
              error instanceof Error ? error : undefined
            );

            if (options['recordHistory']) {
              const entries = state.history.get(node.id) ?? [];
              entries.push({
                timestamp: new Date().toISOString(),
                pathId: options.pathId ?? null,
                pathName: null,
                nodeId: node.id,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                status: 'failed',
                iteration,
                inputs: cloneValue(nodeInputs),
                outputs: {
                  status: 'failed',
                  error: graphError.message,
                },
                inputHash: null,
                inputsFrom: [],
                outputsTo: [],
                durationMs: nodeDurationMs,
                ...buildRuntimeTelemetryFields(runtimeTelemetry),
              } as RuntimeHistoryEntry);
              state.history.set(node.id, entries);
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
                durationMs: nodeDurationMs,
                reason: graphError.message,
                ...buildRuntimeTelemetryFields(runtimeTelemetry),
              });
            }

            if (options.onNodeError) {
              await options.onNodeError({
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                node,
                nodeInputs,
                prevOutputs,
                error: graphError,
                iteration,
                ...buildRuntimeTelemetryFields(runtimeTelemetry),
              });
            }

            throw graphError;
          }
        })
      );
    }
  }

  if (iteration >= maxIterationsLimit && state.finishedNodes.size < scopedNodeIds.size) {
    await emitHalt('max_iterations');
    throw new GraphExecutionError(
      `Graph execution exceeded maximum iterations (${maxIterationsLimit}).`,
      state.buildRuntimeStateSnapshot(state.inputs)
    );
  }

  const hasTerminalBlockedNodes = Array.from(state.blockedNodes).some((nodeId) => {
    const rawStatus = state.outputs[nodeId]?.['status'];
    const status = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : 'blocked';
    return status !== 'waiting_callback' && status !== 'advance_pending';
  });

  if (hasTerminalBlockedNodes && state.finishedNodes.size < scopedNodeIds.size) {
    await emitHalt('blocked');
  }

  return state.buildRuntimeStateSnapshot(state.inputs);
}
