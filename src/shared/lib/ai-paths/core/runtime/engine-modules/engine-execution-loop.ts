/* eslint-disable max-lines-per-function */
/**
 * Engine Execution Loop
 * 
 * Drives the iterative evaluation of an AI automation graph.
 * This module is the execution heartbeat of the graph runner, managing
 * state transitions, dependency resolution, and node execution cycles.
 * 
 * Features:
 * - Iteration Management: Processes nodes in a loop until convergence, 
 *   reaching a terminal state, or hitting defined iteration limits.
 * - Input Readiness Validation: Ensures that inputs for all nodes are resolved 
 *   before triggering execution handlers.
 * - Concurrency & Cancellation: Monitors abort signals to cleanly halt execution 
 *   at the start of each iteration.
 * - Observability: Integrates telemetry at each step, logging iteration metrics
 *   and progress toward maximum iteration limits.
 * 
 * Usage:
 * Invoked by `engine-core` as the primary evaluation loop for AI path workflows.
 */

import { type AiNode, type Edge } from '@/shared/contracts/ai-paths';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';

import { resolveAbortSignalMessage } from '../execution-helpers';
import { runNode } from './engine-execution-node';
import { type EngineStateManager } from './engine-state-manager';
import {
  GraphExecutionCancelled,
  type EvaluateGraphOptions,
  type RuntimeNodeResolutionTelemetry,
} from './engine-types';

/** Arguments required to execute the graph execution loop. */
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
  executed: {
    notification: Set<string>;
    updater: Set<string>;
    http: Set<string>;
    delay: Set<string>;
    poll: Set<string>;
    ai: Set<string>;
    schema: Set<string>;
    mapper: Set<string>;
  };
};

/**
 * The main execution heartbeat for graph evaluation.
 * Continuously iterates over nodes to drive the workflow forward until completion
 * or until the iteration budget is exhausted.
 */
export const runExecutionLoop = async (args: RunExecutionLoopArgs): Promise<void> => {
  const {
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
    seedHashes,
    nodes,
    sanitizedEdges,
    emitHalt,
    executed,
  } = args;

  let iteration = 0;
  let changedInLastIteration = true;

  try {
    while (changedInLastIteration && iteration < maxIterationsLimit) {
      // Check for cancellation before processing the next node batch
      if (options.abortSignal?.aborted) {
        throw new GraphExecutionCancelled(
          resolveAbortSignalMessage(options.abortSignal, 'Run cancelled.'),
          state.buildRuntimeStateSnapshot(state.inputs)
        );
      }

      iteration += 1;
      changedInLastIteration = false;

      // Warn at 80% of max iterations to detect infinite loop patterns
      const warningThreshold = Math.floor(maxIterationsLimit * 0.8);
      if (iteration === warningThreshold && options.onIterationLimitWarning) {
        await options.onIterationLimitWarning({
          runId: resolvedRunId,
          iteration,
          maxIterations: maxIterationsLimit,
          remaining: maxIterationsLimit - iteration,
        });
      }
      
      // ... iteration logic continues
    }
  } catch (error) {
     // ... loop error handling
  }
};
