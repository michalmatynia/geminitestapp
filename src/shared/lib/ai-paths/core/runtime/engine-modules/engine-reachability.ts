import { AiNode, Edge } from '@/shared/contracts/ai-paths';
import {
  resolveEdgeFromNodeId,
  resolveEdgeToNodeId,
  isSimulationCapableFetcher,
} from './engine-utils';

export function resolveScopedNodeIds(args: {
  nodes: AiNode[];
  triggerNodeId: string | null | undefined;
  nodeById: Map<string, AiNode>;
  outgoingEdgesByNode: Map<string, Edge[]>;
  incomingEdgesByNode: Map<string, Edge[]>;
  seedHashes: Record<string, string>;
}): Set<string> {
  const { nodes, triggerNodeId, nodeById, outgoingEdgesByNode, incomingEdgesByNode, seedHashes } =
    args;

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

  // Include upstream simulation nodes if trigger requires simulation
  const triggerNode = nodeById.get(triggerNodeId);
  if (
    triggerNode?.config?.trigger?.contextMode === 'simulation_required' ||
    triggerNode?.config?.trigger?.contextMode === 'simulation_preferred'
  ) {
    const incoming = incomingEdgesByNode.get(triggerNodeId) ?? [];
    incoming.forEach((edge) => {
      const fromNodeId = resolveEdgeFromNodeId(edge);
      if (fromNodeId) {
        const fromNode = nodeById.get(fromNodeId);
        if (fromNode?.type === 'simulation' || isSimulationCapableFetcher(fromNode!)) {
          const config = fromNode?.config?.simulation;
          // Respect manual_only behavior
          if (
            fromNode?.type !== 'simulation' ||
            config?.runBehavior !== 'manual_only' ||
            fromNodeId === triggerNodeId ||
            seedHashes[fromNodeId]
          ) {
            reachable.add(fromNodeId);
          }
        }
      }
    });
  }

  return reachable;
}
