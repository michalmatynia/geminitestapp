import { AiNode, Edge, RuntimePortValues } from '@/shared/contracts/ai-paths';
import {
  type EvaluateGraphOptions,
  type RuntimeNodeResolutionTelemetry,
} from './engine-types';
import { EngineStateManager } from './engine-state-manager';
import { deriveNodeInputs } from './engine-node-input-deriver';
import {
  resolveBlockedNodeStatus,
  resolveDeclaredNodeStatus,
} from './engine-runtime-status';
import {
  evaluateInputReadiness,
  resolveMissingInputStatus,
} from './engine-utils';
import {
  buildRuntimeTelemetryFields,
} from './engine-execution-telemetry';
import { runNode } from './engine-execution-node';
import { buildSpanId } from './engine-execution-context';

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

        const statusChanged = previousStatus !== blockedStatus;
        const messageChanged = previousMessage !== message;

        if (statusChanged || messageChanged || waitingPortsChanged || waitingDetailsChanged) {
          const attempt = state.getNodeAttempt(node.id);
          const spanId = buildSpanId(node.id, attempt, iteration);
          state.outputs[node.id] = {
            ...state.outputs[node.id],
            status: blockedStatus,
            message,
            waitingOnPorts: readiness.waitingOnPorts,
            waitingOnDetails: readiness.waitingOnDetails,
          };
          state.blockedNodes.add(node.id);

          if (options.onToast && statusChanged && (blockedStatus === 'blocked' || (blockedStatus as string) === 'failed')) {
            void options.onToast({
              runId: resolvedRunId,
              nodeId: node.id,
              message: `Node ${node.title || node.id} blocked: ${message}`,
              options: { variant: 'error' },
            });
          }

          if (options['onNodeStatus'] && typeof options['onNodeStatus'] === 'function') {
            void (options['onNodeStatus'] as Function)({
              runId: resolvedRunId,
              traceId: resolvedRunId,
              spanId,
              node,
              iteration,
              attempt,
              status: blockedStatus,
              message,
              waitingOnPorts: readiness.waitingOnPorts,
              ...buildRuntimeTelemetryFields(runtimeTelemetry),
            });
          }

          if (options.onNodeBlocked) {
            void options.onNodeBlocked({
              runId: resolvedRunId,
              traceId: resolvedRunId,
              spanId,
              node,
              iteration,
              attempt,
              reason: 'missing_inputs',
              status: blockedStatus as 'blocked' | 'waiting_callback',
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
          const changed = await runNode({
            node,
            iteration,
            state,
            options,
            resolvedRunId,
            resolvedRunStartedAt,
            triggerContext,
            internalCheckTriggerProvenance,
            telemetryResolver,
            seedHashes,
            nodes,
            sanitizedEdges,
            outgoingEdgesByNode,
            nodeById,
            executed,
          });
          if (changed) changedInLastIteration = true;
        })
      );
    }
  }

  if (iteration >= maxIterationsLimit) {
    await emitHalt('max_iterations');
  }
};
