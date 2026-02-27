'use client';

import React from 'react';
import {
  type AiNode,
  type DataContractNodeIssueSummary,
  type Edge,
  type RuntimeState,
  type AiPathRuntimeNodeStatusMap,
  type AiPathRuntimeEvent,
} from '@/features/ai/ai-paths/lib';
import { type RuntimeRunStatus } from './CanvasBoardUIContext';
import type { ConnectorInfo } from './canvas-board-connectors';
import { type EdgeRoutingMode, type EdgePath } from '../context/hooks/useEdgePaths';
import { type CanvasRendererMode } from './CanvasBoard.utils';
import { type ViewState, type PanState, type DragState, type ConnectingState } from '../context/CanvasContext';
import { Button, Tooltip, Badge } from '@/shared/ui';
import { cn } from '@/shared/utils';

// Re-export types from core
export * from './engine-core';
export * from './engine-modules/engine-types';

const DEFAULT_NODE_SELECTION_TOOL_MODE: 'select' | 'pan' = 'select';
const DEFAULT_NODE_SELECTION_SCOPE_MODE = 'portion';

export interface CanvasBoardProps {
  viewportClassName?: string | undefined;
  confirmNodeSwitch?: ((nodeId: string) => boolean | Promise<boolean>) | undefined;
  openNodeConfigOnSingleClick?: boolean | undefined;
  nodeDiagnosticsById?: Record<string, DataContractNodeIssueSummary> | undefined;
  onFocusNodeDiagnostics?: ((nodeId: string) => void) | undefined;
  resolveConnectorTooltip?: (
    input: CanvasBoardConnectorTooltipOverrideInput
  ) => CanvasBoardConnectorTooltipOverride | null | undefined;
}

export function CanvasBoard({
  viewportClassName,
  confirmNodeSwitch,
  openNodeConfigOnSingleClick = false,
  nodeDiagnosticsById = {},
  onFocusNodeDiagnostics: _onFocusNodeDiagnostics,
  resolveConnectorTooltip,
}: CanvasBoardProps): React.JSX.Element {
  const state = useCanvasBoardState({
    confirmNodeSwitch,
    nodeDiagnosticsById,
  });

  const {
    view,
    viewportRef,
    canvasRef,
    nodes,
    edges,
    connecting,
    connectingPos,
    runtimeState,
    runtimeNodeStatuses,
    runtimeRunStatus,
    nodeDurations,
    fireTrigger,
    selectedNodeId,
    selectedEdgeId,
    selectionToolMode,
    selectEdge,
    setConfigOpen,
    edgeRoutingMode,
    setEdgeRoutingMode,
    edgePaths,
    handlePointerDownNode: _handlePointerDownNode,
    handlePointerMoveNode,
    handlePointerUpNode,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
    handleRemoveEdge,
    handleDisconnectPort,
    handleStartConnection,
    handleCompleteConnection,
    handleReconnectInput,
    handleSelectNode,
    handleDrop,
    handleDragOver,
    zoomTo,
    fitToNodes,
    fitToSelection,
    resetView,
    centerOnCanvasPoint,
    selectionMarqueeRect,
    touchLongPressIndicator,
    ConfirmationModal,
    selectedNodeIdSet,
    hoveredConnectorKey,
    setHoveredConnectorKey,
    pinnedConnectorKey,
    setPinnedConnectorKey,
    svgConnectorTooltip,
    setSvgConnectorTooltip,
    svgNodeDiagnosticsTooltip,
    setSvgNodeDiagnosticsTooltip,
    rendererMode,
    setRendererMode,
    showMinimap,
    setShowMinimap,
    viewportSize,
    prefersReducedMotion,
    svgPerf,
    effectiveFlowIntensity,
    isSvgRenderer,
    getConnectorInfo,
    getPortValue,
    activeShapeId,
    nodeById,
    setNodes,
    updateNode,
    removeNode,
    setNodeSelection,
    toggleNodeSelection,
    selectNode,
    startDrag,
    endDrag,
    dragState,
    updateLastPointerCanvasPosFromClient,
    stopViewAnimation,
    resolveActiveNodeSelectionIds,
    confirm,
    setEdges,
    setRuntimeState,
    pruneRuntimeInputsInternal,
  } = state;

  const selectionToolModeProps = React.useMemo(
    (): {
      selectionToolMode: 'node' | 'marquee';
      onSelectionToolModeChange: (mode: 'node' | 'marquee') => void;
    } => {
      return {
        selectionToolMode: selectionToolMode ?? DEFAULT_NODE_SELECTION_TOOL_MODE,
        onSelectionToolModeChange: (mode: 'node' | 'marquee') => {
          selectionActions.setSelectionToolMode(mode);
        },
      };
    },
    [selectionActions.setSelectionToolMode, selectionToolMode]
  );

  const handleConnectorHover = React.useCallback(
    (payload: { clientX: number; clientY: number; info: ConnectorInfo }) => {
      setSvgConnectorTooltip(payload);
    },
    [setSvgConnectorTooltip]
  );

  const handleConnectorLeave = React.useCallback(() => {
    if (pinnedConnectorKey) return;
    setSvgConnectorTooltip(null);
  }, [pinnedConnectorKey, setSvgConnectorTooltip]);

  const handleNodeDiagnosticsHover = React.useCallback(
    (payload: { clientX: number; clientY: number; nodeId: string; summary: DataContractNodeIssueSummary }) => {
      setSvgNodeDiagnosticsTooltip(payload);
    },
    [setSvgNodeDiagnosticsTooltip]
  );

  const handleNodeDiagnosticsLeave = React.useCallback(() => {
    setSvgNodeDiagnosticsTooltip(null);
  }, [setSvgNodeDiagnosticsTooltip]);

  const onFocusNodeDiagnostics = React.useCallback(
    (nodeId: string) => {
      _onFocusNodeDiagnostics?.(nodeId);
    },
    [_onFocusNodeDiagnostics]
  );

  const onFireTrigger = React.useCallback(
    (node: AiNode, event?: React.MouseEvent<any> | React.PointerEvent<any>) => {
      void fireTrigger(node, event);
    },
    [fireTrigger]
  );

  const handlePointerDownNode = React.useCallback(
    (nodeId: string, event: React.PointerEvent) => {
      _handlePointerDownNode(nodeId, event);
      event.stopPropagation();
    },
    [_handlePointerDownNode]
  );

  const canvasInteractions: CanvasBoardState = React.useMemo(
    () => ({
      // View State
      view,
      panState: null, // TODO: implement pan state
      dragState: dragState,
      lastDrop: null, // TODO: implement last drop
      connecting,
      connectingPos,
      isPanning: false, // TODO: implement isPanning
      isDraggingNode: false, // TODO: implement isDraggingNode
      isConnecting: Boolean(connecting),

      // Refs
      viewportRef,
      canvasRef,

      // Graph Data
      nodes,
      edges,
      flowIntensity: effectiveFlowIntensity,
      nodeById,
      edgePaths,
      edgeMetaMap: new Map(), // TODO: implement edgeMetaMap

      // Runtime State
      runtimeState,
      runtimeNodeStatuses,
      runtimeEvents: undefined, // TODO: implement runtimeEvents
      runtimeRunStatus,
      nodeDurations,

      // Actions
      fireTrigger,

      // Selection
      selectedNodeId,
      selectedNodeIds: Array.from(selectedNodeIdSet),
      selectedEdgeId,
      selectionToolMode: selectionToolMode ?? DEFAULT_NODE_SELECTION_TOOL_MODE,
      selectedNodeIdSet,

      // UI Actions
      selectEdge,
      setConfigOpen,
      setEdgeRoutingMode,

      // Event Handlers
      handlePointerDownNode,
      handlePointerMoveNode,
      handlePointerUpNode,
      handlePanStart,
      handlePanMove,
      handlePanEnd,
      handleWheel,
      handleRemoveEdge,
      handleDisconnectPort,
      handleStartConnection,
      handleCompleteConnection,
      handleReconnectInput,
      handleSelectNode,
      handleDrop,
      handleDragOver,

      // Navigation
      zoomTo,
      fitToNodes,
      fitToSelection,
      resetView,
      centerOnCanvasPoint,

      // Derived UI State
      selectionMarqueeRect,
      touchLongPressIndicator: touchLongPressIndicator ?? null, // Use local state if available
      ConfirmationModal,

      // Local UI State
      hoveredConnectorKey,
      setHoveredConnectorKey,
      pinnedConnectorKey,
      setPinnedConnectorKey,
      svgConnectorTooltip,
      setSvgConnectorTooltip,
      svgNodeDiagnosticsTooltip,
      setSvgNodeDiagnosticsTooltip,
      rendererMode,
      setRendererMode,
      showMinimap,
      setShowMinimap,
      viewportSize,
      prefersReducedMotion,
      svgPerf,
      effectiveFlowIntensity,
      isSvgRenderer,

      // Helpers
      getConnectorInfo,
      getPortValue,
      activeShapeId: null, // TODO: implement activeShapeId
      edgeRoutingMode,
      nodeDiagnosticsById,
    }),
    [
      view,
      viewportSize,
      detailLevel,
      nodes,
      edges,
      edgePaths,
      edgeMetaMap,
      edgeRoutingMode,
      connecting,
      connectingPos,
      nodeById,
      selectedNodeId,
      selectedNodeIdSet,
      selectedEdgeId,
      runtimeState,
      runtimeNodeStatuses,
      runtimeRunStatus,
      nodeDurations,
      nodeDiagnosticsById,
      inputPulseNodes,
      outputPulseNodes,
      activeEdgeIds,
      triggerConnected,
      wireFlowEnabled,
      flowingIntensity,
      reduceVisualEffects,
      openNodeConfigOnSingleClick,
      zoomTo,
      fitToNodes,
      fitToSelection,
      resetView,
      centerOnCanvasPoint,
      selectionMarqueeRect,
      touchLongPressIndicator,
      ConfirmationModal,
      hoveredConnectorKey,
      setHoveredConnectorKey,
      pinnedConnectorKey,
      setPinnedConnectorKey,
      svgConnectorTooltip,
      setSvgConnectorTooltip,
      svgNodeDiagnosticsTooltip,
      setSvgNodeDiagnosticsTooltip,
      rendererMode,
      setRendererMode,
      showMinimap,
      setShowMinimap,
      prefersReducedMotion,
      svgPerf,
      effectiveFlowIntensity,
      isSvgRenderer,
      getConnectorInfo,
      getPortValue,
      activeShapeId,
      nodeById,
      setNodes,
      updateNode,
      removeNode,
      setNodeSelection,
      toggleNodeSelection,
      selectNode,
      selectEdge,
      setConfigOpen,
      setEdgeRoutingMode,
      handlePointerDownNode,
      handlePointerMoveNode,
      handlePointerUpNode,
      handlePanStart,
      handlePanMove,
      handlePanEnd,
      handleWheel,
      handleRemoveEdge,
      handleDisconnectPort,
      handleStartConnection,
      handleCompleteConnection,
      handleReconnectInput,
      handleSelectNode,
      handleDrop,
      handleDragOver,
      fireTrigger,
      confirmNodeSwitch,
    ]
  );

  // Render logic
  return (
    <CanvasBoardUIProvider value={canvasInteractions}>
      <div ref={viewportRef} className={cn('relative h-full w-full', viewportClassName)}>
        <CanvasControlPanel
          {...{
            rendererMode,
            onRendererModeChange,
            edgeRoutingMode,
            onEdgeRoutingModeChange,
            showMinimap,
            onToggleMinimap,
            selectionToolMode: selectionToolMode ?? DEFAULT_NODE_SELECTION_TOOL_MODE,
            onZoomIn,
            onZoomOut,
            onFitToNodes,
            onFitToSelection,
            onResetView,
            viewScale,
            svgPerf,
          }}
        />

        <div
          ref={canvasRef}
          className='h-full w-full touch-none select-none'
          onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onWheel={handleWheel}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <svg
            ref={svgRef}
            width={viewportSize?.width ?? 0}
            height={viewportSize?.height ?? 0}
            viewBox={`0 0 ${viewportSize?.width ?? 0} ${viewportSize?.height ?? 0}`}
            className={cn('h-full w-full transition-opacity', {
              'opacity-50': svgPerf && svgPerf.fps < 30,
            })}
            style={{
              cursor: isPanning ? 'grabbing' : 'grab',
            }}
          >
            <CanvasSelectionMarquee rect={selectionMarqueeRect} />
            <CanvasLongPressIndicator indicator={touchLongPressIndicator} />
            <CanvasSvgEdgeLayer />
            <CanvasSvgNodeLayer />
            <CanvasConnectorTooltip
              tooltip={svgConnectorTooltip}
              position={svgConnectorTooltipPosition}
              override={svgConnectorTooltipOverride}
            />
            <CanvasNodeDiagnosticsTooltip
              tooltip={svgNodeDiagnosticsTooltip}
              position={svgNodeDiagnosticsTooltipPosition}
            />
          </svg>
        </div>
        {showMinimap && <CanvasMinimap />}
        {ConfirmationModal && <ConfirmationModal />}
      </div>
    </CanvasBoardUIProvider>
  );
}
