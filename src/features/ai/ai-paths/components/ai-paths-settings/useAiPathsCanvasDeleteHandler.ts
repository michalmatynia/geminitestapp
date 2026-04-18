'use client';

import { useCallback } from 'react';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import {
  computeEdgeSelectionDeleteResult,
  computeNodeSelectionDeleteResult,
} from '@/features/ai/ai-paths/context/hooks/canvas/delete-selection-command';
import type { ConfirmConfig } from '@/shared/hooks/ui/useConfirm';

interface DeleteHandlerOptions {
  isPathSwitching: boolean;
  isPathLocked: boolean;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  graphNodes: AiNode[];
  graphEdges: Edge[];
  setGraphNodes: (nodes: AiNode[], options: { reason: string; source: string; allowNodeCountDecrease?: boolean }) => void;
  setGraphEdges: (edges: Edge[], options: { reason: string; source: string }) => void;
  clearRuntimeInputsForEdges: (removed: Edge[], remaining: Edge[]) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  notifyLocked: () => void;
  confirm: (config: ConfirmConfig) => void;
}

export function useAiPathsCanvasDeleteHandler(options: DeleteHandlerOptions): () => void {
  const {
    isPathSwitching, isPathLocked, selectedNodeIds, selectedEdgeId, graphNodes, graphEdges,
    setGraphNodes, setGraphEdges, clearRuntimeInputsForEdges, selectNode, selectEdge, notifyLocked, confirm,
  } = options;

  const handleDeleteEdges = useCallback((): void => {
    if (selectedEdgeId === null || selectedEdgeId === '') return;
    const res = computeEdgeSelectionDeleteResult(graphEdges, [selectedEdgeId]);
    if (res.edgeIds.length === 0) return;
    setGraphEdges(res.remainingEdges, { reason: 'delete', source: 'settings.canvas.delete.edge' });
    clearRuntimeInputsForEdges(res.removedEdges, res.remainingEdges);
    selectEdge(null);
  }, [selectedEdgeId, graphEdges, setGraphEdges, clearRuntimeInputsForEdges, selectEdge]);

  return useCallback((): void => {
    if (isPathSwitching === true) return;
    if (selectedNodeIds.length === 0) { handleDeleteEdges(); return; }
    if (isPathLocked === true) { notifyLocked(); return; }
    const res = computeNodeSelectionDeleteResult(graphNodes, graphEdges, selectedNodeIds);
    if (res.nodeIds.length === 0) return;
    const target = res.nodeIds.length === 1 ? graphNodes.find((n) => n.id === res.nodeIds[0]) : null;
    const label = target ? (target.title ?? 'this node') : `${res.nodeIds.length} nodes`;

    confirm({
      title: 'Remove Node?',
      message: `Are you sure you want to remove ${label}? This will delete all connected wires.`,
      confirmText: 'Remove',
      isDangerous: true,
      onConfirm: () => {
        setGraphNodes(res.remainingNodes, { reason: 'delete', source: 'settings.canvas.delete.node', allowNodeCountDecrease: true });
        setGraphEdges(res.remainingEdges, { reason: 'delete', source: 'settings.canvas.delete.node' });
        clearRuntimeInputsForEdges(res.removedEdges, res.remainingEdges);
        selectNode(null);
        if (selectedEdgeId !== null && selectedEdgeId !== '' && res.removedEdges.some((e) => e.id === selectedEdgeId)) selectEdge(null);
      },
    });
  }, [isPathSwitching, selectedNodeIds, isPathLocked, notifyLocked, graphNodes, graphEdges, confirm, handleDeleteEdges, setGraphNodes, setGraphEdges, clearRuntimeInputsForEdges, selectNode, selectedEdgeId, selectEdge]);
}
