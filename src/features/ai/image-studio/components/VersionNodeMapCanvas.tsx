'use client';

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import type { CompositeLayerConfig } from '@/shared/contracts/image-studio';

import { CompositeStackNode } from './CompositeStackNode';
import { useVersionNodeMapContext } from './VersionNodeMapContext';
import { useSettingsState } from '../context/SettingsContext';
import { readMeta } from '@/features/ai/image-studio/utils/metadata';
import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';
import {
  CONTENT_OFFSET_X,
  CONTENT_OFFSET_Y,
  NODE_HEIGHT,
  NODE_WIDTH,
  getCompositeNodeHeight,
} from '@/features/ai/image-studio/utils/version-graph';

import type { VersionNode } from '../context/VersionGraphContext';

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const WHEEL_ZOOM_SENSITIVITY = 0.00065;
const MAX_WHEEL_ZOOM_DELTA = 0.1;
const MIN_WHEEL_ZOOM_DELTA = 0.002;
const THUMB_SIZE = 48;
const LABEL_OFFSET_Y = 14;

// ── CSS keyframes (injected as <style> in SVG) ──────────────────────────────

const SVG_STYLES = `
@keyframes vgraph-fade-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 0.85; transform: scale(1); }
}
@keyframes vgraph-glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(250,204,21,0.4)); }
  50% { filter: drop-shadow(0 0 8px rgba(250,204,21,0.7)); }
}
@keyframes vgraph-edge-draw {
  from { stroke-dashoffset: 1000; }
  to { stroke-dashoffset: 0; }
}
`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface VersionNodeMapCanvasProps {
  _unused?: never;
}

export interface VersionNodeMapCanvasRef {
  svgElement: SVGSVGElement | null;
  fitToView: () => void;
  getPanZoom: () => { pan: { x: number; y: number }; zoom: number };
  setPan: (pan: { x: number; y: number }) => void;
}

// ── Edge path ────────────────────────────────────────────────────────────────

function buildEdgePath(sourceNode: VersionNode, targetNode: VersionNode): string {
  const sx = sourceNode.x;
  const sy = sourceNode.y + NODE_HEIGHT / 2;
  const tx = targetNode.x;
  const ty = targetNode.y - NODE_HEIGHT / 2 + 8;
  const cy = (sy + ty) / 2;
  return `M ${sx} ${sy} C ${sx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`;
}

// ── Arrow markers ────────────────────────────────────────────────────────────

function SvgDefs(): React.JSX.Element {
  return (
    <defs>
      <marker
        id='vgraph-arrow'
        viewBox='0 0 10 10'
        refX='10'
        refY='5'
        markerWidth='6'
        markerHeight='6'
        orient='auto-start-reverse'
      >
        <path d='M 0 0 L 10 5 L 0 10 z' fill='#6b7280' />
      </marker>
      <marker
        id='vgraph-arrow-merge'
        viewBox='0 0 10 10'
        refX='10'
        refY='5'
        markerWidth='6'
        markerHeight='6'
        orient='auto-start-reverse'
      >
        <path d='M 0 0 L 10 5 L 0 10 z' fill='#a855f7' />
      </marker>
      <marker
        id='vgraph-arrow-composite'
        viewBox='0 0 10 10'
        refX='10'
        refY='5'
        markerWidth='6'
        markerHeight='6'
        orient='auto-start-reverse'
      >
        <path d='M 0 0 L 10 5 L 0 10 z' fill='#14b8a6' />
      </marker>
    </defs>
  );
}

// ── Node stroke class helper ─────────────────────────────────────────────────

function getNodeStrokeClass(
  node: VersionNode,
  isSelected: boolean,
  isMergeSelected: boolean,
  isCompareSelected: boolean,
  isCompositeSelected: boolean
): string {
  if (isCompareSelected) return 'fill-card/80 stroke-cyan-400';
  if (isCompositeSelected) return 'fill-card/80 stroke-teal-400';
  if (isMergeSelected) return 'fill-card/80 stroke-orange-400';
  if (isSelected) return 'fill-card/80 stroke-yellow-400';
  if (node.type === 'composite') return 'fill-card/80 stroke-teal-400/60';
  if (node.type === 'merge') return 'fill-card/80 stroke-purple-400/60';
  if (node.type === 'generation') return 'fill-card/80 stroke-emerald-400/60';
  return 'fill-card/80 stroke-blue-400/60';
}

type NodeOperationVisual = {
  label: string;
  icon: string;
  color: string;
};

function resolveNodeOperationVisual(node: VersionNode): NodeOperationVisual {
  const meta = readMeta(node.slot);
  const relationType = typeof meta.relationType === 'string' ? meta.relationType.toLowerCase() : '';

  if (relationType.startsWith('crop:') || meta.crop) {
    return { label: 'Crop', icon: 'C', color: '#22d3ee' };
  }
  if (relationType.startsWith('center:') || meta.center) {
    return { label: 'Center', icon: 'T', color: '#38bdf8' };
  }
  if (relationType.startsWith('upscale:') || meta.upscale) {
    return { label: 'Upscale', icon: 'U', color: '#60a5fa' };
  }
  if (relationType.startsWith('autoscale:') || meta.autoscale) {
    return { label: 'Auto Scaler', icon: 'A', color: '#3b82f6' };
  }
  if (relationType.startsWith('mask:') || meta.maskData || node.hasMask) {
    return { label: 'Mask', icon: 'K', color: '#a855f7' };
  }
  if (relationType.startsWith('merge:') || node.type === 'merge') {
    return { label: 'Merge', icon: 'M', color: '#a855f7' };
  }
  if (relationType.startsWith('composite:') || node.type === 'composite') {
    return { label: 'Composite', icon: 'O', color: '#14b8a6' };
  }
  if (relationType.startsWith('generation:') || node.type === 'generation') {
    return { label: 'Generation', icon: 'G', color: '#34d399' };
  }
  return { label: 'Base', icon: 'B', color: '#9ca3af' };
}

// ── Component ────────────────────────────────────────────────────────────────

export const VersionNodeMapCanvas = React.forwardRef<
  VersionNodeMapCanvasRef,
  VersionNodeMapCanvasProps
>(function VersionNodeMapCanvas(_props, ref) {
  const { studioSettings } = useSettingsState();
  const {
    nodes,
    edges,
    selectedNodeId,
    hoveredNodeId,
    mergeMode,
    mergeSelectedIds,
    compositeMode,
    compositeSelectedIds,
    collapsedNodeIds,
    filteredNodeIds,
    isolatedNodeIds,
    compareMode,
    compareNodeIds,
    onSelectNode,
    onHoverNode,
    onOpenNodeDetails,
    onToggleMergeSelection,
    onToggleCompositeSelection,
    onToggleCollapse,
    onReorderCompositeLayer,
    onContextMenu,
    getSlotImageSrc,
    getSlotAnnotation,
    zoom,
    onZoomChange,
  } = useVersionNodeMapContext();
  const versionGraphTooltipsEnabled = studioSettings.helpTooltips.versionGraphButtonsEnabled;
  const tooltipContent = React.useMemo(
    () => ({
      nodeToggleCollapse: getImageStudioDocTooltip('version_graph_node_toggle_collapse'),
      nodeOpenDetails: getImageStudioDocTooltip('version_graph_node_open_details'),
    }),
    []
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(zoom);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null
  );
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [smoothTransition, setSmoothTransition] = useState(false);
  const brokenImagesRef = useRef<Set<string>>(new Set());
  const [, setBrokenTick] = useState(0);
  const prevNodeCountRef = useRef(nodes.length);

  useEffect(() => {
    if (nodes.length !== prevNodeCountRef.current) {
      brokenImagesRef.current.clear();
      prevNodeCountRef.current = nodes.length;
    }
  }, [nodes.length]);

  // Expose SVG ref + fitToView + pan/zoom access
  useImperativeHandle(
    ref,
    () => ({
      get svgElement() {
        return svgRef.current;
      },
      fitToView() {
        const svg = svgRef.current;
        if (!svg || nodes.length === 0) return;
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // Graph content offset (matches the inner <g> translate)
        const offsetX = CONTENT_OFFSET_X;
        const offsetY = CONTENT_OFFSET_Y;

        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (const n of nodes) {
          const nx = n.x + offsetX - NODE_WIDTH / 2;
          const ny = n.y + offsetY - NODE_HEIGHT / 2;
          if (nx < minX) minX = nx;
          if (ny < minY) minY = ny;
          if (nx + NODE_WIDTH > maxX) maxX = nx + NODE_WIDTH;
          if (ny + NODE_HEIGHT > maxY) maxY = ny + NODE_HEIGHT;
        }

        const graphW = maxX - minX;
        const graphH = maxY - minY;
        if (graphW <= 0 || graphH <= 0) return;

        const newZoom = Math.min(rect.width / graphW, rect.height / graphH) * 0.85;
        const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const newPan = {
          x: rect.width / 2 - centerX * clampedZoom,
          y: rect.height / 2 - centerY * clampedZoom,
        };

        setSmoothTransition(true);
        panRef.current = newPan;
        zoomRef.current = clampedZoom;
        setPan(newPan);
        onZoomChange(clampedZoom);
        setTimeout(() => setSmoothTransition(false), 200);
      },
      getPanZoom() {
        return { pan: panRef.current, zoom: zoomRef.current };
      },
      setPan(newPan: { x: number; y: number }) {
        setSmoothTransition(true);
        panRef.current = newPan;
        setPan(newPan);
        setTimeout(() => setSmoothTransition(false), 200);
      },
    }),
    [nodes, onZoomChange]
  );

  // Track previous node/edge IDs for new-item animations
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const prevEdgeIdsRef = useRef<Set<string>>(new Set());
  const newNodeIdsRef = useRef<Set<string>>(new Set());
  const newEdgeIdsRef = useRef<Set<string>>(new Set());
  const animationsPrimedRef = useRef(false);

  // Compute new items on each render
  const currentNodeIds = new Set(nodes.map((n) => n.id));
  const currentEdgeIds = new Set(edges.map((e) => e.id));

  if (!animationsPrimedRef.current) {
    // Do not animate every node when the graph is first opened.
    newNodeIdsRef.current = new Set();
    newEdgeIdsRef.current = new Set();
  } else {
    newNodeIdsRef.current = new Set(
      [...currentNodeIds].filter((id) => !prevNodeIdsRef.current.has(id))
    );
    newEdgeIdsRef.current = new Set(
      [...currentEdgeIds].filter((id) => !prevEdgeIdsRef.current.has(id))
    );
  }

  // Update previous sets after render
  useEffect(() => {
    if (!animationsPrimedRef.current) {
      prevNodeIdsRef.current = currentNodeIds;
      prevEdgeIdsRef.current = currentEdgeIds;
      animationsPrimedRef.current = true;
      return;
    }
    const timeout = setTimeout(() => {
      prevNodeIdsRef.current = currentNodeIds;
      prevEdgeIdsRef.current = currentEdgeIds;
      // Clear new flags after animation duration
    }, 600);
    return () => clearTimeout(timeout);
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const mergeSelectedSet = new Set(mergeSelectedIds);
  const compositeSelectedSet = new Set(compositeSelectedIds);

  // ── Pan handlers ──

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      if ((e.target as SVGElement).closest('[data-node-id]')) return;
      dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [pan]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // ── Zoom handler ──
  // Use a native wheel listener with passive: false so browser/page scrolling
  // is suppressed while zooming over the graph canvas.
  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;

    const handleNativeWheel = (event: WheelEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      // Normalize wheel movement across mouse wheel and trackpad sources.
      const normalizedDeltaY =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * 240
            : event.deltaY;
      const rawZoomDelta = -normalizedDeltaY * WHEEL_ZOOM_SENSITIVITY;
      const zoomDelta = Math.max(
        -MAX_WHEEL_ZOOM_DELTA,
        Math.min(MAX_WHEEL_ZOOM_DELTA, rawZoomDelta)
      );
      if (Math.abs(zoomDelta) < MIN_WHEEL_ZOOM_DELTA) return;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + zoomDelta));
      if (nextZoom === currentZoom) return;

      const rect = element.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const worldX = (pointerX - currentPan.x) / currentZoom;
      const worldY = (pointerY - currentPan.y) / currentZoom;
      const nextPan = {
        x: pointerX - worldX * nextZoom,
        y: pointerY - worldY * nextZoom,
      };

      panRef.current = nextPan;
      zoomRef.current = nextZoom;
      setPan(nextPan);
      onZoomChange(nextZoom);
    };

    element.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleNativeWheel);
    };
  }, [onZoomChange]);

  // ── Click handlers ──

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!(e.target as SVGElement).closest('[data-node-id]')) {
        onSelectNode(null);
      }
    },
    [onSelectNode]
  );

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (compositeMode) {
        onToggleCompositeSelection(nodeId);
      } else if (mergeMode) {
        onToggleMergeSelection(nodeId);
      } else {
        onSelectNode(nodeId);
      }
    },
    [compositeMode, mergeMode, onToggleCompositeSelection, onToggleMergeSelection, onSelectNode]
  );

  // ── Viewport culling ──
  // Compute visible bounds for culling off-screen nodes (performance optimization)
  const svgRect = svgRef.current?.getBoundingClientRect();
  const cullMargin = 200; // extra margin in world-space units
  const viewBounds = svgRect
    ? {
        minX: -pan.x / zoom - cullMargin - CONTENT_OFFSET_X,
        minY: -pan.y / zoom - cullMargin - CONTENT_OFFSET_Y,
        maxX: (-pan.x + svgRect.width) / zoom + cullMargin - CONTENT_OFFSET_X,
        maxY: (-pan.y + svgRect.height) / zoom + cullMargin - CONTENT_OFFSET_Y,
      }
    : null;

  const isNodeVisible = (node: VersionNode): boolean => {
    if (!viewBounds || nodes.length < 50) return true;
    return (
      node.x + NODE_WIDTH / 2 >= viewBounds.minX &&
      node.x - NODE_WIDTH / 2 <= viewBounds.maxX &&
      node.y + NODE_HEIGHT / 2 >= viewBounds.minY &&
      node.y - NODE_HEIGHT / 2 <= viewBounds.maxY
    );
  };

  if (nodes.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-xs text-gray-500'>
        No cards in this project yet.
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      role='img'
      aria-label={`Version graph with ${nodes.length} nodes and ${edges.length} edges`}
      className='h-full w-full cursor-grab overscroll-none active:cursor-grabbing'
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleBackgroundClick}
    >
      <style>{SVG_STYLES}</style>
      <SvgDefs />
      <g
        transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
        style={smoothTransition ? { transition: 'transform 0.15s ease-out' } : undefined}
      >
        <g transform={`translate(${nodes.length > 0 ? CONTENT_OFFSET_X : 0}, ${CONTENT_OFFSET_Y})`}>
          {/* Edges */}
          {edges.map((edge) => {
            const sourceNode = nodeById.get(edge.source);
            const targetNode = nodeById.get(edge.target);
            if (!sourceNode || !targetNode) return null;
            // Viewport culling: skip if both endpoints are off-screen
            if (!isNodeVisible(sourceNode) && !isNodeVisible(targetNode)) return null;

            const isMergeEdge = edge.type === 'merge';
            const isCompositeEdge = edge.type === 'composite';
            const isNewEdge = newEdgeIdsRef.current.has(edge.id);

            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + NODE_HEIGHT / 2 + targetNode.y - NODE_HEIGHT / 2 + 8) / 2;

            const isEdgeHovered = hoveredEdgeId === edge.id;
            const edgeStroke = isCompositeEdge ? '#14b8a6' : isMergeEdge ? '#a855f7' : '#6b7280';
            const edgeMarker = isCompositeEdge
              ? 'url(#vgraph-arrow-composite)'
              : isMergeEdge
                ? 'url(#vgraph-arrow-merge)'
                : 'url(#vgraph-arrow)';

            return (
              <React.Fragment key={edge.id}>
                {/* Invisible wider hit area for hover */}
                <path
                  d={buildEdgePath(sourceNode, targetNode)}
                  fill='none'
                  stroke='transparent'
                  strokeWidth={10}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                />
                <path
                  d={buildEdgePath(sourceNode, targetNode)}
                  fill='none'
                  strokeWidth={isEdgeHovered ? 2.5 : 1.5}
                  markerEnd={edgeMarker}
                  stroke={edgeStroke}
                  strokeOpacity={isEdgeHovered ? 0.9 : isCompositeEdge || isMergeEdge ? 0.6 : 0.5}
                  strokeDasharray={isCompositeEdge ? '6 3' : isMergeEdge ? '4 3' : undefined}
                  style={{
                    pointerEvents: 'none',
                    transition: 'stroke-width 0.15s ease, stroke-opacity 0.15s ease',
                    ...(isNewEdge
                      ? {
                          strokeDasharray: 1000,
                          strokeDashoffset: 1000,
                          animation: 'vgraph-edge-draw 0.6s ease forwards 0.2s',
                        }
                      : {}),
                  }}
                />
                {zoom > 0.7 || isEdgeHovered ? (
                  <text
                    x={midX + 4}
                    y={midY}
                    fontSize={7}
                    fill={edgeStroke}
                    fillOpacity={0.7}
                    textAnchor='start'
                  >
                    {isCompositeEdge ? 'comp' : isMergeEdge ? 'merge' : 'gen'}
                  </text>
                ) : null}
              </React.Fragment>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            if (!isNodeVisible(node)) return null;
            const isSelected = node.id === selectedNodeId;
            const isHovered = node.id === hoveredNodeId;
            const isMergeSelected = mergeSelectedSet.has(node.id);
            const isNewNode = newNodeIdsRef.current.has(node.id);
            const isCollapsed = collapsedNodeIds.has(node.id);
            const isFilteredOut = filteredNodeIds !== null && !filteredNodeIds.has(node.id);
            const imageSrc = getSlotImageSrc(node.slot);
            const operationVisual = resolveNodeOperationVisual(node);
            const nx = node.x - NODE_WIDTH / 2;
            const ny = node.y - NODE_HEIGHT / 2;

            const isCompositeSelected = compositeSelectedSet.has(node.id);
            const isIsolatedOut = isolatedNodeIds !== null && !isolatedNodeIds.has(node.id);
            const isCompareSelected =
              compareMode &&
              compareNodeIds !== null &&
              (compareNodeIds[0] === node.id || compareNodeIds[1] === node.id);
            const dimmed =
              (mergeMode && !isMergeSelected && !isHovered) ||
              (compositeMode && !isCompositeSelected && !isHovered) ||
              isFilteredOut ||
              isIsolatedOut;
            const hasChildren = node.childIds.length > 0;
            const annotation = getSlotAnnotation?.(node.slot);
            const isCompositeNode = node.type === 'composite';
            const compositeMeta = isCompositeNode ? readMeta(node.slot) : null;
            const compositeLayers: CompositeLayerConfig[] =
              compositeMeta?.compositeConfig?.layers ?? [];
            const compositeHeight = isCompositeNode
              ? getCompositeNodeHeight(compositeLayers.length)
              : NODE_HEIGHT;

            return (
              <g
                key={node.id}
                data-node-id={node.id}
                className='cursor-pointer'
                onClick={(e) => handleNodeClick(e, node.id)}
                onContextMenu={(e) => {
                  if (onContextMenu) {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu(node.id, e.clientX, e.clientY);
                  }
                }}
                onPointerEnter={() => onHoverNode(node.id)}
                onPointerLeave={() => onHoverNode(null)}
                style={{
                  transform: `translate(${nx}px, ${ny}px) scale(${isHovered && !mergeMode && !compositeMode ? 1.08 : 1})`,
                  transformOrigin: `${nx + NODE_WIDTH / 2}px ${ny + compositeHeight / 2}px`,
                  transition: 'transform 0.3s ease-out, opacity 0.2s ease',
                  opacity: dimmed ? (isFilteredOut ? 0.2 : 0.4) : isHovered ? 1 : 0.85,
                  animation: isNewNode
                    ? 'vgraph-fade-in 0.5s ease forwards'
                    : isSelected
                      ? 'vgraph-glow-pulse 2s ease-in-out infinite'
                      : undefined,
                }}
              >
                {/* Accessible title */}
                <title>
                  {operationVisual.label} ({node.type})
                </title>

                {isCompositeNode && compositeLayers.length > 0 ? (
                  <CompositeStackNode
                    node={node}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    layers={compositeLayers}
                    zoom={zoom}
                    getSlotLabel={(slotId) => {
                      const n = nodeById.get(slotId);
                      return n ? n.label : slotId.slice(0, 8);
                    }}
                    getSlotImageSrc={(slotId) => {
                      const n = nodeById.get(slotId);
                      return n ? getSlotImageSrc(n.slot) : null;
                    }}
                    onReorderLayer={(from, to) => onReorderCompositeLayer(node.id, from, to)}
                  />
                ) : (
                  <>
                    {/* Background */}
                    <rect
                      x={0}
                      y={0}
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx={8}
                      ry={8}
                      strokeWidth={isSelected || isMergeSelected || isCompositeSelected ? 2 : 1}
                      strokeDasharray={
                        isMergeSelected ? '4 3' : isCompositeSelected ? '6 3' : undefined
                      }
                      className={getNodeStrokeClass(
                        node,
                        isSelected,
                        isMergeSelected,
                        isCompareSelected,
                        isCompositeSelected
                      )}
                    />

                    {/* Thumbnail */}
                    {imageSrc && !brokenImagesRef.current.has(node.id) ? (
                      <image
                        href={imageSrc}
                        x={(NODE_WIDTH - THUMB_SIZE) / 2}
                        y={6}
                        width={THUMB_SIZE}
                        height={THUMB_SIZE}
                        preserveAspectRatio='xMidYMid slice'
                        clipPath='inset(0 round 4px)'
                        onError={() => {
                          brokenImagesRef.current.add(node.id);
                          setBrokenTick((t) => t + 1);
                        }}
                      />
                    ) : (
                      <rect
                        x={(NODE_WIDTH - THUMB_SIZE) / 2}
                        y={6}
                        width={THUMB_SIZE}
                        height={THUMB_SIZE}
                        rx={4}
                        ry={4}
                        fill={brokenImagesRef.current.has(node.id) ? '#7f1d1d' : '#374151'}
                        fillOpacity={0.4}
                      />
                    )}

                    {/* Operation label under thumbnail */}
                    <g>
                      <circle
                        cx={NODE_WIDTH / 2 - 20}
                        cy={THUMB_SIZE + 6 + LABEL_OFFSET_Y - 2}
                        r={3}
                        fill={operationVisual.color}
                        fillOpacity={0.95}
                      />
                      <text
                        x={NODE_WIDTH / 2 - 14}
                        y={THUMB_SIZE + 6 + LABEL_OFFSET_Y + 1}
                        textAnchor='start'
                        fill={operationVisual.color}
                        fontSize={7}
                        fontWeight='bold'
                      >
                        {operationVisual.icon}
                      </text>
                      <text
                        x={NODE_WIDTH / 2 - 6}
                        y={THUMB_SIZE + 6 + LABEL_OFFSET_Y + 1}
                        textAnchor='start'
                        fill='#d1d5db'
                        fontSize={8}
                      >
                        {operationVisual.label}
                      </text>
                    </g>

                    {/* Mask badge */}
                    {node.hasMask ? (
                      <circle cx={NODE_WIDTH - 6} cy={8} r={4} fill='#a855f7' />
                    ) : null}

                    {/* Annotation badge with tooltip */}
                    {annotation ? (
                      <g>
                        <circle
                          cx={6}
                          cy={NODE_HEIGHT - 8}
                          r={3}
                          fill='#facc15'
                          fillOpacity={0.8}
                        />
                        <title>{annotation}</title>
                      </g>
                    ) : null}

                    {/* Collapse toggle button */}
                    {hasChildren && !mergeMode && !compositeMode ? (
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCollapse(node.id);
                        }}
                        className='cursor-pointer'
                      >
                        {versionGraphTooltipsEnabled ? (
                          <title>{tooltipContent.nodeToggleCollapse}</title>
                        ) : null}
                        <rect
                          x={NODE_WIDTH / 2 - 10}
                          y={NODE_HEIGHT - 4}
                          width={20}
                          height={14}
                          rx={3}
                          ry={3}
                          fill='#1f2937'
                          stroke='#4b5563'
                          strokeWidth={0.5}
                        />
                        <text
                          x={NODE_WIDTH / 2}
                          y={NODE_HEIGHT + 7}
                          textAnchor='middle'
                          fill={isCollapsed ? '#facc15' : '#9ca3af'}
                          fontSize={8}
                          fontWeight='bold'
                        >
                          {isCollapsed ? `+${node.descendantCount}` : '\u2212'}
                        </text>
                      </g>
                    ) : null}
                  </>
                )}
                {onOpenNodeDetails ? (
                  <g
                    className='cursor-pointer'
                    role='button'
                    aria-label={
                      versionGraphTooltipsEnabled
                        ? tooltipContent.nodeOpenDetails
                        : 'Open node details'
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenNodeDetails(node.id);
                    }}
                  >
                    {versionGraphTooltipsEnabled ? (
                      <title>{tooltipContent.nodeOpenDetails}</title>
                    ) : null}
                    <circle
                      cx={NODE_WIDTH - 8}
                      cy={4}
                      r={4.5}
                      fill='#0f172a'
                      fillOpacity={0.95}
                      stroke='#60a5fa'
                      strokeWidth={1}
                    />
                    <text
                      x={NODE_WIDTH - 8}
                      y={6}
                      textAnchor='middle'
                      fill='#bfdbfe'
                      fontSize={6}
                      fontWeight={700}
                      pointerEvents='none'
                    >
                      i
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
});
