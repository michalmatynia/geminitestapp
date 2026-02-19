import type {
  AiNode,
  AiPathsValidationCondition,
  AiPathsValidationConfig,
  AiPathsValidationRule,
  Edge,
} from '@/shared/types/domain/ai-paths';

import { DB_COLLECTION_OPTIONS } from '../constants';
import {
  normalizeAiPathsValidationConfig,
} from './defaults';

export type AiPathsValidationFinding = {
  id: string;
  ruleId: string;
  ruleTitle: string;
  severity: 'error' | 'warning' | 'info';
  module: string;
  nodeId: string | null;
  nodeTitle: string | null;
  message: string;
  recommendation: string | null;
  docsBindings: string[];
  failedConditionIds: string[];
};

export type AiPathsValidationReport = {
  enabled: boolean;
  policy: NonNullable<AiPathsValidationConfig['policy']>;
  score: number;
  blocked: boolean;
  shouldWarn: boolean;
  warnThreshold: number;
  blockThreshold: number;
  rulesEvaluated: number;
  failedRules: number;
  findings: AiPathsValidationFinding[];
  severityCounts: Record<'error' | 'warning' | 'info', number>;
};

export type EvaluateAiPathsValidationInput = {
  nodes: AiNode[];
  edges: Edge[];
  config: AiPathsValidationConfig | null | undefined;
};

const DEFAULT_SEVERITY_WEIGHT: Record<'error' | 'warning' | 'info', number> = {
  error: 25,
  warning: 12,
  info: 5,
};

const COLLECTION_ALLOWLIST = new Set(
  DB_COLLECTION_OPTIONS.map((option) => option.value)
);

const clampScore = (value: number): number =>
  Math.max(0, Math.min(100, Math.trunc(value)));

const normalizePathToken = (value: string): string =>
  value
    .trim()
    .replace(/^\$\./, '')
    .replace(/^\$\[/, '[');

const resolvePathValue = (input: unknown, path: string | undefined): unknown => {
  if (!path || !path.trim()) return input;
  const normalizedPath = normalizePathToken(path);
  if (!normalizedPath) return input;

  const tokens = normalizedPath
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((token) => token.trim())
    .filter(Boolean);

  let cursor: unknown = input;
  for (const token of tokens) {
    if (cursor === null || cursor === undefined) return undefined;
    if (typeof cursor !== 'object') return undefined;
    const record = cursor as Record<string, unknown>;
    cursor = record[token];
  }
  return cursor;
};

const toText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
};

const buildGraphContext = (nodes: AiNode[], edges: Edge[]): Record<string, unknown> => {
  const countsByType = nodes.reduce<Record<string, number>>(
    (acc: Record<string, number>, node: AiNode): Record<string, number> => {
      const key = node.type;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {}
  );
  return {
    counts: {
      nodes: nodes.length,
      edges: edges.length,
      byType: countsByType,
    },
  };
};

const normalizeEntityType = (value: unknown): string => {
  const normalized = toText(value).trim().toLowerCase();
  if (!normalized) return 'product';
  if (normalized === 'products') return 'product';
  if (normalized === 'notes') return 'note';
  return normalized;
};

const getNodeValue = (
  node: AiNode,
  graphContext: Record<string, unknown>,
  condition: AiPathsValidationCondition
): unknown => {
  const path = condition.valuePath ?? condition.field;
  if (!path) return undefined;
  if ((condition.module ?? '').trim().toLowerCase() === 'graph') {
    return resolvePathValue(graphContext, path);
  }
  return resolvePathValue(node, path);
};

const edgeToNodeId = (edge: Edge): string | null => {
  if (typeof edge.to === 'string' && edge.to.trim().length > 0) return edge.to;
  if (typeof edge.target === 'string' && edge.target.trim().length > 0) return edge.target;
  return null;
};

const edgeFromNodeId = (edge: Edge): string | null => {
  if (typeof edge.from === 'string' && edge.from.trim().length > 0) return edge.from;
  if (typeof edge.source === 'string' && edge.source.trim().length > 0) return edge.source;
  return null;
};

const edgeToPort = (edge: Edge): string | null => {
  if (typeof edge.toPort === 'string' && edge.toPort.trim().length > 0) return edge.toPort;
  if (typeof edge.targetHandle === 'string' && edge.targetHandle.trim().length > 0) {
    return edge.targetHandle;
  }
  return null;
};

const edgeFromPort = (edge: Edge): string | null => {
  if (typeof edge.fromPort === 'string' && edge.fromPort.trim().length > 0) return edge.fromPort;
  if (typeof edge.sourceHandle === 'string' && edge.sourceHandle.trim().length > 0) {
    return edge.sourceHandle;
  }
  return null;
};

const isAllowedCollection = (value: string): boolean => {
  const normalized = value.trim();
  if (!normalized) return false;
  if (COLLECTION_ALLOWLIST.has(normalized)) return true;
  if (COLLECTION_ALLOWLIST.has('custom')) return normalized.length > 0;
  return false;
};

const evaluateCondition = (args: {
  condition: AiPathsValidationCondition;
  rule: AiPathsValidationRule;
  node: AiNode | null;
  nodesById: Map<string, AiNode>;
  edges: Edge[];
  graphContext: Record<string, unknown>;
  config: AiPathsValidationConfig;
}): boolean => {
  const { condition, rule, node, nodesById, edges, graphContext, config } = args;

  const evaluate = (): boolean => {
    switch (condition.operator) {
      case 'exists': {
        if (rule.module === 'graph') {
          return resolvePathValue(graphContext, condition.valuePath ?? condition.field) !== undefined;
        }
        if (!node) return false;
        return resolvePathValue(node, condition.valuePath ?? condition.field) !== undefined;
      }
      case 'non_empty': {
        if (rule.module === 'graph') {
          return hasMeaningfulValue(
            resolvePathValue(graphContext, condition.valuePath ?? condition.field)
          );
        }
        if (!node) return false;
        return hasMeaningfulValue(resolvePathValue(node, condition.valuePath ?? condition.field));
      }
      case 'equals': {
        if (rule.module === 'graph') {
          return resolvePathValue(graphContext, condition.valuePath ?? condition.field) === condition.expected;
        }
        if (!node) return false;
        return resolvePathValue(node, condition.valuePath ?? condition.field) === condition.expected;
      }
      case 'in': {
        const list =
          Array.isArray(condition.list)
            ? condition.list
            : Array.isArray(condition.expected)
              ? (condition.expected as string[])
              : [];
        if (list.length === 0) return false;
        const value = rule.module === 'graph'
          ? resolvePathValue(graphContext, condition.valuePath ?? condition.field)
          : node
            ? resolvePathValue(node, condition.valuePath ?? condition.field)
            : undefined;
        return list.includes(toText(value));
      }
      case 'matches_regex': {
        const pattern =
          typeof condition.expected === 'string'
            ? condition.expected
            : Array.isArray(condition.list) && condition.list.length > 0
              ? condition.list[0]
              : '';
        if (!pattern) return false;
        let regex: RegExp;
        try {
          regex = new RegExp(pattern, condition.flags);
        } catch {
          return false;
        }
        const value = rule.module === 'graph'
          ? resolvePathValue(graphContext, condition.valuePath ?? condition.field)
          : node
            ? resolvePathValue(node, condition.valuePath ?? condition.field)
            : undefined;
        return regex.test(toText(value));
      }
      case 'jsonpath_exists': {
        const value = resolvePathValue(
          rule.module === 'graph' ? graphContext : node,
          condition.valuePath ?? condition.field
        );
        return value !== undefined;
      }
      case 'jsonpath_equals': {
        const value = resolvePathValue(
          rule.module === 'graph' ? graphContext : node,
          condition.valuePath ?? condition.field
        );
        if (typeof condition.expected === 'number' && typeof value === 'number') {
          return value >= condition.expected;
        }
        return value === condition.expected;
      }
      case 'has_incoming_port': {
        if (!node) return false;
        return edges.some((edge: Edge): boolean => {
          if (edgeToNodeId(edge) !== node.id) return false;
          if (!condition.port) return true;
          return edgeToPort(edge) === condition.port;
        });
      }
      case 'has_outgoing_port': {
        if (!node) return false;
        return edges.some((edge: Edge): boolean => {
          if (edgeFromNodeId(edge) !== node.id) return false;
          if (!condition.port) return true;
          return edgeFromPort(edge) === condition.port;
        });
      }
      case 'wired_from': {
        if (!node) return false;
        return edges.some((edge: Edge): boolean => {
          if (edgeToNodeId(edge) !== node.id) return false;
          if (condition.toPort && edgeToPort(edge) !== condition.toPort) return false;
          if (condition.fromPort && edgeFromPort(edge) !== condition.fromPort) return false;
          const sourceId = edgeFromNodeId(edge);
          if (!sourceId) return false;
          if (condition.sourceNodeId && sourceId !== condition.sourceNodeId) return false;
          if (condition.fromNodeType) {
            const sourceNode = nodesById.get(sourceId);
            if (!sourceNode || sourceNode.type !== condition.fromNodeType) return false;
          }
          return true;
        });
      }
      case 'wired_to': {
        if (!node) return false;
        return edges.some((edge: Edge): boolean => {
          if (edgeFromNodeId(edge) !== node.id) return false;
          if (condition.fromPort && edgeFromPort(edge) !== condition.fromPort) return false;
          if (condition.toPort && edgeToPort(edge) !== condition.toPort) return false;
          const targetId = edgeToNodeId(edge);
          if (!targetId) return false;
          if (condition.targetNodeId && targetId !== condition.targetNodeId) return false;
          if (condition.toNodeType) {
            const targetNode = nodesById.get(targetId);
            if (!targetNode || targetNode.type !== condition.toNodeType) return false;
          }
          return true;
        });
      }
      case 'collection_exists': {
        if (!node) return false;
        const raw = resolvePathValue(
          node,
          condition.field ?? condition.valuePath ?? 'config.database.query.collection'
        );
        return isAllowedCollection(toText(raw));
      }
      case 'entity_collection_resolves': {
        if (!node) return false;
        const entityType = normalizeEntityType(
          resolvePathValue(node, 'config.simulation.entityType')
        );
        const entityId =
          toText(resolvePathValue(node, 'config.simulation.entityId')).trim() ||
          toText(resolvePathValue(node, 'config.simulation.productId')).trim();
        const collectionMap =
          config.collectionMap && typeof config.collectionMap === 'object'
            ? config.collectionMap
            : {};
        const mappedCollection = toText(collectionMap[entityType]).trim();
        return entityId.length > 0 && mappedCollection.length > 0;
      }
      default:
        return false;
    }
  };

  const result = evaluate();
  return condition.negate ? !result : result;
};

const matchesRuleNode = (rule: AiPathsValidationRule, node: AiNode): boolean => {
  if (rule.module === 'graph') return false;
  if (rule.module !== 'custom' && node.type !== rule.module) {
    if (
      !Array.isArray(rule.appliesToNodeTypes) ||
      rule.appliesToNodeTypes.length === 0 ||
      !rule.appliesToNodeTypes.includes(node.type)
    ) {
      return false;
    }
  }
  if (!Array.isArray(rule.appliesToNodeTypes) || rule.appliesToNodeTypes.length === 0) {
    return true;
  }
  return rule.appliesToNodeTypes.includes(node.type);
};

const evaluateRuleForNode = (args: {
  rule: AiPathsValidationRule;
  node: AiNode | null;
  nodesById: Map<string, AiNode>;
  edges: Edge[];
  graphContext: Record<string, unknown>;
  config: AiPathsValidationConfig;
}): { passed: boolean; failedConditions: string[] } => {
  const { rule, node, nodesById, edges, graphContext, config } = args;
  const mode = rule.conditionMode === 'any' ? 'any' : 'all';
  const checks = rule.conditions.map((condition: AiPathsValidationCondition): boolean =>
    evaluateCondition({
      condition,
      rule,
      node,
      nodesById,
      edges,
      graphContext,
      config,
    })
  );
  const passed =
    mode === 'any' ? checks.some((value: boolean): boolean => value) : checks.every((value: boolean): boolean => value);
  const failedConditions = rule.conditions
    .filter((condition: AiPathsValidationCondition, index: number): boolean => !checks[index])
    .map((condition: AiPathsValidationCondition): string => condition.id);
  return { passed, failedConditions };
};

export const evaluateAiPathsValidationPreflight = ({
  nodes,
  edges,
  config,
}: EvaluateAiPathsValidationInput): AiPathsValidationReport => {
  const normalizedConfig = normalizeAiPathsValidationConfig(config);
  const policy = normalizedConfig.policy ?? 'block_below_threshold';
  const baseScore =
    typeof normalizedConfig.baseScore === 'number'
      ? clampScore(normalizedConfig.baseScore)
      : 100;

  if (!normalizedConfig.enabled) {
    return {
      enabled: false,
      policy,
      score: 100,
      blocked: false,
      shouldWarn: false,
      warnThreshold: normalizedConfig.warnThreshold ?? 70,
      blockThreshold: normalizedConfig.blockThreshold ?? 50,
      rulesEvaluated: 0,
      failedRules: 0,
      findings: [],
      severityCounts: { error: 0, warning: 0, info: 0 },
    };
  }

  const nodesById = new Map<string, AiNode>(
    nodes.map((node: AiNode): [string, AiNode] => [node.id, node])
  );
  const graphContext = buildGraphContext(nodes, edges);
  const orderedRules = (normalizedConfig.rules ?? [])
    .filter((rule: AiPathsValidationRule): boolean => rule.enabled !== false)
    .slice()
    .sort((a: AiPathsValidationRule, b: AiPathsValidationRule): number => {
      const left = typeof a.sequence === 'number' ? a.sequence : 0;
      const right = typeof b.sequence === 'number' ? b.sequence : 0;
      if (left !== right) return left - right;
      return a.id.localeCompare(b.id);
    });

  const findings: AiPathsValidationFinding[] = [];
  let score = baseScore;
  let rulesEvaluated = 0;
  let failedRules = 0;

  const evaluateAndCollectFinding = (rule: AiPathsValidationRule, node: AiNode | null): void => {
    rulesEvaluated += 1;
    const evaluation = evaluateRuleForNode({
      rule,
      node,
      nodesById,
      edges,
      graphContext,
      config: normalizedConfig,
    });
    if (evaluation.passed) return;

    failedRules += 1;
    const weight =
      typeof rule.weight === 'number' && Number.isFinite(rule.weight)
        ? Math.max(0, Math.trunc(rule.weight))
        : DEFAULT_SEVERITY_WEIGHT[rule.severity ?? 'warning'];
    score = clampScore(score - weight);

    if (
      typeof rule.forceProbabilityIfFailed === 'number' &&
      Number.isFinite(rule.forceProbabilityIfFailed)
    ) {
      score = Math.min(score, clampScore(rule.forceProbabilityIfFailed));
    }

    findings.push({
      id: `${rule.id}:${node?.id ?? 'graph'}`,
      ruleId: rule.id,
      ruleTitle: rule.title,
      severity: rule.severity ?? 'warning',
      module: rule.module,
      nodeId: node?.id ?? null,
      nodeTitle: node?.title ?? null,
      message: rule.description?.trim() || `${rule.title} validation failed.`,
      recommendation: rule.recommendation?.trim() || null,
      docsBindings: Array.isArray(rule.docsBindings) ? rule.docsBindings : [],
      failedConditionIds: evaluation.failedConditions,
    });
  };

  orderedRules.forEach((rule: AiPathsValidationRule): void => {
    if (rule.module === 'graph') {
      evaluateAndCollectFinding(rule, null);
      return;
    }

    const matchingNodes = nodes.filter((node: AiNode): boolean => matchesRuleNode(rule, node));
    if (matchingNodes.length === 0) {
      // Evaluate once against null so misconfigured rules can still fail visibly.
      evaluateAndCollectFinding(rule, null);
      return;
    }
    matchingNodes.forEach((node: AiNode): void => {
      evaluateAndCollectFinding(rule, node);
    });
  });

  const severityCounts = findings.reduce<Record<'error' | 'warning' | 'info', number>>(
    (acc: Record<'error' | 'warning' | 'info', number>, finding: AiPathsValidationFinding) => {
      const key = finding.severity;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    { error: 0, warning: 0, info: 0 }
  );

  const warnThreshold = normalizedConfig.warnThreshold ?? 70;
  const blockThreshold = normalizedConfig.blockThreshold ?? 50;
  const blocked = policy === 'block_below_threshold' ? score < blockThreshold : false;
  const shouldWarn =
    policy === 'warn_below_threshold'
      ? score < warnThreshold || severityCounts.warning > 0 || severityCounts.error > 0
      : policy === 'block_below_threshold'
        ? !blocked && (score < warnThreshold || severityCounts.warning > 0)
        : severityCounts.warning > 0 || severityCounts.error > 0;

  return {
    enabled: true,
    policy,
    score,
    blocked,
    shouldWarn,
    warnThreshold,
    blockThreshold,
    rulesEvaluated,
    failedRules,
    findings,
    severityCounts,
  };
};
