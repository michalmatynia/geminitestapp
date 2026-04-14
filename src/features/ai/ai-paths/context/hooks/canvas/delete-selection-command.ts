import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

export type NodeSelectionDeleteResult = {
  nodeIds: string[];
  nodeIdSet: Set<string>;
  remainingNodes: AiNode[];
  removedEdges: Edge[];
  remainingEdges: Edge[];
};

export const computeNodeSelectionDeleteResult = (
  nodes: AiNode[],
  edges: Edge[],
  nodeIds: string[]
): NodeSelectionDeleteResult => {
  const trimmedNodeIds = Array.from(
    new Set(
      nodeIds.map((nodeId) => nodeId.trim()).filter((nodeId): nodeId is string => nodeId.length > 0)
    )
  );
  const nodeIdSet = new Set(trimmedNodeIds);
  const remainingNodes = nodes.filter((node) => !nodeIdSet.has(node.id));
  const removedEdges = edges.filter((edge) =>
    Boolean((edge.from && nodeIdSet.has(edge.from)) || (edge.to && nodeIdSet.has(edge.to)))
  );
  const remainingEdges = edges.filter(
    (edge) => !((edge.from && nodeIdSet.has(edge.from)) || (edge.to && nodeIdSet.has(edge.to)))
  );

  return {
    nodeIds: trimmedNodeIds,
    nodeIdSet,
    remainingNodes,
    removedEdges,
    remainingEdges,
  };
};

export type EdgeSelectionDeleteResult = {
  edgeIds: string[];
  edgeIdSet: Set<string>;
  removedEdges: Edge[];
  remainingEdges: Edge[];
};

export const computeEdgeSelectionDeleteResult = (
  edges: Edge[],
  edgeIds: string[]
): EdgeSelectionDeleteResult => {
  const trimmedEdgeIds = Array.from(
    new Set(
      edgeIds.map((edgeId) => edgeId.trim()).filter((edgeId): edgeId is string => edgeId.length > 0)
    )
  );
  const edgeIdSet = new Set(trimmedEdgeIds);
  const removedEdges = edges.filter((edge) => edgeIdSet.has(edge.id));
  const remainingEdges = edges.filter((edge) => !edgeIdSet.has(edge.id));

  return {
    edgeIds: trimmedEdgeIds,
    edgeIdSet,
    removedEdges,
    remainingEdges,
  };
};
