'use client';

import React from 'react';
import {
  type DataContractNodeIssueSummary,
} from '@/features/ai/ai-paths/lib';
import { cn } from '@/shared/utils';

import { useCanvasBoardState } from './useCanvasBoardState';
import { CanvasBoardUIProvider } from './CanvasBoardUIContext';
import { CanvasControlPanel } from './canvas-control-panel';
import { CanvasMinimap } from './canvas-minimap';
import { CanvasSvgEdgeLayer } from './canvas-svg-edge-layer';
import { CanvasSvgNodeLayer } from './canvas-svg-node-layer';
import { CanvasConnectorTooltip } from './canvas-connector-tooltip';
import { CanvasNodeDiagnosticsTooltip } from './canvas-node-diagnostics-tooltip';
import { CanvasSelectionMarquee } from './canvas-selection-marquee';
import { CanvasLongPressIndicator } from './canvas-long-press-indicator';
import { 
  type CanvasBoardConnectorTooltipOverrideInput, 
  type CanvasBoardConnectorTooltipOverride,
  type CanvasBoardState
} from './CanvasBoard.utils';
import type { ConnectorInfo } from './canvas-board-connectors';

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

  // Combined UI context value
  const canvasInteractions: CanvasBoardState = React.useMemo(() => ({
    ...state,
    openNodeConfigOnSingleClick,
    onConnectorHover: handleConnectorHover,
    onConnectorLeave: handleConnectorLeave,
    onNodeDiagnosticsHover: handleNodeDiagnosticsHover,
    onNodeDiagnosticsLeave: handleNodeDiagnosticsLeave,
    onFocusNodeDiagnostics,
    resolveConnectorTooltip,
  }), [
    state,
    openNodeConfigOnSingleClick,
    handleConnectorHover,
    handleConnectorLeave,
    handleNodeDiagnosticsHover,
    handleNodeDiagnosticsLeave,
    onFocusNodeDiagnostics,
    resolveConnectorTooltip,
  ]);

  return (
    <CanvasBoardUIProvider value={canvasInteractions}>
      <div ref={viewportRef} className={cn('relative h-full w-full', viewportClassName)}>
        <CanvasControlPanel
          rendererMode={rendererMode}
          onRendererModeChange={setRendererMode}
          edgeRoutingMode={edgeRoutingMode}
          onEdgeRoutingModeChange={state.setEdgeRoutingMode}
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap(!showMinimap)}
          selectionToolMode={selectionToolMode}
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
          className='h-full w-full touch-none select-none'
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
            className={cn('h-full w-full transition-opacity', {
              'opacity-50': svgPerf && svgPerf.fps < 30,
            })}
            style={{
              cursor: isPanning ? 'grabbing' : (selectionToolMode === 'pan' ? 'grab' : 'default'),
            }}
          >
            {selectionMarqueeRect && <CanvasSelectionMarquee rect={selectionMarqueeRect} />}
            {touchLongPressIndicator && (
              <CanvasLongPressIndicator 
                indicator={{
                  clientX: touchLongPressIndicator.x,
                  clientY: touchLongPressIndicator.y,
                  progress: touchLongPressIndicator.progress
                }} 
              />
            )}
            <CanvasSvgEdgeLayer />
            <CanvasSvgNodeLayer />
            {svgConnectorTooltip && (
              <CanvasConnectorTooltip
                tooltip={svgConnectorTooltip}
                override={resolveConnectorTooltip?.({
                  direction: svgConnectorTooltip.info.direction,
                  node: state.nodeById.get(svgConnectorTooltip.info.nodeId)!,
                  port: svgConnectorTooltip.info.port,
                })}
              />
            )}
            {svgNodeDiagnosticsTooltip && (
              <CanvasNodeDiagnosticsTooltip
                tooltip={svgNodeDiagnosticsTooltip}
                title={
                  state.nodeById.get(svgNodeDiagnosticsTooltip.nodeId)?.title ||
                  svgNodeDiagnosticsTooltip.nodeId
                }
              />
            )}
          </svg>
        </div>
        {showMinimap && <CanvasMinimap />}
        <ConfirmationModal />
      </div>
    </CanvasBoardUIProvider>
  );
}
