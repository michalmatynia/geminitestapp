import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

export type DependencyRiskSeverity = 'warning' | 'error';

export type DependencyRisk = {
  id: string;
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
  severity: DependencyRiskSeverity;
  category: string;
  message: string;
  recommendation: string;
};

export type DependencyReport = {
  risks: DependencyRisk[];
  warnings: number;
  errors: number;
  strictReady: boolean;
};

export type DependencyInspectorScopeMode = 'full' | 'reachable_from_roots';

export type DependencyInspectorOptions = {
  scopeMode?: DependencyInspectorScopeMode;
  scopeRootNodeIds?: string[] | Set<string>;
};

const TEMPLATE_TOKEN_REGEX: RegExp = /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/g;

const TEMPLATE_SYSTEM_ROOT_PREFIXES = ['Date:', 'DB Provider:', 'Collection:'];

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveEdgeFromNodeId = (edge: Edge): string | null =>
  normalizeNonEmptyString(edge.from) ?? normalizeNonEmptyString(edge.source);

const resolveEdgeToNodeId = (edge: Edge): string | null =>
  normalizeNonEmptyString(edge.to) ?? normalizeNonEmptyString(edge.target);

const getIncomingPorts = (nodeId: string, edges: Edge[]): Set<string> => {
  const ports = new Set<string>();
  edges.forEach((edge: Edge): void => {
    const targetNodeId = resolveEdgeToNodeId(edge);
    if (targetNodeId !== nodeId) return;
    const toPort =
      normalizeNonEmptyString(edge.toPort) ?? normalizeNonEmptyString(edge.targetHandle);
    if (!toPort) return;
    ports.add(toPort);
  });
  return ports;
};

const hasAnyPort = (ports: Set<string>, candidates: string[]): boolean =>
  candidates.some((candidate: string): boolean => ports.has(candidate));

const normalizeTemplateRoot = (token: string): string => {
  const rootCandidate = token.split('.')[0]?.trim() ?? '';
  return rootCandidate.replace(/\[[^\]]*\]/g, '').trim();
};

const isSystemTemplateRoot = (root: string): boolean =>
  root === 'value' ||
  root === 'current' ||
  TEMPLATE_SYSTEM_ROOT_PREFIXES.some((prefix: string): boolean => root.startsWith(prefix));

const extractTemplateRoots = (template: string): string[] => {
  const roots = new Set<string>();
  TEMPLATE_TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = TEMPLATE_TOKEN_REGEX.exec(template);
  while (match) {
    const token = (match[1] ?? match[2] ?? '').trim();
    if (token) {
      const root = normalizeTemplateRoot(token);
      if (root && !isSystemTemplateRoot(root)) {
        roots.add(root);
      }
    }
    match = TEMPLATE_TOKEN_REGEX.exec(template);
  }
  return Array.from(roots);
};

const collectDatabaseWriteTemplateRoots = (
  node: AiNode
): {
  roots: string[];
  templateLabels: string[];
} => {
  const dbConfig = node.config?.database;
  if (!dbConfig) {
    return { roots: [], templateLabels: [] };
  }
  const operation = dbConfig.operation ?? 'query';
  const isWriteOperation =
    operation === 'update' ||
    operation === 'insert' ||
    operation === 'delete' ||
    (dbConfig.useMongoActions &&
      (dbConfig.actionCategory === 'create' ||
        dbConfig.actionCategory === 'update' ||
        dbConfig.actionCategory === 'delete'));
  if (!isWriteOperation) {
    return { roots: [], templateLabels: [] };
  }

  const templateSources: Array<{ label: string; value: string }> = [
    {
      label: 'database.query.queryTemplate',
      value: normalizeNonEmptyString(dbConfig.query?.queryTemplate) ?? '',
    },
    {
      label: 'database.updateTemplate',
      value: normalizeNonEmptyString(dbConfig.updateTemplate) ?? '',
    },
  ].filter((entry: { label: string; value: string }): boolean => entry.value.length > 0);

  const roots = new Set<string>();
  templateSources.forEach((entry: { label: string; value: string }): void => {
    extractTemplateRoots(entry.value).forEach((root: string): void => {
      roots.add(root);
    });
  });
  return {
    roots: Array.from(roots),
    templateLabels: templateSources.map(
      (entry: { label: string; value: string }): string => entry.label
    ),
  };
};

const pushRisk = (
  risks: DependencyRisk[],
  node: AiNode,
  category: string,
  severity: DependencyRiskSeverity,
  message: string,
  recommendation: string
): void => {
  risks.push({
    id: `${node.id}:${category}`,
    nodeId: node.id,
    nodeTitle: node.title ?? node.id,
    nodeType: node.type,
    severity,
    category,
    message,
    recommendation,
  });
};

const resolveScopedRootNodeIds = (
  nodes: AiNode[],
  edges: Edge[],
  options: DependencyInspectorOptions
): string[] => {
  const nodeIdSet = new Set(nodes.map((node: AiNode): string => node.id));
  const explicitRootIds = (
    Array.isArray(options.scopeRootNodeIds)
      ? options.scopeRootNodeIds
      : options.scopeRootNodeIds
        ? Array.from(options.scopeRootNodeIds)
        : []
  )
    .map((nodeId: string): string => nodeId.trim())
    .filter((nodeId: string): boolean => nodeId.length > 0 && nodeIdSet.has(nodeId));
  const explicitUnique = Array.from(new Set(explicitRootIds));
  if (explicitUnique.length > 0) return explicitUnique;

  const triggerRootIds = nodes
    .filter((node: AiNode): boolean => node.type === 'trigger')
    .map((node: AiNode): string => node.id);
  if (triggerRootIds.length > 0) return triggerRootIds;

  const incomingNodeIds = new Set<string>();
  edges.forEach((edge: Edge): void => {
    const toNodeId = resolveEdgeToNodeId(edge);
    if (!toNodeId || !nodeIdSet.has(toNodeId)) return;
    incomingNodeIds.add(toNodeId);
  });
  const fallbackRootIds = nodes
    .filter((node: AiNode): boolean => !incomingNodeIds.has(node.id))
    .map((node: AiNode): string => node.id);
  if (fallbackRootIds.length > 0) return fallbackRootIds;

  return nodes[0] ? [nodes[0].id] : [];
};

const buildReachableDependencyScope = (
  nodes: AiNode[],
  edges: Edge[],
  options: DependencyInspectorOptions
): { nodes: AiNode[]; edges: Edge[] } => {
  if (nodes.length === 0) return { nodes, edges };

  const nodeIdSet = new Set(nodes.map((node: AiNode): string => node.id));
  const rootNodeIds = resolveScopedRootNodeIds(nodes, edges, options);
  if (rootNodeIds.length === 0) return { nodes, edges };

  const adjacency = new Map<string, Set<string>>();
  edges.forEach((edge: Edge): void => {
    const fromNodeId = resolveEdgeFromNodeId(edge);
    const toNodeId = resolveEdgeToNodeId(edge);
    if (!fromNodeId || !toNodeId) return;
    if (!nodeIdSet.has(fromNodeId) || !nodeIdSet.has(toNodeId)) return;
    const next = adjacency.get(fromNodeId) ?? new Set<string>();
    next.add(toNodeId);
    adjacency.set(fromNodeId, next);
  });

  const queue = [...rootNodeIds];
  const reachableNodeIds = new Set<string>(rootNodeIds);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const next = adjacency.get(current);
    if (!next) continue;
    next.forEach((nodeId: string): void => {
      if (reachableNodeIds.has(nodeId)) return;
      reachableNodeIds.add(nodeId);
      queue.push(nodeId);
    });
  }

  if (reachableNodeIds.size === 0 || reachableNodeIds.size === nodes.length) {
    return { nodes, edges };
  }

  const scopedNodes = nodes.filter((node: AiNode): boolean => reachableNodeIds.has(node.id));
  const scopedNodeIdSet = new Set(scopedNodes.map((node: AiNode): string => node.id));
  const scopedEdges = edges.filter((edge: Edge): boolean => {
    const fromNodeId = resolveEdgeFromNodeId(edge);
    const toNodeId = resolveEdgeToNodeId(edge);
    if (!fromNodeId || !toNodeId) return false;
    return scopedNodeIdSet.has(fromNodeId) && scopedNodeIdSet.has(toNodeId);
  });
  return {
    nodes: scopedNodes,
    edges: scopedEdges,
  };
};

export const inspectPathDependencies = (
  nodes: AiNode[],
  edges: Edge[],
  options: DependencyInspectorOptions = {}
): DependencyReport => {
  if (options.scopeMode === 'reachable_from_roots') {
    const scoped = buildReachableDependencyScope(nodes, edges, options);
    return inspectPathDependencies(scoped.nodes, scoped.edges, {
      ...options,
      scopeMode: 'full',
      scopeRootNodeIds: undefined,
    });
  }

  const risks: DependencyRisk[] = [];

  nodes.forEach((node: AiNode): void => {
    const incomingPorts = getIncomingPorts(node.id, edges);

    if (node.type === 'trigger') return;

    if (node.type === 'parser') {
      if (!incomingPorts.has('entityJson') && !incomingPorts.has('context')) {
        pushRisk(
          risks,
          node,
          'parser_entity_fallback',
          'warning',
          'Parser has no `entityJson` or `context` input and may run with empty source data.',
          'Connect `entityJson` or `context` from upstream nodes.'
        );
      }
      return;
    }

    if (node.type !== 'database') return;

    const waitForInputsEnabled = node.config?.runtime?.waitForInputs === true;
    if (!waitForInputsEnabled) {
      pushRisk(
        risks,
        node,
        'database_wait_for_inputs_disabled',
        'warning',
        'Database node runs without `waitForInputs` guard and can execute on partial data.',
        'Enable `runtime.waitForInputs` in this node configuration.'
      );
    }

    const dbConfig = node.config?.database;
    const operation = dbConfig?.operation ?? 'query';
    if (dbConfig?.updatePayloadMode === 'mapping') {
      pushRisk(
        risks,
        node,
        'database_update_mode_mapping_disallowed',
        'error',
        'Mapping-based update mode is disallowed for Database nodes.',
        'Switch database.updatePayloadMode to `custom` and define explicit query/update templates.'
      );
    }

    if (operation === 'query') {
      const queryMode = dbConfig?.query?.mode ?? 'custom';
      if (queryMode === 'preset') {
        pushRisk(
          risks,
          node,
          'database_query_mode_preset_disallowed',
          'error',
          'Preset query mode is disallowed for Database nodes. Queries must be explicit.',
          'Switch database.query.mode to `custom` and define explicit queryTemplate or query input.'
        );
      }
      const hasQueryInput = hasAnyPort(incomingPorts, ['query', 'queryCallback', 'aiQuery']);
      const queryTemplate = normalizeNonEmptyString(dbConfig?.query?.queryTemplate);
      if (!queryTemplate && !hasQueryInput) {
        pushRisk(
          risks,
          node,
          'database_query_missing_explicit_query',
          'error',
          'Database query has no explicit query template and no explicit query input wiring.',
          'Define database.query.queryTemplate or connect query/queryCallback/aiQuery.'
        );
      }
      return;
    }

    if (operation === 'update' || operation === 'delete') {
      if (
        !hasAnyPort(incomingPorts, ['entityId', 'productId', 'value', 'context', 'bundle', 'meta'])
      ) {
        pushRisk(
          risks,
          node,
          'database_write_missing_identity_inputs',
          'error',
          'Write operation has no connected identity inputs and may rely on hidden fallback IDs.',
          'Connect `entityId`/`productId` (or `value`) from explicit upstream outputs.'
        );
      }
    }

    const templateRootAnalysis = collectDatabaseWriteTemplateRoots(node);
    if (templateRootAnalysis.roots.length > 0) {
      const nodeInputPorts = new Set(
        (Array.isArray(node.inputs) ? node.inputs : [])
          .map((port: string): string => port.trim())
          .filter((port: string): boolean => port.length > 0)
      );
      const missingTemplateRoots = templateRootAnalysis.roots.filter(
        (root: string): boolean => nodeInputPorts.has(root) && !incomingPorts.has(root)
      );
      if (missingTemplateRoots.length > 0) {
        const templatesLabel =
          templateRootAnalysis.templateLabels.length > 0
            ? templateRootAnalysis.templateLabels.join(', ')
            : 'database templates';
        pushRisk(
          risks,
          node,
          'database_write_template_missing_wiring',
          'error',
          `Write template placeholders depend on unwired inputs: ${missingTemplateRoots.join(
            ', '
          )} (${templatesLabel}).`,
          `Wire incoming edges to ${missingTemplateRoots.join(
            ', '
          )}, or rewrite templates to use currently wired ports only.`
        );
      }
    }
  });

  const warnings = risks.filter(
    (risk: DependencyRisk): boolean => risk.severity === 'warning'
  ).length;
  const errors = risks.filter((risk: DependencyRisk): boolean => risk.severity === 'error').length;
  return {
    risks,
    warnings,
    errors,
    strictReady: errors === 0,
  };
};
