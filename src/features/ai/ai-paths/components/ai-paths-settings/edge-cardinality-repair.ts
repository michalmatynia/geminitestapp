import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import { getNodeInputPortCardinality } from '@/shared/lib/ai-paths/core/utils';

export type SingleCardinalityEdgeRepairResult = {
  edges: Edge[];
  removedEdges: Edge[];
};

export const pruneSingleCardinalityIncomingEdges = (
  nodes: AiNode[],
  edges: Edge[]
): SingleCardinalityEdgeRepairResult => {
  const nodeById = new Map<string, AiNode>(
    nodes.map((node: AiNode): [string, AiNode] => [node.id, node])
  );
  const nextEdges: Edge[] = [];
  const removedEdges: Edge[] = [];
  const singlePortEdgeIndex = new Map<string, number>();

  edges.forEach((edge: Edge): void => {
    const targetNodeId = typeof edge.to === 'string' ? edge.to.trim() : '';
    const targetPort = typeof edge.toPort === 'string' ? edge.toPort.trim() : '';
    if (!targetNodeId || !targetPort) {
      nextEdges.push(edge);
      return;
    }

    const targetNode = nodeById.get(targetNodeId);
    if (!targetNode || getNodeInputPortCardinality(targetNode, targetPort) !== 'one') {
      nextEdges.push(edge);
      return;
    }

    const targetKey = `${targetNodeId}:${targetPort}`;
    const existingIndex = singlePortEdgeIndex.get(targetKey);
    if (existingIndex === undefined) {
      singlePortEdgeIndex.set(targetKey, nextEdges.length);
      nextEdges.push(edge);
      return;
    }

    const displacedEdge = nextEdges[existingIndex];
    if (displacedEdge) {
      removedEdges.push(displacedEdge);
    }
    nextEdges[existingIndex] = edge;
  });

  return {
    edges: nextEdges,
    removedEdges,
  };
};
