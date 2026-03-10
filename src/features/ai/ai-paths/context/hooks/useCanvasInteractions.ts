'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import type { Edge, RuntimeState } from '@/shared/lib/ai-paths';
import { useToast } from '@/shared/ui';

import {
  useCanvasEventHandlers,
  type UseCanvasEventHandlersValue,
} from './canvas/useCanvasEventHandlers';
import {
  useCanvasStateHandlers,
  type UseCanvasStateHandlersValue,
} from './canvas/useCanvasStateHandlers';
import {
  useCanvasTouchHandlers,
  type UseCanvasTouchHandlersValue,
} from './canvas/useCanvasTouchHandlers';
import {
  useCanvasState,
  useCanvasActions,
  useCanvasRefs,
  type PanState,
  type DragState,
  type ConnectingState,
} from './useCanvas';
import {
  useCanvasInteractionsClipboard,
  type UseCanvasInteractionsClipboardValue,
} from './useCanvasInteractions.clipboard';
import {
  useCanvasInteractionsConnections,
  type UseCanvasInteractionsConnectionsValue,
} from './useCanvasInteractions.connections';
import { useEdgePaths, type EdgePath, type EdgeRoutingMode } from './useEdgePaths';
import { useSelectionState, useSelectionActions } from './useSelection';
import { useGraphState, useGraphActions } from '../GraphContext';
import { useRuntimeActions } from '../RuntimeContext';
import {
  type MarqueeSelectionState,
  type TouchLongPressIndicatorState,
  type TouchPointSample,
  getMarqueeRect,
} from './useCanvasInteractions.helpers';
import {
  useCanvasInteractionsNavigation,
  type UseCanvasInteractionsNavigationValue,
} from './useCanvasInteractions.navigation';
import {
  useCanvasInteractionsNodes,
  type UseCanvasInteractionsNodesValue,
} from './useCanvasInteractions.nodes';
import {
  useCanvasInteractionsTouch,
  type UseCanvasInteractionsTouchValue,
} from './useCanvasInteractions.touch';



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
    setPanState,
    startPan,
    endPan,
    setIsPanning,
    startDrag,
    endDrag,
    startConnection,
    endConnection,
    setConnectingPos,
    setLastDrop,
  } = useCanvasActions();
  const { viewportRef } = useCanvasRefs();

  // Context: Graph
  const { nodes, edges, activePathId, isPathLocked } = useGraphState();
  const { setNodes, setEdges } = useGraphActions();

  // Context: Runtime
  const { setRuntimeState } = useRuntimeActions();

  // Context: Selection
  const { selectedNodeIds, selectedEdgeId } = useSelectionState();
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
    toast,
    viewportRef,
    nodes,
    selectedNodeIds,
    startPan,
    endPan,
    setIsPanning,
    updateView: (next) => updateView(next),
    panState,
    viewScale: view.scale,
  });

  const { resolveActiveNodeSelectionIds, updateLastPointerCanvasPosFromClient } = stateHandlers;

  const latestViewRef = useRef(view);
  latestViewRef.current = view;
  const rebasePanStateFromClient = useCallback(
    (clientX: number, clientY: number): void => {
      const currentView = latestViewRef.current;
      setPanState({
        startX: clientX,
        startY: clientY,
        originX: currentView.x,
        originY: currentView.y,
      });
    },
    [setPanState]
  );

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
    selectedNodeIds,
    setNodes,
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
    view,
    setLastDrop: (pos: { x: number; y: number }) => setLastDrop(pos),
    ensureNodeVisible: nav.ensureNodeVisible,
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
    viewportRef,
    view: { scale: view.scale, panX: view.x, panY: view.y },
    nav,
    updateLastPointerCanvasPosFromClient: stateHandlers.updateLastPointerCanvasPosFromClient,
    isPanActive: () => panState !== null,
    rebasePanStateFromClient,
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

  const resolveClientPoint = useCallback(
    (
      event: React.MouseEvent | React.PointerEvent | React.TouchEvent
    ): { clientX: number; clientY: number } | null => {
      if ('touches' in event) {
        const touch = event.touches[0] ?? event.changedTouches?.[0];
        if (!touch) return null;
        return { clientX: touch.clientX, clientY: touch.clientY };
      }
      if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
        return { clientX: event.clientX, clientY: event.clientY };
      }
      return null;
    },
    []
  );

  const handlePanStart = useCallback(
    (event: React.MouseEvent | React.PointerEvent | React.TouchEvent): void => {
      if (connecting) {
        endConnection();
        return;
      }
      stateHandlers.handlePanStart(event);
    },
    [connecting, endConnection, stateHandlers]
  );

  const handlePanMove = useCallback(
    (event: React.MouseEvent | React.PointerEvent | React.TouchEvent): void => {
      if (connecting) {
        const viewport = viewportRef.current?.getBoundingClientRect();
        const clientPoint = resolveClientPoint(event);
        if (!viewport || !clientPoint) return;
        const x = (clientPoint.clientX - viewport.left - view.x) / view.scale;
        const y = (clientPoint.clientY - viewport.top - view.y) / view.scale;
        setConnectingPos({ x, y });
        stateHandlers.updateLastPointerCanvasPosFromClient(
          clientPoint.clientX,
          clientPoint.clientY
        );
        return;
      }
      stateHandlers.handlePanMove(event);
    },
    [
      connecting,
      resolveClientPoint,
      setConnectingPos,
      stateHandlers,
      view.scale,
      view.x,
      view.y,
      viewportRef,
    ]
  );

  const handlePanEnd = useCallback(
    (event: React.MouseEvent | React.PointerEvent | React.TouchEvent): void => {
      stateHandlers.handlePanEnd(event);
      if (connecting) {
        endConnection();
      }
    },
    [connecting, endConnection, stateHandlers]
  );

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
    handlePanStart,
    handlePanMove,
    handlePanEnd,
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
