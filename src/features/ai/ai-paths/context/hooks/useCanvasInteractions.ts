'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';

import {
  useCanvasState,
  useCanvasActions,
  useCanvasRefs,
  type PanState,
  type DragState,
  type ConnectingState,
} from './useCanvas';
import { useEdgePaths, type EdgePath, type EdgeRoutingMode } from './useEdgePaths';
import { useSelectionState, useSelectionActions } from './useSelection';

import { useGraphState, useGraphActions } from '../GraphContext';
import { useRuntimeState, useRuntimeActions } from '../RuntimeContext';

import {
  type MarqueeSelectionState,
  type TouchLongPressIndicatorState,
  type MarqueeMode,
  type TouchPointSample,
  getMarqueeRect,
} from './useCanvasInteractions.helpers';

import {
  useCanvasInteractionsClipboard,
  type UseCanvasInteractionsClipboardValue,
} from './useCanvasInteractions.clipboard';
import {
  useCanvasInteractionsNavigation,
  type UseCanvasInteractionsNavigationValue,
} from './useCanvasInteractions.navigation';
import {
  useCanvasInteractionsNodes,
  type UseCanvasInteractionsNodesValue,
} from './useCanvasInteractions.nodes';
import {
  useCanvasInteractionsConnections,
  type UseCanvasInteractionsConnectionsValue,
} from './useCanvasInteractions.connections';
import {
  useCanvasInteractionsTouch,
  type UseCanvasInteractionsTouchValue,
} from './useCanvasInteractions.touch';

import {
  useCanvasStateHandlers,
  type UseCanvasStateHandlersValue,
} from './canvas/useCanvasStateHandlers';
import {
  useCanvasEventHandlers,
  type UseCanvasEventHandlersValue,
} from './canvas/useCanvasEventHandlers';
import {
  useCanvasTouchHandlers,
  type UseCanvasTouchHandlersValue,
} from './canvas/useCanvasTouchHandlers';

import type { Toast } from '@/shared/contracts/ui';
import type { AiNode, Edge, RuntimeState } from '@/shared/lib/ai-paths';

/**
 * Hook that manages all canvas-related interactions (pan, drag, connect, drop)
 * using AI-Paths contexts.
 */
export function useCanvasInteractions(args?: {
  confirmNodeSwitch?: ((nodeId: string) => boolean | Promise<boolean>) | undefined;
}): UseCanvasInteractionsReturn {
  const { confirmNodeSwitch = async () => true } = args ?? {};

  // Context: Canvas/Viewport
  const { view, panState, edgeRoutingMode, isPanning, dragState, connecting, connectingPos } =
    useCanvasState();
  const {
    updateView,
    startPan,
    endPan,
    setIsPanning,
    startDrag,
    endDrag,
    startConnection,
    endConnection,
    setConnectingPos,
  } = useCanvasActions();
  const { viewportRef, canvasRef } = useCanvasRefs();

  // Context: Graph
  const { nodes, edges, activePathId, isPathLocked } = useGraphState();
  const { setNodes, setEdges, removeNode } = useGraphActions();

  // Context: Runtime
  const { setRuntimeState } = useRuntimeActions();
  useRuntimeState();

  // Context: Selection
  const { selectedNodeId, selectedNodeIds, selectedEdgeId, selectionToolMode } =
    useSelectionState();
  const { setNodeSelection, selectNode, selectEdge, toggleNodeSelection } = useSelectionActions();

  // Context: Helpers
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();

  // Internal State
  const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelectionState | null>(null);
  const [touchLongPressIndicator, setTouchLongPressIndicator] =
    useState<TouchLongPressIndicatorState | null>(null);

  // ---------------------------------------------------------------------------
  // Derived / Sub-hooks
  // ---------------------------------------------------------------------------

  const stateHandlers: UseCanvasStateHandlersValue = useCanvasStateHandlers({
    isPathLocked,
    toast: toast as unknown as Toast,
    viewportRef: viewportRef as React.RefObject<HTMLDivElement>,
    nodes,
    edges,
    setNodes,
    setRuntimeState,
    selectionToolMode: (selectionToolMode === 'select' ? 'replace' : 'replace') as MarqueeMode,
    selectionScopeMode: 'replace',
    setNodeSelection,
    toggleNodeSelection,
    startPan,

    endPan,
    setIsPanning,
    updateView: (next) => updateView(next),
    panState,
  });

  const { resolveActiveNodeSelectionIds, updateLastPointerCanvasPosFromClient } = stateHandlers;

  const latestViewRef = useRef(view);
  latestViewRef.current = view;

  const nav: UseCanvasInteractionsNavigationValue = useCanvasInteractionsNavigation({
    view,
    latestViewRef,
    updateView,
    viewportRef,
    nodes,
    resolveActiveNodeSelectionIds,
    updateLastPointerCanvasPosFromClient,
  });

  const nodeActions: UseCanvasInteractionsNodesValue = useCanvasInteractionsNodes({
    nodes,
    edges,
    isPathLocked,
    notifyLocked: stateHandlers.notifyLocked,
    confirmNodeSwitch,
    selectedNodeIdSet: new Set(selectedNodeIds),
    selectedNodeId,
    selectedNodeIds,
    setNodes,
    updateNode: (_id: string, _data: Partial<AiNode>): void => {},
    removeNode,
    setNodeSelection,
    toggleNodeSelection,
    selectNode,
    selectEdge,
    startDrag,
    endDrag,
    dragState,
    updateLastPointerCanvasPosFromClient,
    stopViewAnimation: nav.stopViewAnimation,
    resolveActiveNodeSelectionIds,
    confirm,
    setEdges,
    setRuntimeState,
    pruneRuntimeInputsInternal: stateHandlers.pruneRuntimeInputsInternal,
    viewportRef,
    canvasRef: canvasRef as unknown as React.RefObject<SVGSVGElement | null>,
    view,
    setLastDrop: (_pos: { x: number; y: number }) => {},
    ensureNodeVisible: (_node: AiNode) => {},
    toast: toast,
  });

  const connectionActions: UseCanvasInteractionsConnectionsValue = useCanvasInteractionsConnections(
    {
      nodes,
      edges,
      isPathLocked,
      notifyLocked: stateHandlers.notifyLocked,
      confirmNodeSwitch,
      setEdges,
      setRuntimeState,
      pruneRuntimeInputsInternal: stateHandlers.pruneRuntimeInputsInternal,
      selectedEdgeId,
      selectEdge,
      startConnection,
      endConnection,
      connecting,
      setConnectingPos,
      view,
      viewportRef,
      toast: toast,
    }
  );

  const clipboard: UseCanvasInteractionsClipboardValue = useCanvasInteractionsClipboard({
    isPathLocked,
    notifyLocked: stateHandlers.notifyLocked,
    nodes,
    edges,
    activePathId,
    setNodes,
    setEdges,
    setNodeSelection,
    selectEdge,
    setRuntimeState,
    pruneRuntimeInputsInternal: stateHandlers.pruneRuntimeInputsInternal,
    resolveActiveNodeSelectionIds,
    viewportRef,
    lastPointerCanvasPosRef: stateHandlers.lastPointerCanvasPosRef,
    view,
    toast: toast,
  });

  const edgePaths = useEdgePaths(edgeRoutingMode as EdgeRoutingMode);

  const eventHandlers: UseCanvasEventHandlersValue = useCanvasEventHandlers({
    viewportRef: viewportRef as React.RefObject<HTMLDivElement>,
    canvasRef: canvasRef as unknown as React.RefObject<HTMLCanvasElement>,
    view: { scale: view.scale, panX: view.x, panY: view.y },
    nav,
    updateLastPointerCanvasPosFromClient: stateHandlers.updateLastPointerCanvasPosFromClient,
    resolveViewportPointFromClient: stateHandlers.resolveViewportPointFromClient,
  });

  const touch: UseCanvasTouchHandlersValue = useCanvasTouchHandlers({
    nav,
  });

  const touchActions: UseCanvasInteractionsTouchValue = useCanvasInteractionsTouch({
    activeTouchPointersRef: touch.activeTouchPointersRef,
    touchGestureRef: touch.touchGestureRef,
    touchLongPressSelectionRef: touch.touchLongPressSelectionRef,
    touchLongPressIndicatorRafRef: touch.touchLongPressIndicatorRafRef,
    touchLongPressIndicatorHideTimerRef: touch.touchLongPressIndicatorHideTimerRef,
    viewportRef: viewportRef,
    latestViewRef,
    setTouchLongPressIndicator,
    setNodeSelection,
    selectEdge,
    setMarqueeSelection,
  });

  const selectionMarqueeRect = useMemo(() => {
    if (!marqueeSelection) return null;
    return getMarqueeRect(marqueeSelection);
  }, [marqueeSelection]);

  useEffect(() => {
    if (!panState) return;

    const handleWindowPointerUp = (): void => {
      stateHandlers.forcePanEnd();
    };
    const handleWindowPointerCancel = (): void => {
      stateHandlers.forcePanEnd();
    };
    const handleWindowBlur = (): void => {
      stateHandlers.forcePanEnd();
    };

    window.addEventListener('pointerup', handleWindowPointerUp, true);
    window.addEventListener('pointercancel', handleWindowPointerCancel, true);
    window.addEventListener('blur', handleWindowBlur);
    return (): void => {
      window.removeEventListener('pointerup', handleWindowPointerUp, true);
      window.removeEventListener('pointercancel', handleWindowPointerCancel, true);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [panState, stateHandlers]);

  return {
    // nodeActions
    handlePointerDownNode: nodeActions.handlePointerDownNode,
    handlePointerMoveNode: nodeActions.handlePointerMoveNode,
    handlePointerUpNode: nodeActions.handlePointerUpNode,
    consumeSuppressedNodeClick: nodeActions.consumeSuppressedNodeClick,
    handleSelectNode: nodeActions.handleSelectNode,
    handleDeleteSelectedNode: nodeActions.handleDeleteSelectedNode,
    handleDragStart: nodeActions.handleDragStart,
    handleDragOver: nodeActions.handleDragOver,
    handleDrop: nodeActions.handleDrop,
    rafIdRef: nodeActions.rafIdRef,
    dragSelectionRef: nodeActions.dragSelectionRef,

    // connectionActions
    handleRemoveEdge: connectionActions.handleRemoveEdge,
    handleDisconnectPort: connectionActions.handleDisconnectPort,
    handleStartConnection: connectionActions.handleStartConnection,
    handleCompleteConnection: connectionActions.handleCompleteConnection,
    handleReconnectInput: connectionActions.handleReconnectInput,
    getPortPosition: connectionActions.getPortPosition,

    // clipboard
    handleCopySelection: clipboard.handleCopySelection,
    handlePasteSelection: clipboard.handlePasteSelection,
    handleCutSelection: clipboard.handleCutSelection,
    handleDuplicateSelection: clipboard.handleDuplicateSelection,
    buildClipboardPayloadFromSelection: clipboard.buildClipboardPayloadFromSelection,
    writeClipboardPayload: clipboard.writeClipboardPayload,
    removeNodesAndConnectedEdges: clipboard.removeNodesAndConnectedEdges,
    pasteClipboardPayload: clipboard.pasteClipboardPayload,
    readClipboardPayload: clipboard.readClipboardPayload,

    // eventHandlers
    handleWheel: eventHandlers.handleWheel,
    wheelGestureActiveUntilRef: eventHandlers.wheelGestureActiveUntilRef,

    // touchActions
    clearTouchLongPressIndicator: touchActions.clearTouchLongPressIndicator,
    startTouchLongPressIndicatorLoop: touchActions.startTouchLongPressIndicatorLoop,
    triggerTouchLongPressActivatedFeedback: touchActions.triggerTouchLongPressActivatedFeedback,
    cancelTouchLongPressSelection: touchActions.cancelTouchLongPressSelection,
    startPinchGestureFromActivePointers: touchActions.startPinchGestureFromActivePointers,
    beginMarqueeSelectionFromClient: touchActions.beginMarqueeSelectionFromClient,
    appendTouchPanSample: touchActions.appendTouchPanSample,

    // nav actions
    stopViewAnimation: nav.stopViewAnimation,
    stopPanInertia: nav.stopPanInertia,
    stopProgrammaticViewAnimation: nav.stopProgrammaticViewAnimation,
    setViewClamped: nav.setViewClamped,
    startPanInertia: nav.startPanInertia,
    getZoomTargetView: nav.getZoomTargetView,
    startWheelZoomLoop: nav.startWheelZoomLoop,
    animateViewTo: nav.animateViewTo,
    zoomTo: nav.zoomTo,
    fitToNodes: nav.fitToNodes,
    fitToSelection: nav.fitToSelection,
    resetView: nav.resetView,
    centerOnCanvasPoint: nav.centerOnCanvasPoint,
    applyWheelZoom: nav.applyWheelZoom,
    wheelZoomRafRef: nav.wheelZoomRafRef,
    viewAnimationRafRef: nav.viewAnimationRafRef,
    panInertiaRafRef: nav.panInertiaRafRef,
    ensureNodeVisible: nav.ensureNodeVisible,

    // State
    edgePaths,
    panState,
    dragState,
    connecting,
    connectingPos,
    marqueeSelection,
    selectionMarqueeRect,
    touchLongPressIndicator,
    handlePanStart: stateHandlers.handlePanStart,
    handlePanMove: stateHandlers.handlePanMove,
    handlePanEnd: stateHandlers.handlePanEnd,
    ConfirmationModal,
    pruneRuntimeInputs: stateHandlers.pruneRuntimeInputsInternal,
    isPanning,
    maybeStartTouchPanInertia: touch.maybeStartTouchPanInertia,
  } as UseCanvasInteractionsReturn;
}

export interface UseCanvasInteractionsReturn
  extends
    UseCanvasInteractionsNodesValue,
    UseCanvasInteractionsConnectionsValue,
    UseCanvasInteractionsClipboardValue,
    UseCanvasEventHandlersValue,
    UseCanvasInteractionsTouchValue,
    UseCanvasInteractionsNavigationValue {
  edgePaths: EdgePath[];
  panState: PanState;
  dragState: DragState;
  connecting: ConnectingState | null;
  connectingPos: { x: number; y: number } | null;
  marqueeSelection: MarqueeSelectionState | null;
  selectionMarqueeRect: { left: number; top: number; width: number; height: number } | null;
  touchLongPressIndicator: TouchLongPressIndicatorState | null;
  handlePanStart: (event: React.MouseEvent | React.PointerEvent | React.TouchEvent) => void;
  handlePanMove: (event: React.MouseEvent | React.PointerEvent | React.TouchEvent) => void;
  handlePanEnd: (event: React.MouseEvent | React.PointerEvent | React.TouchEvent) => void;
  ConfirmationModal: React.FC;
  pruneRuntimeInputs: (
    state: RuntimeState,
    removedEdges: Edge[],
    remainingEdges: Edge[]
  ) => RuntimeState;
  isPanning: boolean;
  maybeStartTouchPanInertia: (lastSample: TouchPointSample) => void;
}
