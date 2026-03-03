import type { AiNode, Edge, ConnectionValidation } from '@/shared/contracts/ai-paths';
import { isValidConnection, normalizePortName } from './graph.ports';
import { arePortTypesCompatible, formatPortDataTypes, getPortDataTypes } from './port-types';

const coerceEdgeList = (edges: unknown): Edge[] => {
  return Array.isArray(edges) ? (edges as Edge[]) : [];
};

export const sanitizeEdges = (nodes: AiNode[], edges: Edge[]): Edge[] => {
  const edgeList = coerceEdgeList(edges);
  const nodeMap = new Map(nodes.map((node: AiNode) => [node.id, node]));
  const resolveNodeId = (
    primary: string | undefined,
    fallback: string | undefined
  ): string | null => {
    const first = typeof primary === 'string' ? primary.trim() : '';
    if (first.length > 0) return first;
    const second = typeof fallback === 'string' ? fallback.trim() : '';
    return second.length > 0 ? second : null;
  };
  const resolvePort = (
    primary: string | null | undefined,
    fallback: string | null | undefined
  ): string | null => {
    const first = typeof primary === 'string' ? normalizePortName(primary) : '';
    if (first.length > 0) return first;
    const second = typeof fallback === 'string' ? normalizePortName(fallback) : '';
    return second.length > 0 ? second : null;
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
    source: fromNodeId,
    target: toNodeId,
    ...(fromPort ? { fromPort, sourceHandle: fromPort } : {}),
    ...(toPort ? { toPort, targetHandle: toPort } : {}),
  });
  return edgeList.flatMap((edge: Edge) => {
    const fromNodeId = resolveNodeId(edge.from, edge.source);
    const toNodeId = resolveNodeId(edge.to, edge.target);
    if (!fromNodeId || !toNodeId) return [];
    const from = nodeMap.get(fromNodeId);
    const to = nodeMap.get(toNodeId);
    if (!from || !to) return [];
    const fromPort = resolvePort(edge.fromPort, edge.sourceHandle) ?? undefined;
    const toPort = resolvePort(edge.toPort, edge.targetHandle) ?? undefined;

    if (fromPort && toPort) {
      if (isValidConnection(from, to, fromPort, toPort)) {
        return [toCanonicalEdge(edge, fromNodeId, toNodeId, fromPort, toPort)];
      }
      return [];
    }
    return [];
  });
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
