import { AiNode, Edge, RuntimePortValues } from '@/shared/contracts/ai-paths';
import {
  NodeHandlerContext,
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
        durationMs: 0,
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
  const existingExecutedState = state.variables[EXECUTED_STATE_KEY];
  const executed =
    existingExecutedState && typeof existingExecutedState === 'object'
      ? (existingExecutedState as NodeHandlerContext['executed'])
      : createExecutedState();
  state.variables[EXECUTED_STATE_KEY] = executed;

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
        attempt,
        nodeDurationMs,
        runtimeTelemetry,
        stage: 'node_pre_execute',
        message: preExecuteValidation.message,
        issues: preExecuteValidation.issues,
        state,
        options,
        resolvedRunId,
        resolvedRunStartedAt,
        sanitizedEdges,
        nodeById,
        activationHash,
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
      attempt,
      spanId,
      nodeInputs,
      prevOutputs: prevOutputs ?? {},
      runtimeTelemetry,
    });

    const retryPolicy = readRuntimeRetryPolicy(node);

    const sideEffectDecision: 'executed' | 'skipped_policy' | undefined = 'executed';

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
      timeoutMs: resolveNodeTimeoutMs(node),
      runMeta: (options['runMeta'] as Record<string, unknown> | undefined) ?? (options['meta'] as Record<string, unknown> | undefined) ?? {},
      activePathId: options.pathId ?? null,
      iteration,
      attempt,
      spanId,
      triggerNodeId: options.triggerNodeId ?? undefined,
      triggerEvent: options.triggerEvent ?? undefined,
      triggerContext: options.triggerContext ?? null,
      deferPoll: Boolean(options.deferPoll),
      skipAiJobs: Boolean(options.skipAiJobs),
      isDryRun: Boolean(options['isDryRun']),
      sideEffectDecision,
      now: new Date().toISOString(),
      abortSignal: options.abortSignal,
      allOutputs: state.outputs as Record<string, Record<string, unknown>>,
      allInputs: state.inputs as Record<string, Record<string, unknown>>,
      fetchEntityCached: options.fetchEntityCached ?? (async () => null),
      reportAiPathsError: options.reportAiPathsError,
      toast: (message, toastOptions) => {
        options.toast?.(message, toastOptions);
        if (options.onToast) {
          void options.onToast({ runId: resolvedRunId, nodeId: node.id, message, options: toastOptions });
        }
      },
      simulationEntityType: (triggerContext?.['entityType'] as string) ?? null,
      simulationEntityId: (triggerContext?.['entityId'] as string) ?? (triggerContext?.['productId'] as string) ?? null,
      resolvedEntity: null,
      fallbackEntityId: null,
      strictFlowMode: Boolean(options.strictFlowMode),
      runtimeTelemetry: buildRuntimeTelemetryFields(runtimeTelemetry),
      executed,
      variables: state.variables,
      setVariable: (key, value) => {
        state.variables[key] = value;
      },
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

    const nextOutputs = (cloneValue(nodeResult) ?? {}) as RuntimePortValues;
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
        attempt,
        nodeDurationMs,
        runtimeTelemetry,
        stage: 'node_post_execute',
        message: postExecuteValidation.message,
        issues: postExecuteValidation.issues,
        state,
        options,
        resolvedRunId,
        resolvedRunStartedAt,
        sanitizedEdges,
        nodeById,
        activationHash,
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

    if (options['onNodeSuccess'] && typeof options['onNodeSuccess'] === 'function') {
      await (options['onNodeSuccess'] as Function)({
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

      const targetInputs = collectNodeInputs(toNodeId, state.outputs, state.incomingEdgesByNode);
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
    const recoverableWaitState = resolveRecoverableNodeWaitState(node, error);
    if (recoverableWaitState) {
      state.activeNodes.delete(node.id);
      state.blockedNodes.add(node.id);
      state.outputs[node.id] = {
        ...state.outputs[node.id],
        status: 'waiting_callback',
        message: recoverableWaitState.message,
        waitingOnPorts: recoverableWaitState.waitingOnPorts,
      };

      if (options['onNodeStatus'] && typeof options['onNodeStatus'] === 'function') {
        void (options['onNodeStatus'] as Function)({
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

    if (options['onNodeError'] && typeof options['onNodeError'] === 'function') {
      await (options['onNodeError'] as Function)({
        runId: resolvedRunId,
        traceId: resolvedRunId,
        spanId,
        runStartedAt: resolvedRunStartedAt,
        node,
        nodeInputs,
        prevOutputs: prevOutputs ?? {},
        error: graphError,
        iteration,
        attempt,
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }

    throw graphError;
  }
};
