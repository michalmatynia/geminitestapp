import { AiNode, Edge, RuntimePortValues } from '@/shared/contracts/ai-paths';
import {
  NodeHandlerContext,
  RuntimeHistoryEntry,
} from '@/shared/contracts/ai-paths-runtime';
import { cloneValue } from '../utils';
import { nowMs, resolveNodeTimeoutMs, withTimeout, withRetries } from '../execution-helpers';
import {
  GraphExecutionError,
  type EvaluateGraphOptions,
  type RuntimeNodeResolutionTelemetry,
} from './engine-types';
import {
  buildNodeInputHash,
  buildNodeHash,
  resolveCacheScopeFingerprint,
} from './engine-hashing';
import {
  collectNodeInputs,
  resolveEdgeToNodeId,
} from './engine-utils';
import { EngineStateManager } from './engine-state-manager';
import { deriveNodeInputs } from './engine-node-input-deriver';
import {
  applyCachedNodeRuntimeStatus,
  readRuntimeRetryPolicy,
  resolveRecoverableNodeWaitState,
} from './engine-runtime-status';
import {
  applyValidationBlockedNodeState,
  runRuntimeValidation,
} from './engine-validation-helpers';
import {
  resolveNodeHandlerOrThrow,
} from './engine-execution-handlers';
import {
  buildRuntimeTelemetryFields,
} from './engine-execution-telemetry';
import { buildSpanId, appendHistoryEntry } from './engine-execution-context';

export type RunNodeArgs = {
  node: AiNode;
  iteration: number;
  state: EngineStateManager;
  options: EvaluateGraphOptions;
  resolvedRunId: string;
  resolvedRunStartedAt: string;
  triggerContext: Record<string, unknown> | null;
  internalCheckTriggerProvenance: () => boolean;
  telemetryResolver: { resolve: (type: string) => RuntimeNodeResolutionTelemetry | null };
  seedHashes: Record<string, string>;
  nodes: AiNode[];
  sanitizedEdges: Edge[];
  outgoingEdgesByNode: Map<string, Edge[]>;
  nodeById: Map<string, AiNode>;
};

export const runNode = async (args: RunNodeArgs): Promise<boolean> => {
  const {
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
  } = args;

  const rawInputs = state.inputs[node.id] ?? {};
  const nodeInputs = deriveNodeInputs({
    node,
    rawInputs,
    triggerContext,
    checkTriggerProvenance: internalCheckTriggerProvenance
  });
  const runtimeTelemetry = telemetryResolver.resolve(node.type);
  const activationHash = buildNodeInputHash(node, nodeInputs, {
    iteration,
  });

  // --- Cache Check Start ---
  const nodeHash = buildNodeHash(
    node,
    nodeInputs,
    resolveCacheScopeFingerprint({ node, runId: resolvedRunId, triggerContext })
  );

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
  let cacheSource: RuntimePortValues | null = null;

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
    const attempt = state.getNodeAttempt(node.id);
    const out = cacheSource;
    state.outputs[node.id] = cloneValue(out) ?? {};

    applyCachedNodeRuntimeStatus(state, node.id, out);

    appendHistoryEntry(state, options, {
      node,
      status: 'cached',
      iteration,
      attempt,
      inputs: nodeInputs,
      outputs: state.outputs[node.id] ?? {},
      inputHash: nodeHash,
      activationHash,
      cacheDecision: isSeedMatch ? 'seed' : 'hit',
      runtimeTelemetry,
    });

    if (options.profile?.onEvent) {
      options.profile.onEvent({
        type: 'node',
        runId: resolvedRunId,
        runStartedAt: resolvedRunStartedAt,
        nodeId: node.id,
        nodeType: node.type,
        iteration,
        status: 'cached',
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }
    return false;
  }
  // --- Cache Check End ---

  const nodeStartedAt = nowMs();
  state.activeNodes.add(node.id);
  state.blockedNodes.delete(node.id);

  const attempt = state.incrementNodeAttempt(node.id);
  const spanId = buildSpanId(node.id, attempt, iteration);

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
      return true;
    }

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
    const retryPolicy = readRuntimeRetryPolicy(node);
    const ctx: NodeHandlerContext = {
      runId: resolvedRunId,
      runStartedAt: resolvedRunStartedAt,
      iteration,
      attempt,
      node,
      inputs: nodeInputs,
      prevOutputs,
      timeoutMs: resolveNodeTimeoutMs(node),
      abortSignal: options.abortSignal,
      profiling: {
        totalAttempts: stats.attempts,
        totalSuccesses: stats.successes,
        totalFailures: stats.failures,
      },
      runtimeTelemetry: buildRuntimeTelemetryFields(runtimeTelemetry),
    };

    if (options.onNodeStart) {
      await options.onNodeStart({
        runId: resolvedRunId,
        traceId: resolvedRunId,
        spanId,
        runStartedAt: resolvedRunStartedAt,
        node,
        nodeInputs,
        prevOutputs,
        iteration,
        attempt,
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }

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
      return true;
    }

    const nodeDurationMs = nowMs() - nodeStartedAt;
    state.nodeDurationsMap.set(node.id, nodeDurationMs);
    state.finishedNodes.add(node.id);
    state.activeNodes.delete(node.id);
    state.errorNodes.delete(node.id);
    state.outputs[node.id] = nextOutputs;

    if (nodeHash && state.effectiveCache) {
      state.effectiveCache.set(nodeHash, nextOutputs);
    }

    appendHistoryEntry(state, options, {
      node,
      status: 'executed',
      iteration,
      attempt,
      inputs: nodeInputs,
      outputs: nextOutputs,
      inputHash: nodeHash,
      activationHash,
      cacheDecision: isCacheDisabled ? 'disabled' : 'miss',
      durationMs: nodeDurationMs,
      runtimeTelemetry,
    });

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

    if (options.onNodeSuccess) {
      await options.onNodeSuccess({
        runId: resolvedRunId,
        traceId: resolvedRunId,
        spanId,
        runStartedAt: resolvedRunStartedAt,
        node,
        nodeInputs,
        outputs: nextOutputs,
        iteration,
        attempt,
        durationMs: nodeDurationMs,
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }

    // Dependency Propagation
    const outgoingEdges = outgoingEdgesByNode.get(node.id) ?? [];
    outgoingEdges.forEach((edge) => {
      const toNodeId = resolveEdgeToNodeId(edge);
      if (!toNodeId) return;
      const targetNode = nodeById.get(toNodeId);
      if (!targetNode) return;

      const targetInputs = collectNodeInputs(targetNode, state.outputs, state.incomingEdgesByNode);
      const changed = JSON.stringify(state.inputs[toNodeId]) !== JSON.stringify(targetInputs);

      if (changed) {
        state.inputs[toNodeId] = targetInputs;
        if (state.finishedNodes.has(toNodeId)) {
          const previousHash = state.nodeHashes.get(toNodeId) ?? null;
          const nextHash = buildNodeHash(
            targetNode,
            targetInputs,
            resolveCacheScopeFingerprint({ node: targetNode, runId: resolvedRunId, triggerContext })
          );
          if (previousHash && nextHash && previousHash !== nextHash) {
            state.finishedNodes.delete(toNodeId);
          }
        }
      }
    });

    return true;
  } catch (error) {
    const recoverableWaitState = resolveRecoverableNodeWaitState(error, node);
    if (recoverableWaitState) {
      state.activeNodes.delete(node.id);
      state.blockedNodes.add(node.id);
      state.outputs[node.id] = {
        ...state.outputs[node.id],
        status: 'waiting_callback',
        message: recoverableWaitState.message,
        waitingOnPorts: recoverableWaitState.waitingOnPorts,
      };

      if (options.onNodeStatus) {
        void options.onNodeStatus({
          runId: resolvedRunId,
          traceId: resolvedRunId,
          spanId,
          node,
          iteration,
          attempt,
          status: 'waiting_callback',
          message: recoverableWaitState.message,
          waitingOnPorts: recoverableWaitState.waitingOnPorts,
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
          reason: 'waiting_callback',
          status: 'waiting_callback',
          message: recoverableWaitState.message,
          waitingOnPorts: recoverableWaitState.waitingOnPorts,
          waitingOnDetails: [],
          ...buildRuntimeTelemetryFields(runtimeTelemetry),
        });
      }

      return false;
    }

    state.activeNodes.delete(node.id);
    state.errorNodes.add(node.id);
    state.finishedNodes.delete(node.id);
    state.blockedNodes.delete(node.id);
    if (error instanceof Error && error.message.includes('timed out')) {
      state.timeoutNodes.add(node.id);
    }

    const nodeDurationMs = nowMs() - nodeStartedAt;
    state.nodeDurationsMap.set(node.id, nodeDurationMs);

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

    appendHistoryEntry(state, options, {
      node,
      status: 'failed',
      iteration,
      attempt,
      inputs: nodeInputs,
      outputs: {
        status: 'failed',
        error: graphError.message,
      },
      inputHash: nodeHash,
      activationHash,
      cacheDecision: isCacheDisabled ? 'disabled' : 'miss',
      error: graphError.message,
      durationMs: nodeDurationMs,
      runtimeTelemetry,
    });

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
        traceId: resolvedRunId,
        spanId,
        runStartedAt: resolvedRunStartedAt,
        node,
        nodeInputs,
        prevOutputs,
        error: graphError,
        iteration,
        attempt,
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }

    throw graphError;
  }
};
