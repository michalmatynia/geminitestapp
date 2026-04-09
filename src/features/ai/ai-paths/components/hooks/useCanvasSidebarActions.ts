'use client';

import { useCallback } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import type { AiNode, Edge, NodeDefinition, RuntimeState } from '@/shared/lib/ai-paths';
import { useToast } from '@/shared/ui/primitives.public';
import { DRAG_KEYS, setDragData } from '@/shared/utils/drag-drop';

import {
  useGraphActions,
  useGraphDataState,
  usePathMetadataState,
  useRuntimeActions,
  useSelectionState,
  useSelectionActions,
  usePersistenceState,
} from '../../context';
import { computeNodeSelectionDeleteResult } from '../../context/hooks/canvas/delete-selection-command';
import { computeEdgeSelectionDeleteResult } from '../../context/hooks/canvas/delete-selection-command';
import { useAiPathsNodeConfigActions } from '../ai-paths-settings/hooks/useAiPathsNodeConfigActions';

const LOCKED_MESSAGE = 'This path is locked. Unlock it in Path Settings to make changes.';

/**
 * Prune runtime inputs that were fed exclusively by the removed edges.
 * Pure function — no React state deps.
 */
function pruneRuntimeInputs(
  state: RuntimeState,
  removedEdges: Edge[],
  remainingEdges: Edge[]
): RuntimeState {
  if (removedEdges.length === 0) return state;
  const remainingTargets = new Set<string>();
  remainingEdges.forEach((edge: Edge) => {
    if (!edge.to || !edge.toPort) return;
    remainingTargets.add(`${edge.to}:${edge.toPort}`);
  });

  const existingInputs = state.inputs ?? {};
  let nextInputs = existingInputs;
  let changed = false;

  removedEdges.forEach((edge: Edge) => {
    if (!edge.to || !edge.toPort) return;
    const targetKey = `${edge.to}:${edge.toPort}`;
    if (remainingTargets.has(targetKey)) return;
    const nodeInputs = nextInputs?.[edge.to] ?? {};
    if (!(edge.toPort in nodeInputs)) return;
    if (!changed) {
      nextInputs = { ...existingInputs };
      changed = true;
    }
    const nextNodeInputs = { ...nodeInputs };
    delete nextNodeInputs[edge.toPort];
    if (Object.keys(nextNodeInputs).length === 0) {
      delete nextInputs[edge.to];
    } else {
      nextInputs[edge.to] = nextNodeInputs;
    }
  });

  if (!changed) return state;
  return { ...state, inputs: nextInputs };
}

export function useCanvasSidebarActions() {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { nodes, edges } = useGraphDataState();
  const { isPathLocked } = usePathMetadataState();
  const { setNodes, setEdges } = useGraphActions();
  const { setRuntimeState } = useRuntimeActions();
  const { selectedNodeId, selectedNodeIds, selectedEdgeId } = useSelectionState();
  const { selectNode, selectEdge } = useSelectionActions();
  const { isPathSwitching } = usePersistenceState();
  const { updateSelectedNode } = useAiPathsNodeConfigActions({ selectedNodeId });

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition): void => {
      if (isPathLocked) {
        event.preventDefault();
        toast(LOCKED_MESSAGE, { variant: 'info' });
        return;
      }
      const payload = JSON.stringify(node);
      setDragData(event.dataTransfer, { [DRAG_KEYS.AI_NODE]: payload }, { effectAllowed: 'copy' });
    },
    [isPathLocked, toast]
  );

  const handleRemoveEdge = useCallback(
    (edgeId: string): void => {
      if (isPathLocked) {
        toast(LOCKED_MESSAGE, { variant: 'info' });
        return;
      }
      const target = edges.find((edge: Edge) => edge.id === edgeId) ?? null;
      if (!target) return;
      const remaining = edges.filter((edge: Edge) => edge.id !== edgeId);
      setEdges(remaining);
      setRuntimeState((prev: RuntimeState) => pruneRuntimeInputs(prev, [target], remaining));
      if (selectedEdgeId === edgeId) {
        selectEdge(null);
      }
    },
    [isPathLocked, edges, setEdges, setRuntimeState, selectedEdgeId, selectEdge, toast]
  );

  const handleDeleteSelectedNode = useCallback((): void => {
    if (isPathSwitching) return;
    if (selectedNodeIds.length === 0) {
      if (selectedEdgeId) {
        const edgeDeleteResult = computeEdgeSelectionDeleteResult(edges, [selectedEdgeId]);
        if (edgeDeleteResult.edgeIds.length === 0) return;
        setEdges(edgeDeleteResult.remainingEdges);
        setRuntimeState((prev: RuntimeState) =>
          pruneRuntimeInputs(prev, edgeDeleteResult.removedEdges, edgeDeleteResult.remainingEdges)
        );
        selectEdge(null);
      }
      return;
    }
    if (isPathLocked) {
      toast(LOCKED_MESSAGE, { variant: 'info' });
      return;
    }
    const deleteResult = computeNodeSelectionDeleteResult(nodes, edges, selectedNodeIds);
    if (deleteResult.nodeIds.length === 0) return;
    const isSingleNode = deleteResult.nodeIds.length === 1;
    const targetNode = isSingleNode
      ? nodes.find((node: AiNode): boolean => node.id === deleteResult.nodeIds[0])
      : null;
    const label = isSingleNode
      ? (targetNode?.title ?? 'this node')
      : `${deleteResult.nodeIds.length} nodes`;

    confirm({
      title: 'Remove Node?',
      message: `Are you sure you want to remove ${label}? This will delete all connected wires.`,
      confirmText: 'Remove',
      isDangerous: true,
      onConfirm: () => {
        setNodes(deleteResult.remainingNodes);
        setEdges(deleteResult.remainingEdges);
        setRuntimeState((prev: RuntimeState) =>
          pruneRuntimeInputs(prev, deleteResult.removedEdges, deleteResult.remainingEdges)
        );
        selectNode(null);
        if (
          selectedEdgeId &&
          deleteResult.removedEdges.some((edge: Edge): boolean => edge.id === selectedEdgeId)
        ) {
          selectEdge(null);
        }
      },
    });
  }, [
    isPathSwitching,
    selectedNodeIds,
    selectedEdgeId,
    isPathLocked,
    nodes,
    edges,
    confirm,
    toast,
    setEdges,
    setNodes,
    setRuntimeState,
    selectNode,
    selectEdge,
  ]);

  return {
    handleDragStart,
    handleRemoveEdge,
    handleDeleteSelectedNode,
    updateSelectedNode,
    ConfirmationModal,
  };
}
