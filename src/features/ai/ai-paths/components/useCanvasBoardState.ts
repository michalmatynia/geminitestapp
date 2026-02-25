import React from 'react';
import {
  useCanvasState,
  useCanvasRefs,
  useCanvasInteractions,
  useGraphState,
  useRuntimeState,
  useRuntimeActions,
  useSelectionState,
  useSelectionActions,
} from '../context';
import type {
  DataContractNodeIssueSummary,
  AiNode,
  PathFlowIntensity,
} from '@/features/ai/ai-paths/lib';
import type { EdgeRoutingMode } from '../context/hooks/useEdgePaths';
import {
  RENDERER_MODE_STORAGE_KEY,
  EDGE_ROUTING_MODE_STORAGE_KEY,
  MINIMAP_VISIBILITY_STORAGE_KEY,
  type CanvasRendererMode,
  type SvgConnectorTooltipState,
  type SvgNodeDiagnosticsTooltipState,
  SVG_PERF_SAMPLE_WINDOW_MS,
  mergeRuntimePayload,
} from './CanvasBoard.utils';
import { buildConnectorInfo } from './canvas-board-connectors';

export interface UseCanvasBoardStateProps {
  confirmNodeSwitch?: ((nodeId: string) => boolean | Promise<boolean>) | undefined;
  nodeDiagnosticsById?: Record<string, DataContractNodeIssueSummary> | undefined;
}

export function useCanvasBoardState({
  confirmNodeSwitch,
  nodeDiagnosticsById = {},
}: UseCanvasBoardStateProps) {
  // --- Context Hooks ---
  const { view, panState, dragState, lastDrop, connecting, connectingPos } = useCanvasState();
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { nodes, edges, flowIntensity } = useGraphState();
  const {
    runtimeState,
    runtimeNodeStatuses,
    runtimeEvents,
    runtimeRunStatus,
    nodeDurations,
  } = useRuntimeState();
  const { fireTrigger } = useRuntimeActions();
  const { selectedNodeId, selectedNodeIds, selectedEdgeId, selectionToolMode } = useSelectionState();
  const { selectEdge, setConfigOpen } = useSelectionActions();
  
  const [edgeRoutingMode, setEdgeRoutingMode] =
    React.useState<EdgeRoutingMode>('bezier');
  
  const {
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
    centerOnCanvasPoint,
    selectionMarqueeRect,
    touchLongPressIndicator,
    ConfirmationModal,
  } = useCanvasInteractions({
    confirmNodeSwitch,
    edgeRoutingMode,
  });

  const selectedNodeIdSet = React.useMemo(
    (): Set<string> => new Set(selectedNodeIds),
    [selectedNodeIds]
  );

  // --- Local State ---
  const [hoveredConnectorKey, setHoveredConnectorKey] = React.useState<string | null>(null);
  const [pinnedConnectorKey, setPinnedConnectorKey] = React.useState<string | null>(null);
  const [svgConnectorTooltip, setSvgConnectorTooltip] =
    React.useState<SvgConnectorTooltipState | null>(null);
  const [svgNodeDiagnosticsTooltip, setSvgNodeDiagnosticsTooltip] =
    React.useState<SvgNodeDiagnosticsTooltipState | null>(null);
  const [rendererMode, setRendererMode] = React.useState<CanvasRendererMode>('svg');
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
    const storedMode = window.localStorage.getItem(RENDERER_MODE_STORAGE_KEY);
    if (storedMode === 'legacy' || storedMode === 'svg') {
      setRendererMode(storedMode);
    }
    const storedRoutingMode = window.localStorage.getItem(
      EDGE_ROUTING_MODE_STORAGE_KEY
    );
    if (storedRoutingMode === 'bezier' || storedRoutingMode === 'orthogonal') {
      setEdgeRoutingMode(storedRoutingMode);
    }
    const storedMinimapVisibility = window.localStorage.getItem(
      MINIMAP_VISIBILITY_STORAGE_KEY
    );
    if (storedMinimapVisibility === '0') {
      setShowMinimap(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RENDERER_MODE_STORAGE_KEY, rendererMode);
  }, [rendererMode]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(EDGE_ROUTING_MODE_STORAGE_KEY, edgeRoutingMode);
  }, [edgeRoutingMode]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      MINIMAP_VISIBILITY_STORAGE_KEY,
      showMinimap ? '1' : '0'
    );
  }, [showMinimap]);

  React.useEffect(() => {
    if (rendererMode !== 'svg' && svgConnectorTooltip !== null) {
      setSvgConnectorTooltip(null);
    }
  }, [rendererMode, svgConnectorTooltip]);

  React.useEffect(() => {
    if (rendererMode !== 'svg' && svgNodeDiagnosticsTooltip !== null) {
      setSvgNodeDiagnosticsTooltip(null);
    }
  }, [rendererMode, svgNodeDiagnosticsTooltip]);

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
    const viewportElement = viewportRef.current;
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
  }, [viewportRef]);

  const isSvgRenderer = rendererMode === 'svg';

  React.useEffect(() => {
    if (!isSvgRenderer || typeof window === 'undefined' || prefersReducedMotion) {
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
        const measuredSlowFrameRatio =
          frameCount > 0 ? slowFrameCount / frameCount : 0;
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
  }, [prefersReducedMotion, isSvgRenderer]);

  // --- Derived ---
  const configuredFlowIntensity: PathFlowIntensity = flowIntensity ?? 'medium';
  const effectiveFlowIntensity = React.useMemo<PathFlowIntensity>(() => {
    if (prefersReducedMotion) return 'off';
    if (configuredFlowIntensity === 'off') return 'off';
    const edgeCount = edges.length;
    if (edgeCount > 1800) return 'off';
    if (edgeCount > 900) return 'low';
    if (edgeCount > 500 && configuredFlowIntensity === 'high') return 'medium';
    return configuredFlowIntensity;
  }, [configuredFlowIntensity, edges.length, prefersReducedMotion]);

  const nodeById = React.useMemo(
    () => new Map(nodes.map((node: AiNode) => [node.id, node])),
    [nodes]
  );

  const getPortValue = React.useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string): unknown => {
      const readRuntimePortValue = (
        bucket: 'inputs' | 'outputs',
        targetNodeId: string,
        targetPort: string
      ): unknown => {
        const source = bucket === 'inputs' ? runtimeState.inputs : runtimeState.outputs;
        const nodeValues = source?.[targetNodeId] ?? {};
        const direct = nodeValues[targetPort];
        if (direct !== undefined) return direct;
        const history = runtimeState.history?.[targetNodeId];
        if (!Array.isArray(history) || history.length === 0) return undefined;
        const lastEntry = history[history.length - 1];
        const fallbackSource =
          bucket === 'inputs' ? lastEntry?.['inputs'] : lastEntry?.['outputs'];
        if (
          !fallbackSource ||
          typeof fallbackSource !== 'object' ||
          Array.isArray(fallbackSource)
        ) {
          return undefined;
        }
        return fallbackSource?.[targetPort];
      };

      const bucket = direction === 'input' ? 'inputs' : 'outputs';
      const directValue = readRuntimePortValue(bucket, nodeId, port);
      if (directValue !== undefined) return directValue;

      if (direction === 'input') {
        const incomingValues: unknown[] = [];
        edges.forEach((edge) => {
          const toNodeId = typeof edge.to === 'string' ? edge.to : null;
          const toPort = typeof edge.toPort === 'string' && edge.toPort.trim().length > 0
            ? edge.toPort
            : typeof edge.targetHandle === 'string' && edge.targetHandle.trim().length > 0
              ? edge.targetHandle
              : null;
          if (toNodeId !== nodeId || toPort !== port) return;
          const fromNodeId = typeof edge.from === 'string' ? edge.from : null;
          const fromPort =
            typeof edge.fromPort === 'string' && edge.fromPort.trim().length > 0
              ? edge.fromPort
              : typeof edge.sourceHandle === 'string' && edge.sourceHandle.trim().length > 0
                ? edge.sourceHandle
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
    [edges, runtimeState]
  );

  const getNodeRuntimeData = React.useCallback(
    (nodeId: string): {
      inputs: Record<string, unknown> | undefined;
      outputs: Record<string, unknown> | undefined;
    } => {
      const history = runtimeState.history?.[nodeId];
      const lastEntry =
        Array.isArray(history) && history.length > 0
          ? history[history.length - 1]
          : null;
      return {
        inputs: mergeRuntimePayload(runtimeState.inputs?.[nodeId], lastEntry?.['inputs']),
        outputs: mergeRuntimePayload(runtimeState.outputs?.[nodeId], lastEntry?.['outputs']),
      };
    },
    [runtimeState.history, runtimeState.inputs, runtimeState.outputs]
  );

  const getConnectorInfo = React.useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string) =>
      buildConnectorInfo({
        direction,
        nodeId,
        port,
        edges,
        nodeById,
        getPortValue,
        getNodeRuntimeData,
      }),
    [edges, getNodeRuntimeData, getPortValue, nodeById]
  );

  return {
    view, panState, dragState, lastDrop, connecting, connectingPos,
    viewportRef, canvasRef,
    nodes, edges, flowIntensity,
    runtimeState, runtimeNodeStatuses, runtimeEvents, runtimeRunStatus, nodeDurations,
    fireTrigger,
    selectedNodeId, selectedNodeIds, selectedEdgeId, selectionToolMode,
    selectEdge, setConfigOpen,
    edgeRoutingMode, setEdgeRoutingMode,
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
    centerOnCanvasPoint,
    selectionMarqueeRect,
    touchLongPressIndicator,
    ConfirmationModal,
    selectedNodeIdSet,
    hoveredConnectorKey, setHoveredConnectorKey,
    pinnedConnectorKey, setPinnedConnectorKey,
    svgConnectorTooltip, setSvgConnectorTooltip,
    svgNodeDiagnosticsTooltip, setSvgNodeDiagnosticsTooltip,
    rendererMode, setRendererMode,
    showMinimap, setShowMinimap,
    viewportSize,
    prefersReducedMotion,
    svgPerf,
    effectiveFlowIntensity,
    isSvgRenderer,
    nodeById,
    getConnectorInfo,
  };
}
