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
import {
  getResolvedNodeInputPortContract,
  getResolvedNodeOutputPortContract,
  type ResolvedNodePortContract,
} from '../utils/graph.nodes';
import {
  getPortDataTypesForValueKind,
  getValueTypeLabel,
  isValueCompatibleWithTypes,
} from '../utils/port-types';

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
const normalizePortLabel = (port: string): string => port.trim();

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getNodeLabel = (node: AiNode): string => node.title?.trim() || node.id;

const describeExpectedKind = (kind: ResolvedNodePortContract['kind']): string => {
  switch (kind) {
    case 'image_url':
      return 'imageUrl';
    case 'job_envelope':
      return 'jobEnvelope';
    case 'bundle':
      return 'bundle';
    case 'json':
      return 'json';
    case 'string':
    case 'number':
    case 'boolean':
      return kind;
    case 'unknown':
    default:
      return 'value';
  }
};

const describeExpectedContract = (contract: ResolvedNodePortContract): string => {
  const kindLabel = describeExpectedKind(contract.kind);
  return contract.cardinality === 'many' ? `${kindLabel}[]` : kindLabel;
};

const normalizeActualTypeLabel = (value: unknown): string => {
  const label = getValueTypeLabel(value);
  return label === 'image' ? 'imageUrl' : label;
};

const describeActualValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'empty[]';
    const itemTypes = Array.from(
      new Set(value.map((item: unknown) => normalizeActualTypeLabel(item)))
    );
    return itemTypes.length === 1 ? `${itemTypes[0]}[]` : `array<${itemTypes.join(' | ')}>`;
  }
  return normalizeActualTypeLabel(value);
};

const validateJsonSchemaType = (
  value: unknown,
  schema: Record<string, unknown>,
  path = 'value'
): string | null => {
  const type = typeof schema['type'] === 'string' ? schema['type'].trim().toLowerCase() : '';
  if (type) {
    const typeMatches =
      (type === 'object' && isObjectRecord(value)) ||
      (type === 'array' && Array.isArray(value)) ||
      (type === 'string' && typeof value === 'string') ||
      (type === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
      (type === 'integer' && typeof value === 'number' && Number.isInteger(value)) ||
      (type === 'boolean' && typeof value === 'boolean');
    if (!typeMatches) {
      return `${path} expected ${type}, got ${describeActualValue(value)}.`;
    }
  }

  if (Array.isArray(schema['required']) && isObjectRecord(value)) {
    for (const key of schema['required']) {
      if (typeof key !== 'string' || key.trim().length === 0) continue;
      if (value[key] === undefined) {
        return `${path}.${key} is required.`;
      }
    }
  }

  const properties = schema['properties'];
  if (isObjectRecord(properties) && isObjectRecord(value)) {
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (value[key] === undefined || !isObjectRecord(propertySchema)) continue;
      const nestedError = validateJsonSchemaType(value[key], propertySchema, `${path}.${key}`);
      if (nestedError) return nestedError;
    }
  }

  const items = schema['items'];
  if (Array.isArray(value) && isObjectRecord(items)) {
    for (let index = 0; index < value.length; index += 1) {
      const nestedError = validateJsonSchemaType(value[index], items, `${path}[${index}]`);
      if (nestedError) return nestedError;
    }
  }

  return null;
};

const validatePortContractValue = (args: {
  node: AiNode;
  port: string;
  value: unknown;
  direction: 'input' | 'output';
  contract: ResolvedNodePortContract;
}): RuntimeValidationIssue[] => {
  const { node, port, value, direction, contract } = args;
  const issues: RuntimeValidationIssue[] = [];
  const hasExecutableContract =
    contract.kind !== 'unknown' ||
    contract.schema !== undefined ||
    contract.schemaRef !== undefined ||
    contract.cardinalitySource !== 'legacy';

  if (!hasExecutableContract || value === undefined) {
    return issues;
  }

  const label = direction === 'input' ? 'Input' : 'Output';
  const portLabel = normalizePortLabel(port);
  const nodeLabel = getNodeLabel(node);

  if (
    contract.cardinality === 'single' &&
    contract.cardinalitySource !== 'legacy' &&
    Array.isArray(value)
  ) {
    issues.push({
      stage: direction === 'input' ? 'node_pre_execute' : 'node_post_execute',
      severity: 'error',
      message: `${label} port "${portLabel}" on node "${nodeLabel}" expected ${describeExpectedContract(contract)}, got ${describeActualValue(value)}.`,
      nodeId: node.id,
      nodeTitle: node.title ?? null,
      metadata: {
        direction,
        port: portLabel,
        expected: describeExpectedContract(contract),
        actual: describeActualValue(value),
        schemaRef: contract.schemaRef,
      },
    });
    return issues;
  }

  const valuesToValidate: unknown[] = Array.isArray(value)
    ? value.map((entry: unknown): unknown => entry)
    : [value];
  if (contract.kind !== 'unknown') {
    const expectedTypes = getPortDataTypesForValueKind(contract.kind);
    const incompatibleValue = valuesToValidate.find(
      (entry: unknown): boolean => !isValueCompatibleWithTypes(entry, expectedTypes)
    );
    if (incompatibleValue !== undefined) {
      issues.push({
        stage: direction === 'input' ? 'node_pre_execute' : 'node_post_execute',
        severity: 'error',
        message: `${label} port "${portLabel}" on node "${nodeLabel}" expected ${describeExpectedContract(contract)}, got ${describeActualValue(value)}.`,
        nodeId: node.id,
        nodeTitle: node.title ?? null,
        metadata: {
          direction,
          port: portLabel,
          expected: describeExpectedContract(contract),
          actual: describeActualValue(value),
          schemaRef: contract.schemaRef,
        },
      });
      return issues;
    }
  }

  if (contract.schema && isObjectRecord(contract.schema)) {
    const schemaError = validateJsonSchemaType(value, contract.schema);
    if (schemaError) {
      issues.push({
        stage: direction === 'input' ? 'node_pre_execute' : 'node_post_execute',
        severity: 'error',
        message: `${label} port "${portLabel}" on node "${nodeLabel}" failed schema validation: ${schemaError}`,
        nodeId: node.id,
        nodeTitle: node.title ?? null,
        metadata: {
          direction,
          port: portLabel,
          expected: describeExpectedContract(contract),
          actual: describeActualValue(value),
          schemaRef: contract.schemaRef,
        },
      });
    }
  }

  return issues;
};

const collectDeclaredPorts = (
  ports: Array<string | undefined>,
  contracts: Record<string, unknown> | undefined
): string[] =>
  Array.from(
    new Set(
      [...ports, ...Object.keys(contracts ?? {})]
        .filter((port): port is string => typeof port === 'string' && port.trim().length > 0)
        .map((port: string) => port.trim())
    )
  );

const buildBuiltInContractIssues = (args: {
  stage: RuntimeValidationStage;
  node: AiNode | null | undefined;
  nodeInputs?: Record<string, unknown> | undefined;
  nodeOutputs?: Record<string, unknown> | undefined;
}): RuntimeValidationIssue[] => {
  const { stage, node } = args;
  if (!node) return [];
  if (stage === 'node_pre_execute') {
    const ports = collectDeclaredPorts(node.inputs ?? [], {
      ...(node.inputContracts ?? {}),
      ...((node.config?.runtime?.inputContracts as Record<string, unknown> | undefined) ?? {}),
    });
    return ports.flatMap((port: string): RuntimeValidationIssue[] =>
      validatePortContractValue({
        node,
        port,
        value: args.nodeInputs?.[port],
        direction: 'input',
        contract: getResolvedNodeInputPortContract(node, port),
      })
    );
  }
  if (stage === 'node_post_execute') {
    const ports = collectDeclaredPorts(node.outputs ?? [], node.outputContracts ?? {});
    return ports.flatMap((port: string): RuntimeValidationIssue[] =>
      validatePortContractValue({
        node,
        port,
        value: args.nodeOutputs?.[port],
        direction: 'output',
        contract: getResolvedNodeOutputPortContract(node, port),
      })
    );
  }
  return [];
};

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

  return ({ stage, node, nodeInputs, nodeOutputs }): RuntimeValidationResult | null => {
    const builtInIssues = buildBuiltInContractIssues({
      stage,
      node,
      nodeInputs,
      nodeOutputs,
    });
    const report = evaluateAiPathsValidationAtStage({
      nodes,
      edges,
      config: normalizedConfig,
      stage,
      ...(node ? { node } : {}),
    });

    const hasRuleFailures = report.enabled && report.rulesEvaluated > 0 && report.failedRules > 0;
    if (!hasRuleFailures && builtInIssues.length === 0) {
      return null;
    }

    const decision = builtInIssues.length > 0 ? 'block' : resolveValidationDecision(report);
    if (decision === 'pass' && builtInIssues.length === 0) {
      return null;
    }

    const issues = [
      ...builtInIssues,
      ...(hasRuleFailures
        ? report.findings.map(
          (finding: AiPathsValidationFinding): RuntimeValidationIssue =>
            toRuntimeValidationIssue(finding, stage, node)
        )
        : []),
    ].slice(0, issueLimit);

    return {
      decision,
      message:
        builtInIssues[0]?.message ??
        resolveValidationMessage({
          stage,
          node,
          decision: decision as 'block' | 'warn',
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
