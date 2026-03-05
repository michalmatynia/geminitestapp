'use client';

import React from 'react';
import { type AiNode, type DataContractNodeIssueSummary } from '@/shared/lib/ai-paths';
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
import { useCanvasPulseEffects } from './canvas-board-pulse-effects';
import {
  type CanvasBoardConnectorTooltipOverrideInput,
  type CanvasBoardConnectorTooltipOverride,
} from './CanvasBoard.utils';
import type { ConnectorInfo } from './canvas-board-connectors';

const CONNECTOR_HIT_TARGET_PX = 14;
const CONNECTOR_TOOLTIP_POINTER_OFFSET_PX = 6;

const shouldIgnoreCanvasPanStart = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      '[data-node-body], [data-node-root], [data-port], [data-canvas-edge-hit], [data-node-diagnostics-badge], [data-node-action], button, input, textarea, select, a, [contenteditable="true"], [data-canvas-no-pan="true"]'
    )
  );
};

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

  const detailLevel = React.useMemo(() => {
    if (view.scale >= 0.9) return 'full' as const;
    if (view.scale >= 0.6) return 'compact' as const;
    return 'skeleton' as const;
  }, [view.scale]);

  const [launchingTriggerIds, setLaunchingTriggerIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const markTriggerLaunching = React.useCallback((nodeId: string): void => {
    setLaunchingTriggerIds((prev) => {
      if (prev.has(nodeId)) return prev;
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, []);

  const clearTriggerLaunching = React.useCallback((nodeId: string): void => {
    setLaunchingTriggerIds((prev) => {
      if (!prev.has(nodeId)) return prev;
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const handleFireTrigger = React.useCallback(
    (node: AiNode, event?: React.MouseEvent<SVGRectElement>): void => {
      markTriggerLaunching(node.id);
      Promise.resolve(state.fireTrigger(node, event))
        .catch(() => undefined)
        .finally(() => {
          setTimeout(() => {
            clearTriggerLaunching(node.id);
          }, 480);
        });
    },
    [clearTriggerLaunching, markTriggerLaunching, state]
  );

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

  const buildEdgePortKey = React.useCallback((nodeId: string, port: string): string => {
    return `${nodeId}:${port}`;
  }, []);

  const edgesByFromPort = React.useMemo(() => {
    const byPort = new Map<string, Array<(typeof state.edges)[number]>>();
    state.edges.forEach((edge) => {
      if (!edge.from || !edge.fromPort) return;
      const key = buildEdgePortKey(edge.from, edge.fromPort);
      const current = byPort.get(key);
      if (current) {
        current.push(edge);
        return;
      }
      byPort.set(key, [edge]);
    });
    return byPort;
  }, [buildEdgePortKey, state.edges]);

  const edgesByToPort = React.useMemo(() => {
    const byPort = new Map<string, Array<(typeof state.edges)[number]>>();
    state.edges.forEach((edge) => {
      if (!edge.to || !edge.toPort) return;
      const key = buildEdgePortKey(edge.to, edge.toPort);
      const current = byPort.get(key);
      if (current) {
        current.push(edge);
        return;
      }
      byPort.set(key, [edge]);
    });
    return byPort;
  }, [buildEdgePortKey, state.edges]);

  const incomingEdgeIdsByNode = React.useMemo(() => {
    const byNode = new Map<string, string[]>();
    state.edges.forEach((edge) => {
      if (!edge.to) return;
      const current = byNode.get(edge.to);
      if (current) {
        current.push(edge.id);
        return;
      }
      byNode.set(edge.to, [edge.id]);
    });
    return byNode;
  }, [state.edges]);

  const outgoingEdgeIdsByNode = React.useMemo(() => {
    const byNode = new Map<string, string[]>();
    state.edges.forEach((edge) => {
      if (!edge.from) return;
      const current = byNode.get(edge.from);
      if (current) {
        current.push(edge.id);
        return;
      }
      byNode.set(edge.from, [edge.id]);
    });
    return byNode;
  }, [state.edges]);

  const pulseTiming = React.useMemo(
    () => ({
      flowAnimationMs:
        state.effectiveFlowIntensity === 'high'
          ? 640
          : state.effectiveFlowIntensity === 'low'
            ? 1200
            : 900,
      nodePulseMs:
        state.effectiveFlowIntensity === 'high'
          ? 520
          : state.effectiveFlowIntensity === 'low'
            ? 860
            : 700,
    }),
    [state.effectiveFlowIntensity]
  );

  const { activeEdgeIds, inputPulseNodes, outputPulseNodes } = useCanvasPulseEffects({
    nodes: state.nodes,
    edges: state.edges,
    runtimeEvents: state.runtimeEvents ?? [],
    runtimeState: state.runtimeState,
    getPortValue: state.getPortValue,
    edgesByFromPort,
    edgesByToPort,
    incomingEdgeIdsByNode,
    outgoingEdgeIdsByNode,
    buildEdgePortKey,
    nodeById: state.nodeById,
    flowAnimationMs: pulseTiming.flowAnimationMs,
    nodePulseMs: pulseTiming.nodePulseMs,
  });
  const wireFlowEnabled = state.effectiveFlowIntensity !== 'off';
  const flowingIntensity =
    state.effectiveFlowIntensity === 'off' ? 'low' : state.effectiveFlowIntensity;
  const reduceVisualEffects = state.prefersReducedMotion || !wireFlowEnabled;
  const enableNodeAnimations = !reduceVisualEffects;

  // Combined UI context value
  const canvasInteractions: CanvasBoardUIContextValue = React.useMemo(
    () => ({
      ...state,
      detailLevel,
      edgeMetaMap,
      inputPulseNodes,
      outputPulseNodes,
      activeEdgeIds,
      launchingTriggerIds,
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
      consumeSuppressedNodeClick: (nodeId) => {
        return state.consumeSuppressedNodeClick(nodeId);
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
      onFireTrigger: handleFireTrigger,
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
    }),
    [
      state,
      detailLevel,
      edgeMetaMap,
      inputPulseNodes,
      outputPulseNodes,
      activeEdgeIds,
      launchingTriggerIds,
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
      handleFireTrigger,
      onFocusNodeDiagnostics,
    ]
  );
  const connectorTooltipOverride = React.useMemo(() => {
    if (!svgConnectorTooltip || !resolveConnectorTooltip) return null;
    const node = state.nodeById.get(svgConnectorTooltip.info.nodeId);
    if (!node) return null;
    return (
      resolveConnectorTooltip({
        direction: svgConnectorTooltip.info.direction,
        node,
        port: svgConnectorTooltip.info.port,
      }) ?? null
    );
  }, [resolveConnectorTooltip, state.nodeById, svgConnectorTooltip]);

  return (
    <CanvasBoardUIProvider value={canvasInteractions}>
      <div
        ref={viewportRef}
        className={cn('relative h-full w-full overflow-hidden overscroll-none', viewportClassName)}
      >
        <CanvasControlPanel
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
          data-doc-id='canvas_drop_zone'
          className='relative h-full w-full touch-none select-none overscroll-none'
          onPointerDown={(event) => {
            if (shouldIgnoreCanvasPanStart(event.target)) return;
            state.clearNodeSelection();
            state.selectEdge(null);
            handlePanStart(event);
          }}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onPointerCancel={handlePanEnd}
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
              cursor: isPanning ? 'grabbing' : selectionToolMode === 'pan' ? 'grab' : 'default',
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
                  progress: touchLongPressIndicator.progress,
                }}
              />
            )}
            {svgConnectorTooltip && (
              <CanvasConnectorTooltip
                tooltip={svgConnectorTooltip}
                position={{
                  left: svgConnectorTooltip.clientX + CONNECTOR_TOOLTIP_POINTER_OFFSET_PX,
                  top: svgConnectorTooltip.clientY + CONNECTOR_TOOLTIP_POINTER_OFFSET_PX,
                }}
                override={connectorTooltipOverride}
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
