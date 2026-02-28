import { useCallback } from 'react';
import type { AiNode, NodeConfig } from '@/shared/lib/ai-paths';

export function useAiPathsNodeConfigActions(args: {
  selectedNodeId: string | null;
  setNodes: (nodes: (prev: AiNode[]) => AiNode[]) => void;
}) {
  const { selectedNodeId, setNodes } = args;

  const updateSelectedNode = useCallback(
    (patch: Partial<AiNode>): void => {
      if (!selectedNodeId) return;
      setNodes((prev) =>
        prev.map((node) => (node.id === selectedNodeId ? { ...node, ...patch } : node))
      );
    },
    [selectedNodeId, setNodes]
  );

  const updateSelectedNodeConfig = useCallback(
    (config: NodeConfig): void => {
      if (!selectedNodeId) return;
      setNodes((prev) =>
        prev.map((node) =>
          node.id === selectedNodeId ? { ...node, config: { ...node.config, ...config } } : node
        )
      );
    },
    [selectedNodeId, setNodes]
  );

  return {
    updateSelectedNode,
    updateSelectedNodeConfig,
  };
}
