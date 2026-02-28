import type { AiNode, Edge, ConnectionValidation } from '@/shared/contracts/ai-paths';
import { isValidConnection, normalizePortName } from './graph.ports';
import { arePortTypesCompatible, formatPortDataTypes, getPortDataTypes } from './port-types';

export const sanitizeEdges = (nodes: AiNode[], edges: Edge[]): Edge[] => {
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
  const triggerFetcherPairKey = (fromNodeId: string, toNodeId: string): string =>
    `${fromNodeId}::${toNodeId}`;
  const triggerFetcherPairsWithSignal = new Set<string>();
  const emittedTriggerFetcherPairs = new Set<string>();
  edges.forEach((edge: Edge): void => {
    const fromNodeId = resolveNodeId(edge.from, edge.source);
    const toNodeId = resolveNodeId(edge.to, edge.target);
    if (!fromNodeId || !toNodeId) return;
    const fromNode = nodeMap.get(fromNodeId);
    const toNode = nodeMap.get(toNodeId);
    if (fromNode?.type !== 'trigger' || toNode?.type !== 'fetcher') return;
    const fromPort = resolvePort(edge.fromPort, edge.sourceHandle);
    const toPort = resolvePort(edge.toPort, edge.targetHandle);
    if ((fromPort === 'trigger' || !fromPort) && (toPort === 'trigger' || !toPort)) {
      triggerFetcherPairsWithSignal.add(triggerFetcherPairKey(fromNodeId, toNodeId));
    }
  });
  return edges.flatMap((edge: Edge) => {
    const fromNodeId = resolveNodeId(edge.from, edge.source);
    const toNodeId = resolveNodeId(edge.to, edge.target);
    if (!fromNodeId || !toNodeId) return [];
    const from = nodeMap.get(fromNodeId);
    const to = nodeMap.get(toNodeId);
    if (!from || !to) return [];
    const fromPort = resolvePort(edge.fromPort, edge.sourceHandle) ?? undefined;
    const toPort = resolvePort(edge.toPort, edge.targetHandle) ?? undefined;

    if (from.type === 'trigger' && to.type === 'fetcher') {
      const pairKey = triggerFetcherPairKey(from.id, to.id);
      if (emittedTriggerFetcherPairs.has(pairKey)) return [];
      const hasExplicitSignal = triggerFetcherPairsWithSignal.has(pairKey);
      const isExplicitSignalEdge =
        (fromPort === 'trigger' || !fromPort) && (toPort === 'trigger' || !toPort);
      if (hasExplicitSignal && !isExplicitSignalEdge) {
        return [];
      }
      emittedTriggerFetcherPairs.add(pairKey);
      const canonical = toCanonicalEdge(edge, fromNodeId, toNodeId, 'trigger', 'trigger');
      if (
        isValidConnection(from, to, canonical.fromPort ?? undefined, canonical.toPort ?? undefined)
      ) {
        return [canonical];
      }
      return [];
    }

    if (fromPort && toPort) {
      if (isValidConnection(from, to, fromPort, toPort)) {
        return [toCanonicalEdge(edge, fromNodeId, toNodeId, fromPort, toPort)];
      }
      const canAlignByFromPort = from.outputs.includes(fromPort) && to.inputs.includes(fromPort);
      const canAlignByToPort = from.outputs.includes(toPort) && to.inputs.includes(toPort);
      // Prefer the source port when both alignments are possible. This avoids
      // accidental output inversions when only the target port drifts.
      if (canAlignByFromPort) {
        return [toCanonicalEdge(edge, fromNodeId, toNodeId, fromPort, fromPort)];
      }
      if (canAlignByToPort) {
        return [toCanonicalEdge(edge, fromNodeId, toNodeId, toPort, toPort)];
      }
      return [];
    }
    const matches = from.outputs.filter((output: string) => to.inputs.includes(output));
    if (matches.length !== 1) return [];
    const port = matches[0];
    if (!port) return [];
    return [toCanonicalEdge(edge, fromNodeId, toNodeId, port, port)];
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
