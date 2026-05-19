import { type AiNode, type Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { resolveAbortSignalMessage } from '../execution-helpers';
import { runNode } from './engine-execution-node';
import { collectReadyNodes } from './engine-execution-readiness';
import { type EngineStateManager } from './engine-state-manager';
import {
  GraphExecutionCancelled,
  GraphExecutionError,
  type EvaluateGraphOptions,
  type RuntimeNodeResolutionTelemetry,
} from './engine-types';

export type RunExecutionLoopArgs = {
  state: EngineStateManager;
  options: EvaluateGraphOptions;
  resolvedRunId: string;
  resolvedRunStartedAt: string;
  maxIterationsLimit: number;
  orderedNodes: AiNode[];
  scopedNodeIds: Set<string>;
  nodeById: Map<string, AiNode>;
  incomingEdgesByNode: Map<string, Edge[]>;
  outgoingEdgesByNode: Map<string, Edge[]>;
  triggerContext: Record<string, unknown> | null;
  internalCheckTriggerProvenance: () => boolean;
  telemetryResolver: { resolve: (type: string) => RuntimeNodeResolutionTelemetry | null };
  seedHashes: Record<string, string>;
  nodes: AiNode[];
  sanitizedEdges: Edge[];
  emitHalt: (reason: 'blocked' | 'max_iterations' | 'completed' | 'failed') => Promise<void>;
  executed: NodeHandlerContext['executed'];
};

type LoopState = {
  iteration: number;
  changedInLastIteration: boolean;
};

const assertExecutionNotAborted = (args: RunExecutionLoopArgs): void => {
  if (args.options.abortSignal?.aborted === true) {
    throw new GraphExecutionCancelled(
      resolveAbortSignalMessage(args.options.abortSignal, 'Run cancelled.'),
      args.state.buildRuntimeStateSnapshot(args.state.inputs)
    );
  }
};

const emitIterationLimitWarning = async (
  args: RunExecutionLoopArgs,
  iteration: number
): Promise<void> => {
  const warningThreshold = Math.floor(args.maxIterationsLimit * 0.8);
  const onIterationLimitWarning = args.options.onIterationLimitWarning;
  if (iteration !== warningThreshold || onIterationLimitWarning === undefined) return;

  await onIterationLimitWarning({
    runId: args.resolvedRunId,
    iteration,
    maxIterations: args.maxIterationsLimit,
    remaining: args.maxIterationsLimit - iteration,
  });
};

const emitIteration = async (args: RunExecutionLoopArgs, iteration: number): Promise<void> => {
  const onIteration = args.options.onIteration;
  if (onIteration === undefined) return;

  await onIteration({
    runId: args.resolvedRunId,
    iteration,
    activeNodes: Array.from(args.state.activeNodes),
  });
};

const executeReadyNodes = async (
  args: RunExecutionLoopArgs,
  iteration: number,
  readyNodes: AiNode[]
): Promise<boolean> => {
  if (readyNodes.length === 0) return false;

  const changes = await Promise.all(
    readyNodes.map((node) =>
      runNode({
        node,
        iteration,
        state: args.state,
        options: args.options,
        resolvedRunId: args.resolvedRunId,
        resolvedRunStartedAt: args.resolvedRunStartedAt,
        triggerContext: args.triggerContext,
        internalCheckTriggerProvenance: args.internalCheckTriggerProvenance,
        telemetryResolver: args.telemetryResolver,
        seedHashes: args.seedHashes,
        nodes: args.nodes,
        sanitizedEdges: args.sanitizedEdges,
        outgoingEdgesByNode: args.outgoingEdgesByNode,
        nodeById: args.nodeById,
        executed: args.executed,
      })
    )
  );

  return changes.some((changed) => changed === true);
};

const runExecutionIteration = async (
  args: RunExecutionLoopArgs,
  currentIteration: number
): Promise<LoopState> => {
  assertExecutionNotAborted(args);

  const iteration = currentIteration + 1;
  await emitIterationLimitWarning(args, iteration);
  await emitIteration(args, iteration);

  const readyNodes = collectReadyNodes({
    ...args,
    iteration,
  });
  const changedInLastIteration = await executeReadyNodes(args, iteration, readyNodes);
  return { iteration, changedInLastIteration };
};

const runLoopRecursively = async (
  args: RunExecutionLoopArgs,
  loopState: LoopState
): Promise<number> => {
  if (loopState.changedInLastIteration !== true || loopState.iteration >= args.maxIterationsLimit) {
    return loopState.iteration;
  }

  const nextState = await runExecutionIteration(args, loopState.iteration);
  return runLoopRecursively(args, nextState);
};

export const runExecutionLoop = async (args: RunExecutionLoopArgs): Promise<void> => {
  let finalIteration = 0;

  try {
    finalIteration = await runLoopRecursively(args, {
      iteration: 0,
      changedInLastIteration: true,
    });
  } catch (error) {
    if (error instanceof GraphExecutionCancelled) {
      await args.emitHalt('failed');
    }
    throw error;
  }

  if (finalIteration >= args.maxIterationsLimit) {
    await args.emitHalt('max_iterations');
    throw new GraphExecutionError(
      `Graph execution exceeded maximum iterations (${args.maxIterationsLimit}).`,
      args.state.buildRuntimeStateSnapshot(args.state.inputs)
    );
  }
};
