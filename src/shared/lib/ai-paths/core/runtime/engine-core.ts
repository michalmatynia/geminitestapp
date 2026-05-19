/**
 * @module EngineCore
 * @description Core entry point for evaluating AI Paths runtime graphs.
 */
import { type AiNode, type Edge } from '@/shared/contracts/ai-paths';
import { type RuntimeState } from '@/shared/contracts/ai-paths-runtime';

import { MAX_ITERATIONS } from './engine-modules/engine-constants';
import { runExecutionLoop } from './engine-modules/engine-execution-loop';
import { prepareGraphForExecution } from './engine-modules/engine-execution-preparation';
import { checkTriggerProvenance } from './engine-modules/engine-execution-provenance';
import { RuntimeTelemetryResolver } from './engine-modules/engine-execution-telemetry';
import {
  GraphExecutionCancelled,
  GraphExecutionError,
  type EvaluateGraphOptions,
} from './engine-modules/engine-types';
import {
  assertSupportedGraph,
  createExecutedState,
  createExecutionContext,
  createHaltEmitter,
  hasTerminalBlockedNodes,
  prepareEngineState,
  resolveTriggerSource,
  runGraphValidations,
  validateTriggerProvenanceOrThrow,
  type ExecutionContext,
} from './engine-modules/engine-core-setup';

export { GraphExecutionError, GraphExecutionCancelled };

type PreparedGraph = ReturnType<typeof prepareGraphForExecution>;
type EngineLoopInput = {
  nodes: AiNode[];
  options: EvaluateGraphOptions;
  executionContext: ExecutionContext;
  preparedGraph: PreparedGraph;
  state: ReturnType<typeof prepareEngineState>;
  triggerContext: Record<string, unknown> | null;
  provenanceContext: Parameters<typeof checkTriggerProvenance>[0];
  emitHalt: ReturnType<typeof createHaltEmitter>;
};

const runPreparedExecutionLoop = async (input: EngineLoopInput): Promise<void> => {
  const telemetryResolver = new RuntimeTelemetryResolver(input.options);
  await runExecutionLoop({
    state: input.state,
    options: input.executionContext.executionOptions,
    resolvedRunId: input.executionContext.resolvedRunId,
    resolvedRunStartedAt: input.executionContext.resolvedRunStartedAt,
    maxIterationsLimit: input.options.maxIterations ?? MAX_ITERATIONS,
    orderedNodes: input.preparedGraph.orderedNodes,
    scopedNodeIds: input.preparedGraph.scopedNodeIds,
    nodeById: input.preparedGraph.nodeById,
    incomingEdgesByNode: input.preparedGraph.incomingEdgesByNode,
    outgoingEdgesByNode: input.preparedGraph.outgoingEdgesByNode,
    triggerContext: input.triggerContext,
    internalCheckTriggerProvenance: () => checkTriggerProvenance(input.provenanceContext),
    telemetryResolver,
    seedHashes: input.executionContext.executionOptions.seedHashes ?? {},
    nodes: input.nodes,
    sanitizedEdges: input.preparedGraph.sanitizedEdges,
    emitHalt: input.emitHalt,
    executed: createExecutedState(),
  });
};

export async function evaluateGraphInternal(
  nodes: AiNode[],
  edges: Edge[],
  options: EvaluateGraphOptions
): Promise<RuntimeState> {
  const executionContext = createExecutionContext(options);
  const preparedGraph = prepareGraphForExecution({
    nodes,
    edges,
    triggerNodeId: options.triggerNodeId,
    seedHashes: options.seedHashes,
  });
  const state = prepareEngineState({
    nodes,
    executionOptions: executionContext.executionOptions,
    preparedGraph,
  });

  assertSupportedGraph(preparedGraph.unsupportedCycleMessage, state);

  const triggerContext = options.triggerContext ?? null;
  const triggerSource = resolveTriggerSource(options, preparedGraph.nodeById);
  const emitHalt = createHaltEmitter({
    state,
    executionOptions: executionContext.executionOptions,
    resolvedRunId: executionContext.resolvedRunId,
  });
  const provenanceContext = {
    scopedNodeIds: preparedGraph.scopedNodeIds,
    nodeById: preparedGraph.nodeById,
    state,
    triggerContext,
    triggerSource,
  };

  validateTriggerProvenanceOrThrow(provenanceContext);
  await runGraphValidations({ nodes, preparedGraph, executionContext, state });

  try {
    await runPreparedExecutionLoop({
      nodes,
      options,
      executionContext,
      preparedGraph,
      state,
      triggerContext,
      provenanceContext,
      emitHalt,
    });
  } finally {
    executionContext.cleanupExecutionAbortSignal();
  }

  if (
    hasTerminalBlockedNodes(state) === true &&
    state.finishedNodes.size < preparedGraph.scopedNodeIds.size
  ) {
    await emitHalt('blocked');
  }

  return state.buildRuntimeStateSnapshot(state.inputs);
}
