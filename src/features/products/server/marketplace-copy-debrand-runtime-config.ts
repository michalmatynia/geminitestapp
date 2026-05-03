import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';

const isMarketplaceCopyDebrandPersistenceNode = (node: AiNode): boolean =>
  node.id === 'node-db-update-marketplace-copy-debrand' ||
  (node.type === 'database' && node.config?.database?.operation === 'update');

const edgeTouchesRemovedNode = (edge: Edge, removedNodeIds: Set<string>): boolean => {
  const fromNodeId = edge.from ?? edge.source ?? '';
  const toNodeId = edge.to ?? edge.target ?? '';
  return removedNodeIds.has(fromNodeId) || removedNodeIds.has(toNodeId);
};

export const prepareMarketplaceCopyDebrandRuntimeConfig = (config: PathConfig): PathConfig => {
  const removedNodeIds = new Set(
    config.nodes
      .filter((node: AiNode): boolean => isMarketplaceCopyDebrandPersistenceNode(node))
      .map((node: AiNode): string => node.id)
  );
  if (removedNodeIds.size === 0) return config;

  return {
    ...config,
    nodes: config.nodes.filter((node: AiNode): boolean => !removedNodeIds.has(node.id)),
    edges: config.edges.filter(
      (edge: Edge): boolean => !edgeTouchesRemovedNode(edge, removedNodeIds)
    ),
  };
};
