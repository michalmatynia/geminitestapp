import { AiNode, Edge } from '@/shared/contracts/ai-paths';
import { RuntimeState } from '@/shared/contracts/ai-paths-runtime';

import { nowMs } from './execution-helpers';

// Modular imports
import {
  GraphExecutionError,
  GraphExecutionCancelled,
  type EvaluateGraphOptions,
} from './engine-modules/engine-types';
import { collectNodeInputs } from './engine-modules/engine-utils';
import { EngineStateManager } from './engine-modules/engine-state-manager';
import { MAX_ITERATIONS } from './engine-modules/engine-constants';
import { runRuntimeValidation } from './engine-modules/engine-validation-helpers';
import { prepareGraphForExecution } from './engine-modules/engine-execution-preparation';
import {
  checkTriggerProvenance,
  validateTriggerProvenanceFeasibility,
} from './engine-modules/engine-execution-provenance';
import { runExecutionLoop } from './engine-modules/engine-execution-loop';
import { RuntimeTelemetryResolver } from './engine-modules/engine-execution-telemetry';

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

  const state = new EngineStateManager(nodes, scopedNodeIds.size, options, incomingEdgesByNode);

  Object.keys(state.outputs).forEach((nodeId) => {
    if (!scopedNodeIds.has(nodeId)) {
      delete state.outputs[nodeId];
    }
  });

  state.skippedNodes.forEach((id: string) => {
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
  const triggerSource = options.triggerNodeId
    ? (nodeById.get(options.triggerNodeId) ?? null)
    : null;
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

  const maxIterationsLimit = options.maxIterations ?? MAX_ITERATIONS;

  await runExecutionLoop({
    state,
    options,
    resolvedRunId,
    resolvedRunStartedAt,
    maxIterationsLimit,
    orderedNodes,
    scopedNodeIds,
    nodeById,
    incomingEdgesByNode,
    outgoingEdgesByNode,
    triggerContext,
    internalCheckTriggerProvenance,
    telemetryResolver,
    seedHashes: options.seedHashes ?? {},
    nodes,
    sanitizedEdges,
    emitHalt,
    executed,
  });

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
