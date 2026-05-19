import { type AiNode, type Edge } from '@/shared/contracts/ai-paths';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';

import { cloneValue } from '../utils';
import { buildSpanId } from './engine-execution-context';
import { buildRuntimeTelemetryFields } from './engine-execution-telemetry';
import { deriveNodeInputs } from './engine-node-input-deriver';
import { resolveBlockedNodeStatus, resolveDeclaredNodeStatus } from './engine-runtime-status';
import { type EngineStateManager } from './engine-state-manager';
import { type EvaluateGraphOptions, type RuntimeNodeResolutionTelemetry } from './engine-types';
import { buildInputLinks, evaluateInputReadiness, resolveMissingInputStatus } from './engine-utils';

type InputReadiness = ReturnType<typeof evaluateInputReadiness>;
type MissingInputStatus = 'blocked' | 'waiting_callback';

type CollectReadyNodesArgs = {
  state: EngineStateManager;
  options: EvaluateGraphOptions;
  resolvedRunId: string;
  resolvedRunStartedAt: string;
  iteration: number;
  orderedNodes: AiNode[];
  scopedNodeIds: Set<string>;
  nodeById: Map<string, AiNode>;
  incomingEdgesByNode: Map<string, Edge[]>;
  triggerContext: Record<string, unknown> | null;
  internalCheckTriggerProvenance: () => boolean;
  telemetryResolver: { resolve: (type: string) => RuntimeNodeResolutionTelemetry | null };
  sanitizedEdges: Edge[];
};

type NodeReadinessArgs = CollectReadyNodesArgs & {
  node: AiNode;
};

const formatNodeLabel = (nodeTitle: string | null | undefined, nodeId: string): string => {
  const title = typeof nodeTitle === 'string' ? nodeTitle.trim() : '';
  return title.length > 0 ? title : nodeId;
};

const resolveSourceNodeStatus = (state: EngineStateManager, nodeId: string): string => {
  if (state.errorNodes.has(nodeId)) return 'failed';
  if (state.finishedNodes.has(nodeId)) {
    return resolveDeclaredNodeStatus(state.outputs[nodeId]) ?? 'completed';
  }
  if (state.activeNodes.has(nodeId)) return 'running';
  if (state.blockedNodes.has(nodeId)) return resolveBlockedNodeStatus(state.outputs[nodeId]);
  return 'pending';
};

const shouldSkipNodeReadiness = (args: NodeReadinessArgs): boolean => {
  const nodeId = args.node.id;
  if (!args.scopedNodeIds.has(nodeId)) return true;
  if (args.state.finishedNodes.has(nodeId) || args.state.errorNodes.has(nodeId)) return true;
  return (
    args.state.blockedNodes.has(nodeId) && args.state.outputs[nodeId]?.['status'] === 'blocked'
  );
};

const buildMissingInputMessage = (readiness: InputReadiness): string => {
  if (readiness.waitingOnDetails.length > 0) {
    const detailsMsg = readiness.waitingOnDetails
      .map((detail) => {
        const upstreamNodes = detail.upstream
          .map((upstream) => {
            const upstreamLabel = formatNodeLabel(upstream.nodeTitle, upstream.nodeId);
            return `${upstreamLabel} (${upstream.status})`;
          })
          .join(', ');
        return `Upstream status for ${detail.port}: ${upstreamNodes}`;
      })
      .join('; ');
    return `Upstream waiting diagnostics: ${detailsMsg}`;
  }

  if (readiness.waitingOnPorts.length > 0) {
    return `Upstream waiting diagnostics: Waiting on ports: ${readiness.waitingOnPorts.join(', ')}`;
  }

  return 'Upstream waiting diagnostics: Blocked by upstream nodes';
};

const readOutputArray = (state: EngineStateManager, nodeId: string, key: string): unknown[] => {
  const value = state.outputs[nodeId]?.[key];
  return Array.isArray(value) ? value : [];
};

const readOutputString = (
  state: EngineStateManager,
  nodeId: string,
  key: string
): string | null => {
  const value = state.outputs[nodeId]?.[key];
  return typeof value === 'string' ? value.trim() : null;
};

const hasJsonChanged = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) !== JSON.stringify(right);

const hasBlockedOutputChanged = (input: {
  state: EngineStateManager;
  nodeId: string;
  readiness: InputReadiness;
  blockedStatus: MissingInputStatus;
  message: string;
}): boolean => {
  const previousStatus = readOutputString(input.state, input.nodeId, 'status')?.toLowerCase();
  const previousMessage = readOutputString(input.state, input.nodeId, 'message');
  const previousWaitingPorts = readOutputArray(input.state, input.nodeId, 'waitingOnPorts');
  const previousWaitingDetails = readOutputArray(input.state, input.nodeId, 'waitingOnDetails');
  const changes = [
    previousStatus !== input.blockedStatus,
    previousMessage !== input.message,
    hasJsonChanged(previousWaitingPorts, input.readiness.waitingOnPorts),
    hasJsonChanged(previousWaitingDetails, input.readiness.waitingOnDetails),
  ];
  return changes.some((changed) => changed === true);
};

const appendBlockedHistoryEntry = (input: {
  args: NodeReadinessArgs;
  nodeInputs: Record<string, unknown>;
  blockedStatus: MissingInputStatus;
  message: string;
  spanId: string;
  attempt: number;
  readiness: InputReadiness;
  runtimeTelemetry: RuntimeNodeResolutionTelemetry | null;
}): void => {
  if (input.args.options['recordHistory'] !== true) return;

  const entries = input.args.state.history.get(input.args.node.id) ?? [];
  const entry: RuntimeHistoryEntry = {
    timestamp: new Date().toISOString(),
    pathId: input.args.options.pathId ?? null,
    pathName: input.args.options.pathName ?? null,
    traceId: input.args.resolvedRunId,
    spanId: input.spanId,
    nodeId: input.args.node.id,
    nodeType: input.args.node.type,
    nodeTitle: input.args.node.title ?? null,
    status: input.blockedStatus,
    iteration: input.args.iteration,
    attempt: input.attempt,
    inputs: cloneValue(input.nodeInputs),
    outputs: cloneValue(input.args.state.outputs[input.args.node.id] ?? {}),
    inputHash: null,
    skipReason: 'missing_inputs',
    requiredPorts: input.readiness.requiredPorts,
    optionalPorts: input.readiness.optionalPorts,
    waitingOnPorts: input.readiness.waitingOnPorts,
    inputsFrom: buildInputLinks(
      input.args.node.id,
      input.args.sanitizedEdges,
      input.args.nodeById,
      input.nodeInputs
    ),
    outputsTo: [],
    durationMs: 0,
    ...buildRuntimeTelemetryFields(input.runtimeTelemetry),
  };
  entries.push(entry);
  input.args.state.history.set(input.args.node.id, entries);
};

const emitBlockedProfileEvent = (input: {
  args: NodeReadinessArgs;
  readiness: InputReadiness;
  runtimeTelemetry: RuntimeNodeResolutionTelemetry | null;
}): void => {
  const onEvent = input.args.options.profile?.onEvent;
  if (onEvent === undefined) return;

  onEvent({
    type: 'node',
    runId: input.args.resolvedRunId,
    runStartedAt: input.args.resolvedRunStartedAt,
    nodeId: input.args.node.id,
    nodeType: input.args.node.type,
    iteration: input.args.iteration,
    status: 'skipped',
    durationMs: 0,
    reason: 'missing_inputs',
    requiredPorts: input.readiness.requiredPorts,
    optionalPorts: input.readiness.optionalPorts,
    waitingOnPorts: input.readiness.waitingOnPorts,
    ...buildRuntimeTelemetryFields(input.runtimeTelemetry),
  });
};

const emitBlockedCallbacks = (input: {
  args: NodeReadinessArgs;
  readiness: InputReadiness;
  blockedStatus: MissingInputStatus;
  message: string;
  spanId: string;
  attempt: number;
  statusChanged: boolean;
  runtimeTelemetry: RuntimeNodeResolutionTelemetry | null;
}): void => {
  const telemetryFields = buildRuntimeTelemetryFields(input.runtimeTelemetry);
  if (
    input.args.options.onToast !== undefined &&
    input.statusChanged &&
    input.blockedStatus === 'blocked'
  ) {
    void input.args.options.onToast({
      runId: input.args.resolvedRunId,
      nodeId: input.args.node.id,
      message: `Node ${formatNodeLabel(input.args.node.title, input.args.node.id)} blocked: ${input.message}`,
      options: { variant: 'error' },
    });
  }

  const lifecyclePayload = {
    runId: input.args.resolvedRunId,
    traceId: input.args.resolvedRunId,
    spanId: input.spanId,
    node: input.args.node,
    iteration: input.args.iteration,
    attempt: input.attempt,
    status: input.blockedStatus,
    message: input.message,
    waitingOnPorts: input.readiness.waitingOnPorts,
    ...telemetryFields,
  };
  void input.args.options.onNodeStatus?.(lifecyclePayload);
  void input.args.options.onNodeBlocked?.({
    ...lifecyclePayload,
    reason: 'missing_inputs',
    waitingOnDetails: input.readiness.waitingOnDetails,
  });
};

const markNodeBlockedByMissingInputs = (input: {
  args: NodeReadinessArgs;
  readiness: InputReadiness;
  nodeInputs: Record<string, unknown>;
  runtimeTelemetry: RuntimeNodeResolutionTelemetry | null;
}): void => {
  const blockedStatus =
    input.readiness.waitingOnDetails.length > 0
      ? resolveMissingInputStatus({ waitingOnDetails: input.readiness.waitingOnDetails })
      : 'blocked';
  const message = buildMissingInputMessage(input.readiness);
  const nodeId = input.args.node.id;
  const statusChanged = input.args.state.outputs[nodeId]?.['status'] !== blockedStatus;

  if (
    !hasBlockedOutputChanged({
      state: input.args.state,
      nodeId,
      readiness: input.readiness,
      blockedStatus,
      message,
    })
  ) {
    return;
  }

  const attempt = input.args.state.getNodeAttempt(nodeId);
  const spanId = buildSpanId(nodeId, attempt, input.args.iteration);
  const { blockedNodes, outputs } = input.args.state;
  outputs[nodeId] = {
    status: blockedStatus,
    skipReason: 'missing_inputs',
    blockedReason: 'missing_inputs',
    message,
    requiredPorts: input.readiness.requiredPorts,
    optionalPorts: input.readiness.optionalPorts,
    waitingOnPorts: input.readiness.waitingOnPorts,
    waitingOnDetails: input.readiness.waitingOnDetails,
  };
  blockedNodes.add(nodeId);
  appendBlockedHistoryEntry({ ...input, blockedStatus, message, spanId, attempt });
  emitBlockedProfileEvent(input);
  emitBlockedCallbacks({ ...input, blockedStatus, message, spanId, attempt, statusChanged });
};

const isNodeReadyForExecution = (args: NodeReadinessArgs): boolean => {
  if (shouldSkipNodeReadiness(args)) return false;

  const rawInputs = args.state.inputs[args.node.id] ?? {};
  const nodeInputs = deriveNodeInputs({
    node: args.node,
    rawInputs,
    triggerContext: args.triggerContext,
    checkTriggerProvenance: args.internalCheckTriggerProvenance,
  });
  const runtimeTelemetry = args.telemetryResolver.resolve(args.node.type);
  const readiness = evaluateInputReadiness(
    args.node,
    nodeInputs,
    args.incomingEdgesByNode.get(args.node.id) ?? [],
    args.nodeById,
    (id) => resolveSourceNodeStatus(args.state, id),
    (id) => args.state.outputs[id] ?? {}
  );

  if (readiness.ready) return true;
  markNodeBlockedByMissingInputs({ args, readiness, nodeInputs, runtimeTelemetry });
  return false;
};

export const collectReadyNodes = (args: CollectReadyNodesArgs): AiNode[] =>
  args.orderedNodes.filter((node) => isNodeReadyForExecution({ ...args, node }));
