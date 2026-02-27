'use client';

import React from 'react';
import {
  type DataContractNodeIssueSummary,
} from '@/shared/lib/ai-paths';
import { cn } from '@/shared/utils';

import { useCanvasBoardState } from './useCanvasBoardState';
import { CanvasBoardUIProvider, type CanvasBoardUIContextValue } from './CanvasBoardUIContext';
import { CanvasControlPanel } from './CanvasControlPanel';
import { CanvasMinimap } from './canvas-minimap';
import { CanvasSvgEdgeLayer } from './canvas-svg-edge-layer';
import { CanvasSvgNodeLayer } from './canvas-svg-node-layer';
import { CanvasConnectorTooltip } from './canvas/CanvasConnectorTooltip';
import { CanvasNodeDiagnosticsTooltip } from './canvas/CanvasNodeDiagnosticsTooltip';
import { CanvasSelectionMarquee } from './canvas/CanvasSelectionMarquee';
import { CanvasLongPressIndicator } from './canvas/CanvasLongPressIndicator';
import { 
  type CanvasBoardConnectorTooltipOverrideInput, 
  type CanvasBoardConnectorTooltipOverride
} from './CanvasBoard.utils';
import type { ConnectorInfo } from './canvas-board-connectors';

const CONNECTOR_HIT_TARGET_PX = 14;

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
  onFocusNodeDiagnostics,
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
    selectionToolMode,
    edgeRoutingMode,
    selectionMarqueeRect,
    touchLongPressIndicator,
    ConfirmationModal,
    pinnedConnectorKey,
    svgConnectorTooltip,
    setSvgConnectorTooltip,
    svgNodeDiagnosticsTooltip,
    setSvgNodeDiagnosticsTooltip,
    rendererMode,
    setRendererMode,
    showMinimap,
    setShowMinimap,
    viewportSize,
    svgPerf,
    isPanning,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
    handleDrop,
    handleDragOver,
    zoomTo,
    fitToNodes,
    fitToSelection,
    resetView,
  } = state;

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

  const detailLevel = React.useMemo(() => {
    if (view.scale >= 0.9) return 'full' as const;
    if (view.scale >= 0.6) return 'compact' as const;
    return 'skeleton' as const;
  }, [view.scale]);

  const edgeMetaMap = React.useMemo(
    () => new Map(state.edges.map((edge) => [edge.id, edge])),
    [state.edges]
  );

  const triggerConnected = React.useMemo(() => {
    const next = new Set<string>();
    state.edges.forEach((edge) => {
      if (edge.from) next.add(edge.from);
      if (edge.to) next.add(edge.to);
    });
    return next;
  }, [state.edges]);

  const activeEdgeIds = React.useMemo(() => new Set<string>(), []);
  const inputPulseNodes = React.useMemo(() => new Set<string>(), []);
  const outputPulseNodes = React.useMemo(() => new Set<string>(), []);
  const wireFlowEnabled = state.effectiveFlowIntensity !== 'off';
  const flowingIntensity = state.effectiveFlowIntensity === 'off' ? 'low' : state.effectiveFlowIntensity;
  const reduceVisualEffects = state.prefersReducedMotion || !wireFlowEnabled;
  const enableNodeAnimations = !reduceVisualEffects;

  // Combined UI context value
  const canvasInteractions: CanvasBoardUIContextValue = React.useMemo(() => ({
    ...state,
    detailLevel,
    edgeMetaMap,
    inputPulseNodes,
    outputPulseNodes,
    activeEdgeIds,
    triggerConnected,
    wireFlowEnabled,
    flowingIntensity,
    reduceVisualEffects,
    enableNodeAnimations,
    connectorHitTargetPx: CONNECTOR_HIT_TARGET_PX,
    onPointerDownNode: (event, nodeId) => {
      state.handlePointerDownNode(nodeId, event);
    },
    onPointerMoveNode: (event, nodeId) => {
      state.handlePointerMoveNode(nodeId, event);
    },
    onPointerUpNode: (event, nodeId) => {
      state.handlePointerUpNode(nodeId, event);
    },
    onSelectNode: (nodeId, options) => {
      state.handleSelectNode(nodeId, options);
    },
    onOpenNodeConfig: () => {
      state.setConfigOpen(true);
    },
    onStartConnection: (event, node, port) => {
      state.handleStartConnection(event, node, port);
    },
    onCompleteConnection: (event, node, port) => {
      state.handleCompleteConnection(event, node, port);
    },
    onReconnectInput: (event, nodeId, port) => {
      state.handleReconnectInput(event, nodeId, port);
    },
    onDisconnectPort: (direction, nodeId, port) => {
      state.handleDisconnectPort(direction, nodeId, port);
    },
    onFireTrigger: (node) => {
      void state.fireTrigger(node);
    },
    onRemoveEdge: (edgeId) => {
      state.handleRemoveEdge(edgeId);
    },
    onSelectEdge: (edgeId) => {
      state.selectEdge(edgeId);
    },
    openNodeConfigOnSingleClick,
    onConnectorHover: handleConnectorHover,
    onConnectorLeave: handleConnectorLeave,
    onNodeDiagnosticsHover: handleNodeDiagnosticsHover,
    onNodeDiagnosticsLeave: handleNodeDiagnosticsLeave,
    onFocusNodeDiagnostics,
  }), [
    state,
    detailLevel,
    edgeMetaMap,
    inputPulseNodes,
    outputPulseNodes,
    activeEdgeIds,
    triggerConnected,
    wireFlowEnabled,
    flowingIntensity,
    reduceVisualEffects,
    enableNodeAnimations,
    openNodeConfigOnSingleClick,
    handleConnectorHover,
    handleConnectorLeave,
    handleNodeDiagnosticsHover,
    handleNodeDiagnosticsLeave,
    onFocusNodeDiagnostics,
  ]);

  return (
    <CanvasBoardUIProvider value={canvasInteractions}>
      <div
        ref={viewportRef}
        className={cn('relative h-full w-full overflow-hidden overscroll-none', viewportClassName)}
      >
        <CanvasControlPanel
          rendererMode={rendererMode}
          onRendererModeChange={setRendererMode}
          edgeRoutingMode={edgeRoutingMode}
          onEdgeRoutingModeChange={state.setEdgeRoutingMode}
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap(!showMinimap)}
          onZoomIn={() => {
            zoomTo(view.scale * 1.2);
          }}
          onZoomOut={() => {
            zoomTo(view.scale / 1.2);
          }}
          onFitToNodes={() => {
            fitToNodes();
          }}
          onFitToSelection={() => {
            fitToSelection();
          }}
          onResetView={() => {
            resetView();
          }}
          viewScale={view.scale}
          svgPerf={svgPerf}
        />

        <div
          ref={canvasRef}
          className='relative h-full w-full touch-none select-none overscroll-none'
          onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onWheel={handleWheel}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <svg
            width={viewportSize?.width ?? 0}
            height={viewportSize?.height ?? 0}
            viewBox={`0 0 ${viewportSize?.width ?? 0} ${viewportSize?.height ?? 0}`}
            className='h-full w-full'
            style={{
              cursor: isPanning ? 'grabbing' : (selectionToolMode === 'pan' ? 'grab' : 'default'),
            }}
          >
            <g
              data-canvas-world='true'
              transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}
            >
              <CanvasSvgEdgeLayer />
              <CanvasSvgNodeLayer />
            </g>
          </svg>
          <div className='pointer-events-none absolute inset-0'>
            {selectionMarqueeRect && <CanvasSelectionMarquee rect={selectionMarqueeRect} />}
            {touchLongPressIndicator && (
              <CanvasLongPressIndicator 
                indicator={{
                  x: touchLongPressIndicator.x,
                  y: touchLongPressIndicator.y,
                  progress: touchLongPressIndicator.progress
                }} 
              />
            )}
            {svgConnectorTooltip && (
              <CanvasConnectorTooltip
                tooltip={svgConnectorTooltip}
                position={{
                  left: svgConnectorTooltip.clientX + 12,
                  top: svgConnectorTooltip.clientY + 12,
                }}
                override={resolveConnectorTooltip?.({
                  direction: svgConnectorTooltip.info.direction,
                  node: state.nodeById.get(svgConnectorTooltip.info.nodeId)!,
                  port: svgConnectorTooltip.info.port,
                }) ?? null}
              />
            )}
            {svgNodeDiagnosticsTooltip && (
              <CanvasNodeDiagnosticsTooltip
                tooltip={svgNodeDiagnosticsTooltip}
                position={{
                  left: svgNodeDiagnosticsTooltip.clientX + 12,
                  top: svgNodeDiagnosticsTooltip.clientY + 12,
                }}
                nodeTitle={
                  state.nodeById.get(svgNodeDiagnosticsTooltip.nodeId)?.title ||
                  svgNodeDiagnosticsTooltip.nodeId
                }
              />
            )}
          </div>
        </div>
        {showMinimap && <CanvasMinimap />}
        <ConfirmationModal />
      </div>
    </CanvasBoardUIProvider>
  );
}
