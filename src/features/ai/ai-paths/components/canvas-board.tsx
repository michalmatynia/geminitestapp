'use client';

import React from 'react';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { CanvasMinimap } from './canvas-minimap';
import { CanvasSvgEdgeLayer } from './canvas-svg-edge-layer';
import { CanvasSvgNodeLayer } from './canvas-svg-node-layer';
import { CanvasBoardUIProvider } from './CanvasBoardUIContext';
import {
  type CanvasBoardConnectorTooltipOverrideInput,
  type CanvasBoardConnectorTooltipOverride,
  renderNodeDiagnosticsTooltipContent,
} from './CanvasBoard.utils';
import { useCanvasBoardState } from './useCanvasBoardState';
import { CanvasControlPanel } from './CanvasControlPanel';
import { CanvasLegacyNodeLayer } from './CanvasLegacyNodeLayer';
import { renderConnectorTooltip } from './canvas-board-connectors';
import { type DataContractNodeIssueSummary } from '@/features/ai/ai-paths/lib';

export interface CanvasBoardProps {
  viewportClassName?: string | undefined;
  confirmNodeSwitch?: ((nodeId: string) => boolean | Promise<boolean>) | undefined;
  openNodeConfigOnSingleClick?: boolean | undefined;
  nodeDiagnosticsById?: Record<string, DataContractNodeIssueSummary> | undefined;
  onFocusNodeDiagnostics?: ((nodeId: string) => void) | undefined;
  resolveConnectorTooltip?: (input: CanvasBoardConnectorTooltipOverrideInput) => CanvasBoardConnectorTooltipOverride | null | undefined;
}

export function CanvasBoard({
  viewportClassName,
  confirmNodeSwitch,
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
    nodes,
    edges,
    runtimeNodeStatuses,
    nodeDurations,
    fireTrigger,
    selectedEdgeId,
    selectionToolMode,
    selectEdge,
    edgeRoutingMode,
    setEdgeRoutingMode,
    edgePaths,
    handlePointerDownNode,
    handlePointerMoveNode,
    handlePointerUpNode,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
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
    svgPerf,
    effectiveFlowIntensity,
    isSvgRenderer,
    nodeById,
    getConnectorInfo,
  } = state;

  const triggerConnected = React.useMemo((): Set<string> => {
    const triggerIds = nodes.filter((node) => node.type === 'trigger').map((node) => node.id);
    if (triggerIds.length === 0) return new Set<string>();
    const adjacency = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      if (!edge.from || !edge.to) return;
      const fromSet = adjacency.get(edge.from) ?? new Set<string>();
      fromSet.add(edge.to);
      adjacency.set(edge.from, fromSet);
      const toSet = adjacency.get(edge.to) ?? new Set<string>();
      toSet.add(edge.from);
      adjacency.set(edge.to, toSet);
    });
    const visited = new Set<string>();
    const queue = [...triggerIds];
    triggerIds.forEach((id) => visited.add(id));
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const next = adjacency.get(current);
      if (!next) continue;
      next.forEach((id) => {
        if (!visited.has(id)) {
          visited.add(id);
          queue.push(id);
        }
      });
    }
    return visited;
  }, [edges, nodes]);

  const svgConnectorTooltipPosition = React.useMemo(
    (): { left: number; top: number } | null => {
      if (!svgConnectorTooltip || !viewportRef.current) return null;
      const rect = viewportRef.current.getBoundingClientRect();
      const localX = svgConnectorTooltip.clientX - rect.left;
      const localY = svgConnectorTooltip.clientY - rect.top;
      const maxLeft = Math.max(12, rect.width - 332);
      const maxTop = Math.max(12, rect.height - 272);
      const left = Math.min(Math.max(12, localX + 14), maxLeft);
      const top = Math.min(Math.max(12, localY + 14), maxTop);
      return { left, top };
    },
    [svgConnectorTooltip, viewportRef]
  );

  const svgNodeDiagnosticsTooltipPosition = React.useMemo(
    (): { left: number; top: number } | null => {
      if (!svgNodeDiagnosticsTooltip || !viewportRef.current) return null;
      const rect = viewportRef.current.getBoundingClientRect();
      const localX = svgNodeDiagnosticsTooltip.clientX - rect.left;
      const localY = svgNodeDiagnosticsTooltip.clientY - rect.top;
      const maxLeft = Math.max(12, rect.width - 372);
      const maxTop = Math.max(12, rect.height - 312);
      const left = Math.min(Math.max(12, localX + 14), maxLeft);
      const top = Math.min(Math.max(12, localY + 14), maxTop);
      return { left, top };
    },
    [svgNodeDiagnosticsTooltip, viewportRef]
  );

  const svgConnectorTooltipOverride = React.useMemo(() => {
    if (!svgConnectorTooltip) return null;
    const hoveredNode = nodeById.get(svgConnectorTooltip.info.nodeId);
    if (!hoveredNode) return null;
    return resolveConnectorTooltip?.({
      direction: svgConnectorTooltip.info.direction,
      node: hoveredNode,
      port: svgConnectorTooltip.info.port,
    }) ?? null;
  }, [nodeById, resolveConnectorTooltip, svgConnectorTooltip]);

  const canvasContextValue = React.useMemo(
    () => ({
      rendererMode,
      edgeRoutingMode,
      viewportSize,
      isPanning: state.isPanning,
      isDraggingNode: Boolean(state.dragState),
      isConnecting: Boolean(state.connecting),
      flowIntensity: effectiveFlowIntensity,
    }),
    [rendererMode, edgeRoutingMode, viewportSize, state.isPanning, state.dragState, state.connecting, effectiveFlowIntensity]
  );

  return (
    <Card className='relative flex h-full w-full flex-col overflow-hidden border-none bg-background shadow-none'>
      <CanvasBoardUIProvider value={canvasContextValue as any}>
        <div
          ref={viewportRef}
          className={cn(
            'relative h-full w-full overflow-hidden outline-none',
            viewportClassName
          )}
          tabIndex={0}
          onPointerDown={(e) => { handlePanStart(e); }}
          onPointerMove={(e) => { handlePanMove(e); }}
          onPointerUp={(e) => { handlePanEnd(e); }}
          onPointerLeave={(e) => { handlePanEnd(e); }}
          onDragOver={(e) => { handleDragOver(e); }}
          onDrop={(e) => { handleDrop(e); }}
        >
          {showMinimap && (
            <CanvasMinimap
              nodes={nodes}
              view={view}
              onFitToNodes={fitToNodes}
              onResetView={resetView}
            />
          )}

          <CanvasControlPanel
            rendererMode={rendererMode}
            onRendererModeChange={setRendererMode}
            edgeRoutingMode={edgeRoutingMode}
            onEdgeRoutingModeChange={setEdgeRoutingMode}
            showMinimap={showMinimap}
            onToggleMinimap={() => setShowMinimap(!showMinimap)}
            selectionToolMode={selectionToolMode}
            onZoomIn={() => { zoomTo(view.scale * 1.2); }}
            onZoomOut={() => { zoomTo(view.scale / 1.2); }}
            onFitToNodes={() => { fitToNodes(); }}
            onFitToSelection={() => { fitToSelection(); }}
            onResetView={() => { resetView(); }}
            viewScale={view.scale}
            svgPerf={svgPerf}
          />

          <div
            ref={canvasRef}
            className='absolute inset-0'
            style={{
              transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.scale})`,
              transformOrigin: '0 0',
              transition: state.isPanning ? 'none' : 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            {isSvgRenderer ? (
              <svg className='absolute inset-0 h-full w-full overflow-visible pointer-events-none'>
                <CanvasSvgEdgeLayer
                  edges={edges}
                  edgePaths={edgePaths}
                  selectedEdgeId={selectedEdgeId}
                  onSelectEdge={selectEdge}
                  onRemoveEdge={handleRemoveEdge}
                  flowEnabled={effectiveFlowIntensity !== 'off'}
                  flowIntensity={effectiveFlowIntensity}
                />
                <CanvasSvgNodeLayer
                  nodes={nodes}
                  selectedNodeIdSet={selectedNodeIdSet}
                  runtimeNodeStatuses={runtimeNodeStatuses}
                  nodeDiagnosticsById={nodeDiagnosticsById}
                  onPointerDownNode={handlePointerDownNode}
                  onSelectNode={handleSelectNode}
                  onFocusNodeDiagnostics={onFocusNodeDiagnostics}
                  onFireTrigger={fireTrigger}
                  getConnectorInfo={getConnectorInfo}
                  hoveredConnectorKey={hoveredConnectorKey}
                  pinnedConnectorKey={pinnedConnectorKey}
                  onConnectorHover={setHoveredConnectorKey}
                  onConnectorPin={setPinnedConnectorKey}
                  onConnectorTooltip={setSvgConnectorTooltip}
                  onNodeDiagnosticsTooltip={setSvgNodeDiagnosticsTooltip}
                  onDisconnectPort={handleDisconnectPort}
                  onStartConnection={handleStartConnection}
                  onCompleteConnection={handleCompleteConnection}
                  onReconnectInput={handleReconnectInput}
                  viewportSize={viewportSize}
                  viewScale={view.scale}
                />
              </svg>
            ) : (
              <CanvasLegacyNodeLayer
                nodes={nodes as any}
                selectedNodeIdSet={selectedNodeIdSet}
                activeShapeId={state.activeShapeId ?? null}
                runtimeNodeStatuses={runtimeNodeStatuses}
                nodeDurations={nodeDurations}
                nodeDiagnosticsById={nodeDiagnosticsById}
                triggerConnected={triggerConnected}
                onPointerDownNode={handlePointerDownNode}
                onSelectNode={handleSelectNode}
                onFocusNodeDiagnostics={onFocusNodeDiagnostics}
                onFireTrigger={fireTrigger as any}
                getPortValue={state.getPortValue}
              />
            )}
          </div>

          {selectionMarqueeRect && (
            <div
              className='absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-[60]'
              style={{
                left: selectionMarqueeRect.x,
                top: selectionMarqueeRect.y,
                width: selectionMarqueeRect.width,
                height: selectionMarqueeRect.height,
              }}
            />
          )}

          {touchLongPressIndicator && (
            <div
              className='absolute z-[70] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40 bg-white/10 pointer-events-none'
              style={{
                left: touchLongPressIndicator.clientX,
                top: touchLongPressIndicator.clientY,
                transform: `translate(-50%, -50%) scale(${touchLongPressIndicator.progress})`,
                opacity: 1 - touchLongPressIndicator.progress,
              }}
            />
          )}

          {svgConnectorTooltip && svgConnectorTooltipPosition && (
            <div
              className='fixed z-[100] pointer-events-none transition-transform duration-75'
              style={{
                left: svgConnectorTooltipPosition.left,
                top: svgConnectorTooltipPosition.top,
              }}
            >
              {renderConnectorTooltip({
                info: svgConnectorTooltip.info,
                override: svgConnectorTooltipOverride,
              })}
            </div>
          )}

          {svgNodeDiagnosticsTooltip && svgNodeDiagnosticsTooltipPosition && (
            <div
              className='fixed z-[100] pointer-events-none transition-transform duration-75'
              style={{
                left: svgNodeDiagnosticsTooltipPosition.left,
                top: svgNodeDiagnosticsTooltipPosition.top,
              }}
            >
              <Card className='w-80 border-rose-500/30 bg-card/95 p-3 shadow-2xl backdrop-blur-sm'>
                {renderNodeDiagnosticsTooltipContent({
                  summary: svgNodeDiagnosticsTooltip.summary,
                  nodeLabel: nodeById.get(svgNodeDiagnosticsTooltip.nodeId)?.title || svgNodeDiagnosticsTooltip.nodeId,
                })}
              </Card>
            </div>
          )}
        </div>
        <ConfirmationModal />
      </CanvasBoardUIProvider>
    </Card>
  );
}
