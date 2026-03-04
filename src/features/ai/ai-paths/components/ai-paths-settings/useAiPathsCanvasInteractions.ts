'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import {
  useCanvasActions,
  useCanvasRefs,
  useCanvasState,
} from '@/features/ai/ai-paths/context/CanvasContext';
import { useGraphActions, useGraphState } from '@/features/ai/ai-paths/context/GraphContext';
import {
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context/SelectionContext';
import { useCanvasInteractions } from '@/features/ai/ai-paths/context/hooks/useCanvasInteractions';
import type { AiNode, Edge, NodeDefinition } from '@/shared/lib/ai-paths';
import { sanitizeEdges } from '@/shared/lib/ai-paths';
import { type ConfirmConfig } from '@/shared/hooks/ui/useConfirm';
import {
  computeEdgeSelectionDeleteResult,
  computeNodeSelectionDeleteResult,
} from '@/features/ai/ai-paths/context/hooks/canvas/delete-selection-command';

import { isEditableElement } from './utils/canvas-interaction-utils';

type UseAiPathsCanvasInteractionsArgs = {
  isPathLocked: boolean;
  isPathSwitching?: boolean;
  selectedNodeId: string | null;
  setSelectedNodeId: (value: string | null) => void;
  confirmNodeSwitch?: (nextNodeId: string) => boolean | Promise<boolean>;
  confirm: (config: ConfirmConfig) => void;
  clearRuntimeInputsForEdges: (removed: Edge[], remaining: Edge[]) => void;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  toast: (
    message: string,
    options?: {
      variant?: 'success' | 'error' | 'info' | 'warning';
      duration?: number;
      error?: unknown;
    }
  ) => void;
};

type ConnectingState = {
  fromNodeId: string;
  fromPort: string;
  start: { x: number; y: number };
};

export interface AiPathsCanvasInteractions {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  view: { x: number; y: number; scale: number };
  panState: { startX: number; startY: number; originX: number; originY: number } | null;
  dragState: { nodeId: string; offsetX: number; offsetY: number } | null;
  connecting: ConnectingState | null;
  connectingPos: { x: number; y: number } | null;
  lastDrop: { x: number; y: number } | null;
  selectedEdgeId: string | null;
  edgePaths: {
    id: string;
    path: string;
    label?: string | undefined;
    arrow?: { x: number; y: number; angle: number } | undefined;
  }[];
  connectingFromNode: AiNode | null;
  ensureNodeVisible: (node: AiNode) => void;
  getCanvasCenterPosition: () => { x: number; y: number };
  handlePointerDown: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handleDragStart: (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleStartConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  handleCompleteConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  handlePanStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleReconnectInput: (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    port: string
  ) => void;
  handleRemoveEdge: (edgeId: string) => void;
  handleDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  handleDeleteSelectedNode: () => void;
  handleSelectEdge: (edgeId: string | null) => void;
  handleSelectNode: (nodeId: string) => void;
  zoomTo: (targetScale: number) => void;
  fitToNodes: () => void;
  resetView: () => void;
  ConfirmationModal: React.ComponentType;
}

export function useAiPathsCanvasInteractions(
  args: UseAiPathsCanvasInteractionsArgs
): AiPathsCanvasInteractions {
  const {
    isPathLocked,
    isPathSwitching = false,
    selectedNodeId,
    setSelectedNodeId,
    confirmNodeSwitch,
    confirm,
    clearRuntimeInputsForEdges,
    reportAiPathsError: _reportAiPathsError,
    toast,
  } = args;
  void _reportAiPathsError;

  const { viewportRef, canvasRef } = useCanvasRefs();
  const { view, panState, dragState, connecting, connectingPos, lastDrop } = useCanvasState();
  const {
    setConnecting: setConnectingCtx,
    setConnectingPos: setConnectingPosCtx,
  } = useCanvasActions();
  const lockedToastAtRef = useRef<number>(0);

  const {
    selectedEdgeId,
    selectedNodeId: selectedNodeIdCtx,
    selectedNodeIds: selectedNodeIdsCtx,
  } = useSelectionState();
  const { selectEdge, selectNode } = useSelectionActions();
  const { nodes: graphNodes, edges: graphEdges } = useGraphState();
  const { setNodes: setGraphNodes, setEdges: setGraphEdges } = useGraphActions();

  const notifyLocked = useCallback((): void => {
    const now = Date.now();
    if (now - lockedToastAtRef.current < 800) return;
    lockedToastAtRef.current = now;
    toast('This path is locked. Unlock it to edit nodes or connections.', {
      variant: 'info',
    });
  }, [toast]);

  const interactions = useCanvasInteractions({
    confirmNodeSwitch: (nextNodeId) => confirmNodeSwitch?.(nextNodeId) ?? true,
  });

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, nodeId: string): void => {
      void interactions.handlePointerDownNode(event, nodeId);
    },
    [interactions]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, nodeId: string): void => {
      interactions.handlePointerMoveNode(event, nodeId);
    },
    [interactions]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, nodeId: string): void => {
      interactions.handlePointerUpNode(event, nodeId);
    },
    [interactions]
  );

  const handleStartConnection = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string): void => {
      void interactions.handleStartConnection(event, node, port);
    },
    [interactions]
  );

  const handleCompleteConnection = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string): void => {
      interactions.handleCompleteConnection(event, node, port);
    },
    [interactions]
  );

  const handleReconnectInput = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string): void => {
      void interactions.handleReconnectInput(event, nodeId, port);
    },
    [interactions]
  );

  const handleDragStart = interactions.handleDragStart;
  const handleDragOver = interactions.handleDragOver;
  const handleDrop = interactions.handleDrop;
  const handleRemoveEdge = interactions.handleRemoveEdge;
  const handleDisconnectPort = interactions.handleDisconnectPort;
  const ensureNodeVisible = interactions.ensureNodeVisible;
  const zoomTo = interactions.zoomTo;
  const fitToNodes = interactions.fitToNodes;
  const resetView = interactions.resetView;
  const ConfirmationModal = interactions.ConfirmationModal;
  const edgePaths = interactions.edgePaths;
  const handlePanStart = interactions.handlePanStart as (
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
  const handlePanMove = interactions.handlePanMove as (
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
  const handlePanEnd = interactions.handlePanEnd as (
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
  const connectingFromNode = connecting
    ? graphNodes.find((node: AiNode): boolean => node.id === connecting.fromNodeId) ?? null
    : null;
  const getCanvasCenterPosition = useCallback((): { x: number; y: number } => {
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return { x: 0, y: 0 };
    return {
      x: (viewport.width / 2 - view.x) / view.scale,
      y: (viewport.height / 2 - view.y) / view.scale,
    };
  }, [view.scale, view.x, view.y, viewportRef]);

  const setConnecting = setConnectingCtx;
  const setConnectingPos = setConnectingPosCtx;

  useEffect((): void | (() => void) => {
    const handleWindowPointerDown = (event: PointerEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-port]')) return;
      if (target?.closest('path')) return;
      if (target?.closest('[data-edge-panel]')) return;
      setConnecting(null);
      setConnectingPos(null);
      selectEdge(null);
    };
    window.addEventListener('pointerdown', handleWindowPointerDown);
    return (): void => window.removeEventListener('pointerdown', handleWindowPointerDown);
  }, [selectEdge, setConnecting, setConnectingPos]);

  useEffect((): void | (() => void) => {
    const handleWindowPointerUp = (): void => {
      setConnecting(null);
      setConnectingPos(null);
    };
    window.addEventListener('pointerup', handleWindowPointerUp);
    return (): void => window.removeEventListener('pointerup', handleWindowPointerUp);
  }, [setConnecting, setConnectingPos]);

  const handleDeleteSelectedNode = useCallback((): void => {
    if (isPathSwitching) return;
    const nodeIdsToDelete =
      selectedNodeIdsCtx.length > 0
        ? selectedNodeIdsCtx
        : ((selectedNodeIdCtx ?? selectedNodeId)?.trim() ?? '')
          ? [((selectedNodeIdCtx ?? selectedNodeId) as string).trim()]
          : [];
    if (nodeIdsToDelete.length === 0) {
      if (selectedEdgeId) {
        const edgeDeleteResult = computeEdgeSelectionDeleteResult(graphEdges, [selectedEdgeId]);
        if (edgeDeleteResult.edgeIds.length === 0) return;
        setGraphEdges(edgeDeleteResult.remainingEdges, {
          reason: 'delete',
          source: 'settings.canvas.delete.edge',
        });
        clearRuntimeInputsForEdges(edgeDeleteResult.removedEdges, edgeDeleteResult.remainingEdges);
        selectEdge(null);
      }
      return;
    }
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const deleteResult = computeNodeSelectionDeleteResult(graphNodes, graphEdges, nodeIdsToDelete);
    if (deleteResult.nodeIds.length === 0) return;
    const isSingleNode = deleteResult.nodeIds.length === 1;
    const targetNode = isSingleNode
      ? graphNodes.find((node: AiNode): boolean => node.id === deleteResult.nodeIds[0])
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
        setGraphNodes(deleteResult.remainingNodes, {
          reason: 'delete',
          source: 'settings.canvas.delete.node',
          allowNodeCountDecrease: true,
        });
        setGraphEdges(deleteResult.remainingEdges, {
          reason: 'delete',
          source: 'settings.canvas.delete.node',
        });
        clearRuntimeInputsForEdges(deleteResult.removedEdges, deleteResult.remainingEdges);
        selectNode(null);
        setSelectedNodeId(null);
        if (selectedEdgeId) {
          const shouldClearSelectedEdge = deleteResult.removedEdges.some(
            (edge: Edge): boolean => edge.id === selectedEdgeId
          );
          if (shouldClearSelectedEdge) {
            selectEdge(null);
          }
        }
      },
    });
  }, [
    selectedNodeIdsCtx,
    isPathSwitching,
    selectedNodeIdCtx,
    selectedNodeId,
    selectedEdgeId,
    isPathLocked,
    graphNodes,
    confirm,
    notifyLocked,
    graphEdges,
    setGraphEdges,
    setGraphNodes,
    clearRuntimeInputsForEdges,
    selectNode,
    setSelectedNodeId,
    selectEdge,
  ]);

  useEffect((): (() => void) => {
    const handleWindowKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (isEditableElement(event.target)) return;
      const hasNodeSelection =
        selectedNodeIdsCtx.length > 0 || Boolean((selectedNodeIdCtx ?? selectedNodeId)?.trim());
      const hasEdgeSelection = Boolean(selectedEdgeId);
      if (!hasNodeSelection && !hasEdgeSelection) return;
      event.preventDefault();
      handleDeleteSelectedNode();
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return (): void => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [
    handleDeleteSelectedNode,
    selectedEdgeId,
    selectedNodeId,
    selectedNodeIdCtx,
    selectedNodeIdsCtx,
  ]);

  useEffect((): void => {
    setGraphEdges((prev: Edge[]): Edge[] => sanitizeEdges(graphNodes, prev), {
      reason: 'update',
      source: 'settings.canvas.compat.sanitizeEdges',
    });
  }, [graphNodes, setGraphEdges]);

  const handleSelectEdge = (edgeId: string | null): void => {
    selectEdge(edgeId);
    if (edgeId) {
      selectNode(null);
      setSelectedNodeId(null);
    }
  };

  const handleSelectNode = (nodeId: string): void => {
    if (nodeId === (selectedNodeIdCtx ?? selectedNodeId)) return;

    const proceed = (): void => {
      selectEdge(null);
      selectNode(nodeId);
      setSelectedNodeId(nodeId);
    };

    if (confirmNodeSwitch) {
      const result = confirmNodeSwitch(nodeId);
      if (result instanceof Promise) {
        void result.then((confirmed: boolean): void => {
          if (confirmed) proceed();
        });
      } else if (result) {
        proceed();
      }
    } else {
      proceed();
    }
  };

  return {
    viewportRef,
    canvasRef,
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    lastDrop,
    selectedEdgeId,
    edgePaths,
    connectingFromNode,
    ensureNodeVisible,
    getCanvasCenterPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleStartConnection,
    handleCompleteConnection,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleReconnectInput,
    handleRemoveEdge,
    handleDisconnectPort,
    handleDeleteSelectedNode,
    handleSelectEdge,
    handleSelectNode,
    zoomTo,
    fitToNodes,
    resetView,
    ConfirmationModal,
  };
}
