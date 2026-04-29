import type {
  AiNode,
  Edge,
  ConnectionValidation,
  GraphCompileFinding,
} from '@/shared/contracts/ai-paths';

import { isValidConnection, normalizePortName } from './graph.ports';
import { arePortTypesCompatible, formatPortDataTypes, getPortDataTypes } from './port-types';

const coerceEdgeList = (edges: unknown): Edge[] => {
  return Array.isArray(edges) ? (edges as Edge[]) : [];
};

export const sanitizeEdgesDetailed = (
  nodes: AiNode[],
  edges: Edge[]
): {
  edges: Edge[];
  dropped: GraphCompileFinding[];
} => {
  const edgeList = coerceEdgeList(edges);
  const nodeMap = new Map(nodes.map((node: AiNode) => [node.id, node]));
  const seenConnections = new Set<string>();
  const canonicalEdges: Edge[] = [];
  const dropped: GraphCompileFinding[] = [];
  const resolveNodeId = (value: string | undefined): string | null => {
    const first = typeof value === 'string' ? value.trim() : '';
    return first.length > 0 ? first : null;
  };
  const resolveLegacyString = (edge: Edge, key: string): string | undefined => {
    const value = (edge as Record<string, unknown>)[key];
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  };
  const resolvePort = (value: string | null | undefined): string | null => {
    const normalized = typeof value === 'string' ? normalizePortName(value) : '';
    return normalized.length > 0 ? normalized : null;
  };
  const resolveFirstNodeId = (...values: Array<string | undefined>): string | null => {
    for (const value of values) {
      const resolved = resolveNodeId(value);
      if (resolved !== null) return resolved;
    }
    return null;
  };
  const resolveFirstPort = (...values: Array<string | null | undefined>): string | null => {
    for (const value of values) {
      const resolved = resolvePort(value);
      if (resolved !== null) return resolved;
    }
    return null;
  };
  const toCanonicalEdge = (
    edge: Edge,
    fromNodeId: string,
    toNodeId: string,
    fromPort?: string,
    toPort?: string
  ): Edge => ({
    ...edge,
    from: fromNodeId,
    to: toNodeId,
    ...(fromPort ? { fromPort } : {}),
    ...(toPort ? { toPort } : {}),
  });
  const addDroppedEdge = (
    code:
      | 'invalid_edge_missing_node'
      | 'invalid_edge_missing_port'
      | 'invalid_edge_incompatible_connection'
      | 'duplicate_edge_dropped',
    edge: Edge,
    message: string,
    resolved?: {
      fromNodeId?: string | null;
      fromPort?: string | null;
      toNodeId?: string | null;
      toPort?: string | null;
    }
  ): void => {
    dropped.push({
      code,
      severity: 'warning',
      message,
      edgeId: edge.id,
      metadata: {
        from: resolved?.fromNodeId ?? edge.from ?? edge.source ?? null,
        to: resolved?.toNodeId ?? edge.to ?? edge.target ?? null,
        fromPort: resolved?.fromPort ?? edge.fromPort ?? edge.sourceHandle ?? null,
        toPort: resolved?.toPort ?? edge.toPort ?? edge.targetHandle ?? null,
      },
    });
  };
  edgeList.forEach((edge: Edge): void => {
    const fromNodeId = resolveFirstNodeId(
      edge.from,
      edge.source,
      resolveLegacyString(edge, 'fromNodeId')
    );
    const toNodeId = resolveFirstNodeId(
      edge.to,
      edge.target,
      resolveLegacyString(edge, 'toNodeId')
    );
    if (!fromNodeId || !toNodeId) {
      addDroppedEdge(
        'invalid_edge_missing_node',
        edge,
        `Dropped edge "${edge.id}": source and target node ids must be present.`,
        { fromNodeId, toNodeId }
      );
      return;
    }
    const from = nodeMap.get(fromNodeId);
    const to = nodeMap.get(toNodeId);
    if (!from || !to) {
      addDroppedEdge(
        'invalid_edge_missing_node',
        edge,
        `Dropped edge "${edge.id}": source or target node does not exist.`,
        { fromNodeId, toNodeId }
      );
      return;
    }
    const fromPort =
      resolveFirstPort(
        edge.fromPort,
        edge.sourceHandle,
        resolveLegacyString(edge, 'sourcePort'),
        resolveLegacyString(edge, 'fromHandle')
      ) ?? undefined;
    const toPort =
      resolveFirstPort(
        edge.toPort,
        edge.targetHandle,
        resolveLegacyString(edge, 'targetPort'),
        resolveLegacyString(edge, 'toHandle')
      ) ?? undefined;

    if (!fromPort || !toPort) {
      addDroppedEdge(
        'invalid_edge_missing_port',
        edge,
        `Dropped edge "${edge.id}": source and target ports must be specified.`,
        { fromNodeId, fromPort: fromPort ?? null, toNodeId, toPort: toPort ?? null }
      );
      return;
    }

    if (!from.outputs.includes(fromPort) || !to.inputs.includes(toPort)) {
      addDroppedEdge(
        'invalid_edge_missing_port',
        edge,
        `Dropped edge "${edge.id}": source or target port does not exist on the referenced node.`,
        { fromNodeId, fromPort, toNodeId, toPort }
      );
      return;
    }

    if (!isValidConnection(from, to, fromPort, toPort)) {
      addDroppedEdge(
        'invalid_edge_incompatible_connection',
        edge,
        `Dropped edge "${edge.id}": ${from.title ?? from.id}.${fromPort} cannot connect to ${to.title ?? to.id}.${toPort}.`,
        { fromNodeId, fromPort, toNodeId, toPort }
      );
      return;
    }

    const dedupeKey = `${fromNodeId}:${fromPort}->${toNodeId}:${toPort}`;
    if (seenConnections.has(dedupeKey)) {
      addDroppedEdge(
        'duplicate_edge_dropped',
        edge,
        `Dropped duplicate edge "${edge.id}": ${fromNodeId}.${fromPort} -> ${toNodeId}.${toPort}.`,
        { fromNodeId, fromPort, toNodeId, toPort }
      );
      return;
    }

    seenConnections.add(dedupeKey);
    canonicalEdges.push(toCanonicalEdge(edge, fromNodeId, toNodeId, fromPort, toPort));
  });

  return {
    edges: canonicalEdges,
    dropped,
  };
};

export const sanitizeEdges = (nodes: AiNode[], edges: Edge[]): Edge[] => {
  return sanitizeEdgesDetailed(nodes, edges).edges;
};

export const validateConnection = (
  from: AiNode,
  to: AiNode,
  fromPort?: string,
  toPort?: string
): ConnectionValidation => {
  if (!fromPort || !toPort) {
    return { valid: false, message: 'Source and target ports must be specified.' };
  }
  if (!from.outputs.includes(fromPort)) {
    return {
      valid: false,
      message: `Node "${from.title ?? from.id}" does not have output port "${fromPort}".`,
    };
  }
  if (!to.inputs.includes(toPort)) {
    return {
      valid: false,
      message: `Node "${to.title ?? to.id}" does not have input port "${toPort}".`,
    };
  }

  const fromTypes = getPortDataTypes(fromPort);
  const toTypes = getPortDataTypes(toPort);
  const typeCompatible = arePortTypesCompatible(fromTypes, toTypes);

  if (!typeCompatible) {
    const fromLabel = formatPortDataTypes(fromTypes);
    const toLabel = formatPortDataTypes(toTypes);
    return {
      valid: false,
      message: `Port types are incompatible: ${fromLabel} \u2192 ${toLabel}.`,
    };
  }

  return { valid: true };
};
