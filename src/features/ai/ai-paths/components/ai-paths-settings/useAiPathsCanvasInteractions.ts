'use client';

import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { useCanvasActions, useCanvasRefs, useCanvasState } from '@/features/ai/ai-paths/context/CanvasContext';
import { useGraphActions, useGraphDataState } from '@/features/ai/ai-paths/context/GraphContext';
import { useCanvasInteractions } from '@/features/ai/ai-paths/context/hooks/useCanvasInteractions';
import { useSelectionActions, useSelectionState } from '@/features/ai/ai-paths/context/SelectionContext';
import { type ConfirmConfig } from '@/shared/hooks/ui/useConfirm';
import type { AiNode, Edge, NodeDefinition } from '@/shared/contracts/ai-paths';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useAiPathsCanvasDeleteHandler } from './useAiPathsCanvasDeleteHandler';
import { useAiPathsCanvasKeyboardShortcuts } from './useAiPathsCanvasKeyboardShortcuts';

type UseAiPathsCanvasInteractionsArgs = {
  enabled?: boolean; isPathLocked: boolean; isPathSwitching?: boolean;
  confirmNodeSwitch?: (nextNodeId: string) => boolean | Promise<boolean>;
  confirm: (config: ConfirmConfig) => void;
  clearRuntimeInputsForEdges: (removed: Edge[], remaining: Edge[]) => void;
  toast: (msg: string, options?: { variant?: 'success' | 'error' | 'info' | 'warning'; duration?: number; error?: unknown; }) => void;
};

type ConnectingState = { fromNodeId: string; fromPort: string; start: { x: number; y: number }; };

export interface AiPathsCanvasInteractions {
  viewportRef: React.RefObject<HTMLDivElement | null>; canvasRef: React.RefObject<HTMLDivElement | null>;
  view: { x: number; y: number; scale: number }; panState: { startX: number; startY: number; originX: number; originY: number } | null;
  dragState: { nodeId: string; offsetX: number; offsetY: number } | null; connecting: ConnectingState | null;
  connectingPos: { x: number; y: number } | null; lastDrop: { x: number; y: number } | null; selectedEdgeId: string | null;
  edgePaths: { id: string; path: string; label?: string | undefined; arrow?: { x: number; y: number; angle: number } | undefined; }[];
  connectingFromNode: AiNode | null; ensureNodeVisible: (node: AiNode) => void; getCanvasCenterPosition: () => { x: number; y: number };
  handlePointerDown: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handleDragStart: (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleStartConnection: (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string) => void;
  handleCompleteConnection: (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string) => void;
  handlePanStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleReconnectInput: (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string) => void;
  handleRemoveEdge: (edgeId: string) => void; handleDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  handleDeleteSelectedNode: () => void; handleSelectEdge: (edgeId: string | null) => void; handleSelectNode: (nodeId: string) => void;
  zoomTo: (targetScale: number) => void; fitToNodes: () => void; resetView: () => void; ConfirmationModal: React.ComponentType;
}

function useCanvasWindowInteractions(
  enabled: boolean, setConnecting: (val: ConnectingState | null) => void,
  setConnectingPos: (val: { x: number; y: number } | null) => void, selectEdge: (id: string | null) => void
): void {
  useEffect(() => {
    if (!enabled) return (): void => {};
    const hWPD = (event: PointerEvent): void => {
      const t = event.target as HTMLElement | null;
      if (t?.closest('[data-port]') || t?.closest('path') || t?.closest('[data-edge-panel]')) return;
      setConnecting(null); setConnectingPos(null); selectEdge(null);
    };
    window.addEventListener('pointerdown', hWPD);
    return (): void => window.removeEventListener('pointerdown', hWPD);
  }, [enabled, selectEdge, setConnecting, setConnectingPos]);

  useEffect(() => {
    if (!enabled) return (): void => {};
    const hWPU = (): void => { setConnecting(null); setConnectingPos(null); };
    window.addEventListener('pointerup', hWPU);
    return (): void => window.removeEventListener('pointerup', hWPU);
  }, [enabled, setConnecting, setConnectingPos]);
}

function useHandleSelectNode(
  selectedNodeIds: string[], selectEdge: (id: string | null) => void,
  selectNode: (id: string | null) => void, confirmNodeSwitch?: (nextNodeId: string) => boolean | Promise<boolean>
): (nodeId: string) => void {
  return useCallback((nodeId: string): void => {
    if (selectedNodeIds.length <= 1 && selectedNodeIds.includes(nodeId)) return;
    const proceed = (): void => { selectEdge(null); selectNode(nodeId); };
    if (confirmNodeSwitch === undefined) { proceed(); return; }
    const res = confirmNodeSwitch(nodeId);
    if (res instanceof Promise) res.then((conf): void => { if (conf) proceed(); }).catch(logClientError);
    else if (res) proceed();
  }, [selectedNodeIds, selectEdge, selectNode, confirmNodeSwitch]);
}

export function useAiPathsCanvasInteractions(
  args: UseAiPathsCanvasInteractionsArgs
): AiPathsCanvasInteractions {
  const {
    enabled = true, isPathLocked, isPathSwitching = false, confirmNodeSwitch,
    confirm, clearRuntimeInputsForEdges, toast,
  } = args;
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { view, panState, dragState, connecting, connectingPos, lastDrop } = useCanvasState();
  const { setConnecting, setConnectingPos } = useCanvasActions();
  const lockedToastAtRef = useRef<number>(0);
  const { selectedEdgeId, selectedNodeIds } = useSelectionState();
  const { selectEdge, selectNode } = useSelectionActions();
  const { nodes, edges } = useGraphDataState();
  const { setNodes, setEdges } = useGraphActions();

  const notifyLocked = useCallback((): void => {
    const now = Date.now();
    if (now - lockedToastAtRef.current < 800) return;
    lockedToastAtRef.current = now;
    toast('This path is locked. Unlock it to edit nodes or connections.', { variant: 'info' });
  }, [toast]);

  const interactions = useCanvasInteractions({ confirmNodeSwitch: (nextNodeId) => confirmNodeSwitch?.(nextNodeId) ?? true });
  const hPD = useCallback((e: React.PointerEvent<HTMLDivElement>, n: string): void => { interactions.handlePointerDownNode(e, n).catch(logClientError); }, [interactions]);
  const hSC = useCallback((e: React.PointerEvent<HTMLButtonElement>, n: AiNode, p: string): void => { interactions.handleStartConnection(e, n, p).catch(logClientError); }, [interactions]);
  const hRI = useCallback((e: React.PointerEvent<HTMLButtonElement>, n: string, p: string): void => { interactions.handleReconnectInput(e, n, p).catch(logClientError); }, [interactions]);

  const getCanvasCenterPosition = useCallback((): { x: number; y: number } => {
    const v = viewportRef.current?.getBoundingClientRect();
    if (!v) return { x: 0, y: 0 };
    return { x: (v.width / 2 - view.x) / view.scale, y: (v.height / 2 - view.y) / view.scale };
  }, [view.scale, view.x, view.y, viewportRef]);

  useCanvasWindowInteractions(enabled, setConnecting, setConnectingPos, selectEdge);
  const hDSN = useAiPathsCanvasDeleteHandler({
    isPathSwitching, isPathLocked, selectedNodeIds, selectedEdgeId, graphNodes: nodes, graphEdges: edges, setGraphNodes: setNodes, setGraphEdges: setEdges, clearRuntimeInputsForEdges, selectNode, selectEdge, notifyLocked, confirm,
  });
  useAiPathsCanvasKeyboardShortcuts({ enabled, selectedNodeIds, selectedEdgeId, handleDeleteSelectedNode: hDSN });

  useEffect((): void => {
    setEdges((prev: Edge[]): Edge[] => sanitizeEdges(nodes, prev), { reason: 'update', source: 'settings.canvas.sanitizeEdges' });
  }, [nodes, setEdges]);

  return {
    viewportRef, canvasRef, view, panState, dragState, connecting, connectingPos, lastDrop, selectedEdgeId,
    edgePaths: interactions.edgePaths, ensureNodeVisible: interactions.ensureNodeVisible, getCanvasCenterPosition,
    handlePointerDown: hPD, handlePointerMove: interactions.handlePointerMoveNode, handlePointerUp: interactions.handlePointerUpNode,
    handleDragStart: interactions.handleDragStart, handleDrop: interactions.handleDrop, handleDragOver: interactions.handleDragOver,
    handleStartConnection: hSC, handleCompleteConnection: interactions.handleCompleteConnection,
    handlePanStart: interactions.handlePanStart as (event: React.PointerEvent<HTMLDivElement>) => void,
    handlePanMove: interactions.handlePanMove as (event: React.PointerEvent<HTMLDivElement>) => void,
    handlePanEnd: interactions.handlePanEnd as (event: React.PointerEvent<HTMLDivElement>) => void,
    handleReconnectInput: hRI, handleRemoveEdge: interactions.handleRemoveEdge, handleDisconnectPort: interactions.handleDisconnectPort,
    handleDeleteSelectedNode: hDSN, handleSelectEdge: (e): void => { selectEdge(e); if (e !== null && e !== '') selectNode(null); },
    handleSelectNode: useHandleSelectNode(selectedNodeIds, selectEdge, selectNode, confirmNodeSwitch),
    connectingFromNode: connecting ? (nodes.find((n: AiNode): boolean => n.id === connecting.fromNodeId) ?? null) : null,
    zoomTo: interactions.zoomTo, fitToNodes: interactions.fitToNodes, resetView: interactions.resetView, ConfirmationModal: interactions.ConfirmationModal,
  };
}
