import { AiNode, Edge, RuntimePortValues } from '@/shared/contracts/ai-paths';
import {
  NodeHandlerContext,
  RuntimeHistoryEntry,
  RuntimeTraceResume,
} from '@/shared/contracts/ai-paths-runtime';

import { nowMs, resolveNodeTimeoutMs, withTimeout, withRetries } from '../execution-helpers';
import { cloneValue } from '../utils';
import { buildSpanId } from './engine-execution-context';
import { resolveNodeHandlerOrThrow } from './engine-execution-handlers';
import { buildRuntimeTelemetryFields } from './engine-execution-telemetry';
import { buildNodeInputHash, buildNodeHash, resolveCacheScopeFingerprint } from './engine-hashing';
import { deriveNodeInputs } from './engine-node-input-deriver';
import {
  applyCachedNodeRuntimeStatus,
  readRuntimeRetryPolicy,
  resolveRecoverableNodeWaitState,
} from './engine-runtime-status';
import { EngineStateManager } from './engine-state-manager';
import {
  GraphExecutionError,
  type EvaluateGraphOptions,
  type RuntimeNodeResolutionTelemetry,
} from './engine-types';
import {
  buildInputLinks,
  buildOutputLinks,
  collectNodeInputs,
  resolveEdgeToNodeId,
} from './engine-utils';
import { applyValidationBlockedNodeState, runRuntimeValidation } from './engine-validation-helpers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const EXECUTED_STATE_KEY = '__executed_state__';
const createExecutedState = (): NodeHandlerContext['executed'] => ({
  notification: new Set<string>(),
  updater: new Set<string>(),
  http: new Set<string>(),
  delay: new Set<string>(),
  poll: new Set<string>(),
  ai: new Set<string>(),
  schema: new Set<string>(),
  mapper: new Set<string>(),
});

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
  executed: NodeHandlerContext['executed'];
};

const EFFECT_NODE_TYPES = new Set<string>([
  'agent',
  'api_advanced',
  'database',
  'http',
  'learner_agent',
  'model',
  'notification',
  'playwright',
]);

const DEFAULT_SIDE_EFFECT_POLICY_BY_NODE_TYPE = new Map<string, 'per_run' | 'per_activation'>([
  ['agent', 'per_activation'],
  ['api_advanced', 'per_activation'],
  ['database', 'per_activation'],
  ['http', 'per_activation'],
  ['learner_agent', 'per_activation'],
  ['model', 'per_activation'],
  ['notification', 'per_run'],
  ['playwright', 'per_activation'],
]);

const EFFECT_EXECUTED_BUCKET_BY_NODE_TYPE = new Map<string, keyof NodeHandlerContext['executed']>([
  ['agent', 'ai'],
  ['api_advanced', 'http'],
  ['database', 'updater'],
  ['http', 'http'],
  ['learner_agent', 'ai'],
  ['model', 'ai'],
  ['notification', 'notification'],
  ['playwright', 'ai'],
]);

const resolveNodeSideEffectPolicy = (node: AiNode): 'per_run' | 'per_activation' | undefined => {
  const configured = node.config?.runtime?.sideEffectPolicy;
  if (configured === 'per_run' || configured === 'per_activation') {
    return configured;
  }
  return DEFAULT_SIDE_EFFECT_POLICY_BY_NODE_TYPE.get(node.type);
};

const resolveNodeIdempotencyKey = (input: {
  node: AiNode;
  runId: string;
  activationHash: string | null;
  policy?: 'per_run' | 'per_activation';
}): string | null => {
  if (!input.policy) return null;

  const explicitPolicy = input.node.config?.runtime?.sideEffectPolicy;
  const hasAdvancedApiIdempotency = Boolean(
    String(input.node.type) === 'api_advanced' || String(input.node.type) === 'advanced_api'
      ? input.node.config?.apiAdvanced?.idempotencyEnabled ||
          (input.node.config?.apiAdvanced?.idempotencyKeyTemplate ?? '').trim().length > 0
      : false
  );
  if (
    explicitPolicy !== 'per_run' &&
    explicitPolicy !== 'per_activation' &&
    !hasAdvancedApiIdempotency
  ) {
    return null;
  }

  const activationScope = input.activationHash ?? 'activation';
  return input.policy === 'per_run'
    ? `${input.runId}:${input.node.id}:${activationScope}`
    : `${input.node.id}:${activationScope}`;
};

const resolveSourceSpanId = (input: {
  state: EngineStateManager;
  options: EvaluateGraphOptions;
  nodeId: string;
  nodeHash: string | null;
  activationHash: string | null;
  preferSeedHistory: boolean;
}): string | null => {
  const readEntries = (value: unknown): RuntimeHistoryEntry[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const entries = (value as Record<string, unknown>)[input.nodeId];
    return Array.isArray(entries) ? (entries as RuntimeHistoryEntry[]) : [];
  };

  const findMatch = (entries: RuntimeHistoryEntry[]): RuntimeHistoryEntry | null => {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (!entry) continue;
      if (input.nodeHash && entry.inputHash === input.nodeHash) return entry;
      if (input.activationHash && entry.activationHash === input.activationHash) return entry;
    }
    return entries.at(-1) ?? null;
  };

  const entries = input.preferSeedHistory
    ? readEntries(input.options['seedHistory'])
    : (input.state.history.get(input.nodeId) ?? []);
  const matched = findMatch(entries);
  return typeof matched?.spanId === 'string' ? matched.spanId : null;
};

const resolveNodeResume = (
  options: EvaluateGraphOptions,
  nodeId: string
): RuntimeTraceResume | null => {
  const resumeByNodeId = options['resumeByNodeId'];
  if (!resumeByNodeId || typeof resumeByNodeId !== 'object' || Array.isArray(resumeByNodeId)) {
    return null;
  }
  const value = (resumeByNodeId as Record<string, unknown>)[nodeId];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RuntimeTraceResume;
};

const appendNodeHistoryEntry = (input: {
  state: EngineStateManager;
  options: EvaluateGraphOptions;
  resolvedRunId: string;
  spanId: string;
  node: AiNode;
  status: 'executed' | 'cached' | 'failed';
  iteration: number;
  attempt: number;
  nodeInputs: RuntimePortValues;
  nodeOutputs: RuntimePortValues;
  nodeById: Map<string, AiNode>;
  sanitizedEdges: Edge[];
  inputHash?: string | null;
  activationHash?: string | null;
  cacheDecision?: 'hit' | 'miss' | 'disabled' | 'seed';
  sideEffectPolicy?: 'per_run' | 'per_activation';
  sideEffectDecision?: string;
  idempotencyKey?: string | null;
  effectSourceSpanId?: string | null;
  resume?: RuntimeTraceResume | null;
  error?: string | null;
  durationMs?: number;
  runtimeTelemetry?: RuntimeNodeResolutionTelemetry | null;
}): void => {
  if (!input.options['recordHistory']) return;
  const entries = input.state.history.get(input.node.id) ?? [];
  entries.push({
    timestamp: new Date().toISOString(),
    pathId: input.options.pathId ?? null,
    pathName: input.options.pathName ?? null,
    traceId: input.resolvedRunId,
    spanId: input.spanId,
    nodeId: input.node.id,
    nodeType: input.node.type,
    nodeTitle: input.node.title ?? null,
    status: input.status,
    iteration: input.iteration,
    attempt: input.attempt,
    inputs: cloneValue(input.nodeInputs),
    outputs: cloneValue(input.nodeOutputs),
    inputHash: input.inputHash ?? null,
    activationHash: input.activationHash ?? null,
    cacheDecision: input.cacheDecision,
    sideEffectPolicy: input.sideEffectPolicy,
    sideEffectDecision: input.sideEffectDecision,
    idempotencyKey: input.idempotencyKey ?? null,
    effectSourceSpanId: input.effectSourceSpanId ?? null,
    resumeMode: input.resume?.mode,
    resumeDecision: input.resume?.decision,
    resumeReason: input.resume?.reason,
    resumeSourceTraceId: input.resume?.sourceTraceId ?? null,
    resumeSourceSpanId: input.resume?.sourceSpanId ?? null,
    resumeSourceRunStartedAt: input.resume?.sourceRunStartedAt ?? null,
    resumeSourceStatus: input.resume?.sourceStatus ?? null,
    error: input.error ?? undefined,
    inputsFrom: buildInputLinks(
      input.node.id,
      input.sanitizedEdges,
      input.nodeById,
      input.nodeInputs
    ),
    outputsTo: buildOutputLinks(
      input.node.id,
      input.sanitizedEdges,
      input.nodeById,
      input.nodeOutputs
    ),
    durationMs: input.durationMs ?? 0,
    ...buildRuntimeTelemetryFields(input.runtimeTelemetry ?? null),
  } as RuntimeHistoryEntry);
  input.state.history.set(input.node.id, entries);
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
    executed: executedState,
  } = args;

  const rawInputs = state.inputs[node.id] ?? {};
  const nodeInputs = deriveNodeInputs({
    node,
    rawInputs,
    triggerContext,
    checkTriggerProvenance: internalCheckTriggerProvenance,
  });
  const runtimeTelemetry = telemetryResolver.resolve(node.type);
  const activationHash = buildNodeInputHash(node, nodeInputs, {
    iteration,
  });
  const resume = resolveNodeResume(options, node.id);

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
  const seedOutputs = options.seedOutputs?.[node.id] ?? null;
  const isSeedMatch = Boolean(
    nodeHash && seedHashes[node.id] === nodeHash && seedOutputs
  );

  const isEntryNode = node.id === options.triggerNodeId;
  const isImplicitTriggerNode = node.type === 'trigger' && !options.triggerNodeId;
  const cacheMode = node.config?.runtime?.cache?.mode ?? 'auto';
  const isCacheDisabled = cacheMode === 'disabled';
  const isEffectNodeType = EFFECT_NODE_TYPES.has(node.type);
  const sideEffectPolicy = resolveNodeSideEffectPolicy(node);
  const effectExecutedBucket = EFFECT_EXECUTED_BUCKET_BY_NODE_TYPE.get(node.type);
  const idempotencyKey = resolveNodeIdempotencyKey({
    node,
    runId: resolvedRunId,
    activationHash,
    policy: sideEffectPolicy,
  });

  let validCacheHit = false;
  let cacheSource: RuntimePortValues | null = null;

  if (!isEntryNode && !isImplicitTriggerNode && !isCacheDisabled) {
    if (isSeedMatch && seedOutputs) {
      cacheSource = seedOutputs;
      validCacheHit = true;
    } else if (cachedOutputs) {
      cacheSource = cachedOutputs;
      validCacheHit = true;
    }

    if (validCacheHit && cacheSource) {
      const hasData = Object.keys(cacheSource).some((k) => k !== 'status' && k !== 'context');
      const expectsData = (node.outputs ?? []).length > 0;
      if (!hasData && expectsData) {
        validCacheHit = false;
        cacheSource = null;
      }
    }
  }

  if (validCacheHit && cacheSource) {
    const attempt = state.reserveNodeAttempt(node.id);
    const spanId = buildSpanId(node.id, attempt, iteration);
    const out = cacheSource;
    const effectSourceSpanId = isEffectNodeType
      ? resolveSourceSpanId({
        state,
        options,
        nodeId: node.id,
        nodeHash,
        activationHash,
        preferSeedHistory: isSeedMatch,
      })
      : null;
    state.outputs[node.id] = cloneValue(out) ?? {};

    applyCachedNodeRuntimeStatus(state, node.id, out);

    appendNodeHistoryEntry({
      state,
      options,
      resolvedRunId,
      spanId,
      node,
      status: 'cached',
      iteration,
      attempt,
      nodeInputs,
      nodeOutputs: state.outputs[node.id] ?? {},
      nodeById,
      sanitizedEdges,
      inputHash: nodeHash,
      activationHash,
      cacheDecision: isSeedMatch ? 'seed' : 'hit',
      sideEffectPolicy,
      sideEffectDecision: isEffectNodeType ? 'skipped_duplicate' : undefined,
      idempotencyKey,
      effectSourceSpanId,
      resume,
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
        sideEffectPolicy,
        sideEffectDecision: isEffectNodeType ? 'skipped_duplicate' : undefined,
        activationHash: activationHash ?? undefined,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }
    const onNodeFinish = options.onNodeFinish;
    if (onNodeFinish) {
      await onNodeFinish({
        runId: resolvedRunId,
        traceId: resolvedRunId,
        spanId,
        runStartedAt: resolvedRunStartedAt,
        node,
        nodeInputs,
        prevOutputs,
        nextOutputs: state.outputs[node.id] ?? {},
        changed: false,
        iteration,
        attempt,
        cached: true,
        cacheDecision: isSeedMatch ? 'seed' : 'hit',
        sideEffectPolicy,
        sideEffectDecision: isEffectNodeType ? 'skipped_duplicate' : undefined,
        activationHash,
        idempotencyKey,
        effectSourceSpanId,
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
    executedState && typeof executedState === 'object'
      ? executedState
      : existingExecutedState && typeof existingExecutedState === 'object'
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

    const sideEffectDecision: 'executed' | 'skipped_policy' | undefined =
      isEffectNodeType && effectExecutedBucket && executed[effectExecutedBucket].has(node.id)
        ? 'skipped_policy'
        : isEffectNodeType
          ? 'executed'
          : undefined;

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
      runMeta:
        (options['runMeta'] as Record<string, unknown> | undefined) ??
        (options['meta'] as Record<string, unknown> | undefined) ??
        {},
      activePathId: options.pathId ?? null,
      contextRegistry: options.contextRegistry ?? null,
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
      sideEffectControl: sideEffectPolicy
        ? {
          policy: sideEffectPolicy,
          decision: sideEffectDecision === 'skipped_policy' ? 'skipped_policy' : 'executed',
          activationHash,
          idempotencyKey,
        }
        : undefined,
      now: new Date().toISOString(),
      abortSignal: options.abortSignal,
      allOutputs: state.outputs,
      allInputs: state.inputs,
      fetchEntityCached:
        options.fetchEntityCached ?? options.fetchEntityByType ?? (async () => null),
      reportAiPathsError: options.reportAiPathsError,
      toast: (message, toastOptions) => {
        options.toast?.(message, toastOptions);
        if (options.onToast) {
          void options.onToast({
            runId: resolvedRunId,
            nodeId: node.id,
            message,
            options: toastOptions,
          });
        }
      },
      simulationEntityType: (triggerContext?.['entityType'] as string) ?? null,
      simulationEntityId:
        (triggerContext?.['entityId'] as string) ??
        (triggerContext?.['productId'] as string) ??
        null,
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
        withTimeout(Promise.resolve(handler(ctx)), ctx.timeoutMs, `Node ${node.title || node.id}`),
      retryPolicy.enabled ? retryPolicy.attempts : 1,
      retryPolicy.backoffMs,
      `Node ${node.title || node.id}`,
      options.abortSignal
    );

    const nextOutputs = cloneValue(nodeResult) ?? {};
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

    // Detect handler-declared blocked status (e.g. model returning { status: 'blocked', reason: 'missing_prompt' }).
    // Route through the blocked-node path so downstream nodes wait instead of processing garbage data.
    const handlerDeclaredBlocked =
      typeof nextOutputs?.['status'] === 'string' &&
      nextOutputs['status'].trim().toLowerCase() === 'blocked';

    if (handlerDeclaredBlocked) {
      const nodeDurationMs = nowMs() - nodeStartedAt;
      state.nodeDurationsMap.set(node.id, nodeDurationMs);
      state.activeNodes.delete(node.id);
      state.blockedNodes.add(node.id);
      state.outputs[node.id] = nextOutputs;

      appendNodeHistoryEntry({
        state,
        options,
        resolvedRunId,
        spanId,
        node,
        status: 'executed',
        iteration,
        attempt,
        nodeInputs,
        nodeOutputs: nextOutputs,
        nodeById,
        sanitizedEdges,
        inputHash: nodeHash,
        activationHash,
        cacheDecision: isCacheDisabled ? 'disabled' : 'miss',
        sideEffectPolicy,
        sideEffectDecision,
        idempotencyKey,
        resume,
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
          status: 'skipped',
          durationMs: nodeDurationMs,
          reason: String(nextOutputs['reason'] ?? 'handler_declared_blocked'),
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
          reason: String(nextOutputs['reason'] ?? 'handler_declared_blocked'),
          status: 'blocked',
          message: `Node ${node.title || node.id} blocked: ${String(nextOutputs['reason'] ?? 'handler declared blocked status')}`,
          waitingOnPorts: Array.isArray(nextOutputs['waitingOnPorts'])
            ? (nextOutputs['waitingOnPorts'] as string[])
            : [],
          waitingOnDetails: [],
          ...buildRuntimeTelemetryFields(runtimeTelemetry),
        });
      }

      return true;
    }

    const nodeDurationMs = nowMs() - nodeStartedAt;
    state.nodeDurationsMap.set(node.id, nodeDurationMs);
    state.finishedNodes.add(node.id);
    state.activeNodes.delete(node.id);
    state.errorNodes.delete(node.id);
    state.outputs[node.id] = nextOutputs;

    if (effectExecutedBucket === 'notification' && sideEffectDecision === 'executed') {
      executed.notification.add(node.id);
    }

    if (nodeHash && state.effectiveCache) {
      state.effectiveCache.set(nodeHash, nextOutputs);
    }

    appendNodeHistoryEntry({
      state,
      options,
      resolvedRunId,
      spanId,
      node,
      status: 'executed',
      iteration,
      attempt,
      nodeInputs,
      nodeOutputs: nextOutputs,
      nodeById,
      sanitizedEdges,
      inputHash: nodeHash,
      activationHash,
      cacheDecision: isCacheDisabled ? 'disabled' : 'miss',
      sideEffectPolicy,
      sideEffectDecision,
      idempotencyKey,
      resume,
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
        sideEffectPolicy,
        sideEffectDecision,
        activationHash: activationHash ?? undefined,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }

    const onNodeFinish = options.onNodeFinish;
    if (onNodeFinish) {
      await onNodeFinish({
        runId: resolvedRunId,
        traceId: resolvedRunId,
        spanId,
        runStartedAt: resolvedRunStartedAt,
        node,
        nodeInputs,
        prevOutputs,
        nextOutputs,
        changed: true,
        iteration,
        attempt,
        cacheDecision: isCacheDisabled ? 'disabled' : 'miss',
        sideEffectPolicy,
        sideEffectDecision,
        activationHash,
        idempotencyKey,
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }

    const onNodeSuccess = options.onNodeSuccess;
    if (onNodeSuccess) {
      await onNodeSuccess({
        runId: resolvedRunId,
        traceId: resolvedRunId,
        spanId,
        runStartedAt: resolvedRunStartedAt,
        node,
        nodeInputs,
        prevOutputs,
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
    logClientError(error);
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

      const onNodeStatus = options.onNodeStatus;
      if (onNodeStatus) {
        void onNodeStatus({
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

    appendNodeHistoryEntry({
      state,
      options,
      resolvedRunId,
      spanId,
      node,
      status: 'failed',
      iteration,
      attempt,
      nodeInputs,
      nodeOutputs: {
        status: 'failed',
        error: graphError.message,
      },
      nodeById,
      sanitizedEdges,
      inputHash: nodeHash,
      activationHash,
      cacheDecision: isCacheDisabled ? 'disabled' : 'miss',
      sideEffectPolicy,
      sideEffectDecision: sideEffectPolicy ? 'failed' : undefined,
      idempotencyKey,
      resume,
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
        sideEffectPolicy,
        sideEffectDecision: sideEffectPolicy ? 'failed' : undefined,
        activationHash: activationHash ?? undefined,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ...buildRuntimeTelemetryFields(runtimeTelemetry),
      });
    }

    const shouldNotifyNodeError =
      !(graphError instanceof GraphExecutionError) ||
      !graphError.message.startsWith('No handler found for node type:');
    const onNodeError = options.onNodeError;
    if (shouldNotifyNodeError && onNodeError) {
      await onNodeError({
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
