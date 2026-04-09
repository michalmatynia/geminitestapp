import type { AiNode, Edge, PathConfig } from '@/shared/lib/ai-paths';

import { useGraphDataState, usePathMetadataState } from './GraphContext';

export function useNodes(): AiNode[] {
  const { nodes } = useGraphDataState();
  return nodes;
}

export function useEdges(): Edge[] {
  const { edges } = useGraphDataState();
  return edges;
}

export function useNode(nodeId: string | null): AiNode | null {
  const { nodes } = useGraphDataState();
  if (!nodeId) return null;
  return nodes.find((node) => node.id === nodeId) ?? null;
}

export function useActivePathConfig(): PathConfig | null {
  const { activePathId, pathConfigs } = usePathMetadataState();
  if (!activePathId) return null;
  return pathConfigs[activePathId] ?? null;
}
