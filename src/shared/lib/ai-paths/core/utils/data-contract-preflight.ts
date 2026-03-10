import type {
  AiNode,
  Edge,
  ParserSampleState,
  UpdaterSampleState,
  DataContractPreflightMode,
  DataContractPreflightScopeMode,
  DataContractIssueSeverity,
  DataContractIssueCode,
  DataContractPreflightIssue,
  DataContractNodeIssueSummary,
  DataContractPreflightReport,
  EvaluateDataContractPreflightArgs,
} from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { getNodeInputPortContract, normalizePortName, sanitizeEdges } from './graph';
import { getValueAtMappingPath } from './json';
import {
  arePortTypesCompatible,
  formatPortDataTypes,
  getPortDataTypes,
  getValueTypeLabel,
  isValueCompatibleWithTypes,
} from './port-types';
import { parseJsonSafe } from './runtime';

export type {
  DataContractPreflightMode,
  DataContractPreflightScopeMode,
  DataContractIssueSeverity,
  DataContractIssueCode,
  DataContractPreflightIssue,
  DataContractNodeIssueSummary,
  DataContractPreflightReport,
  EvaluateDataContractPreflightArgs,
};

const TEMPLATE_TOKEN_REGEX: RegExp = /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/g;

const TEMPLATE_SYSTEM_ROOT_PREFIXES = ['Date:', 'DB Provider:', 'Collection:'];

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveEdgeFromNodeId = (edge: Edge): string | null => normalizeNonEmptyString(edge.from);

const resolveEdgeToNodeId = (edge: Edge): string | null => normalizeNonEmptyString(edge.to);

const resolveEdgeFromPort = (edge: Edge): string | null => normalizeNonEmptyString(edge.fromPort);

const resolveEdgeToPort = (edge: Edge): string | null => normalizeNonEmptyString(edge.toPort);

const resolveNodeLabel = (node: AiNode | undefined, fallbackNodeId: string): string => {
  const title =
    typeof node?.title === 'string' && node.title.trim().length > 0 ? node.title.trim() : null;
  return title ?? fallbackNodeId;
};

const parseSampleJson = (
  sample: ParserSampleState | UpdaterSampleState | null | undefined
): unknown => {
  if (!sample) return undefined;
  const raw = normalizeNonEmptyString(sample.json);
  if (!raw) return undefined;
  return parseJsonSafe(raw);
};

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isObjectRecord(value)) return Object.keys(value).length === 0;
  return false;
};

const normalizeTemplateRoot = (token: string): string => {
  const rootCandidate = token.split('.')[0]?.trim() ?? '';
  return rootCandidate.replace(/\[[^\]]*\]/g, '').trim();
};

const isSystemTemplateRoot = (root: string): boolean =>
  TEMPLATE_SYSTEM_ROOT_PREFIXES.some((prefix: string): boolean => root.startsWith(prefix));

const extractTemplateTokens = (template: string): string[] => {
  const tokens = new Set<string>();
  TEMPLATE_TOKEN_REGEX.lastIndex = 0;
  let match = TEMPLATE_TOKEN_REGEX.exec(template);
  while (match) {
    const token = (match[1] ?? match[2] ?? '').trim();
    if (!token) {
      match = TEMPLATE_TOKEN_REGEX.exec(template);
      continue;
    }
    const root = normalizeTemplateRoot(token);
    if (!root || isSystemTemplateRoot(root)) {
      match = TEMPLATE_TOKEN_REGEX.exec(template);
      continue;
    }
    tokens.add(token);
    match = TEMPLATE_TOKEN_REGEX.exec(template);
  }
  return Array.from(tokens);
};

const extractTemplateRawJsonCandidate = (value: string): string => {
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  return value.trim();
};

const resolveScopedRootNodeIds = (
  nodes: AiNode[],
  edges: Edge[],
  scopeRootNodeIds?: string[] | Set<string>
): string[] => {
  const nodeIdSet = new Set(nodes.map((node: AiNode): string => node.id));
  const explicitRoots = (
    Array.isArray(scopeRootNodeIds)
      ? scopeRootNodeIds
      : scopeRootNodeIds
        ? Array.from(scopeRootNodeIds)
        : []
  )
    .map((nodeId: string): string => nodeId.trim())
    .filter((nodeId: string): boolean => nodeId.length > 0 && nodeIdSet.has(nodeId));
  const uniqueRoots = Array.from(new Set(explicitRoots));
  if (uniqueRoots.length > 0) return uniqueRoots;

  const triggerRoots = nodes
    .filter((node: AiNode): boolean => node.type === 'trigger')
    .map((node: AiNode): string => node.id);
  if (triggerRoots.length > 0) return triggerRoots;

  const incomingNodeIds = new Set<string>();
  edges.forEach((edge: Edge): void => {
    const targetNodeId = resolveEdgeToNodeId(edge);
    if (!targetNodeId || !nodeIdSet.has(targetNodeId)) return;
    incomingNodeIds.add(targetNodeId);
  });

  const fallbackRoots = nodes
    .filter((node: AiNode): boolean => !incomingNodeIds.has(node.id))
    .map((node: AiNode): string => node.id);
  if (fallbackRoots.length > 0) return fallbackRoots;

  return nodes[0] ? [nodes[0].id] : [];
};

const buildReachableScope = (
  nodes: AiNode[],
  edges: Edge[],
  scopeRootNodeIds?: string[] | Set<string>
): { nodes: AiNode[]; edges: Edge[]; reachableNodeIds: Set<string> } => {
  if (nodes.length === 0) {
    return {
      nodes,
      edges,
      reachableNodeIds: new Set<string>(),
    };
  }

  const nodeIdSet = new Set(nodes.map((node: AiNode): string => node.id));
  const rootNodeIds = resolveScopedRootNodeIds(nodes, edges, scopeRootNodeIds);
  if (rootNodeIds.length === 0) {
    return {
      nodes,
      edges,
      reachableNodeIds: new Set<string>(),
    };
  }

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
    return {
      nodes,
      edges,
      reachableNodeIds: new Set(nodes.map((node: AiNode): string => node.id)),
    };
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
    reachableNodeIds,
  };
};

const getHistoryEntryValue = (
  runtimeState: RuntimeState,
  nodeId: string,
  direction: 'inputs' | 'outputs',
  port: string
): unknown => {
  const historyEntries = runtimeState.history?.[nodeId];
  if (!Array.isArray(historyEntries) || historyEntries.length === 0) {
    return undefined;
  }
  const lastEntry = historyEntries[historyEntries.length - 1];
  const source = direction === 'inputs' ? lastEntry?.inputs : lastEntry?.outputs;
  return source?.[port];
};

const getRuntimeOutputValue = (
  runtimeState: RuntimeState,
  nodeId: string,
  port: string
): unknown => {
  const direct = runtimeState.outputs?.[nodeId]?.[port];
  if (direct !== undefined) return direct;
  return getHistoryEntryValue(runtimeState, nodeId, 'outputs', port);
};

const getRuntimeInputValue = (
  runtimeState: RuntimeState,
  nodeId: string,
  port: string
): unknown => {
  const direct = runtimeState.inputs?.[nodeId]?.[port];
  if (direct !== undefined) return direct;
  return getHistoryEntryValue(runtimeState, nodeId, 'inputs', port);
};

const resolvePortRuntimeValue = (args: {
  runtimeState: RuntimeState;
  node: AiNode;
  port: string;
  incomingEdgesByPortKey: Map<string, Edge[]>;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
}): unknown => {
  const directInput = getRuntimeInputValue(args.runtimeState, args.node.id, args.port);
  if (directInput !== undefined) {
    return directInput;
  }

  const incomingEdges = args.incomingEdgesByPortKey.get(`${args.node.id}::${args.port}`) ?? [];
  const upstreamValues = incomingEdges
    .map((edge: Edge): unknown => {
      const fromNodeId = resolveEdgeFromNodeId(edge);
      const fromPort = resolveEdgeFromPort(edge);
      if (!fromNodeId || !fromPort) return undefined;
      return getRuntimeOutputValue(args.runtimeState, fromNodeId, fromPort);
    })
    .filter((value: unknown): boolean => value !== undefined);

  if (upstreamValues.length === 1) {
    return upstreamValues[0];
  }
  if (upstreamValues.length > 1) {
    return upstreamValues;
  }

  if (args.node.type === 'parser') {
    const sampleValue = parseSampleJson(args.parserSamples[args.node.id]);
    if (sampleValue !== undefined) {
      return sampleValue;
    }
  }

  return undefined;
};

const resolveTemplateTokenValue = (token: string, context: Record<string, unknown>): unknown => {
  const normalizedToken = token.trim();
  if (!normalizedToken) return undefined;
  if (normalizedToken === 'value') {
    return context['value'];
  }
  if (normalizedToken === 'current') {
    return context['current'] ?? context['value'];
  }
  return getValueAtMappingPath(context, normalizedToken);
};

const pushIssue = (
  issuesByKey: Map<string, DataContractPreflightIssue>,
  issue: Omit<DataContractPreflightIssue, 'id'>
): void => {
  const keyParts = [issue.code, issue.nodeId, issue.port ?? '', issue.token ?? '', issue.message];
  const key = keyParts.join('|');
  if (issuesByKey.has(key)) return;
  issuesByKey.set(key, {
    ...issue,
    id: key,
  });
};

const buildNodeTemplateContext = (args: {
  node: AiNode;
  runtimeState: RuntimeState;
  incomingEdgesByPortKey: Map<string, Edge[]>;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
}): Record<string, unknown> => {
  const context: Record<string, unknown> = {};
  args.node.inputs.forEach((inputPort: string): void => {
    const value = resolvePortRuntimeValue({
      runtimeState: args.runtimeState,
      node: args.node,
      port: inputPort,
      incomingEdgesByPortKey: args.incomingEdgesByPortKey,
      parserSamples: args.parserSamples,
      updaterSamples: args.updaterSamples,
    });
    if (value !== undefined) {
      context[inputPort] = value;
    }
  });

  if (context['current'] === undefined && context['value'] !== undefined) {
    context['current'] = context['value'];
  }
  return context;
};

const resolveTokenRootCandidates = (token: string): string[] => {
  const root = normalizeTemplateRoot(token);
  if (!root) return [];
  if (root === 'current') {
    return ['current', 'value'];
  }
  return [root];
};

const hasNodeInputPort = (node: AiNode, port: string): boolean =>
  node.inputs.some(
    (inputPort: string): boolean => normalizePortName(inputPort) === normalizePortName(port)
  );

const shouldDeferMissingTemplateTokenIssue = (args: {
  node: AiNode;
  token: string;
  nodeTemplateContext: Record<string, unknown>;
  runtimeState: RuntimeState;
  incomingEdgesByPortKey: Map<string, Edge[]>;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
}): boolean => {
  const rootCandidates = resolveTokenRootCandidates(args.token);
  if (rootCandidates.length === 0) return false;

  const hasRootContext = rootCandidates.some(
    (root: string): boolean => args.nodeTemplateContext[root] !== undefined
  );
  if (hasRootContext) return false;

  for (const root of rootCandidates) {
    if (!hasNodeInputPort(args.node, root)) continue;
    const normalizedPort = normalizePortName(root);
    const hasIncomingEdge = Boolean(
      args.incomingEdgesByPortKey.get(`${args.node.id}::${normalizedPort}`)?.length
    );
    if (!hasIncomingEdge) continue;
    const runtimeValue = resolvePortRuntimeValue({
      runtimeState: args.runtimeState,
      node: args.node,
      port: normalizedPort,
      incomingEdgesByPortKey: args.incomingEdgesByPortKey,
      parserSamples: args.parserSamples,
      updaterSamples: args.updaterSamples,
    });
    if (runtimeValue === undefined) {
      // Upstream is wired, but there is no concrete runtime/sample evidence yet.
      return true;
    }
  }

  return false;
};

const validateDatabaseMappingContract = (args: {
  node: AiNode;
  mode: DataContractPreflightMode;
  databaseConfig: Record<string, unknown> | null;
  issuesByKey: Map<string, DataContractPreflightIssue>;
}): void => {
  if (args.mode !== 'full' || !args.databaseConfig) return;
  const updatePayloadMode = normalizeNonEmptyString(args.databaseConfig['updatePayloadMode']);
  if (updatePayloadMode !== 'mapping') return;

  const mappings = args.databaseConfig['mappings'];
  if (!Array.isArray(mappings) || mappings.length === 0) {
    pushIssue(args.issuesByKey, {
      nodeId: args.node.id,
      nodeType: args.node.type,
      nodeTitle: resolveNodeLabel(args.node, args.node.id),
      severity: 'error',
      code: 'database_mapping_invalid',
      message: 'Database mapping mode requires at least one mapping entry.',
      recommendation:
        'Add one or more mappings in the node config, or switch update payload mode to custom.',
      metadata: {
        updatePayloadMode,
      },
    });
    return;
  }

  mappings.forEach((entry: unknown, index: number): void => {
    if (!isObjectRecord(entry)) {
      pushIssue(args.issuesByKey, {
        nodeId: args.node.id,
        nodeType: args.node.type,
        nodeTitle: resolveNodeLabel(args.node, args.node.id),
        severity: 'error',
        code: 'database_mapping_invalid',
        message: `Mapping #${index + 1} is invalid.`,
        recommendation: 'Each mapping must define sourcePort and targetPath as non-empty strings.',
        metadata: {
          index,
        },
      });
      return;
    }

    const sourcePort = normalizeNonEmptyString(entry['sourcePort']);
    const targetPath = normalizeNonEmptyString(entry['targetPath']);
    if (!sourcePort || !targetPath) {
      pushIssue(args.issuesByKey, {
        nodeId: args.node.id,
        nodeType: args.node.type,
        nodeTitle: resolveNodeLabel(args.node, args.node.id),
        severity: 'error',
        code: 'database_mapping_invalid',
        message: `Mapping #${index + 1} is missing sourcePort or targetPath.`,
        recommendation: 'Each mapping must define sourcePort and targetPath as non-empty strings.',
        metadata: {
          index,
          sourcePort: sourcePort ?? null,
          targetPath: targetPath ?? null,
        },
      });
      return;
    }

    if (!hasNodeInputPort(args.node, sourcePort)) {
      pushIssue(args.issuesByKey, {
        nodeId: args.node.id,
        nodeType: args.node.type,
        nodeTitle: resolveNodeLabel(args.node, args.node.id),
        severity: 'error',
        code: 'database_mapping_source_port_missing',
        port: sourcePort,
        message: `Mapping #${index + 1} references source port "${sourcePort}", but the node does not expose that input.`,
        recommendation: `Change sourcePort to a connected node input or add "${sourcePort}" to this node inputs.`,
        metadata: {
          index,
          targetPath,
        },
      });
    }
  });
};

export const evaluateDataContractPreflight = (
  args: EvaluateDataContractPreflightArgs
): DataContractPreflightReport => {
  const mode: DataContractPreflightMode = args.mode ?? 'light';
  const scopeMode: DataContractPreflightScopeMode = args.scopeMode ?? 'full';
  const parserSamples: Record<string, ParserSampleState> = args.parserSamples ?? {};
  const updaterSamples: Record<string, UpdaterSampleState> = args.updaterSamples ?? {};
  const runtimeState: RuntimeState = args.runtimeState ?? {
    status: 'idle',
    nodeStatuses: {},
    nodeOutputs: {},
    variables: {},
    events: [],
    inputs: {},
    outputs: {},
  };

  const sanitizedEdges = sanitizeEdges(args.nodes, args.edges);
  const scoped =
    scopeMode === 'reachable_from_roots'
      ? buildReachableScope(args.nodes, sanitizedEdges, args.scopeRootNodeIds)
      : {
        nodes: args.nodes,
        edges: sanitizedEdges,
        reachableNodeIds: new Set(args.nodes.map((node: AiNode): string => node.id)),
      };

  const nodes = scoped.nodes;
  const edges = scoped.edges;
  const nodeById = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
  const issuesByKey = new Map<string, DataContractPreflightIssue>();

  const incomingEdgesByPortKey = new Map<string, Edge[]>();
  edges.forEach((edge: Edge): void => {
    const toNodeId = resolveEdgeToNodeId(edge);
    const toPortRaw = resolveEdgeToPort(edge);
    if (!toNodeId || !toPortRaw) return;
    const toPort = normalizePortName(toPortRaw);
    const key = `${toNodeId}::${toPort}`;
    const existing = incomingEdgesByPortKey.get(key) ?? [];
    existing.push(edge);
    incomingEdgesByPortKey.set(key, existing);
  });

  edges.forEach((edge: Edge): void => {
    const fromNodeId = resolveEdgeFromNodeId(edge);
    const toNodeId = resolveEdgeToNodeId(edge);
    const fromPortRaw = resolveEdgeFromPort(edge);
    const toPortRaw = resolveEdgeToPort(edge);
    if (!fromNodeId || !toNodeId || !fromPortRaw || !toPortRaw) return;
    const fromNode = nodeById.get(fromNodeId);
    const toNode = nodeById.get(toNodeId);
    if (!fromNode || !toNode) return;

    const fromPort = normalizePortName(fromPortRaw);
    const toPort = normalizePortName(toPortRaw);

    const fromTypes = getPortDataTypes(fromPort);
    const toTypes = getPortDataTypes(toPort);
    if (!arePortTypesCompatible(fromTypes, toTypes)) {
      pushIssue(issuesByKey, {
        nodeId: toNode.id,
        nodeType: toNode.type,
        nodeTitle: resolveNodeLabel(toNode, toNode.id),
        severity: 'warning',
        code: 'connection_type_mismatch',
        port: toPort,
        message: `Port type mismatch for ${toPort}: ${formatPortDataTypes(fromTypes)} -> ${formatPortDataTypes(toTypes)}.`,
        recommendation: `Rewire to a compatible input or map/cast ${fromPort} before sending to ${toPort}.`,
        metadata: {
          edgeId: edge.id,
          fromNodeId,
          fromPort,
          toNodeId,
          toPort,
        },
      });
    }

    const runtimeOutputValue = getRuntimeOutputValue(runtimeState, fromNodeId, fromPort);
    if (
      runtimeOutputValue !== undefined &&
      !isValueCompatibleWithTypes(runtimeOutputValue, toTypes)
    ) {
      const actualType = getValueTypeLabel(runtimeOutputValue);
      const severity: DataContractIssueSeverity =
        mode === 'full' && getNodeInputPortContract(toNode, toPort).required === true
          ? 'error'
          : 'warning';
      pushIssue(issuesByKey, {
        nodeId: toNode.id,
        nodeType: toNode.type,
        nodeTitle: resolveNodeLabel(toNode, toNode.id),
        severity,
        code: 'runtime_value_type_mismatch',
        port: toPort,
        message: `Runtime value for ${toPort} is ${actualType}, expected ${formatPortDataTypes(toTypes)}.`,
        recommendation: `Map the upstream value to ${toPort} shape before execution.`,
        metadata: {
          edgeId: edge.id,
          fromNodeId,
          fromPort,
          actualType,
        },
      });
    }
  });

  nodes.forEach((node: AiNode): void => {
    const requiredPorts = node.inputs.filter(
      (port: string): boolean => getNodeInputPortContract(node, port).required === true
    );

    requiredPorts.forEach((requiredPort: string): void => {
      const incomingEdges = incomingEdgesByPortKey.get(`${node.id}::${requiredPort}`) ?? [];

      if (incomingEdges.length === 0) {
        pushIssue(issuesByKey, {
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: resolveNodeLabel(node, node.id),
          severity: mode === 'full' ? 'error' : 'warning',
          code: 'required_input_unresolved',
          port: requiredPort,
          message: `Required input ${requiredPort} has no incoming edge.`,
          recommendation: `Connect a source to ${requiredPort} or disable strict requirement for this port.`,
        });
        return;
      }

      if (mode !== 'full') {
        return;
      }

      const resolvedValue = resolvePortRuntimeValue({
        runtimeState,
        node,
        port: requiredPort,
        incomingEdgesByPortKey,
        parserSamples,
        updaterSamples,
      });

      if (resolvedValue === undefined) {
        return;
      }
      if (resolvedValue === null) {
        pushIssue(issuesByKey, {
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: resolveNodeLabel(node, node.id),
          severity: 'error',
          code: 'required_input_nullish',
          port: requiredPort,
          message: `Required input ${requiredPort} resolves to null.`,
          recommendation: `Ensure upstream token mapping for ${requiredPort} resolves to a non-null value.`,
        });
        return;
      }
      if (isEmptyValue(resolvedValue)) {
        pushIssue(issuesByKey, {
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: resolveNodeLabel(node, node.id),
          severity: 'error',
          code: 'required_input_empty',
          port: requiredPort,
          message: `Required input ${requiredPort} resolves to an empty value.`,
          recommendation: `Provide a non-empty value for ${requiredPort} before execution.`,
        });
      }
    });

    if (node.type !== 'database' || mode !== 'full') {
      return;
    }

    const databaseConfig = isObjectRecord(node.config?.database)
      ? (node.config?.database as Record<string, unknown>)
      : null;
    validateDatabaseMappingContract({
      node,
      mode,
      databaseConfig,
      issuesByKey,
    });

    const nodeTemplateContext = buildNodeTemplateContext({
      node,
      runtimeState,
      incomingEdgesByPortKey,
      parserSamples,
      updaterSamples,
    });

    const identityPorts: Array<'entityId' | 'productId'> = ['entityId', 'productId'];
    identityPorts.forEach((identityPort) => {
      const identityValue = resolvePortRuntimeValue({
        runtimeState,
        node,
        port: identityPort,
        incomingEdgesByPortKey,
        parserSamples,
        updaterSamples,
      });
      if (identityValue === undefined || identityValue === null) return;
      if (typeof identityValue === 'string' || typeof identityValue === 'number') return;
      pushIssue(issuesByKey, {
        nodeId: node.id,
        nodeType: node.type,
        nodeTitle: resolveNodeLabel(node, node.id),
        severity: 'error',
        code: 'database_scalar_identity_expected',
        port: identityPort,
        message: `Database ${identityPort} expects a scalar id, but received ${getValueTypeLabel(identityValue)}.`,
        recommendation:
          'Use a mapped scalar id (for example `bundle.EntityID`) rather than passing the full bundle object.',
      });
    });

    const queryInputs: Array<'query' | 'queryCallback' | 'aiQuery'> = [
      'query',
      'queryCallback',
      'aiQuery',
    ];
    queryInputs.forEach((queryPort) => {
      const queryInputValue = resolvePortRuntimeValue({
        runtimeState,
        node,
        port: queryPort,
        incomingEdgesByPortKey,
        parserSamples,
        updaterSamples,
      });
      if (queryInputValue === undefined || queryInputValue === null) return;
      if (isObjectRecord(queryInputValue)) return;
      if (typeof queryInputValue === 'string') {
        const candidate = extractTemplateRawJsonCandidate(queryInputValue);
        const parsed = parseJsonSafe(candidate);
        if (isObjectRecord(parsed)) return;
        const severity: DataContractIssueSeverity =
          queryInputValue.includes('{{') || queryInputValue.includes('[') ? 'warning' : 'error';
        pushIssue(issuesByKey, {
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: resolveNodeLabel(node, node.id),
          severity,
          code: 'database_query_input_shape_mismatch',
          port: queryPort,
          message: `Database ${queryPort} must resolve to a JSON object query.`,
          recommendation:
            'Provide an object payload or a JSON string that parses to an object (optionally tokenized).',
        });
        return;
      }
      pushIssue(issuesByKey, {
        nodeId: node.id,
        nodeType: node.type,
        nodeTitle: resolveNodeLabel(node, node.id),
        severity: 'error',
        code: 'database_query_input_shape_mismatch',
        port: queryPort,
        message: `Database ${queryPort} received ${getValueTypeLabel(queryInputValue)}; expected object query input.`,
        recommendation: 'Map this input to an object query shape or pass a JSON object string.',
      });
    });

    const templateSources: Array<{ label: string; template: string }> = [
      {
        label: 'database.query.queryTemplate',
        template: normalizeNonEmptyString(node.config?.database?.query?.queryTemplate) ?? '',
      },
      {
        label: 'database.updateTemplate',
        template: normalizeNonEmptyString(node.config?.database?.updateTemplate) ?? '',
      },
    ].filter((entry: { label: string; template: string }): boolean => entry.template.length > 0);

    templateSources.forEach((source: { label: string; template: string }): void => {
      const tokens = extractTemplateTokens(source.template);
      tokens.forEach((token: string): void => {
        const root = normalizeTemplateRoot(token);
        if (
          root &&
          root !== 'current' &&
          !hasNodeInputPort(node, root) &&
          nodeTemplateContext[root] === undefined
        ) {
          pushIssue(issuesByKey, {
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: resolveNodeLabel(node, node.id),
            severity: 'error',
            code: 'database_template_token_root_missing',
            port: root,
            token,
            message: `${source.label} token {{${token}}} references root "${root}" that is not available on this node.`,
            recommendation:
              'Use a token root that matches a connected node input (or switch the mapping/template to a valid root).',
            metadata: { template: source.label },
          });
          return;
        }
        const value = resolveTemplateTokenValue(token, nodeTemplateContext);
        if (value === undefined) {
          if (
            shouldDeferMissingTemplateTokenIssue({
              node,
              token,
              nodeTemplateContext,
              runtimeState,
              incomingEdgesByPortKey,
              parserSamples,
              updaterSamples,
            })
          ) {
            pushIssue(issuesByKey, {
              nodeId: node.id,
              nodeType: node.type,
              nodeTitle: resolveNodeLabel(node, node.id),
              severity: 'warning',
              code: 'database_template_token_missing',
              token,
              message: `${source.label} token {{${token}}} cannot be verified at preflight (upstream connected, but no runtime/sample evidence yet).`,
              recommendation:
                'Seed parser/updater samples or run a dry simulation so template token values can be validated before execution.',
              metadata: {
                template: source.label,
                deferred: true,
              },
            });
            return;
          }
          pushIssue(issuesByKey, {
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: resolveNodeLabel(node, node.id),
            severity: 'error',
            code: 'database_template_token_missing',
            token,
            message: `${source.label} token {{${token}}} resolves to undefined.`,
            recommendation: `Connect or map token {{${token}}} before running this database node.`,
            metadata: { template: source.label },
          });
          return;
        }
        if (value === null || isEmptyValue(value)) {
          pushIssue(issuesByKey, {
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: resolveNodeLabel(node, node.id),
            severity: 'error',
            code: 'database_template_token_empty',
            token,
            message: `${source.label} token {{${token}}} resolves to null/empty.`,
            recommendation: `Ensure {{${token}}} resolves to a non-empty value before execution.`,
            metadata: { template: source.label },
          });
        }
      });
    });
  });

  const issues = Array.from(issuesByKey.values()).sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === 'error' ? -1 : 1;
    }
    if (left.nodeId !== right.nodeId) {
      return left.nodeId.localeCompare(right.nodeId);
    }
    return left.code.localeCompare(right.code);
  });

  const byNodeId: Record<string, DataContractNodeIssueSummary> = {};
  issues.forEach((issue: DataContractPreflightIssue): void => {
    const current = byNodeId[issue.nodeId] ?? {
      errors: 0,
      warnings: 0,
      issues: [],
    };
    if (issue.severity === 'error') {
      current.errors += 1;
    } else {
      current.warnings += 1;
    }
    current.issues.push(issue);
    byNodeId[issue.nodeId] = current;
  });

  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;

  return {
    mode,
    scopeMode,
    scopedNodeIds: Array.from(scoped.reachableNodeIds),
    issues,
    errors,
    warnings,
    byNodeId,
  };
};
