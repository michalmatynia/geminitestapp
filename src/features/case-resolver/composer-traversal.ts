import { type CaseResolverEdge } from '@/shared/contracts/case-resolver';
import { type NodeOutput } from './composer-compiler';

export const resolveLeafNodePrompt = (
  visitOrder: { nodeId: string }[],
  outgoingByNode: Map<string, CaseResolverEdge[]>,
  visitedNodeIds: Set<string>,
  outputsByNode: Record<string, NodeOutput>
): string => {
  const leafNodeIds = visitOrder
    .map((entry) => entry.nodeId)
    .filter((nodeId) => {
      const outgoing = outgoingByNode.get(nodeId) ?? [];
      return !outgoing.some((edge) => typeof edge.target === 'string' && visitedNodeIds.has(edge.target));
    });

  const dedupedLeafOutputs: string[] = [];
  const seenLeafOutputs = new Set<string>();
  
  leafNodeIds.forEach((nodeId) => {
    const output = outputsByNode[nodeId]?.plaintextContent?.trim();
    if (output && !seenLeafOutputs.has(output)) {
      seenLeafOutputs.add(output);
      dedupedLeafOutputs.push(output);
    }
  });

  return dedupedLeafOutputs.join('\n\n').trim();
};
