'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useCanvasRefs } from '@/features/ai/ai-paths/context/CanvasContext';
import {
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context/SelectionContext';
import type { AiNode, Edge, NodeDefinition } from '@/shared/lib/ai-paths';
import { sanitizeEdges } from '@/shared/lib/ai-paths';
import { type ConfirmConfig, useConfirm } from '@/shared/hooks/ui/useConfirm';

import { useCanvasView } from './hooks/useCanvasView';
import { useCanvasNodeDrag } from './hooks/useCanvasNodeDrag';
import { useCanvasConnection } from './hooks/useCanvasConnection';
import { isEditableElement } from './utils/canvas-interaction-utils';

type UseAiPathsCanvasInteractionsArgs = {
  nodes: AiNode[];
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  isPathLocked: boolean;
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
    nodes,
    setNodes,
    edges,
    setEdges,
    isPathLocked,
    selectedNodeId,
    setSelectedNodeId,
    confirmNodeSwitch,
    confirm,
    clearRuntimeInputsForEdges,
    reportAiPathsError,
    toast,
  } = args;

  const { viewportRef, canvasRef } = useCanvasRefs();
  const [lastDrop, setLastDrop] = useState<{ x: number; y: number } | null>(null);
  const lastDropTimerRef = useRef<number | null>(null);
  const lockedToastAtRef = useRef<number>(0);

  const {
    selectedEdgeId,
    selectedNodeId: selectedNodeIdCtx,
    selectedNodeIds: selectedNodeIdsCtx,
  } = useSelectionState();
  const { selectEdge, selectNode } = useSelectionActions();
  const { ConfirmationModal } = useConfirm();

  const notifyLocked = useCallback((): void => {
    const now = Date.now();
    if (now - lockedToastAtRef.current < 800) return;
    lockedToastAtRef.current = now;
    toast('This path is locked. Unlock it to edit nodes or connections.', {
      variant: 'info',
    });
  }, [toast]);

  const {
    view,
    panState,
    zoomTo,
    fitToNodes: fitToNodesView,
    resetView,
    ensureNodeVisible,
    handlePanStart: handlePanStartView,
    handlePanMove: handlePanMoveView,
    handlePanEnd: handlePanEndView,
    getCanvasCenterPosition,
  } = useCanvasView(viewportRef);

  const {
    dragState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragStart,
    handleDragOver,
    handleDrop,
  } = useCanvasNodeDrag({
    nodes,
    setNodes,
    view,
    viewportRef,
    canvasRef,
    isPathLocked,
    notifyLocked,
    reportAiPathsError,
    toast,
    setSelectedNodeId,
    ensureNodeVisible,
    setLastDrop,
  });

  const {
    connecting,
    setConnecting,
    connectingPos,
    setConnectingPos,
    handleStartConnection,
    handleCompleteConnection,
    handleRemoveEdge,
    handleDisconnectPort,
    handleReconnectInput,
    edgePaths,
    connectingFromNode,
  } = useCanvasConnection({
    nodes,
    edges,
    setEdges,
    view,
    viewportRef,
    isPathLocked,
    notifyLocked,
    selectedEdgeId,
    selectEdge,
    clearRuntimeInputsForEdges,
    toast,
  });

  useEffect((): void | (() => void) => {
    if (!lastDrop) return;
    if (lastDropTimerRef.current) {
      window.clearTimeout(lastDropTimerRef.current);
    }
    lastDropTimerRef.current = window.setTimeout((): void => {
      setLastDrop(null);
      lastDropTimerRef.current = null;
    }, 1600);
    return (): void => {
      if (lastDropTimerRef.current) {
        window.clearTimeout(lastDropTimerRef.current);
        lastDropTimerRef.current = null;
      }
    };
  }, [lastDrop]);

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
    const nodeIdsToDelete =
      selectedNodeIdsCtx.length > 0
        ? selectedNodeIdsCtx
        : ((selectedNodeIdCtx ?? selectedNodeId)?.trim() ?? '')
          ? [((selectedNodeIdCtx ?? selectedNodeId) as string).trim()]
          : [];
    if (nodeIdsToDelete.length === 0) {
      if (selectedEdgeId) {
        handleRemoveEdge(selectedEdgeId);
      }
      return;
    }
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const nodeIdSet = new Set(nodeIdsToDelete);
    const isSingleNode = nodeIdsToDelete.length === 1;
    const targetNode = isSingleNode
      ? nodes.find((node: AiNode): boolean => node.id === nodeIdsToDelete[0])
      : null;
    const label = isSingleNode
      ? (targetNode?.title ?? 'this node')
      : `${nodeIdsToDelete.length} nodes`;

    confirm({
      title: 'Remove Node?',
      message: `Are you sure you want to remove ${label}? This will delete all connected wires.`,
      confirmText: 'Remove',
      isDangerous: true,
      onConfirm: () => {
        setNodes((prev: AiNode[]): AiNode[] =>
          prev.filter((node: AiNode): boolean => !nodeIdSet.has(node.id))
        );
        let removedEdgesSnapshot: Edge[] = [];
        let remainingEdgesSnapshot: Edge[] = [];
        setEdges((prev: Edge[]): Edge[] => {
          removedEdgesSnapshot = prev.filter(
            (edge: Edge): boolean =>
              (edge.from ? nodeIdSet.has(edge.from) : false) ||
              (edge.to ? nodeIdSet.has(edge.to) : false)
          );
          remainingEdgesSnapshot = prev.filter(
            (edge: Edge): boolean =>
              (!edge.from || !nodeIdSet.has(edge.from)) && (!edge.to || !nodeIdSet.has(edge.to))
          );
          clearRuntimeInputsForEdges(removedEdgesSnapshot, remainingEdgesSnapshot);
          return remainingEdgesSnapshot;
        });
        selectNode(null);
        setSelectedNodeId(null);
        if (selectedEdgeId) {
          const shouldClearSelectedEdge = removedEdgesSnapshot.some(
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
    selectedNodeIdCtx,
    selectedNodeId,
    selectedEdgeId,
    isPathLocked,
    nodes,
    confirm,
    notifyLocked,
    handleRemoveEdge,
    setNodes,
    setEdges,
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
    setEdges((prev: Edge[]): Edge[] => sanitizeEdges(nodes, prev));
  }, [nodes, setEdges]);

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }
    handlePanStartView(event);
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (connecting) {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const x = (event.clientX - viewport.left - view.x) / view.scale;
      const y = (event.clientY - viewport.top - view.y) / view.scale;
      setConnectingPos({ x, y });
      return;
    }
    handlePanMoveView(event);
  };

  const handlePanEnd = (_event: React.PointerEvent<HTMLDivElement>): void => {
    handlePanEndView();
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
    }
  };

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

  const fitToNodes = (): void => {
    fitToNodesView(nodes);
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
