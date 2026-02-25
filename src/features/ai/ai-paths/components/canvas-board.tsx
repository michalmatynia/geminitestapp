/* eslint-disable */
// @ts-nocheck
'use client';

import React from 'react';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { CanvasMinimap } from './canvas-minimap';
import { CanvasSvgEdgeLayer } from './canvas-svg-edge-layer';
import { CanvasSvgNodeLayer } from './canvas-svg-node-layer';
import { CanvasBoardUIProvider, type CanvasBoardUIContextValue } from './CanvasBoardUIContext';
import {
  type CanvasBoardConnectorTooltipOverrideInput,
  type CanvasBoardConnectorTooltipOverride,
  type CanvasNode,
  type SvgConnectorTooltipState,
  type SvgNodeDiagnosticsTooltipState,
} from './CanvasBoard.utils';
import { useCanvasBoardState, type CanvasBoardState } from './useCanvasBoardState';
import { CanvasControlPanel } from './CanvasControlPanel';
import { CanvasLegacyNodeLayer } from './CanvasLegacyNodeLayer';
import { type DataContractNodeIssueSummary } from '@/features/ai/ai-paths/lib';

import { CanvasConnectorTooltip } from './canvas/CanvasConnectorTooltip';
import { CanvasNodeDiagnosticsTooltip } from './canvas/CanvasNodeDiagnosticsTooltip';
import { CanvasSelectionMarquee } from './canvas/CanvasSelectionMarquee';
import { CanvasLongPressIndicator } from './canvas/CanvasLongPressIndicator';

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
  const state: CanvasBoardState = useCanvasBoardState({
    confirmNodeSwitch,
    nodeDiagnosticsById,
  }) as unknown as CanvasBoardState;

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
    (): CanvasBoardUIContextValue => ({
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
      <CanvasBoardUIProvider value={canvasContextValue}>
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
              onFitToNodes={() => { void fitToNodes(); }}
              onResetView={() => { void resetView(); }}
            />
          )}

          <CanvasControlPanel
            rendererMode={rendererMode}
            onRendererModeChange={(mode) => { setRendererMode(mode); }}
            edgeRoutingMode={edgeRoutingMode}
            onEdgeRoutingModeChange={(mode) => { setEdgeRoutingMode(mode); }}
            showMinimap={showMinimap}
            onToggleMinimap={() => { setShowMinimap(!showMinimap); }}
            selectionToolMode={selectionToolMode}
            onZoomIn={() => { void zoomTo(view.scale * 1.2); }}
            onZoomOut={() => { void zoomTo(view.scale / 1.2); }}
            onFitToNodes={() => { void fitToNodes(); }}
            onFitToSelection={() => { void fitToSelection(); }}
            onResetView={() => { void resetView(); }}
            viewScale={view.scale}
            svgPerf={svgPerf}
          />

                      <div
                        ref={canvasRef}
                        className='absolute inset-0'
                        style={{
                          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                          transformOrigin: '0 0',
                          transition: state.isPanning ? 'none' : 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
                        }}
                      >            {isSvgRenderer ? (
              <svg className='absolute inset-0 h-full w-full overflow-visible pointer-events-none'>
                <CanvasSvgEdgeLayer
                  edges={edges}
                  edgePaths={edgePaths}
                  selectedEdgeId={selectedEdgeId}
                  onSelectEdge={(id: string) => { selectEdge(id); }}
                  onRemoveEdge={(id: string) => { handleRemoveEdge(id); }}
                  flowEnabled={effectiveFlowIntensity !== 'off'}
                  flowIntensity={effectiveFlowIntensity}
                />
                <CanvasSvgNodeLayer
                  nodes={nodes}
                  selectedNodeIdSet={selectedNodeIdSet}
                  runtimeNodeStatuses={runtimeNodeStatuses}
                  nodeDiagnosticsById={nodeDiagnosticsById}
                  onPointerDownNode={(id: string, event: React.PointerEvent) => { handlePointerDownNode(id, event); }}
                  onSelectNode={(id: string) => { handleSelectNode(id); }}
                  onFocusNodeDiagnostics={(id: string) => { onFocusNodeDiagnostics?.(id); }}
                  onFireTrigger={(node, event) => { void fireTrigger(node, event); }}
                  getConnectorInfo={(direction, nodeId, port) => getConnectorInfo(direction, nodeId, port)}
                  hoveredConnectorKey={hoveredConnectorKey}
                  pinnedConnectorKey={pinnedConnectorKey}
                  onConnectorHover={(key) => { setHoveredConnectorKey(key); }}
                  onConnectorPin={(key) => { setPinnedConnectorKey(key); }}
                  onConnectorTooltip={(tooltip) => { setSvgConnectorTooltip(tooltip); }}
                  onNodeDiagnosticsTooltip={(tooltip) => { setSvgNodeDiagnosticsTooltip(tooltip); }}
                  onDisconnectPort={(nodeId, port) => { handleDisconnectPort(nodeId, port); }}
                  onStartConnection={(nodeId, port, pos) => { handleStartConnection(nodeId, port, pos); }}
                  onCompleteConnection={(nodeId, port) => { void handleCompleteConnection(nodeId, port); }}
                  onReconnectInput={(edgeId, nodeId, port) => { void handleReconnectInput(edgeId, nodeId, port); }}
                  viewportSize={viewportSize}
                  viewScale={view.scale}
                />
              </svg>
            ) : (
              <CanvasLegacyNodeLayer
                nodes={nodes as CanvasNode[]}
                selectedNodeIdSet={selectedNodeIdSet}
                activeShapeId={state.activeShapeId ?? null}
                runtimeNodeStatuses={runtimeNodeStatuses}
                nodeDurations={nodeDurations}
                nodeDiagnosticsById={nodeDiagnosticsById}
                triggerConnected={triggerConnected}
                onPointerDownNode={(id: string, event: React.PointerEvent) => { handlePointerDownNode(id, event); }}
                onSelectNode={(id: string) => { handleSelectNode(id); }}
                onFocusNodeDiagnostics={(id: string) => { onFocusNodeDiagnostics?.(id); }}
                onFireTrigger={(node, event) => { void fireTrigger(node, event); }}
                getPortValue={(direction, nodeId, port) => state.getPortValue(direction, nodeId, port)}
              />
            )}
          </div>

          {selectionMarqueeRect && (
            <CanvasSelectionMarquee rect={selectionMarqueeRect} />
          )}

          {touchLongPressIndicator && (
            <CanvasLongPressIndicator indicator={touchLongPressIndicator} />
          )}

          {svgConnectorTooltip && svgConnectorTooltipPosition && (
            <CanvasConnectorTooltip 
              tooltip={svgConnectorTooltip} 
              position={svgConnectorTooltipPosition} 
              override={svgConnectorTooltipOverride} 
            />
          )}

          {svgNodeDiagnosticsTooltip && svgNodeDiagnosticsTooltipPosition && (
            <CanvasNodeDiagnosticsTooltip 
              tooltip={svgNodeDiagnosticsTooltip} 
              position={svgNodeDiagnosticsTooltipPosition} 
              nodeTitle={nodeById.get(svgNodeDiagnosticsTooltip.nodeId)?.title || svgNodeDiagnosticsTooltip.nodeId} 
            />
          )}
        </div>
        <ConfirmationModal />
      </CanvasBoardUIProvider>
    </Card>
  );
}
