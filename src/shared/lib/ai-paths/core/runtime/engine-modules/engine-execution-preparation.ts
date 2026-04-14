import { AiNode, Edge } from '@/shared/contracts/ai-paths';

import { resolveScopedNodeIds } from './engine-reachability';
import {
  resolveEdgeFromNodeId,
  resolveEdgeToNodeId,
  orderNodesByDependencies,
} from './engine-utils';
import { compileGraph, sanitizeEdges } from '../../utils';

export type GraphPreparationResult = {
  sanitizedEdges: Edge[];
  nodeById: Map<string, AiNode>;
  incomingEdgesByNode: Map<string, Edge[]>;
  outgoingEdgesByNode: Map<string, Edge[]>;
  orderedNodes: AiNode[];
  scopedNodeIds: Set<string>;
  unsupportedCycleMessage: string | null;
};

export const prepareGraphForExecution = (args: {
  nodes: AiNode[];
  edges: Edge[];
  triggerNodeId?: string | null;
  seedHashes?: Record<string, string>;
}): GraphPreparationResult => {
  const { nodes, edges, triggerNodeId, seedHashes = {} } = args;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const incomingEdgesByNodeAll = new Map<string, Edge[]>();
  const outgoingEdgesByNodeAll = new Map<string, Edge[]>();

  const sanitizedEdges = sanitizeEdges(nodes, edges);
  sanitizedEdges.forEach((edge) => {
    const fromNodeId = resolveEdgeFromNodeId(edge);
    const toNodeId = resolveEdgeToNodeId(edge);
    if (!fromNodeId || !toNodeId) return;
    if (!incomingEdgesByNodeAll.has(toNodeId)) incomingEdgesByNodeAll.set(toNodeId, []);
    incomingEdgesByNodeAll.get(toNodeId)!.push(edge);
    if (!outgoingEdgesByNodeAll.has(fromNodeId)) outgoingEdgesByNodeAll.set(fromNodeId, []);
    outgoingEdgesByNodeAll.get(fromNodeId)!.push(edge);
  });

  const orderedNodes = orderNodesByDependencies(nodes, sanitizedEdges);
  const compileReport = compileGraph(nodes, sanitizedEdges);
  const unsupportedCycleMessage =
    compileReport.findings.find((finding) => finding.code === 'unsupported_cycle')?.message ?? null;

  const scopedNodeIds = resolveScopedNodeIds({
    nodes,
    triggerNodeId: triggerNodeId ?? undefined,
    nodeById,
    outgoingEdgesByNode: outgoingEdgesByNodeAll,
    incomingEdgesByNode: incomingEdgesByNodeAll,
    seedHashes,
  });

  const incomingEdgesByNode = new Map<string, Edge[]>();
  const outgoingEdgesByNode = new Map<string, Edge[]>();
  sanitizedEdges.forEach((edge) => {
    const fromNodeId = resolveEdgeFromNodeId(edge);
    const toNodeId = resolveEdgeToNodeId(edge);
    if (!fromNodeId || !toNodeId) return;
    if (!scopedNodeIds.has(fromNodeId) || !scopedNodeIds.has(toNodeId)) return;
    if (!incomingEdgesByNode.has(toNodeId)) incomingEdgesByNode.set(toNodeId, []);
    incomingEdgesByNode.get(toNodeId)!.push(edge);
    if (!outgoingEdgesByNode.has(fromNodeId)) outgoingEdgesByNode.set(fromNodeId, []);
    outgoingEdgesByNode.get(fromNodeId)!.push(edge);
  });

  return {
    sanitizedEdges,
    nodeById,
    incomingEdgesByNode,
    outgoingEdgesByNode,
    orderedNodes,
    scopedNodeIds,
    unsupportedCycleMessage,
  };
};
