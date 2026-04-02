import { AiNode, Edge, RuntimePortValues } from '@/shared/contracts/ai-paths';
import { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';

import { cloneValue } from '../utils';
import { EngineStateManager } from './engine-state-manager';
import {
  type EvaluateGraphOptions,
  type RuntimeValidationIssue,
  type RuntimeValidationResult,
  type RuntimeValidationStage,
  type RuntimeNodeResolutionTelemetry,
} from './engine-types';
import { buildInputLinks } from './engine-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const buildRuntimeTelemetryFields = (
  telemetry: RuntimeNodeResolutionTelemetry | null
): {
  runtimeStrategy?: RuntimeNodeResolutionTelemetry['runtimeStrategy'];
  runtimeResolutionSource?: RuntimeNodeResolutionTelemetry['runtimeResolutionSource'];
  runtimeCodeObjectId?: string | null;
} =>
  telemetry
    ? {
      runtimeStrategy: telemetry.runtimeStrategy,
      runtimeResolutionSource: telemetry.runtimeResolutionSource,
      runtimeCodeObjectId: telemetry.runtimeCodeObjectId ?? null,
    }
    : {};

export const normalizeRuntimeValidationIssues = (
  issues: RuntimeValidationIssue[] | undefined,
  stage: RuntimeValidationStage,
  node: AiNode | null
): RuntimeValidationIssue[] => {
  if (!Array.isArray(issues)) return [];
  return issues
    .filter((issue: RuntimeValidationIssue | null | undefined): issue is RuntimeValidationIssue => {
      if (!issue) return false;
      return typeof issue.message === 'string' && issue.message.trim().length > 0;
    })
    .map(
      (issue: RuntimeValidationIssue): RuntimeValidationIssue => ({
        ...issue,
        stage,
        nodeId: issue.nodeId ?? node?.id ?? null,
        nodeTitle: issue.nodeTitle ?? node?.title ?? null,
      })
    );
};

export type RunRuntimeValidationArgs = {
  stage: RuntimeValidationStage;
  iteration: number;
  node?: AiNode | null;
  nodeInputs?: RuntimePortValues;
  nodeOutputs?: RuntimePortValues;
  runtimeTelemetry?: RuntimeNodeResolutionTelemetry | null;
  options: EvaluateGraphOptions;
  resolvedRunId: string;
  resolvedRunStartedAt: string;
  nodes: AiNode[];
  sanitizedEdges: Edge[];
};

type RuntimeValidationMiddlewareResult = RuntimeValidationResult | null | undefined;

const executeRuntimeValidationMiddleware = async (
  args: RunRuntimeValidationArgs,
  validationMiddleware: NonNullable<EvaluateGraphOptions['validationMiddleware']>
): Promise<RuntimeValidationMiddlewareResult> => {
  const {
    stage,
    node = null,
    resolvedRunId,
    resolvedRunStartedAt,
    nodes,
    sanitizedEdges,
  } = args;
  const context: Parameters<NonNullable<EvaluateGraphOptions['validationMiddleware']>>[0] = {
    stage,
    runId: resolvedRunId,
    runStartedAt: resolvedRunStartedAt,
    iteration: args.iteration,
    node,
    nodeInputs: args.nodeInputs,
    nodeOutputs: args.nodeOutputs,
    nodes,
    edges: sanitizedEdges,
  };

  try {
    return await validationMiddleware(context);
  } catch (error) {
    logClientError(error);
    args.options.reportAiPathsError(error, {
      action: 'runtime_validation_middleware',
      stage,
      nodeId: node?.id ?? null,
      iteration: args.iteration,
      runId: resolvedRunId,
    });
    throw error;
  }
};

const resolveRuntimeValidationDecision = (
  validationResult: Exclude<RuntimeValidationMiddlewareResult, null | undefined>
): 'warn' | 'block' => (validationResult.decision === 'block' ? 'block' : 'warn');

const buildRuntimeValidationFallbackMessage = (args: {
  decision: 'warn' | 'block';
  node: AiNode | null;
  stage: RuntimeValidationStage;
}): string =>
  args.decision === 'block'
    ? `Runtime validation blocked ${args.node ? `node ${args.node.id}` : 'graph'} at stage ${args.stage}.`
    : `Runtime validation warning for ${args.node ? `node ${args.node.id}` : 'graph'} at stage ${args.stage}.`;

const resolveRuntimeValidationMessage = (args: {
  validationResult: Exclude<RuntimeValidationMiddlewareResult, null | undefined>;
  decision: 'warn' | 'block';
  issues: RuntimeValidationIssue[];
  node: AiNode | null;
  stage: RuntimeValidationStage;
}): string => {
  const message = args.validationResult.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }

  return (
    args.issues[0]?.message ??
    buildRuntimeValidationFallbackMessage({
      decision: args.decision,
      node: args.node,
      stage: args.stage,
    })
  );
};

const notifyRuntimeValidation = async (args: {
  options: EvaluateGraphOptions;
  resolvedRunId: string;
  resolvedRunStartedAt: string;
  iteration: number;
  stage: RuntimeValidationStage;
  decision: 'warn' | 'block';
  node: AiNode | null;
  nodeInputs?: RuntimePortValues;
  nodeOutputs?: RuntimePortValues;
  message: string;
  issues: RuntimeValidationIssue[];
  runtimeTelemetry?: RuntimeNodeResolutionTelemetry | null;
}): Promise<void> => {
  if (!args.options.onRuntimeValidation) {
    return;
  }

  try {
    await args.options.onRuntimeValidation({
      runId: args.resolvedRunId,
      runStartedAt: args.resolvedRunStartedAt,
      iteration: args.iteration,
      stage: args.stage,
      decision: args.decision,
      node: args.node,
      nodeInputs: args.nodeInputs,
      nodeOutputs: args.nodeOutputs,
      message: args.message,
      issues: args.issues,
      ...buildRuntimeTelemetryFields(args.runtimeTelemetry ?? null),
    });
  } catch (error) {
    logClientError(error);
    args.options.reportAiPathsError(error, {
      action: 'onRuntimeValidation',
      stage: args.stage,
      nodeId: args.node?.id ?? null,
      iteration: args.iteration,
      runId: args.resolvedRunId,
    });
  }
};

export const runRuntimeValidation = async (
  args: RunRuntimeValidationArgs
): Promise<{
  decision: 'warn' | 'block';
  message: string;
  issues: RuntimeValidationIssue[];
} | null> => {
  const {
    options,
    stage,
    node = null,
    resolvedRunId,
    resolvedRunStartedAt,
  } = args;
  if (!options.validationMiddleware) return null;

  const validationResult = await executeRuntimeValidationMiddleware(
    args,
    options.validationMiddleware
  );
  if (!validationResult || validationResult.decision === 'pass') {
    return null;
  }

  const decision = resolveRuntimeValidationDecision(validationResult);
  const issues = normalizeRuntimeValidationIssues(validationResult.issues, stage, node);
  const message = resolveRuntimeValidationMessage({
    validationResult,
    decision,
    issues,
    node,
    stage,
  });

  await notifyRuntimeValidation({
    options,
    resolvedRunId,
    resolvedRunStartedAt,
    iteration: args.iteration,
    stage,
    decision,
    node,
    nodeInputs: args.nodeInputs,
    nodeOutputs: args.nodeOutputs,
    message,
    issues,
    runtimeTelemetry: args.runtimeTelemetry ?? null,
  });

  return {
    decision,
    message,
    issues,
  };
};

export type ApplyValidationBlockedNodeStateArgs = {
  node: AiNode;
  nodeInputs: RuntimePortValues;
  iteration: number;
  attempt: number;
  nodeDurationMs: number;
  runtimeTelemetry: RuntimeNodeResolutionTelemetry | null;
  stage: RuntimeValidationStage;
  message: string;
  issues: RuntimeValidationIssue[];
  state: EngineStateManager;
  options: EvaluateGraphOptions;
  resolvedRunId: string;
  resolvedRunStartedAt: string;
  sanitizedEdges: Edge[];
  nodeById: Map<string, AiNode>;
  activationHash?: string | null;
};

export const applyValidationBlockedNodeState = async (
  args: ApplyValidationBlockedNodeStateArgs
): Promise<void> => {
  const {
    node,
    nodeInputs,
    iteration,
    attempt,
    nodeDurationMs,
    runtimeTelemetry,
    stage,
    message,
    issues,
    state,
    options,
    resolvedRunId,
    resolvedRunStartedAt,
    sanitizedEdges,
    nodeById,
    activationHash = null,
  } = args;
  const spanId = `${node.id}:${attempt}:${iteration}`;
  const blockedOutputs: RuntimePortValues = {
    status: 'blocked',
    skipReason: 'validation',
    blockedReason: 'validation',
    message: message,
    validationStage: stage,
    validationIssues: cloneValue(issues),
  };
  state.blockedNodes.add(node.id);
  state.errorNodes.delete(node.id);
  state.timeoutNodes.delete(node.id);
  state.finishedNodes.delete(node.id);
  state.outputs[node.id] = blockedOutputs;

  if (options['recordHistory']) {
    const entries = state.history.get(node.id) ?? [];
    entries.push({
      timestamp: new Date().toISOString(),
      pathId: options.pathId ?? null,
      pathName: options.pathName ?? null,
      traceId: resolvedRunId,
      spanId,
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? null,
      status: 'blocked',
      iteration: iteration,
      attempt,
      inputs: cloneValue(nodeInputs),
      outputs: cloneValue(blockedOutputs),
      inputHash: activationHash,
      skipReason: 'validation',
      error: message,
      inputsFrom: buildInputLinks(node.id, sanitizedEdges, nodeById, nodeInputs),
      outputsTo: [],
      durationMs: nodeDurationMs,
      ...buildRuntimeTelemetryFields(runtimeTelemetry),
    } as RuntimeHistoryEntry);
    state.history.set(node.id, entries);
  }

  if (options.profile?.onEvent) {
    options.profile.onEvent({
      type: 'node',
      runId: resolvedRunId,
      runStartedAt: resolvedRunStartedAt,
      nodeId: node.id,
      nodeType: node.type,
      iteration: iteration,
      status: 'skipped',
      durationMs: nodeDurationMs,
      reason: 'validation',
      ...buildRuntimeTelemetryFields(runtimeTelemetry),
    });
  }

  if (options.onNodeBlocked) {
    await options.onNodeBlocked({
      runId: resolvedRunId,
      traceId: resolvedRunId,
      spanId,
      node: node,
      iteration,
      attempt,
      reason: 'validation',
      status: 'blocked',
      message: message,
      waitingOnPorts: [],
      waitingOnDetails: [],
      ...buildRuntimeTelemetryFields(runtimeTelemetry),
    });
  }
};
