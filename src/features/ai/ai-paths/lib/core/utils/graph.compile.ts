import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { CompiledGraph } from './graph.types';

export const compileGraph = (
  nodes: AiNode[],
  edges: Edge[]
): CompiledGraph => {
  const nodeMap = new Map(nodes.map((node: AiNode) => [node.id, node]));
  const adjacency = new Map<string, string[]>();
  const inverseAdjacency = new Map<string, string[]>();

  edges.forEach((edge: Edge) => {
    if (!edge.from || !edge.to) return;
    const targets = adjacency.get(edge.from) ?? [];
    targets.push(edge.to);
    adjacency.set(edge.from, targets);

    const sources = inverseAdjacency.get(edge.to) ?? [];
    sources.push(edge.from);
    inverseAdjacency.set(edge.to, sources);
  });

  const triggerNode = nodes.find((node: AiNode) => node.type === 'trigger');
  const triggerNodeId = triggerNode?.id ?? null;

  const processingNodeIds = nodes
    .filter((node: AiNode) => node.type !== 'trigger' && node.type !== 'viewer')
    .map((node: AiNode) => node.id);

  const terminalNodeIds = nodes
    .filter((node: AiNode) => {
      const targets = adjacency.get(node.id) ?? [];
      return targets.length === 0;
    })
    .map((node: AiNode) => node.id);

  return {
    nodes,
    edges,
    nodeMap,
    adjacency,
    inverseAdjacency,
    triggerNodeId,
    processingNodeIds,
    terminalNodeIds,
  };
};
