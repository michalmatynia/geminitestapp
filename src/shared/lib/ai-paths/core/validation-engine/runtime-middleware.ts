import type {
  AiNode,
  AiPathsValidationConfig,
  AiPathsValidationFinding,
  Edge,
} from '@/shared/contracts/ai-paths';
import type {
  RuntimeValidationIssue,
  RuntimeValidationMiddleware,
  RuntimeValidationResult,
  RuntimeValidationStage,
} from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';

import { normalizeAiPathsValidationConfig } from './defaults';
import { evaluateAiPathsValidationAtStage } from './evaluator';

export type CreateAiPathsRuntimeValidationMiddlewareInput = {
  config: AiPathsValidationConfig | null | undefined;
  nodes: AiNode[];
  edges: Edge[];
  maxIssuesPerDecision?: number | undefined;
};

export type ResolveAiPathsRuntimeValidationMiddlewareInput = {
  validationMiddleware?: RuntimeValidationMiddleware | null | undefined;
  runtimeValidationEnabled?: boolean | undefined;
  runtimeValidationConfig?: AiPathsValidationConfig | null | undefined;
  nodes: AiNode[];
  edges: Edge[];
  maxIssuesPerDecision?: number | undefined;
};

const DEFAULT_MAX_ISSUES_PER_DECISION = 10;

const buildStageLabel = (stage: RuntimeValidationStage): string => {
  switch (stage) {
    case 'graph_parse':
      return 'graph parse';
    case 'graph_bind':
      return 'graph bind';
    case 'node_pre_execute':
      return 'node pre-execute';
    case 'node_post_execute':
      return 'node post-execute';
    default:
      return stage;
  }
};

const toRuntimeValidationIssue = (
  finding: AiPathsValidationFinding,
  stage: RuntimeValidationStage,
  node?: AiNode | null | undefined
): RuntimeValidationIssue => ({
  stage,
  ruleId: finding.ruleId,
  severity: finding.severity,
  message: finding.message,
  nodeId: finding.nodeId ?? node?.id ?? null,
  nodeTitle: finding.nodeTitle ?? node?.title ?? null,
  docsBindings: finding.docsBindings,
  metadata: {
    failedConditionIds: finding.failedConditionIds,
    module: finding.module,
  },
});

const resolveValidationDecision = (report: {
  blocked: boolean;
  severityCounts: Record<'error' | 'warning' | 'info', number>;
  shouldWarn: boolean;
  failedRules: number;
}): RuntimeValidationResult['decision'] => {
  if (report.blocked || report.severityCounts.error > 0) return 'block';
  if (report.shouldWarn || report.failedRules > 0) return 'warn';
  return 'pass';
};

const resolveValidationMessage = (args: {
  stage: RuntimeValidationStage;
  node?: AiNode | null | undefined;
  decision: Exclude<RuntimeValidationResult['decision'], 'pass'>;
  issues: RuntimeValidationIssue[];
}): string => {
  const { stage, node, decision, issues } = args;
  const focus = node ? `node "${node.title ?? node.id}"` : 'graph';
  const stageLabel = buildStageLabel(stage);
  const firstMessage = issues[0]?.message;
  const prefix =
    decision === 'block'
      ? `Runtime validation blocked ${focus} during ${stageLabel}.`
      : `Runtime validation warning for ${focus} during ${stageLabel}.`;
  return firstMessage ? `${prefix} ${firstMessage}` : prefix;
};

export const createAiPathsRuntimeValidationMiddleware = ({
  config,
  nodes,
  edges,
  maxIssuesPerDecision,
}: CreateAiPathsRuntimeValidationMiddlewareInput): RuntimeValidationMiddleware | undefined => {
  const normalizedConfig = normalizeAiPathsValidationConfig(config);
  if (!normalizedConfig.enabled) return undefined;

  const issueLimit =
    typeof maxIssuesPerDecision === 'number' && Number.isFinite(maxIssuesPerDecision)
      ? Math.max(1, Math.trunc(maxIssuesPerDecision))
      : DEFAULT_MAX_ISSUES_PER_DECISION;

  return ({ stage, node }): RuntimeValidationResult | null => {
    const report = evaluateAiPathsValidationAtStage({
      nodes,
      edges,
      config: normalizedConfig,
      stage,
      ...(node ? { node } : {}),
    });

    if (!report.enabled || report.rulesEvaluated === 0 || report.failedRules === 0) {
      return null;
    }

    const decision = resolveValidationDecision(report);
    if (decision === 'pass') {
      return null;
    }

    const issues = report.findings
      .map(
        (finding: AiPathsValidationFinding): RuntimeValidationIssue =>
          toRuntimeValidationIssue(finding, stage, node)
      )
      .slice(0, issueLimit);

    return {
      decision,
      message: resolveValidationMessage({
        stage,
        node,
        decision,
        issues,
      }),
      issues,
    };
  };
};

export const resolveAiPathsRuntimeValidationMiddleware = (
  input: ResolveAiPathsRuntimeValidationMiddlewareInput
): RuntimeValidationMiddleware | undefined => {
  const override = input.validationMiddleware;
  if (typeof override === 'function') {
    return override;
  }
  if (input.runtimeValidationEnabled === false) {
    return undefined;
  }
  return createAiPathsRuntimeValidationMiddleware({
    config: input.runtimeValidationConfig ?? null,
    nodes: input.nodes,
    edges: input.edges,
    maxIssuesPerDecision: input.maxIssuesPerDecision,
  });
};
