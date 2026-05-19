import { type AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { prepareGraphForExecution } from './engine-execution-preparation';
import { validateTriggerProvenanceFeasibility } from './engine-execution-provenance';
import { EngineStateManager } from './engine-state-manager';
import { GraphExecutionError, type EvaluateGraphOptions } from './engine-types';
import { collectNodeInputs } from './engine-utils';
import { runRuntimeValidation } from './engine-validation-helpers';
import { nowMs } from '../execution-helpers';
import { cloneValue } from '../utils';

type PreparedGraph = ReturnType<typeof prepareGraphForExecution>;
type HaltReason = 'blocked' | 'max_iterations' | 'completed' | 'failed';

type ExecutionAbortSignal = {
  signal: AbortSignal | undefined;
  cleanup: () => void;
};

export type ExecutionContext = {
  resolvedRunId: string;
  resolvedRunStartedAt: string;
  executionOptions: EvaluateGraphOptions;
  cleanupExecutionAbortSignal: () => void;
};

type ProvenanceContext = {
  scopedNodeIds: Set<string>;
  nodeById: Map<string, AiNode>;
  state: EngineStateManager;
  triggerContext: Record<string, unknown> | null;
  triggerSource: AiNode | null;
};

const resolveMaxDurationMs = (options: EvaluateGraphOptions): number | null =>
  typeof options.maxDurationMs === 'number' &&
  Number.isFinite(options.maxDurationMs) &&
  options.maxDurationMs > 0
    ? Math.max(1, Math.trunc(options.maxDurationMs))
    : null;

const buildExecutionAbortSignal = (options: EvaluateGraphOptions): ExecutionAbortSignal => {
  const parentSignal = options.abortSignal;
  const maxDurationMs = resolveMaxDurationMs(options);

  if (parentSignal === undefined && maxDurationMs === null) {
    return { signal: undefined, cleanup: () => undefined };
  }

  const controller = new AbortController();
  const timeoutId =
    maxDurationMs === null
      ? null
      : setTimeout(() => {
          controller.abort(new Error(`Graph execution timed out after ${maxDurationMs}ms.`));
        }, maxDurationMs);

  const handleParentAbort = (): void => {
    controller.abort(parentSignal?.reason);
  };

  if (parentSignal?.aborted === true) {
    handleParentAbort();
  } else {
    parentSignal?.addEventListener('abort', handleParentAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      parentSignal?.removeEventListener('abort', handleParentAbort);
    },
  };
};

export const createExecutionContext = (options: EvaluateGraphOptions): ExecutionContext => {
  const resolvedRunId = options.runId ?? `run_${nowMs()}`;
  const resolvedRunStartedAt = new Date(nowMs()).toISOString();
  const { signal, cleanup } = buildExecutionAbortSignal(options);
  return {
    resolvedRunId,
    resolvedRunStartedAt,
    executionOptions: { ...options, abortSignal: signal },
    cleanupExecutionAbortSignal: cleanup,
  };
};

const pruneUnscopedOutputs = (state: EngineStateManager, scopedNodeIds: Set<string>): void => {
  const { outputs } = state;
  Object.keys(state.outputs).forEach((nodeId) => {
    if (!scopedNodeIds.has(nodeId)) delete outputs[nodeId];
  });
};

const applySkippedNodeSeedOutputs = (
  state: EngineStateManager,
  nodeById: Map<string, AiNode>,
  executionOptions: EvaluateGraphOptions
): void => {
  const { finishedNodes, outputs } = state;
  state.skippedNodes.forEach((id) => {
    if (!nodeById.has(id)) return;
    if (executionOptions.seedOutputs?.[id] === undefined || state.errorNodes.has(id)) {
      finishedNodes.add(id);
      return;
    }
    outputs[id] = cloneValue(executionOptions.seedOutputs[id]);
  });
};

const initializeNodeInputs = (
  nodes: AiNode[],
  state: EngineStateManager,
  preparedGraph: PreparedGraph
): void => {
  const { inputs } = state;
  nodes.forEach((node) => {
    inputs[node.id] = cloneValue(
      collectNodeInputs(node.id, state.outputs, preparedGraph.incomingEdgesByNode)
    );
  });
};

export const prepareEngineState = (input: {
  nodes: AiNode[];
  executionOptions: EvaluateGraphOptions;
  preparedGraph: PreparedGraph;
}): EngineStateManager => {
  const state = new EngineStateManager(
    input.nodes,
    input.preparedGraph.scopedNodeIds.size,
    input.executionOptions,
    input.preparedGraph.incomingEdgesByNode
  );
  pruneUnscopedOutputs(state, input.preparedGraph.scopedNodeIds);
  applySkippedNodeSeedOutputs(state, input.preparedGraph.nodeById, input.executionOptions);
  initializeNodeInputs(input.nodes, state, input.preparedGraph);
  return state;
};

export const createExecutedState = (): NodeHandlerContext['executed'] => ({
  notification: new Set<string>(),
  updater: new Set<string>(),
  http: new Set<string>(),
  delay: new Set<string>(),
  poll: new Set<string>(),
  ai: new Set<string>(),
  schema: new Set<string>(),
  mapper: new Set<string>(),
});

export const resolveTriggerSource = (
  options: EvaluateGraphOptions,
  nodeById: Map<string, AiNode>
): AiNode | null => {
  const triggerNodeId = options.triggerNodeId;
  return typeof triggerNodeId === 'string' ? (nodeById.get(triggerNodeId) ?? null) : null;
};

export const createHaltEmitter =
  (input: {
    state: EngineStateManager;
    executionOptions: EvaluateGraphOptions;
    resolvedRunId: string;
  }) =>
  async (reason: HaltReason): Promise<void> => {
    const onHalt = input.executionOptions.onHalt;
    if (onHalt === undefined) return;
    try {
      const snapshot = input.state.buildRuntimeStateSnapshot(input.state.inputs);
      await onHalt({
        runId: input.resolvedRunId,
        reason,
        nodeStatuses: snapshot.nodeStatuses,
      });
    } catch (error) {
      logClientError(error);
      input.executionOptions.reportAiPathsError(error, {
        action: 'onHalt',
        reason,
        runId: input.resolvedRunId,
      });
    }
  };

export const assertSupportedGraph = (
  unsupportedCycleMessage: string | null,
  state: EngineStateManager
): void => {
  if (unsupportedCycleMessage === null) return;
  throw new GraphExecutionError(
    unsupportedCycleMessage,
    state.buildRuntimeStateSnapshot(state.inputs)
  );
};

export const validateTriggerProvenanceOrThrow = (context: ProvenanceContext): void => {
  try {
    validateTriggerProvenanceFeasibility(context);
  } catch (error) {
    logClientError(error);
    throw new GraphExecutionError(
      error instanceof Error ? error.message : String(error),
      context.state.buildRuntimeStateSnapshot(context.state.inputs),
      context.triggerSource?.id
    );
  }
};

const runGraphValidationStageOrThrow = async (input: {
  stage: 'graph_parse' | 'graph_bind';
  nodes: AiNode[];
  preparedGraph: PreparedGraph;
  executionContext: ExecutionContext;
  state: EngineStateManager;
}): Promise<void> => {
  const validation = await runRuntimeValidation({
    stage: input.stage,
    iteration: 0,
    node: null,
    options: input.executionContext.executionOptions,
    resolvedRunId: input.executionContext.resolvedRunId,
    resolvedRunStartedAt: input.executionContext.resolvedRunStartedAt,
    nodes: input.nodes,
    sanitizedEdges: input.preparedGraph.sanitizedEdges,
  });

  if (validation?.decision !== 'block') return;
  throw new GraphExecutionError(
    validation.message,
    input.state.buildRuntimeStateSnapshot(input.state.inputs)
  );
};

export const runGraphValidations = async (input: {
  nodes: AiNode[];
  preparedGraph: PreparedGraph;
  executionContext: ExecutionContext;
  state: EngineStateManager;
}): Promise<void> => {
  await runGraphValidationStageOrThrow({ ...input, stage: 'graph_parse' });
  await runGraphValidationStageOrThrow({ ...input, stage: 'graph_bind' });
};

export const hasTerminalBlockedNodes = (state: EngineStateManager): boolean =>
  Array.from(state.blockedNodes).some((nodeId) => {
    const rawStatus = state.outputs[nodeId]?.['status'];
    const status = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : 'blocked';
    return status !== 'waiting_callback' && status !== 'advance_pending';
  });
