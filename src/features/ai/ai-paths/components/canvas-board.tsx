import React from 'react';

import type { AiNode, PathFlowIntensity, Edge } from '@/features/ai/ai-paths/lib';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  PORT_SIZE,
  getPortOffsetY,
  formatDurationMs,
  typeStyles,
  validateConnection,
} from '@/features/ai/ai-paths/lib';
import { Button, Tooltip, Badge } from '@/shared/ui';

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
import {
  buildConnectorInfo,
  renderConnectorTooltip,
} from './canvas-board-connectors';
import { useCanvasPulseEffects } from './canvas-board-pulse-effects';
import { CanvasMinimap } from './canvas-minimap';
import { CanvasSvgEdgeLayer } from './canvas-svg-edge-layer';
import { CanvasSvgNodeLayer } from './canvas-svg-node-layer';
import { NodeProcessingDots } from './NodeProcessingDots';
import { formatPortLabel } from '../utils/ui-utils';

import type { EdgePath, EdgeRoutingMode } from '../context/hooks/useEdgePaths';

const DEFAULT_NODE_NOTE_COLOR = '#f5e7c3';
type CanvasRendererMode = 'legacy' | 'svg';
type SvgDetailLevel = 'full' | 'compact' | 'skeleton';
const RENDERER_MODE_STORAGE_KEY = 'ai-paths:canvas-renderer-mode';
const EDGE_ROUTING_MODE_STORAGE_KEY = 'ai-paths:canvas-edge-routing-mode';
const MINIMAP_VISIBILITY_STORAGE_KEY = 'ai-paths:canvas-minimap-visible';
const SVG_CULL_PADDING = 260;
const SVG_EDGE_CULL_PADDING = 160;
const SVG_PERF_SAMPLE_WINDOW_MS = 1200;

export type CanvasBoardConnectorTooltipOverrideInput = {
  direction: 'input' | 'output';
  node: AiNode;
  port: string;
};

export type CanvasBoardConnectorTooltipOverride = {
  content: React.ReactNode;
  maxWidth?: string | undefined;
};

type CanvasBoardProps = {
  /** Optional class name for the viewport container */
  viewportClassName?: string | undefined;
  confirmNodeSwitch?: ((nodeId: string) => boolean | Promise<boolean>) | undefined;
  resolveConnectorTooltip?:
    | ((
        input: CanvasBoardConnectorTooltipOverrideInput
      ) => CanvasBoardConnectorTooltipOverride | null | undefined)
    | undefined;
};

const formatRuntimeStatusLabel = (status: string): string =>
  status
    .split('_')
    .map((part: string) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
    .join(' ');

const runtimeStatusBadgeClassName = (status: string): string => {
  if (status === 'completed') {
    return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200';
  }
  if (status === 'cached') {
    return 'border-teal-400/60 bg-teal-500/15 text-teal-200';
  }
  if (status === 'failed' || status === 'canceled' || status === 'timeout') {
    return 'border-rose-500/60 bg-rose-500/15 text-rose-200';
  }
  if (status === 'queued') {
    return 'border-amber-500/60 bg-amber-500/15 text-amber-200';
  }
  if (
    status === 'running' ||
    status === 'polling' ||
    status === 'paused' ||
    status === 'waiting_callback' ||
    status === 'advance_pending'
  ) {
    return 'border-sky-500/60 bg-sky-500/15 text-sky-200';
  }
  return 'border-border bg-card/60 text-gray-200';
};

const BLOCKER_PROCESSING_STATUSES = new Set<string>([
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

const downgradeDetailLevel = (level: SvgDetailLevel): SvgDetailLevel => {
  if (level === 'full') return 'compact';
  if (level === 'compact') return 'skeleton';
  return 'skeleton';
};

const buildConnectingPreviewPath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  routingMode: EdgeRoutingMode
): string => {
  if (routingMode === 'orthogonal') {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 28) {
      const directionY = dy >= 0 ? 1 : -1;
      const bendY = fromY + (absDy < 56 ? 24 * directionY : dy * 0.5);
      return `M ${fromX} ${fromY} L ${fromX} ${bendY} L ${toX} ${bendY} L ${toX} ${toY}`;
    }
    const directionX = dx >= 0 ? 1 : -1;
    const bendX = fromX + (absDx < 84 ? 34 * directionX : dx * 0.5);
    return `M ${fromX} ${fromY} L ${bendX} ${fromY} L ${bendX} ${toY} L ${toX} ${toY}`;
  }
  const midX = fromX + (toX - fromX) * 0.5;
  return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
};

export function CanvasBoard({
  viewportClassName,
  confirmNodeSwitch,
  resolveConnectorTooltip,
}: CanvasBoardProps): React.JSX.Element {
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

  // --- Local State & Refs ---
  const [hoveredConnectorKey, setHoveredConnectorKey] = React.useState<string | null>(null);
  const [pinnedConnectorKey, setPinnedConnectorKey] = React.useState<string | null>(null);
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

  // --- Constants & Derived ---
  const FLOW_ANIMATION_MS = 1600; const NODE_PULSE_MS = 1400;
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
  const flowEnabled = effectiveFlowIntensity !== 'off';
  const flowingIntensity =
    effectiveFlowIntensity === 'off' ? 'low' : effectiveFlowIntensity;
  const useSvgRenderer = rendererMode === 'svg';

  React.useEffect(() => {
    if (!useSvgRenderer || typeof window === 'undefined' || prefersReducedMotion) {
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
  }, [prefersReducedMotion, useSvgRenderer]);

  // --- Derived from Context ---
  const connectingFromNode = React.useMemo<AiNode | null>(() => {
    if (!connecting?.fromNodeId) return null;
    return nodes.find((node) => node.id === connecting.fromNodeId) ?? null;
  }, [nodes, connecting?.fromNodeId]);

  const flowStyle = React.useMemo<React.CSSProperties>(() => {
    switch (effectiveFlowIntensity) {
      case 'off':
        return {
          '--ai-paths-flow-duration': '0s',
          '--ai-paths-flow-opacity': '0',
          '--ai-paths-flow-dash': '0 0',
          '--ai-paths-flow-glow': '0px',
        };
      case 'low':
        return {
          '--ai-paths-flow-duration': '1.6s',
          '--ai-paths-flow-opacity': '0.45',
          '--ai-paths-flow-dash': '8 10',
          '--ai-paths-flow-glow': '2px',
        };
      case 'high':
        return {
          '--ai-paths-flow-duration': '0.55s',
          '--ai-paths-flow-opacity': '1',
          '--ai-paths-flow-dash': '4 4',
          '--ai-paths-flow-glow': '10px',
        };
      case 'medium':
      default:
        return {
          '--ai-paths-flow-duration': '0.9s',
          '--ai-paths-flow-opacity': '0.9',
          '--ai-paths-flow-dash': '6 6',
          '--ai-paths-flow-glow': '6px',
        };
    }
  }, [effectiveFlowIntensity]);

  const buildConnectorKey = (
    direction: 'input' | 'output',
    nodeId: string,
    port: string
  ): string => `${direction}:${nodeId}:${port}`;
  const buildEdgePortKey = React.useCallback(
    (nodeId: string, port: string): string => `${nodeId}:${port}`,
    []
  );

  const getPortValue = React.useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string): unknown => {
      const source = direction === 'input' ? runtimeState.inputs : runtimeState.outputs;
      const nodeValues = source?.[nodeId] ?? {};
      const directValue = nodeValues[port];
      if (directValue !== undefined) return directValue;
      const history = runtimeState.history?.[nodeId];
      if (!Array.isArray(history) || history.length === 0) return directValue;
      const lastEntry = history[history.length - 1];
      const fallbackSource =
        direction === 'input' ? lastEntry?.inputs : lastEntry?.outputs;
      return fallbackSource?.[port];
    },
    [runtimeState]
  );

  const getNodeRuntimeData = React.useCallback(
    (nodeId: string): {
      inputs: Record<string, unknown> | undefined;
      outputs: Record<string, unknown> | undefined;
    } => ({
      inputs: runtimeState.inputs[nodeId],
      outputs: runtimeState.outputs[nodeId],
    }),
    [runtimeState.inputs, runtimeState.outputs]
  );

  const nodeById = React.useMemo(
    () => new Map(nodes.map((node: AiNode) => [node.id, node])),
    [nodes]
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
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        queue.push(neighbor);
      });
    }
    return visited;
  }, [nodes, edges]);

  const edgeMetaMap = React.useMemo(
    (): Map<string, Edge> => new Map(edges.map((edge) => [edge.id, edge])),
    [edges]
  );
  const edgesByFromPort = React.useMemo(() => {
    const map = new Map<string, Edge[]>();
    edges.forEach((edge) => {
      if (!edge.from || !edge.fromPort) return;
      const key = buildEdgePortKey(edge.from, edge.fromPort);
      const list = map.get(key) ?? [];
      list.push(edge);
      map.set(key, list);
    });
    return map;
  }, [edges, buildEdgePortKey]);
  const edgesByToPort = React.useMemo(() => {
    const map = new Map<string, Edge[]>();
    edges.forEach((edge) => {
      if (!edge.to || !edge.toPort) return;
      const key = buildEdgePortKey(edge.to, edge.toPort);
      const list = map.get(key) ?? [];
      list.push(edge);
      map.set(key, list);
    });
    return map;
  }, [edges, buildEdgePortKey]);
  const incomingEdgeIdsByNode = React.useMemo((): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (!edge.to) return;
      const list = map.get(edge.to) ?? [];
      list.push(edge.id);
      map.set(edge.to, list);
    });
    return map;
  }, [edges]);
  const outgoingEdgeIdsByNode = React.useMemo((): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (!edge.from) return;
      const list = map.get(edge.from) ?? [];
      list.push(edge.id);
      map.set(edge.from, list);
    });
    return map;
  }, [edges]);

  const { activeEdgeIds, inputPulseNodes, outputPulseNodes } = useCanvasPulseEffects({
    nodes,
    edges,
    runtimeEvents,
    runtimeState: {
      inputs: runtimeState.inputs,
      outputs: runtimeState.outputs,
    },
    getPortValue,
    edgesByFromPort,
    edgesByToPort,
    incomingEdgeIdsByNode,
    outgoingEdgeIdsByNode,
    buildEdgePortKey,
    nodeById,
    flowAnimationMs: FLOW_ANIMATION_MS,
    nodePulseMs: NODE_PULSE_MS,
  });
  const svgWorldViewport = React.useMemo(() => {
    if (!viewportSize) return null;
    const minX = (-view.x) / view.scale - SVG_CULL_PADDING;
    const minY = (-view.y) / view.scale - SVG_CULL_PADDING;
    const maxX = (-view.x + viewportSize.width) / view.scale + SVG_CULL_PADDING;
    const maxY = (-view.y + viewportSize.height) / view.scale + SVG_CULL_PADDING;
    return { minX, minY, maxX, maxY };
  }, [view.scale, view.x, view.y, viewportSize]);
  const svgEdgeViewport = React.useMemo(() => {
    if (!svgWorldViewport) return null;
    return {
      minX: svgWorldViewport.minX - SVG_EDGE_CULL_PADDING,
      minY: svgWorldViewport.minY - SVG_EDGE_CULL_PADDING,
      maxX: svgWorldViewport.maxX + SVG_EDGE_CULL_PADDING,
      maxY: svgWorldViewport.maxY + SVG_EDGE_CULL_PADDING,
    };
  }, [svgWorldViewport]);
  const svgVisibleNodeIdSet = React.useMemo(() => {
    if (!svgWorldViewport) return new Set(nodes.map((node: AiNode) => node.id));
    const visible = new Set<string>();
    nodes.forEach((node: AiNode) => {
      const left = node.position.x;
      const top = node.position.y;
      const right = node.position.x + NODE_WIDTH;
      const bottom = node.position.y + NODE_MIN_HEIGHT;
      if (
        right >= svgWorldViewport.minX &&
        left <= svgWorldViewport.maxX &&
        bottom >= svgWorldViewport.minY &&
        top <= svgWorldViewport.maxY
      ) {
        visible.add(node.id);
      }
    });
    selectedNodeIdSet.forEach((nodeId: string) => {
      visible.add(nodeId);
    });
    return visible;
  }, [nodes, selectedNodeIdSet, svgWorldViewport]);
  const renderedEdgePaths = React.useMemo((): EdgePath[] => {
    if (!useSvgRenderer) return edgePaths;
    return (edgePaths).filter((edgePath: EdgePath): boolean => {
      if (!edgeMetaMap.has(edgePath.id)) return true;
      const fromNodeId = edgePath.fromNodeId;
      const toNodeId = edgePath.toNodeId;
      if (selectedEdgeId === edgePath.id) return true;
      if (selectedNodeIdSet.has(fromNodeId) || selectedNodeIdSet.has(toNodeId)) return true;
      if (activeEdgeIds.has(edgePath.id)) return true;
      if (svgEdgeViewport) {
        const bounds = edgePath.bounds;
        if (
          bounds.maxX >= svgEdgeViewport.minX &&
          bounds.minX <= svgEdgeViewport.maxX &&
          bounds.maxY >= svgEdgeViewport.minY &&
          bounds.minY <= svgEdgeViewport.maxY
        ) {
          return true;
        }
      }
      const fromVisible = svgVisibleNodeIdSet.has(fromNodeId);
      const toVisible = svgVisibleNodeIdSet.has(toNodeId);
      if (fromVisible && toVisible) return true;
      return false;
    });
  }, [
    activeEdgeIds,
    edgeMetaMap,
    edgePaths,
    selectedEdgeId,
    selectedNodeIdSet,
    svgEdgeViewport,
    svgVisibleNodeIdSet,
    useSvgRenderer,
  ]);
  const svgDetailLevel = React.useMemo((): SvgDetailLevel => {
    let next: SvgDetailLevel =
      view.scale < 0.52 ? 'skeleton' : view.scale < 0.8 ? 'compact' : 'full';
    if (svgVisibleNodeIdSet.size > 220 || renderedEdgePaths.length > 720) {
      next = downgradeDetailLevel(next);
    }
    if (svgPerf.fps > 0 && (svgPerf.fps < 46 || svgPerf.slowFrameRatio > 0.35)) {
      next = downgradeDetailLevel(next);
    }
    return next;
  }, [
    renderedEdgePaths.length,
    svgPerf.fps,
    svgPerf.slowFrameRatio,
    svgVisibleNodeIdSet.size,
    view.scale,
  ]);
  const wireFlowEnabled = React.useMemo((): boolean => {
    if (!flowEnabled) return false;
    if (!useSvgRenderer) return true;
    if (svgDetailLevel === 'skeleton') return false;
    if (svgPerf.fps > 0 && svgPerf.fps < 34) return false;
    if (svgPerf.slowFrameRatio > 0.55) return false;
    return true;
  }, [
    flowEnabled,
    svgDetailLevel,
    svgPerf.fps,
    svgPerf.slowFrameRatio,
    useSvgRenderer,
  ]);
  const svgReduceEdgeEffects = React.useMemo((): boolean => {
    if (!useSvgRenderer) return false;
    if (svgDetailLevel === 'skeleton') return true;
    if (renderedEdgePaths.length > 780) return true;
    if (svgPerf.fps > 0 && svgPerf.fps < 40) return true;
    if (svgPerf.slowFrameRatio > 0.42) return true;
    return false;
  }, [
    renderedEdgePaths.length,
    svgDetailLevel,
    svgPerf.fps,
    svgPerf.slowFrameRatio,
    useSvgRenderer,
  ]);
  const svgEnableNodeAnimations = React.useMemo((): boolean => {
    if (!useSvgRenderer) return true;
    if (prefersReducedMotion) return false;
    if (svgDetailLevel === 'skeleton') return false;
    if (svgPerf.fps > 0 && svgPerf.fps < 38) return false;
    if (svgPerf.slowFrameRatio > 0.45) return false;
    return true;
  }, [
    prefersReducedMotion,
    svgDetailLevel,
    svgPerf.fps,
    svgPerf.slowFrameRatio,
    useSvgRenderer,
  ]);
  const svgConnectorHitTargetPx = React.useMemo((): number => {
    if (!useSvgRenderer) return 14;
    if (svgDetailLevel === 'skeleton') return 22;
    if (view.scale < 0.72) return 18;
    return 14;
  }, [svgDetailLevel, useSvgRenderer, view.scale]);
  const svgCulledNodeCount = useSvgRenderer
    ? Math.max(0, nodes.length - svgVisibleNodeIdSet.size)
    : 0;
  const svgCulledEdgeCount = useSvgRenderer
    ? Math.max(0, edges.length - renderedEdgePaths.length)
    : 0;
  const flowModeLabel = (() => {
    if (wireFlowEnabled) return effectiveFlowIntensity;
    if (useSvgRenderer && flowEnabled) return 'adaptive-off';
    return 'off';
  })();
  const touchLongPressProgressDegrees = touchLongPressIndicator
    ? Math.round(Math.max(0, Math.min(1, touchLongPressIndicator.progress)) * 360)
    : 0;
  const hasNodeSelection = selectedNodeIdSet.size > 0 || Boolean(selectedNodeId);
  const canvasCursorClass = panState
    ? 'cursor-grabbing'
    : selectionToolMode === 'select'
      ? 'cursor-crosshair'
      : 'cursor-grab';

  return (
    <div
      ref={viewportRef}
      className={`relative min-h-[672px] rounded-lg border bg-card/70 backdrop-blur overflow-hidden overscroll-contain ${
        canvasCursorClass
      } ${viewportClassName ?? ''}`}
      style={flowStyle}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPointerDown={handlePanStart}
      onPointerMove={handlePanMove}
      onPointerUp={handlePanEnd}
      onPointerLeave={handlePanEnd}
      onPointerCancel={handlePanEnd}
    >
      <div className='absolute bottom-3 left-3 z-10 rounded-md border border-border/60 bg-card/30 p-2 text-[11px] text-gray-400'>
        Nodes: {nodes.length}
        {` • Edges: ${edges.length}`}
        {lastDrop ? ` • Last drop: ${Math.round(lastDrop.x)}, ${Math.round(lastDrop.y)}` : ''}
        {` • View: ${Math.round(view.x)}, ${Math.round(view.y)} @ ${Math.round(view.scale * 100)}%`}
        {` • Renderer: ${useSvgRenderer ? 'SVG' : 'Legacy'}`}
        {useSvgRenderer
          ? ` • Visible: ${svgVisibleNodeIdSet.size} nodes / ${renderedEdgePaths.length} wires`
          : ''}
        {useSvgRenderer
          ? ` • Culled: ${svgCulledNodeCount} nodes / ${svgCulledEdgeCount} wires`
          : ''}
        {useSvgRenderer ? ` • Detail: ${svgDetailLevel}` : ''}
        {useSvgRenderer && svgPerf.fps > 0
          ? ` • FPS: ${svgPerf.fps} (${svgPerf.avgFrameMs.toFixed(1)}ms)`
          : ''}
        {` • Routing: ${edgeRoutingMode}`}
        {` • Flow: ${flowModeLabel}`}
      </div>
      <div className='absolute bottom-4 right-4 z-10 rounded-md border border-border/60 bg-card/30 p-2 text-xs text-gray-300'>
        <div className='mb-2 text-[11px] uppercase text-gray-500'>View Controls</div>
        <div className='flex items-center gap-2'>
          <Button
            className='h-7 w-7 rounded-full border text-xs text-white hover:bg-muted/60'
            type='button'
            variant='ghost'
            size='xs'
            onClick={() => zoomTo(view.scale - 0.1)}
          >
            -
          </Button>
          <span className='min-w-[56px] text-center text-[11px] text-gray-300'>
            {Math.round(view.scale * 100)}%
          </span>
          <Button
            className='h-7 w-7 rounded-full border text-xs text-white hover:bg-muted/60'
            type='button'
            variant='ghost'
            size='xs'
            onClick={() => zoomTo(view.scale + 0.1)}
          >
            +
          </Button>
          <Button
            className='h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60'
            type='button'
            variant='ghost'
            size='xs'
            onClick={fitToNodes}
          >
            Fit
          </Button>
          <Button
            className='h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60 disabled:opacity-40 disabled:hover:bg-transparent'
            type='button'
            variant='ghost'
            size='xs'
            onClick={fitToSelection}
            disabled={!hasNodeSelection}
          >
            Sel
          </Button>
          <Button
            className='h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60'
            type='button'
            variant='ghost'
            size='xs'
            onClick={resetView}
          >
            Reset
          </Button>
          {useSvgRenderer ? (
            <Button
              className={`h-7 rounded-full border px-2 text-[11px] ${
                showMinimap ? 'border-sky-400/70 text-sky-200' : 'text-gray-300'
              } hover:bg-muted/60`}
              type='button'
              variant='ghost'
              size='xs'
              aria-pressed={showMinimap}
              onClick={() => setShowMinimap((current) => !current)}
            >
              Minimap
            </Button>
          ) : null}
          <div className='ml-2 flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-1 py-1'>
            <Button
              className={`h-6 rounded-full px-2 text-[10px] ${
                useSvgRenderer ? 'border-sky-400/70 text-sky-200' : 'text-gray-300'
              }`}
              type='button'
              variant='ghost'
              size='xs'
              onClick={() => setRendererMode('svg')}
            >
              SVG
            </Button>
            <Button
              className={`h-6 rounded-full px-2 text-[10px] ${
                !useSvgRenderer ? 'border-sky-400/70 text-sky-200' : 'text-gray-300'
              }`}
              type='button'
              variant='ghost'
              size='xs'
              onClick={() => setRendererMode('legacy')}
            >
              Legacy
            </Button>
          </div>
          <div className='ml-1 flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-1 py-1'>
            <Button
              className={`h-6 rounded-full px-2 text-[10px] ${
                edgeRoutingMode === 'bezier'
                  ? 'border-emerald-400/70 text-emerald-200'
                  : 'text-gray-300'
              }`}
              type='button'
              variant='ghost'
              size='xs'
              onClick={() => setEdgeRoutingMode('bezier')}
            >
              Curve
            </Button>
            <Button
              className={`h-6 rounded-full px-2 text-[10px] ${
                edgeRoutingMode === 'orthogonal'
                  ? 'border-emerald-400/70 text-emerald-200'
                  : 'text-gray-300'
              }`}
              type='button'
              variant='ghost'
              size='xs'
              onClick={() => setEdgeRoutingMode('orthogonal')}
            >
              Ortho
            </Button>
          </div>
        </div>
      </div>
      {useSvgRenderer && showMinimap ? (
        <CanvasMinimap
          nodes={nodes}
          edgePaths={edgePaths}
          selectedNodeIdSet={selectedNodeIdSet}
          view={view}
          viewportSize={viewportSize}
          onNavigate={centerOnCanvasPoint}
          onZoomTo={zoomTo}
        />
      ) : null}
      {selectionMarqueeRect ? (
        <div
          className='pointer-events-none absolute z-30 rounded-md border border-sky-300/80 bg-sky-500/15'
          style={{
            left: selectionMarqueeRect.x,
            top: selectionMarqueeRect.y,
            width: selectionMarqueeRect.width,
            height: selectionMarqueeRect.height,
          }}
        />
      ) : null}
      {touchLongPressIndicator ? (
        <div
          className='pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2'
          style={{
            left: touchLongPressIndicator.x,
            top: touchLongPressIndicator.y,
          }}
        >
          <span
            className='relative block h-11 w-11 rounded-full'
            style={{
              background: `conic-gradient(${
                touchLongPressIndicator.phase === 'activated'
                  ? 'rgba(52,211,153,0.96)'
                  : 'rgba(56,189,248,0.94)'
              } ${touchLongPressProgressDegrees}deg, rgba(15,23,42,0.3) 0deg)`,
            }}
          >
            {touchLongPressIndicator.phase === 'activated' ? (
              <span className='absolute inset-0 rounded-full border border-emerald-300/60 animate-ping' />
            ) : null}
            <span
              className={`absolute inset-[4px] rounded-full border ${
                touchLongPressIndicator.phase === 'activated'
                  ? 'border-emerald-200/90 bg-emerald-400/20'
                  : 'border-sky-200/80 bg-sky-500/15'
              }`}
            />
            <span
              className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                touchLongPressIndicator.phase === 'activated'
                  ? 'bg-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.75)]'
                  : 'bg-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
              }`}
            />
          </span>
        </div>
      ) : null}
      <div
        ref={canvasRef}
        className='absolute left-0 top-0'
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          transformOrigin: '0 0',
          willChange: useSvgRenderer ? 'transform' : undefined,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.18) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        {lastDrop ? (
          <div
            className='absolute pointer-events-none'
            style={{
              width: 10,
              height: 10,
              transform: `translate(${lastDrop.x}px, ${lastDrop.y}px)`,
            }}
          >
            <span className='absolute inset-0 rounded-full bg-sky-400/40 animate-ping' />
            <div className='absolute inset-0 rounded-full border border-sky-300/70 bg-sky-500/60 shadow-[0_0_8px_rgba(56,189,248,0.5)]' />
          </div>
        ) : null}
        <svg
          className='absolute inset-0'
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ pointerEvents: 'auto' }}
        >
          <defs>
            <filter id='signal-dot-glow' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='2' result='blur' />
              <feMerge>
                <feMergeNode in='blur' />
                <feMergeNode in='SourceGraphic' />
              </feMerge>
            </filter>
          </defs>
          <CanvasSvgEdgeLayer
            edgePaths={renderedEdgePaths}
            edgeMetaMap={edgeMetaMap}
            nodeById={nodeById}
            viewScale={view.scale}
            selectedEdgeId={selectedEdgeId}
            selectedNodeIdSet={selectedNodeIdSet}
            activeEdgeIds={activeEdgeIds}
            triggerConnected={triggerConnected}
            wireFlowEnabled={wireFlowEnabled}
            flowingIntensity={flowingIntensity}
            reduceVisualEffects={svgReduceEdgeEffects}
            onRemoveEdge={handleRemoveEdge}
            onSelectEdge={(edgeId: string) => selectEdge(edgeId)}
          />
          {connecting && connectingPos ? ((): React.JSX.Element => {
            const fromX = connecting.start.x;
            const fromY = connecting.start.y;
            const toX = connectingPos.x;
            const toY = connectingPos.y;
            const path = buildConnectingPreviewPath(
              fromX,
              fromY,
              toX,
              toY,
              edgeRoutingMode
            );
            return (
              <path
                d={path}
                stroke='rgba(56,189,248,0.55)'
                strokeWidth='1.6'
                fill='none'
              />
            );
          })() : null}
          {useSvgRenderer ? (
            <CanvasSvgNodeLayer
              nodes={nodes}
              edges={edges}
              view={view}
              viewportSize={viewportSize}
              cullPadding={SVG_CULL_PADDING}
              detailLevel={svgDetailLevel}
              selectedNodeId={selectedNodeId}
              selectedNodeIdSet={selectedNodeIdSet}
              runtimeState={runtimeState}
              runtimeNodeStatuses={runtimeNodeStatuses}
              runtimeRunStatus={runtimeRunStatus}
              nodeDurations={nodeDurations}
              inputPulseNodes={inputPulseNodes}
              outputPulseNodes={outputPulseNodes}
              triggerConnected={triggerConnected}
              enableNodeAnimations={svgEnableNodeAnimations}
              connectorHitTargetPx={svgConnectorHitTargetPx}
              connecting={
                connecting
                  ? { fromNodeId: connecting.fromNodeId, fromPort: connecting.fromPort }
                  : null
              }
              connectingFromNode={connectingFromNode}
              hoveredConnectorKey={hoveredConnectorKey}
              pinnedConnectorKey={pinnedConnectorKey}
              setHoveredConnectorKey={setHoveredConnectorKey}
              setPinnedConnectorKey={setPinnedConnectorKey}
              onPointerDownNode={handlePointerDownNode}
              onPointerMoveNode={handlePointerMoveNode}
              onPointerUpNode={handlePointerUpNode}
              onSelectNode={handleSelectNode}
              onOpenNodeConfig={() => setConfigOpen(true)}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onReconnectInput={handleReconnectInput}
              onDisconnectPort={handleDisconnectPort}
              onFireTrigger={(node: AiNode) => {
                void fireTrigger(node);
              }}
            />
          ) : null}
        </svg>

        {!useSvgRenderer
          ? nodes.map((node) => {
            const isSelected = selectedNodeIdSet.has(node.id);
            const isPrimarySelected = node.id === selectedNodeId;
            const style = typeStyles[node.type] ?? typeStyles.template;
            const canUsePersistedStatusFallback = runtimeRunStatus !== 'idle';
            const statusFromRuntimeState = runtimeState.outputs[node.id]?.['status'];
            const runtimeNodeStatusRaw =
            runtimeNodeStatuses?.[node.id] ??
            (canUsePersistedStatusFallback && typeof statusFromRuntimeState === 'string'
              ? statusFromRuntimeState
              : null);
            const runtimeNodeStatus =
            typeof runtimeNodeStatusRaw === 'string' && runtimeNodeStatusRaw.trim().length > 0
              ? runtimeNodeStatusRaw.trim().toLowerCase()
              : null;
            const runtimeNodeStatusLabel = runtimeNodeStatus
              ? formatRuntimeStatusLabel(runtimeNodeStatus)
              : null;
            const iteratorOutput =
            node.type === 'iterator'
              ? runtimeState.outputs[node.id]
              : undefined;
            const iteratorStatus = (iteratorOutput?.['status'] as string | undefined) ?? null;
            const iteratorIndex =
            typeof iteratorOutput?.['index'] === 'number' ? (iteratorOutput?.['index']) : null;
            const iteratorTotal =
            typeof iteratorOutput?.['total'] === 'number' ? (iteratorOutput?.['total']) : null;
            const iteratorDone =
            typeof iteratorOutput?.['done'] === 'boolean' ? (iteratorOutput?.['done']) : null;
            const iteratorProgressLabel =
            iteratorIndex !== null && iteratorTotal !== null && iteratorTotal > 0
              ? `${Math.min(iteratorIndex + 1, iteratorTotal)}/${iteratorTotal}`
              : iteratorTotal !== null && iteratorTotal === 0
                ? '0/0'
                : null;
            const iteratorStatusClasses =
            iteratorStatus === 'completed' || iteratorDone
              ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
              : iteratorStatus === 'advance_pending'
                ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                : iteratorStatus === 'waiting_callback'
                  ? 'border-sky-500/60 bg-sky-500/15 text-sky-200'
                  : 'border-border bg-card/60 text-gray-200';
            const blockerNodeStatus =
            node.type === 'model' ||
            node.type === 'agent' ||
            node.type === 'learner_agent' ||
            node.type === 'poll' ||
            node.type === 'delay'
              ? runtimeNodeStatus
              : undefined;
            const isBlockerProcessing =
            flowEnabled &&
            !!blockerNodeStatus &&
            BLOCKER_PROCESSING_STATUSES.has(blockerNodeStatus);
            const noteConfig = node.config?.notes;
            const noteText = typeof noteConfig?.text === 'string' ? noteConfig.text.trim() : '';
            const noteColor =
            typeof noteConfig?.color === 'string' && noteConfig.color.trim()
              ? noteConfig.color.trim()
              : DEFAULT_NODE_NOTE_COLOR;
            const showNote = Boolean(noteConfig?.showOnCanvas && noteText);
            const isScheduledTrigger =
            node.type === 'trigger' && node.config?.trigger?.event === 'scheduled_run';
            const isInputPulse = inputPulseNodes.has(node.id);
            const isOutputPulse = outputPulseNodes.has(node.id);
            const isDragging = dragState?.nodeId === node.id;
          
            return (
              <div
                key={node.id}
                className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{
                  width: NODE_WIDTH,
                  transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                }}
                onPointerDown={(event) => {
                  void handlePointerDownNode(event, node.id);
                }}
                onPointerMove={(event) => {
                  handlePointerMoveNode(event, node.id);
                }}
                onPointerUp={(event) => {
                  handlePointerUpNode(event, node.id);
                }}
                onClick={(event) => {
                  void handleSelectNode(node.id, {
                    toggle: event.shiftKey || event.metaKey || event.ctrlKey,
                  });
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  void handleSelectNode(node.id);
                  setConfigOpen(true);
                }}
              >
                <div
                  className={`relative flex flex-col gap-1.5 rounded-xl border bg-card/80 p-2 pb-3 text-[11px] text-gray-200 shadow-lg backdrop-blur ${
                    style.border
                  } ${style.glow} ${
                    isBlockerProcessing ? 'ai-paths-node-halo' : ''
                  } ${
                    isPrimarySelected
                      ? 'ring-2 ring-sky-200/60'
                      : isSelected
                        ? 'ring-1 ring-sky-200/40'
                        : ''
                  }`}
                  style={{ minHeight: NODE_MIN_HEIGHT }}
                >
                  {isInputPulse || isOutputPulse ? (
                    <div className='absolute -top-2 right-2 flex items-center gap-1'>
                      {isInputPulse ? (
                        <span
                          className='relative inline-flex h-2.5 w-2.5'
                          title='Input loaded'
                        >
                          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/70' />
                          <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_6px_rgba(56,189,248,0.75)]' />
                        </span>
                      ) : null}
                      {isOutputPulse ? (
                        <span
                          className='relative inline-flex h-2.5 w-2.5'
                          title='Output sent'
                        >
                          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70' />
                          <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.75)]' />
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div
                    className='pointer-events-none absolute bottom-1 right-2 w-[90%] break-all text-right text-[8px] font-mono text-gray-400/80'
                  >
                    {node.id}
                  </div>
                  {node.inputs.map((input, index) => (
                    <div
                      key={`input-${node.id}-${input}`}
                      className='absolute flex items-center'
                      style={{
                        left: -(PORT_SIZE / 2) - 4,
                        top: getPortOffsetY(index, node.inputs.length) - PORT_SIZE / 2,
                      }}
                      onMouseEnter={() => setHoveredConnectorKey(buildConnectorKey('input', node.id, input))}
                      onMouseLeave={() =>
                        setHoveredConnectorKey((prev) =>
                          prev === buildConnectorKey('input', node.id, input) ? null : prev
                        )
                      }
                    >
                      {(() : React.JSX.Element => {
                        const isConnecting = Boolean(connecting && connectingFromNode);
                        const isConnectable = isConnecting
                          ? validateConnection(
                            connectingFromNode as AiNode,
                            node,
                            connecting?.fromPort ?? '',
                            input
                          ).valid
                          : false;
                        const connectorInfo = getConnectorInfo('input', node.id, input);
                        const hasIncomingEdge = edges.some(
                          (edge): boolean =>
                            edge.to === node.id && edge.toPort === input
                        );
                        const connectorKey = buildConnectorKey('input', node.id, input);
                        const isPinned = pinnedConnectorKey === connectorKey;
                        const isHovered = hoveredConnectorKey === connectorKey;
                        const isTooltipOpen = isPinned || isHovered;
                        const hasMismatch = connectorInfo.hasMismatch;
                        const tooltipOverride = resolveConnectorTooltip?.({
                          direction: 'input',
                          node,
                          port: input,
                        }) ?? null;
                        return (
                          <>
                            <Tooltip
                              content={tooltipOverride?.content ?? renderConnectorTooltip(connectorInfo)}
                              side='right'
                              maxWidth={tooltipOverride?.maxWidth ?? '360px'}
                              open={isTooltipOpen}
                              disableHover
                            >
                              <div className='relative'>
                                <button
                                  type='button'
                                  data-port='input'
                                  className={`cursor-pointer rounded-full border bg-sky-500/20 shadow-[0_0_8px_rgba(56,189,248,0.35)] hover:border-sky-200 ${
                                    isConnecting
                                      ? isConnectable
                                        ? 'border-emerald-300/80 bg-emerald-500/30 shadow-[0_0_14px_rgba(52,211,153,0.55)] ring-2 ring-emerald-400/60'
                                        : 'border-border/60 bg-card/20 opacity-40 shadow-none'
                                      : isPinned
                                        ? 'border-amber-300/80 ring-2 ring-amber-300/70'
                                        : 'border-sky-400/60'
                                  }`}
                                  style={{
                                    width: PORT_SIZE + 2,
                                    height: PORT_SIZE + 2,
                                  }}
                                  onPointerUp={(event) => {
                                    event.stopPropagation();
                                    if (connecting) {
                                      handleCompleteConnection(event, node, input);
                                      return;
                                    }
                                  }}
                                  onPointerDown={(event) => {
                                    event.stopPropagation();
                                    if (hasIncomingEdge) {
                                      void handleReconnectInput(event, node.id, input);
                                    }
                                  }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPinnedConnectorKey((prev) =>
                                      prev === connectorKey ? null : connectorKey
                                    );
                                  }}
                                  onContextMenu={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleDisconnectPort('input', node.id, input);
                                  }}                                aria-label={`Connect to ${formatPortLabel(input)}`}
                                  title={`Input: ${formatPortLabel(input)}`}
                                />
                                {hasMismatch ? (
                                  <span className='absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black/60' />
                                ) : null}
                              </div>
                            </Tooltip>
                            <span
                              className={`ml-1.5 rounded px-1 py-0.5 text-[8px] font-medium ${
                                isConnecting
                                  ? isConnectable
                                    ? 'bg-emerald-500/15 text-emerald-200'
                                    : 'bg-muted/60 text-gray-500'
                                  : hasMismatch
                                    ? 'bg-rose-500/15 text-rose-200'
                                    : 'bg-sky-500/10 text-sky-300'
                              }`}
                            >
                              {formatPortLabel(input)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                  {node.outputs.map((output, index) => (
                    <div
                      key={`output-${node.id}-${output}`}
                      className='absolute flex items-center'
                      style={{
                        right: -(PORT_SIZE / 2) - 4,
                        top: getPortOffsetY(index, node.outputs.length) - PORT_SIZE / 2,
                      }}
                      onMouseEnter={() => setHoveredConnectorKey(buildConnectorKey('output', node.id, output))}
                      onMouseLeave={() =>
                        setHoveredConnectorKey((prev) =>
                          prev === buildConnectorKey('output', node.id, output) ? null : prev
                        )
                      }
                    >
                      {((): React.JSX.Element => {
                        const connectorInfo = getConnectorInfo('output', node.id, output);
                        const connectorKey = buildConnectorKey('output', node.id, output);
                        const isPinned = pinnedConnectorKey === connectorKey;
                        const isHovered = hoveredConnectorKey === connectorKey;
                        const isTooltipOpen = isPinned || isHovered;
                        const hasMismatch = connectorInfo.hasMismatch;
                        const tooltipOverride = resolveConnectorTooltip?.({
                          direction: 'output',
                          node,
                          port: output,
                        }) ?? null;
                        return (
                          <>
                            <span
                              className={`mr-1.5 rounded px-1 py-0.5 text-[8px] font-medium ${
                                hasMismatch
                                  ? 'bg-rose-500/15 text-rose-200'
                                  : 'bg-amber-500/10 text-amber-300'
                              }`}
                            >
                              {formatPortLabel(output)}
                            </span>
                            <Tooltip
                              content={tooltipOverride?.content ?? renderConnectorTooltip(connectorInfo)}
                              side='left'
                              maxWidth={tooltipOverride?.maxWidth ?? '360px'}
                              open={isTooltipOpen}
                              disableHover
                            >
                              <div className='relative'>
                                <button
                                  type='button'
                                  data-port='output'
                                  className={`cursor-pointer rounded-full border bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.35)] hover:border-amber-200 ${
                                    isPinned ? 'border-amber-300/80 ring-2 ring-amber-300/70' : 'border-amber-400/60'
                                  }`}
                                  style={{
                                    width: PORT_SIZE + 2,
                                    height: PORT_SIZE + 2,
                                  }}
                                  onPointerDown={(event) =>
                                  { void handleStartConnection(event, node, output); }
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPinnedConnectorKey((prev) =>
                                      prev === connectorKey ? null : connectorKey
                                    );
                                  }}
                                  onContextMenu={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleDisconnectPort('output', node.id, output);
                                  }}                                aria-label={`Start connection from ${formatPortLabel(output)}`}
                                  title={`Output: ${formatPortLabel(output)}`}
                                />
                                {hasMismatch ? (
                                  <span className='absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black/60' />
                                ) : null}
                              </div>
                            </Tooltip>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-xs font-semibold text-white'>{node.title}</span>
                    <div className='flex items-center gap-1'>
                      {isScheduledTrigger ? (
                        <Badge variant='outline' className='h-auto border-amber-400/60 bg-amber-500/15 px-2 py-0 text-[9px] text-amber-200 uppercase'>
                        Scheduled
                        </Badge>
                      ) : null}
                      <Badge variant='outline' className='h-auto px-2 py-0 text-[10px] text-gray-400 uppercase'>
                        {node.type}
                      </Badge>
                    </div>
                  </div>
                  {runtimeNodeStatusLabel && (
                    <div className='inline-flex w-fit items-center gap-1'>
                      <Badge
                        variant='outline'
                        className={`h-auto flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-wide ${runtimeStatusBadgeClassName(runtimeNodeStatus ?? '')}`}
                      >
                        {runtimeNodeStatus === 'cached' && (
                          <svg className='h-2.5 w-2.5 shrink-0' viewBox='0 0 16 16' fill='currentColor'>
                            <path d='M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2' />
                          </svg>
                        )}
                        {runtimeNodeStatusLabel}
                      </Badge>
                      {nodeDurations[node.id] != null && (
                        <span className='text-[9px] text-gray-400'>
                          {formatDurationMs(nodeDurations[node.id] ?? null)}
                        </span>
                      )}
                    </div>
                  )}
                  {node.type === 'iterator' && (iteratorStatus || iteratorProgressLabel) ? (
                    <Badge
                      variant='outline'
                      className={`h-auto inline-flex w-fit items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-wide ${iteratorStatusClasses}`}
                      title={
                        iteratorProgressLabel && iteratorStatus
                          ? `${iteratorProgressLabel} • ${iteratorStatus}`
                          : iteratorStatus ?? iteratorProgressLabel ?? undefined
                      }
                    >
                      {iteratorProgressLabel ? <span>{iteratorProgressLabel}</span> : null}
                      {iteratorStatus ? <span>{iteratorStatus}</span> : null}
                    </Badge>
                  ) : null}
                  {isBlockerProcessing && (
                    <Badge
                      variant='outline'
                      className='h-auto inline-flex w-fit items-center gap-1 border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wide text-sky-200'
                    >
                    Processing
                      <NodeProcessingDots active />
                    </Badge>
                  )}
                  {node.type === 'viewer' && !triggerConnected.has(node.id) && (
                    <Badge variant='outline' className='h-auto border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[9px] text-amber-200'>
                    Not wired to a Trigger
                    </Badge>
                  )}
                  {node.type === 'trigger' && (
                    <Button
                      className='self-start rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10'
                      type='button'
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => { void fireTrigger(node, event); }}
                    >
                    Fire Trigger
                    </Button>
                  )}
                  {node.type === 'trigger' && (
                    <div className='text-[10px] uppercase text-lime-200/80'>
                      {isScheduledTrigger
                        ? 'Server scheduled trigger'
                        : 'Accepts context input'}
                    </div>
                  )}
                  {node.type === 'context' && (
                    <span className='text-[10px] uppercase text-emerald-300/80'>
                    Role output can feed any Trigger
                    </span>
                  )}
                  {node.type === 'simulation' && (
                    <span className='text-[10px] uppercase text-cyan-300/80'>
                    Wire Trigger ↔ Simulation
                    </span>
                  )}
                  {node.type === 'viewer' && (
                    <Badge variant='outline' className='h-auto border-border bg-card/60 px-2 py-1 text-[10px] text-gray-400'>
                    Open node to view results
                    </Badge>
                  )}
                </div>
                {showNote ? (
                  <div
                    className='mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-[11px] text-gray-900 shadow-sm'
                    style={{ backgroundColor: noteColor }}
                  >
                    <div className='whitespace-pre-wrap break-words'>{noteText}</div>
                  </div>
                ) : null}
              </div>
            );
          })
          : null}
      </div>
      <ConfirmationModal />
    </div>
  );
}
