import { AiNode, Edge, RuntimePortValues } from '@/shared/contracts/ai-paths';
import {
  RuntimeHistoryEntry,
} from '@/shared/contracts/ai-paths-runtime';
import { cloneValue } from '../utils';
import {
  type EvaluateGraphOptions,
  type RuntimeValidationIssue,
  type RuntimeValidationStage,
  type RuntimeNodeResolutionTelemetry,
} from './engine-types';
import { EngineStateManager } from './engine-state-manager';

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
    .filter(
      (issue: RuntimeValidationIssue | null | undefined): issue is RuntimeValidationIssue => {
        if (!issue) return false;
        return typeof issue.message === 'string' && issue.message.trim().length > 0;
      }
    )
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

export const runRuntimeValidation = async (args: RunRuntimeValidationArgs): Promise<{
  decision: 'warn' | 'block';
  message: string;
  issues: RuntimeValidationIssue[];
} | null> => {
  const { options, stage, node = null, resolvedRunId, resolvedRunStartedAt, nodes, sanitizedEdges } = args;
  if (!options.validationMiddleware) return null;

  let validationResult:
    | {
        decision: 'pass' | 'warn' | 'block';
        message?: string;
        issues?: RuntimeValidationIssue[];
      }
    | null
    | undefined = null;
  try {
    validationResult = await options.validationMiddleware({
      stage,
      runId: resolvedRunId,
      runStartedAt: resolvedRunStartedAt,
      iteration: args.iteration,
      node,
      nodeInputs: args.nodeInputs,
      nodeOutputs: args.nodeOutputs,
      nodes,
      edges: sanitizedEdges,
    });
  } catch (error) {
    options.reportAiPathsError(error, {
      action: 'runtime_validation_middleware',
      stage,
      nodeId: node?.id ?? null,
      iteration: args.iteration,
      runId: resolvedRunId,
    });
    throw error;
  }

  if (!validationResult || validationResult.decision === 'pass') {
    return null;
  }

  const decision = validationResult.decision === 'block' ? 'block' : 'warn';
  const issues = normalizeRuntimeValidationIssues(validationResult.issues, stage, node);
  const fallbackMessage =
    decision === 'block'
      ? `Runtime validation blocked ${node ? `node ${node.id}` : 'graph'} at stage ${stage}.`
      : `Runtime validation warning for ${node ? `node ${node.id}` : 'graph'} at stage ${stage}.`;
  const message =
    typeof validationResult.message === 'string' && validationResult.message.trim().length > 0
      ? validationResult.message.trim()
      : (issues[0]?.message ?? fallbackMessage);

  if (options.onRuntimeValidation) {
    try {
      await options.onRuntimeValidation({
        runId: resolvedRunId,
        runStartedAt: resolvedRunStartedAt,
        iteration: args.iteration,
        stage,
        decision,
        node,
        nodeInputs: args.nodeInputs,
        nodeOutputs: args.nodeOutputs,
        message,
        issues,
        ...buildRuntimeTelemetryFields(args.runtimeTelemetry ?? null),
      });
    } catch (error) {
      options.reportAiPathsError(error, {
        action: 'onRuntimeValidation',
        stage,
        nodeId: node?.id ?? null,
        iteration: args.iteration,
        runId: resolvedRunId,
      });
    }
  }

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
  nodeDurationMs: number;
  runtimeTelemetry: RuntimeNodeResolutionTelemetry | null;
  stage: RuntimeValidationStage;
  message: string;
  issues: RuntimeValidationIssue[];
  state: EngineStateManager;
  options: EvaluateGraphOptions;
  resolvedRunId: string;
  resolvedRunStartedAt: string;
};

export const applyValidationBlockedNodeState = async (args: ApplyValidationBlockedNodeStateArgs): Promise<void> => {
  const { node, nodeInputs, iteration, nodeDurationMs, runtimeTelemetry, stage, message, issues, state, options, resolvedRunId, resolvedRunStartedAt } = args;
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
      pathName: null,
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? null,
      status: 'blocked',
      iteration: iteration,
      inputs: cloneValue(nodeInputs),
      outputs: cloneValue(blockedOutputs),
      skipReason: 'validation',
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
      node: node,
      reason: 'validation',
      status: 'blocked',
      message: message,
      waitingOnPorts: [],
      waitingOnDetails: [],
      ...buildRuntimeTelemetryFields(runtimeTelemetry),
    });
  }
};
