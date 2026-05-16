import { type AiNode, type CaseResolverEdge, type CaseResolverGraph } from '@/shared/contracts/case-resolver';


import { CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT, CASE_RESOLVER_PLAINTEXT_CONTENT_PORT } from '@/shared/contracts/case-resolver/constants';
import { sortNodeIdsByPosition } from './composer-utils';

export type NodeOutputs = {
  wysiwygText: string;
  plaintextContent: string;
  plainText: string;
  wysiwygContent: string;
};

export interface GraphContext {
  nodeById: Map<string, AiNode>;
  outgoingByNode: Map<string, CaseResolverEdge[]>;
  incomingByNode: Map<string, CaseResolverEdge[]>;
  incomingCount: Map<string, number>;
}

export const isWysiwygTextInputPort = (port: string | null | undefined): boolean =>
  port === 'wysiwygText';

export const isPlaintextContentInputPort = (port: string | null | undefined): boolean =>
  port === CASE_RESOLVER_PLAINTEXT_CONTENT_PORT;

export const isPlainTextInputPort = (port: string | null | undefined): boolean =>
  port === 'plainText';

export const isWysiwygContentInputPort = (port: string | null | undefined): boolean =>
  port === CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT;

export const buildGraphContext = (graph: CaseResolverGraph): GraphContext => {
  const nodeById = new Map<string, AiNode>(
    graph.nodes.map((node) => [node.id, node])
  );
  const outgoingByNode = new Map<string, CaseResolverEdge[]>();
  const incomingByNode = new Map<string, CaseResolverEdge[]>();
  const incomingCount = new Map<string, number>();

  graph.nodes.forEach((node) => {
    incomingCount.set(node.id, 0);
    outgoingByNode.set(node.id, []);
    incomingByNode.set(node.id, []);
  });

  graph.edges.forEach((edge) => {
    if (edge.source === undefined || edge.target === undefined) return;
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) return;
    
    const outgoing = outgoingByNode.get(edge.source) ?? [];
    outgoing.push(edge);
    outgoingByNode.set(edge.source, outgoing);
    
    const incoming = incomingByNode.get(edge.target) ?? [];
    incoming.push(edge);
    incomingByNode.set(edge.target, incoming);
    
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
  });

  return { nodeById, outgoingByNode, incomingByNode, incomingCount };
};

export const resolveStartNodeIds = (
  graph: CaseResolverGraph,
  context: GraphContext,
  selectedNodeId: string | null
): string[] => {
  if (selectedNodeId !== null && context.nodeById.has(selectedNodeId)) {
    return [selectedNodeId];
  }
  const sortedNodeIds = sortNodeIdsByPosition(graph.nodes);
  const rootNodeIds = sortedNodeIds.filter(
    (nodeId) => (context.incomingCount.get(nodeId) ?? 0) === 0
  );
  return rootNodeIds.length > 0 ? rootNodeIds : sortedNodeIds;
};

export const compareNodesByPosition = (
  left: AiNode | undefined,
  right: AiNode | undefined,
  leftId: string,
  rightId: string
): number => {
  if (left === undefined || right === undefined) return leftId.localeCompare(rightId);
  if (left.position.y !== right.position.y) {
    return left.position.y - right.position.y;
  }
  if (left.position.x !== right.position.x) {
    return left.position.x - right.position.x;
  }
  return leftId.localeCompare(rightId);
};

export const computeVisitOrder = (
  graph: CaseResolverGraph,
  context: GraphContext,
  startNodeIds: string[],
  selectedNodeId: string | null
): Array<{ nodeId: string; incomingEdgeId: string | null }> => {
  const visitOrder: Array<{ nodeId: string; incomingEdgeId: string | null }> = [];
  const visited = new Set<string>();

  const visit = (nodeId: string, incomingEdgeId: string | null): void => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    visitOrder.push({ nodeId, incomingEdgeId });

    const outgoing = [...(context.outgoingByNode.get(nodeId) ?? [])].sort((left, right) => {
      const leftNode = left.target !== undefined ? context.nodeById.get(left.target) : undefined;
      const rightNode = right.target !== undefined ? context.nodeById.get(right.target) : undefined;
      return compareNodesByPosition(leftNode, rightNode, left.id, right.id);
    });

    outgoing.forEach((edge) => {
      if (edge.target !== undefined) {
        visit(edge.target, edge.id);
      }
    });
  };

  startNodeIds.forEach((nodeId) => visit(nodeId, null));
  
  const isSingleNodePreview = selectedNodeId !== null && context.nodeById.has(selectedNodeId);
  if (!isSingleNodePreview) {
    const sortedNodeIds = sortNodeIdsByPosition(graph.nodes);
    sortedNodeIds.forEach((nodeId) => visit(nodeId, null));
  }

  return visitOrder;
};
