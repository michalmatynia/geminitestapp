/* eslint-disable */
// @ts-nocheck
'use client';

import React from 'react';

import { type AiNode, type DataContractNodeIssueSummary } from '@/features/ai/ai-paths/lib';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { CanvasBoardUIProvider, type CanvasBoardUIContextValue } from './CanvasBoardUIContext';
import {
  type CanvasBoardConnectorTooltipOverride,
  type CanvasBoardConnectorTooltipOverrideInput,
  type CanvasNode,
} from './CanvasBoard.utils';
import { CanvasControlPanel } from './CanvasControlPanel';
import { CanvasLegacyNodeLayer } from './CanvasLegacyNodeLayer';
import { CanvasLongPressIndicator } from './canvas/CanvasLongPressIndicator';
import { CanvasConnectorTooltip } from './canvas/CanvasConnectorTooltip';
import { CanvasNodeDiagnosticsTooltip } from './canvas/CanvasNodeDiagnosticsTooltip';
import { CanvasSelectionMarquee } from './canvas/CanvasSelectionMarquee';
import { CanvasMinimap } from './canvas-minimap';
import { CanvasSvgEdgeLayer } from './canvas-svg-edge-layer';
import { CanvasSvgNodeLayer } from './canvas-svg-node-layer';
import { type CanvasBoardState, useCanvasBoardState } from './useCanvasBoardState';

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
    nodeById,
    getPortValue,
  } = state;

  const triggerConnected = React.useMemo((): Set<string> => {
    const triggerIds = nodes
      .filter((node: AiNode) => node.type === 'trigger')
      .map((node: AiNode) => node.id);
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
    return (
      resolveConnectorTooltip?.({
        direction: svgConnectorTooltip.info.direction,
        node: hoveredNode,
        port: svgConnectorTooltip.info.port,
      }) ?? null
    );
  }, [nodeById, resolveConnectorTooltip, svgConnectorTooltip]);

  const detailLevel = React.useMemo((): CanvasBoardUIContextValue['detailLevel'] => {
    if (view.scale < 0.55) return 'skeleton';
    if (view.scale < 0.85 || nodes.length > 1400) return 'compact';
    return 'full';
  }, [nodes.length, view.scale]);

  const edgeMetaMap = React.useMemo(
    () => new Map(edges.map((edge) => [edge.id, edge])),
    [edges]
  );
  const viewportCursorClassName =
    state.isPanning
      ? 'cursor-grabbing'
      : selectionToolMode === 'pan'
        ? 'cursor-grab'
        : 'cursor-default';

  const activeEdgeIds = React.useMemo((): Set<string> => new Set<string>(), []);
  const inputPulseNodes = React.useMemo((): Set<string> => new Set<string>(), []);
  const outputPulseNodes = React.useMemo((): Set<string> => new Set<string>(), []);
  const wireFlowEnabled = effectiveFlowIntensity !== 'off';
  const flowingIntensity = effectiveFlowIntensity === 'off' ? 'low' : effectiveFlowIntensity;
  const reduceVisualEffects = prefersReducedMotion;

  const handleConnectorHover = React.useCallback(
    (payload: { clientX: number; clientY: number; info: unknown }) => {
      setSvgConnectorTooltip(payload);
    },
    [setSvgConnectorTooltip]
  );

  const handleConnectorLeave = React.useCallback(() => {
    if (pinnedConnectorKey) return;
    setSvgConnectorTooltip(null);
  }, [pinnedConnectorKey, setSvgConnectorTooltip]);

  const handleNodeDiagnosticsHover = React.useCallback(
    (payload: {
      clientX: number;
      clientY: number;
      nodeId: string;
      summary: DataContractNodeIssueSummary;
    }) => {
      setSvgNodeDiagnosticsTooltip(payload);
    },
    [setSvgNodeDiagnosticsTooltip]
  );

  const handleNodeDiagnosticsLeave = React.useCallback(() => {
    setSvgNodeDiagnosticsTooltip(null);
  }, [setSvgNodeDiagnosticsTooltip]);

  const canvasContextValue = React.useMemo(
    (): CanvasBoardUIContextValue => ({
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
      enableNodeAnimations: true,
      connectorHitTargetPx: 18,
      openNodeConfigOnSingleClick,
      zoomTo: (targetScale) => {
        void zoomTo(targetScale);
      },
      fitToNodes: () => {
        void fitToNodes();
      },
      fitToSelection: () => {
        void fitToSelection();
      },
      resetView: () => {
        void resetView();
      },
      centerOnCanvasPoint: (canvasX, canvasY) => {
        void centerOnCanvasPoint(canvasX, canvasY);
      },
      hoveredConnectorKey,
      pinnedConnectorKey,
      setHoveredConnectorKey,
      setPinnedConnectorKey,
      onConnectorHover: handleConnectorHover,
      onConnectorLeave: handleConnectorLeave,
      onNodeDiagnosticsHover: handleNodeDiagnosticsHover,
      onNodeDiagnosticsLeave: handleNodeDiagnosticsLeave,
      onFocusNodeDiagnostics,
      onPointerDownNode: (event, nodeId) => {
        handlePointerDownNode(nodeId, event);
      },
      onPointerMoveNode: (event, nodeId) => {
        handlePointerMoveNode(nodeId, event);
      },
      onPointerUpNode: (event, nodeId) => {
        handlePointerUpNode(nodeId, event);
      },
      onSelectNode: (nodeId, options) => {
        void handleSelectNode(nodeId, options);
      },
      onOpenNodeConfig: () => {
        setConfigOpen(true);
      },
      onStartConnection: (event, node, port) => {
        handleStartConnection(event, node, port);
      },
      onCompleteConnection: (event, node, port) => {
        void handleCompleteConnection(event, node, port);
      },
      onReconnectInput: (event, nodeId, port) => {
        void handleReconnectInput(event, nodeId, port);
      },
      onDisconnectPort: (direction, nodeId, port) => {
        handleDisconnectPort(direction, nodeId, port);
      },
      onFireTrigger: (node) => {
        void fireTrigger(node);
      },
      onRemoveEdge: (edgeId) => {
        handleRemoveEdge(edgeId);
      },
      onSelectEdge: (edgeId) => {
        selectEdge(edgeId);
      },
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
      hoveredConnectorKey,
      pinnedConnectorKey,
      setHoveredConnectorKey,
      setPinnedConnectorKey,
      handleConnectorHover,
      handleConnectorLeave,
      handleNodeDiagnosticsHover,
      handleNodeDiagnosticsLeave,
      onFocusNodeDiagnostics,
      handlePointerDownNode,
      handlePointerMoveNode,
      handlePointerUpNode,
      handleSelectNode,
      setConfigOpen,
      handleStartConnection,
      handleCompleteConnection,
      handleReconnectInput,
      handleDisconnectPort,
      fireTrigger,
      handleRemoveEdge,
      selectEdge,
    ]
  );

  return (
    <Card className='relative flex h-full w-full flex-col overflow-hidden border-none bg-background shadow-none'>
      <CanvasBoardUIProvider value={canvasContextValue}>
        <div
          ref={viewportRef}
          className={cn(
            'relative h-full w-full overflow-hidden outline-none',
            viewportCursorClassName,
            viewportClassName
          )}
          tabIndex={0}
          onPointerDown={(event) => {
            handlePanStart(event);
          }}
          onPointerMove={(event) => {
            handlePanMove(event);
          }}
          onPointerUp={(event) => {
            handlePanEnd(event);
          }}
          onPointerLeave={(event) => {
            handlePanEnd(event);
          }}
          onWheel={(event) => {
            handleWheel(event);
          }}
          onDragOver={(event) => {
            handleDragOver(event);
          }}
          onDrop={(event) => {
            handleDrop(event);
          }}
        >
          {showMinimap && <CanvasMinimap />}

          <CanvasControlPanel
            rendererMode={rendererMode}
            onRendererModeChange={(mode) => {
              setRendererMode(mode);
            }}
            edgeRoutingMode={edgeRoutingMode}
            onEdgeRoutingModeChange={(mode) => {
              setEdgeRoutingMode(mode);
            }}
            showMinimap={showMinimap}
            onToggleMinimap={() => {
              setShowMinimap((previous) => !previous);
            }}
            selectionToolMode={selectionToolMode}
            onZoomIn={() => {
              void zoomTo(view.scale * 1.2);
            }}
            onZoomOut={() => {
              void zoomTo(view.scale / 1.2);
            }}
            onFitToNodes={() => {
              void fitToNodes();
            }}
            onFitToSelection={() => {
              void fitToSelection();
            }}
            onResetView={() => {
              void resetView();
            }}
            viewScale={view.scale}
            svgPerf={svgPerf}
          />

          <div
            ref={canvasRef}
            className='absolute inset-0'
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: '0 0',
              transition: state.isPanning
                ? 'none'
                : 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            {isSvgRenderer ? (
              <svg className='pointer-events-none absolute inset-0 h-full w-full overflow-visible'>
                <CanvasSvgEdgeLayer />
                <CanvasSvgNodeLayer />
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
                onPointerDownNode={(id: string, event: React.PointerEvent) => {
                  handlePointerDownNode(id, event);
                }}
                onSelectNode={(id: string) => {
                  void handleSelectNode(id);
                }}
                onFocusNodeDiagnostics={(id: string) => {
                  onFocusNodeDiagnostics?.(id);
                }}
                onFireTrigger={(node, event) => {
                  void fireTrigger(node, event);
                }}
                getPortValue={(direction, nodeId, port) =>
                  getPortValue(direction, nodeId, port)
                }
              />
            )}
          </div>

          {selectionMarqueeRect && <CanvasSelectionMarquee rect={selectionMarqueeRect} />}

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
              nodeTitle={
                nodeById.get(svgNodeDiagnosticsTooltip.nodeId)?.title ||
                svgNodeDiagnosticsTooltip.nodeId
              }
            />
          )}
        </div>
        <ConfirmationModal />
      </CanvasBoardUIProvider>
    </Card>
  );
}
