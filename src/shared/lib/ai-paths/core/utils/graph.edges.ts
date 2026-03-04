import type { AiNode, Edge, ConnectionValidation } from '@/shared/contracts/ai-paths';
import { isValidConnection, normalizePortName } from './graph.ports';
import { arePortTypesCompatible, formatPortDataTypes, getPortDataTypes } from './port-types';

const coerceEdgeList = (edges: unknown): Edge[] => {
  return Array.isArray(edges) ? (edges as Edge[]) : [];
};

export const sanitizeEdges = (nodes: AiNode[], edges: Edge[]): Edge[] => {
  const edgeList = coerceEdgeList(edges);
  const nodeMap = new Map(nodes.map((node: AiNode) => [node.id, node]));
  const seenConnections = new Set<string>();
  const canonicalEdges: Edge[] = [];
  const resolveNodeId = (value: string | undefined): string | null => {
    const first = typeof value === 'string' ? value.trim() : '';
    return first.length > 0 ? first : null;
  };
  const resolvePort = (value: string | null | undefined): string | null => {
    const normalized = typeof value === 'string' ? normalizePortName(value) : '';
    return normalized.length > 0 ? normalized : null;
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
  edgeList.forEach((edge: Edge): void => {
    const fromNodeId = resolveNodeId(edge.from);
    const toNodeId = resolveNodeId(edge.to);
    if (!fromNodeId || !toNodeId) return;
    const from = nodeMap.get(fromNodeId);
    const to = nodeMap.get(toNodeId);
    if (!from || !to) return;
    const fromPort = resolvePort(edge.fromPort) ?? undefined;
    const toPort = resolvePort(edge.toPort) ?? undefined;

    if (fromPort && toPort) {
      if (isValidConnection(from, to, fromPort, toPort)) {
        const dedupeKey = `${fromNodeId}:${fromPort}->${toNodeId}:${toPort}`;
        if (seenConnections.has(dedupeKey)) {
          return;
        }
        seenConnections.add(dedupeKey);
        canonicalEdges.push(toCanonicalEdge(edge, fromNodeId, toNodeId, fromPort, toPort));
      }
      return;
    }
  });
  return canonicalEdges;
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
