import React from 'react';
import {
  useCanvasState,
  useCanvasActions,
  useCanvasRefs,
  useCanvasInteractions,
  useGraphState,
  useRuntimeState,
  useRuntimeActions,
  useSelectionState,
  useSelectionActions,
} from '../context';
import type { AiNode, PathFlowIntensity } from '@/shared/lib/ai-paths';
import {
  MINIMAP_VISIBILITY_STORAGE_KEY,
  type SvgConnectorTooltipState,
  type SvgNodeDiagnosticsTooltipState,
  SVG_PERF_SAMPLE_WINDOW_MS,
  mergeRuntimePayload,
} from './CanvasBoard.utils';
import { buildConnectorInfo, type ConnectorInfo } from './canvas-board-connectors';
import { type CanvasBoardState, type UseCanvasBoardStateProps } from './CanvasBoard.types';

export function useCanvasBoardState({
  confirmNodeSwitch,
  nodeDiagnosticsById = {},
}: UseCanvasBoardStateProps): CanvasBoardState {
  // --- Context Hooks ---
  const canvasState = useCanvasState();
  const canvasActions = useCanvasActions();
  const canvasRefs = useCanvasRefs();
  const graphState = useGraphState();
  const runtimeStateContext = useRuntimeState();
  const runtimeActions = useRuntimeActions();
  const selectionState = useSelectionState();
  const selectionActions = useSelectionActions();

  const { edgeRoutingMode } = canvasState;
  const { setEdgeRoutingMode } = canvasActions;

  const canvasInteractions = useCanvasInteractions({
    confirmNodeSwitch,
  });

  const selectedNodeIdSet = React.useMemo(
    (): Set<string> => new Set(selectionState.selectedNodeIds),
    [selectionState.selectedNodeIds]
  );

  // --- Local State ---
  const [hoveredConnectorKey, setHoveredConnectorKey] = React.useState<string | null>(null);
  const [pinnedConnectorKey, setPinnedConnectorKey] = React.useState<string | null>(null);
  const [svgConnectorTooltip, setSvgConnectorTooltip] =
    React.useState<SvgConnectorTooltipState | null>(null);
  const [svgNodeDiagnosticsTooltip, setSvgNodeDiagnosticsTooltip] =
    React.useState<SvgNodeDiagnosticsTooltipState | null>(null);
  const [showMinimap, setShowMinimap] = React.useState<boolean>(true);
  const [viewportSize, setViewportSize] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  const [svgPerf, setSvgPerf] = React.useState<{
    fps: number;
    avgFrameMs: number;
    slowFrameRatio: number;
  }>({
    fps: 0,
    avgFrameMs: 0,
    slowFrameRatio: 0,
  });

  // --- Effects ---
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedMinimapVisibility = window.localStorage.getItem(MINIMAP_VISIBILITY_STORAGE_KEY);
    if (storedMinimapVisibility === '0') {
      setShowMinimap(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MINIMAP_VISIBILITY_STORAGE_KEY, showMinimap ? '1' : '0');
  }, [showMinimap]);

  React.useEffect(() => {
    if (!pinnedConnectorKey && !hoveredConnectorKey) {
      setSvgConnectorTooltip(null);
    }
  }, [hoveredConnectorKey, pinnedConnectorKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (): void => setPrefersReducedMotion(query.matches);
    apply();
    query.addEventListener('change', apply);
    return (): void => query.removeEventListener('change', apply);
  }, []);

  React.useEffect(() => {
    const viewportElement = canvasRefs.viewportRef.current;
    if (!viewportElement) return;
    const measure = (): void => {
      setViewportSize({
        width: viewportElement.clientWidth,
        height: viewportElement.clientHeight,
      });
    };
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(viewportElement);
    return (): void => observer.disconnect();
  }, [canvasRefs.viewportRef]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion) {
      setSvgPerf({ fps: 0, avgFrameMs: 0, slowFrameRatio: 0 });
      return;
    }
    let frameCount = 0;
    let frameMsSum = 0;
    let slowFrameCount = 0;
    let lastSampleAt = performance.now();
    let lastFrameAt = lastSampleAt;
    let rafId = 0;
    const tick = (now: number): void => {
      const deltaMs = now - lastFrameAt;
      lastFrameAt = now;
      frameCount += 1;
      frameMsSum += deltaMs;
      if (deltaMs > 19) slowFrameCount += 1;

      const sampleElapsedMs = now - lastSampleAt;
      if (sampleElapsedMs >= SVG_PERF_SAMPLE_WINDOW_MS) {
        const measuredFps = Math.round((frameCount * 1000) / sampleElapsedMs);
        const measuredAvgFrameMs = frameCount > 0 ? frameMsSum / frameCount : 0;
        const measuredSlowFrameRatio = frameCount > 0 ? slowFrameCount / frameCount : 0;
        setSvgPerf((previous) => {
          if (
            previous.fps === measuredFps &&
            Math.abs(previous.avgFrameMs - measuredAvgFrameMs) < 0.35 &&
            Math.abs(previous.slowFrameRatio - measuredSlowFrameRatio) < 0.02
          ) {
            return previous;
          }
          return {
            fps: measuredFps,
            avgFrameMs: measuredAvgFrameMs,
            slowFrameRatio: measuredSlowFrameRatio,
          };
        });
        frameCount = 0;
        frameMsSum = 0;
        slowFrameCount = 0;
        lastSampleAt = now;
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return (): void => window.cancelAnimationFrame(rafId);
  }, [prefersReducedMotion]);

  // --- Derived ---
  const configuredFlowIntensity: PathFlowIntensity = graphState.flowIntensity ?? 'medium';
  const effectiveFlowIntensity = React.useMemo<PathFlowIntensity>(() => {
    if (prefersReducedMotion) return 'off';
    if (configuredFlowIntensity === 'off') return 'off';
    const edgeCount = graphState.edges.length;
    if (edgeCount > 1800) return 'off';
    if (edgeCount > 900) return 'low';
    if (edgeCount > 500 && configuredFlowIntensity === 'high') return 'medium';
    return configuredFlowIntensity;
  }, [configuredFlowIntensity, graphState.edges.length, prefersReducedMotion]);

  const nodeById = React.useMemo(
    () => new Map(graphState.nodes.map((node: AiNode) => [node.id, node])),
    [graphState.nodes]
  );

  const getPortValue = React.useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string): unknown => {
      const readRuntimePortValue = (
        bucket: 'inputs' | 'outputs',
        targetNodeId: string,
        targetPort: string
      ): unknown => {
        const source =
          bucket === 'inputs'
            ? runtimeStateContext.runtimeState.inputs
            : runtimeStateContext.runtimeState.outputs;
        const nodeValues = source?.[targetNodeId] ?? {};
        const direct = nodeValues[targetPort];
        if (direct !== undefined) return direct;
        const history = runtimeStateContext.runtimeState.history?.[targetNodeId];
        if (!Array.isArray(history) || history.length === 0) return undefined;
        const lastEntry = history[history.length - 1];
        const fallbackSource = bucket === 'inputs' ? lastEntry?.['inputs'] : lastEntry?.['outputs'];
        if (
          !fallbackSource ||
          typeof fallbackSource !== 'object' ||
          Array.isArray(fallbackSource)
        ) {
          return undefined;
        }
        return fallbackSource[targetPort];
      };

      const bucket = direction === 'input' ? 'inputs' : 'outputs';
      const directValue = readRuntimePortValue(bucket, nodeId, port);
      if (directValue !== undefined) return directValue;

      if (direction === 'input') {
        const incomingValues: unknown[] = [];
        graphState.edges.forEach((edge) => {
          const toNodeId = typeof edge.to === 'string' ? edge.to : null;
          const toPort =
            typeof edge.toPort === 'string' && edge.toPort.trim().length > 0
              ? edge.toPort
              : null;
          if (toNodeId !== nodeId || toPort !== port) return;
          const fromNodeId = typeof edge.from === 'string' ? edge.from : null;
          const fromPort =
            typeof edge.fromPort === 'string' && edge.fromPort.trim().length > 0
              ? edge.fromPort
              : null;
          if (!fromNodeId || !fromPort) return;
          const upstreamValue = readRuntimePortValue('outputs', fromNodeId, fromPort);
          if (upstreamValue !== undefined) {
            incomingValues.push(upstreamValue);
          }
        });
        if (incomingValues.length === 1) return incomingValues[0];
        if (incomingValues.length > 1) return incomingValues;
      }
      return directValue;
    },
    [graphState.edges, runtimeStateContext.runtimeState]
  );

  const getNodeRuntimeData = React.useCallback(
    (
      nodeId: string
    ): {
      inputs: Record<string, unknown> | undefined;
      outputs: Record<string, unknown> | undefined;
    } => {
      const history = runtimeStateContext.runtimeState.history?.[nodeId];
      const lastEntry =
        Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;
      return {
        inputs: mergeRuntimePayload(
          runtimeStateContext.runtimeState.inputs?.[nodeId],
          lastEntry?.['inputs']
        ),
        outputs: mergeRuntimePayload(
          runtimeStateContext.runtimeState.outputs?.[nodeId],
          lastEntry?.['outputs']
        ),
      };
    },
    [runtimeStateContext.runtimeState]
  );

  const getConnectorInfo = React.useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string): ConnectorInfo =>
      buildConnectorInfo({
        direction,
        nodeId,
        port,
        edges: graphState.edges,
        nodeById,
        getPortValue,
        getNodeRuntimeData,
      }),
    [graphState.edges, getNodeRuntimeData, getPortValue, nodeById]
  );

  return {
    view: canvasState.view,
    panState: canvasState.panState,
    dragState: canvasState.dragState,
    lastDrop: canvasState.lastDrop,
    connecting: canvasState.connecting,
    connectingPos: canvasState.connectingPos,
    viewportRef: canvasRefs.viewportRef,
    canvasRef: canvasRefs.canvasRef,
    nodes: graphState.nodes,
    edges: graphState.edges,
    flowIntensity: configuredFlowIntensity,
    runtimeState: runtimeStateContext.runtimeState,
    runtimeNodeStatuses: runtimeStateContext.runtimeNodeStatuses,
    runtimeEvents: runtimeStateContext.runtimeEvents,
    runtimeRunStatus: runtimeStateContext.runtimeRunStatus,
    nodeDurations: runtimeStateContext.nodeDurations,
    fireTrigger: runtimeActions.fireTrigger,
    selectedNodeId: selectionState.selectedNodeId,
    selectedNodeIds: selectionState.selectedNodeIds,
    selectedEdgeId: selectionState.selectedEdgeId,
    selectionToolMode: selectionState.selectionToolMode,
    selectEdge: selectionActions.selectEdge,
    clearNodeSelection: selectionActions.clearNodeSelection,
    setConfigOpen: selectionActions.setConfigOpen,
    edgeRoutingMode,
    setEdgeRoutingMode,
    edgePaths: canvasInteractions.edgePaths,
    handlePointerDownNode: (nodeId, event) => {
      void canvasInteractions.handlePointerDownNode(event, nodeId);
    },
    handlePointerMoveNode: (nodeId, event) => {
      canvasInteractions.handlePointerMoveNode(event, nodeId);
    },
    handlePointerUpNode: (nodeId, event) => {
      canvasInteractions.handlePointerUpNode(event, nodeId);
    },
    consumeSuppressedNodeClick: (nodeId) => {
      return canvasInteractions.consumeSuppressedNodeClick(nodeId);
    },
    handlePanStart: (event) => {
      canvasInteractions.handlePanStart(event);
    },
    handlePanMove: (event) => {
      canvasInteractions.handlePanMove(event);
    },
    handlePanEnd: (event) => {
      canvasInteractions.handlePanEnd(event);
    },
    handleWheel: (event) => {
      canvasInteractions.handleWheel(event);
    },
    handleRemoveEdge: (edgeId) => {
      canvasInteractions.handleRemoveEdge(edgeId);
    },
    handleDisconnectPort: (direction, nodeId, port) => {
      canvasInteractions.handleDisconnectPort(direction, nodeId, port);
    },
    handleStartConnection: (event, node, port) => {
      void canvasInteractions.handleStartConnection(event, node, port);
    },
    handleCompleteConnection: (event, node, port) => {
      canvasInteractions.handleCompleteConnection(event, node, port);
    },
    handleReconnectInput: (event, nodeId, port) => {
      void canvasInteractions.handleReconnectInput(event, nodeId, port);
    },
    handleSelectNode: (nodeId, options) => {
      void canvasInteractions.handleSelectNode(nodeId, options);
    },
    handleDrop: (event) => {
      canvasInteractions.handleDrop(event);
    },
    handleDragOver: (event) => {
      canvasInteractions.handleDragOver(event);
    },
    zoomTo: (targetScale) => {
      canvasInteractions.zoomTo(targetScale);
    },
    fitToNodes: () => {
      canvasInteractions.fitToNodes();
    },
    fitToSelection: () => {
      canvasInteractions.fitToSelection();
    },
    resetView: () => {
      canvasInteractions.resetView();
    },
    centerOnCanvasPoint: (canvasX, canvasY) => {
      canvasInteractions.centerOnCanvasPoint(canvasX, canvasY);
    },
    selectionMarqueeRect: canvasInteractions.selectionMarqueeRect,
    touchLongPressIndicator: canvasInteractions.touchLongPressIndicator,
    ConfirmationModal: canvasInteractions.ConfirmationModal,
    selectedNodeIdSet,
    hoveredConnectorKey,
    setHoveredConnectorKey,
    pinnedConnectorKey,
    setPinnedConnectorKey,
    svgConnectorTooltip,
    setSvgConnectorTooltip,
    svgNodeDiagnosticsTooltip,
    setSvgNodeDiagnosticsTooltip,
    rendererMode: 'svg',
    showMinimap,
    setShowMinimap,
    viewportSize,
    prefersReducedMotion,
    svgPerf,
    effectiveFlowIntensity,
    isSvgRenderer: true,
    nodeById,
    getConnectorInfo,
    getPortValue,
    isPanning: Boolean(canvasState.panState),
    isDraggingNode: Boolean(canvasState.dragState),
    isConnecting: Boolean(canvasState.connecting),
    activeShapeId: selectionState.selectedNodeId ?? null,
    nodeDiagnosticsById,
  };
}
