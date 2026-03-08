import type { AiNode, Edge, PathConfig } from '@/shared/lib/ai-paths';

import { useGraphState } from './GraphContext';

export function useNodes(): AiNode[] {
  const { nodes } = useGraphState();
  return nodes;
}

export function useEdges(): Edge[] {
  const { edges } = useGraphState();
  return edges;
}

export function useNode(nodeId: string | null): AiNode | null {
  const { nodes } = useGraphState();
  if (!nodeId) return null;
  return nodes.find((node) => node.id === nodeId) ?? null;
}

export function useActivePathConfig(): PathConfig | null {
  const { activePathId, pathConfigs } = useGraphState();
  if (!activePathId) return null;
  return pathConfigs[activePathId] ?? null;
}
