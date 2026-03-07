import { AiNode } from '@/shared/contracts/ai-paths';
import { NodeHandler, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import {
  type EvaluateGraphOptions,
  type RuntimeNodeResolutionTelemetry,
  GraphExecutionError,
} from './engine-types';
import { EngineStateManager } from './engine-state-manager';
import { buildRuntimeTelemetryFields } from './engine-execution-telemetry';

export type NodeHandlerContext = {
  node: AiNode;
  options: EvaluateGraphOptions;
  state: EngineStateManager;
  resolvedRunId: string;
  resolvedRunStartedAt: string;
  iteration: number;
  attempt: number;
  spanId: string;
  nodeInputs: RuntimePortValues;
  prevOutputs: RuntimePortValues | null;
  runtimeTelemetry: RuntimeNodeResolutionTelemetry | null;
};

export const resolveNodeHandlerOrThrow = async (ctx: NodeHandlerContext): Promise<NodeHandler> => {
  const {
    node,
    options,
    state,
    resolvedRunId,
    resolvedRunStartedAt,
    iteration,
    attempt,
    spanId,
    nodeInputs,
    prevOutputs,
    runtimeTelemetry,
  } = ctx;
  const handler = options.resolveHandler ? options.resolveHandler(node.type) : null;
  if (!handler) {
    state.errorNodes.add(node.id);
    state.finishedNodes.delete(node.id);
    state.blockedNodes.delete(node.id);
    state.timeoutNodes.delete(node.id);
    const handlerMissingMessage = `No handler found for node type: ${node.type}`;
    state.outputs[node.id] = {
      status: 'failed',
      error: handlerMissingMessage,
    };
    const handlerMissingError = new GraphExecutionError(
      handlerMissingMessage,
      state.buildRuntimeStateSnapshot(state.inputs),
      node.id
    );
    if (options.onNodeError) {
      await options.onNodeError({
        runId: resolvedRunId,
        traceId: resolvedRunId,
        spanId,
        runStartedAt: resolvedRunStartedAt,
        node,
        nodeInputs,
        prevOutputs,
        error: handlerMissingError,
        iteration,
        attempt,
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }
    throw handlerMissingError;
  }
  return handler;
};
