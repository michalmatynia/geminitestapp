import { type AiNode, type Edge } from '@/shared/contracts/ai-paths';

import { resolveEdgeToNodeId } from './engine-utils';

export function resolveScopedNodeIds(args: {
  nodes: AiNode[];
  triggerNodeId: string | null | undefined;
  nodeById: Map<string, AiNode>;
  outgoingEdgesByNode: Map<string, Edge[]>;
  incomingEdgesByNode: Map<string, Edge[]>;
  seedHashes: Record<string, string>;
}): Set<string> {
  const { nodes, triggerNodeId, nodeById, outgoingEdgesByNode } = args;

  if (!triggerNodeId || !nodeById.has(triggerNodeId)) {
    return new Set(nodes.map((node) => node.id));
  }

  const reachable = new Set<string>();
  const stack = [triggerNodeId];

  // Forward reachability
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    const outgoing = outgoingEdgesByNode.get(current) ?? [];
    outgoing.forEach((edge) => {
      const toNodeId = resolveEdgeToNodeId(edge);
      if (toNodeId && !reachable.has(toNodeId)) {
        stack.push(toNodeId);
      }
    });
  }

  // Include seeded nodes
  Object.keys(args.seedHashes).forEach((nodeId) => {
    reachable.add(nodeId);
  });

  return reachable;
}
