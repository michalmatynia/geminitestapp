'use client';

import { useCallback } from 'react';

import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import type { AiNode, NodeConfig } from '@/shared/contracts/ai-paths';

export function useAiPathsNodeConfigActions(args: { selectedNodeId: string | null }) {
  const { selectedNodeId } = args;
  const { setNodes } = useGraphActions();

  const updateSelectedNode = useCallback(
    (patch: Partial<AiNode>, options?: { nodeId?: string }): void => {
      const resolvedNodeId = options?.nodeId?.trim() || selectedNodeId;
      if (!resolvedNodeId) return;
      setNodes((prev) =>
        prev.map((node) => (node.id === resolvedNodeId ? { ...node, ...patch } : node))
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
