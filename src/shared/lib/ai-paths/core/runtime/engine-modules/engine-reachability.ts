import { type AiNode, type Edge } from '@/shared/contracts/ai-paths';

import { resolveEdgeFromNodeId, resolveEdgeToNodeId } from './engine-utils';

const normalizeNodeType = (type: string | undefined): string =>
  typeof type === 'string' ? type.trim().toLowerCase() : '';

const hasPort = (ports: string[] | undefined, portName: string): boolean =>
  Array.isArray(ports) &&
  ports.some((port) => port.trim().toLowerCase() === portName);

const isTriggerLikeNode = (
  node: AiNode | undefined,
  incomingEdgesByNode: Map<string, Edge[]>
): boolean => {
  if (node === undefined) return false;
  const nodeType = normalizeNodeType(node.type);
  if (nodeType === 'trigger' || nodeType.endsWith('_trigger') || nodeType.includes('trigger')) {
    return true;
  }
  return (incomingEdgesByNode.get(node.id)?.length ?? 0) === 0 && hasPort(node.outputs, 'trigger');
};

const collectForwardReachableNodeIds = (
  triggerNodeId: string,
  outgoingEdgesByNode: Map<string, Edge[]>
): Set<string> => {
  const reachable = new Set<string>();
  const stack = [triggerNodeId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || reachable.has(current)) continue;
    reachable.add(current);
    const outgoing = outgoingEdgesByNode.get(current) ?? [];
    outgoing.forEach((edge) => {
      const toNodeId = resolveEdgeToNodeId(edge);
      if (toNodeId !== null && !reachable.has(toNodeId)) {
        stack.push(toNodeId);
      }
    });
  }

  return reachable;
};

const createUnselectedTriggerAncestorResolver = (args: {
  triggerNodeId: string;
  nodeById: Map<string, AiNode>;
  incomingEdgesByNode: Map<string, Edge[]>;
}): ((nodeId: string) => boolean) => {
  const memo = new Map<string, boolean>();

  const hasUnselectedTriggerAncestor = (
    nodeId: string,
    visiting = new Set<string>()
  ): boolean => {
    const memoized = memo.get(nodeId);
    if (memoized !== undefined) return memoized;
    if (visiting.has(nodeId)) return false;
    const node = args.nodeById.get(nodeId);
    if (isTriggerLikeNode(node, args.incomingEdgesByNode) && nodeId !== args.triggerNodeId) {
      memo.set(nodeId, true);
      return true;
    }

    visiting.add(nodeId);
    const hasAncestor = (args.incomingEdgesByNode.get(nodeId) ?? []).some((edge) => {
      const fromNodeId = resolveEdgeFromNodeId(edge);
      return fromNodeId !== null && hasUnselectedTriggerAncestor(fromNodeId, visiting);
    });
    visiting.delete(nodeId);
    memo.set(nodeId, hasAncestor);
    return hasAncestor;
  };

  return hasUnselectedTriggerAncestor;
};

const includeStaticUpstreamDependencies = (args: {
  reachable: Set<string>;
  incomingEdgesByNode: Map<string, Edge[]>;
  hasUnselectedTriggerAncestor: (nodeId: string) => boolean;
}): void => {
  const dependencyStack = Array.from(args.reachable);
  while (dependencyStack.length > 0) {
    const currentNodeId = dependencyStack.pop();
    if (currentNodeId === undefined) continue;
    (args.incomingEdgesByNode.get(currentNodeId) ?? []).forEach((edge) => {
      const fromNodeId = resolveEdgeFromNodeId(edge);
      if (fromNodeId === null || args.reachable.has(fromNodeId)) return;
      if (args.hasUnselectedTriggerAncestor(fromNodeId)) return;
      args.reachable.add(fromNodeId);
      dependencyStack.push(fromNodeId);
    });
  }
};

export function resolveScopedNodeIds(args: {
  nodes: AiNode[];
  triggerNodeId: string | null | undefined;
  nodeById: Map<string, AiNode>;
  outgoingEdgesByNode: Map<string, Edge[]>;
  incomingEdgesByNode: Map<string, Edge[]>;
  seedHashes: Record<string, string>;
}): Set<string> {
  const { nodes, triggerNodeId, nodeById, outgoingEdgesByNode, incomingEdgesByNode } = args;

  if (
    typeof triggerNodeId !== 'string' ||
    triggerNodeId.trim().length === 0 ||
    !nodeById.has(triggerNodeId)
  ) {
    return new Set(nodes.map((node) => node.id));
  }

  const reachable = collectForwardReachableNodeIds(triggerNodeId, outgoingEdgesByNode);

  // Include seeded nodes
  Object.keys(args.seedHashes).forEach((nodeId) => {
    reachable.add(nodeId);
  });

  includeStaticUpstreamDependencies({
    reachable,
    incomingEdgesByNode,
    hasUnselectedTriggerAncestor: createUnselectedTriggerAncestorResolver({
      triggerNodeId,
      nodeById,
      incomingEdgesByNode,
    }),
  });

  return reachable;
}
