'use client';

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { NODE_HEIGHT, NODE_WIDTH } from '../utils/version-graph';

import type { VersionEdge, VersionNode } from '../context/VersionGraphContext';

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
  nodes: VersionNode[];
  edges: VersionEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  mergeMode: boolean;
  mergeSelectedIds: string[];
  collapsedNodeIds: Set<string>;
  filteredNodeIds: Set<string> | null;
  onSelectNode: (id: string | null) => void;
  onHoverNode: (id: string | null) => void;
  onActivateNode: (id: string) => void;
  onToggleMergeSelection: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  getSlotImageSrc: (slot: VersionNode['slot']) => string | null;
  zoom: number;
  onZoomChange: (z: number) => void;
}

export interface VersionNodeMapCanvasRef {
  svgElement: SVGSVGElement | null;
}

// ── Edge path ────────────────────────────────────────────────────────────────

function buildEdgePath(
  sourceNode: VersionNode,
  targetNode: VersionNode,
): string {
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
    </defs>
  );
}

// ── Node stroke class helper ─────────────────────────────────────────────────

function getNodeStrokeClass(
  node: VersionNode,
  isSelected: boolean,
  isMergeSelected: boolean,
): string {
  if (isMergeSelected) return 'fill-card/80 stroke-orange-400';
  if (isSelected) return 'fill-card/80 stroke-yellow-400';
  if (node.type === 'merge') return 'fill-card/80 stroke-purple-400/60';
  if (node.type === 'generation') return 'fill-card/80 stroke-emerald-400/60';
  return 'fill-card/80 stroke-blue-400/60';
}

// ── Component ────────────────────────────────────────────────────────────────

export const VersionNodeMapCanvas = React.forwardRef<VersionNodeMapCanvasRef, VersionNodeMapCanvasProps>(
  function VersionNodeMapCanvas(
    {
      nodes,
      edges,
      selectedNodeId,
      hoveredNodeId,
      mergeMode,
      mergeSelectedIds,
      collapsedNodeIds,
      filteredNodeIds,
      onSelectNode,
      onHoverNode,
      onActivateNode,
      onToggleMergeSelection,
      onToggleCollapse,
      getSlotImageSrc,
      zoom,
      onZoomChange,
    },
    ref,
  ) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const zoomRef = useRef<number>(zoom);
    const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

    // Expose SVG ref for PNG export
    useImperativeHandle(ref, () => ({
      get svgElement() {
        return svgRef.current;
      },
    }), []);

    // Track previous node/edge IDs for new-item animations
    const prevNodeIdsRef = useRef<Set<string>>(new Set());
    const prevEdgeIdsRef = useRef<Set<string>>(new Set());
    const newNodeIdsRef = useRef<Set<string>>(new Set());
    const newEdgeIdsRef = useRef<Set<string>>(new Set());

    // Compute new items on each render
    const currentNodeIds = new Set(nodes.map((n) => n.id));
    const currentEdgeIds = new Set(edges.map((e) => e.id));

    newNodeIdsRef.current = new Set(
      [...currentNodeIds].filter((id) => !prevNodeIdsRef.current.has(id)),
    );
    newEdgeIdsRef.current = new Set(
      [...currentEdgeIds].filter((id) => !prevEdgeIdsRef.current.has(id)),
    );

    // Update previous sets after render
    useEffect(() => {
      const timeout = setTimeout(() => {
        prevNodeIdsRef.current = currentNodeIds;
        prevEdgeIdsRef.current = currentEdgeIds;
        // Clear new flags after animation duration
      }, 600);
      return () => clearTimeout(timeout);
    });

    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const mergeSelectedSet = new Set(mergeSelectedIds);

    // ── Pan handlers ──

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (e.button !== 0) return;
        if ((e.target as SVGElement).closest('[data-node-id]')) return;
        dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
        svgRef.current?.setPointerCapture(e.pointerId);
      },
      [pan],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
      },
      [],
    );

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
        const normalizedDeltaY = event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * 240
            : event.deltaY;
        const rawZoomDelta = -normalizedDeltaY * WHEEL_ZOOM_SENSITIVITY;
        const zoomDelta = Math.max(
          -MAX_WHEEL_ZOOM_DELTA,
          Math.min(MAX_WHEEL_ZOOM_DELTA, rawZoomDelta),
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
      [onSelectNode],
    );

    const handleNodeClick = useCallback(
      (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        if (mergeMode) {
          onToggleMergeSelection(nodeId);
        } else {
          onSelectNode(nodeId);
        }
      },
      [mergeMode, onToggleMergeSelection, onSelectNode],
    );

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
        className='h-full w-full cursor-grab overscroll-none active:cursor-grabbing'
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleBackgroundClick}
      >
        <style>{SVG_STYLES}</style>
        <SvgDefs />
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <g transform={`translate(${nodes.length > 0 ? 200 : 0}, 40)`}>
            {/* Edges */}
            {edges.map((edge) => {
              const sourceNode = nodeById.get(edge.source);
              const targetNode = nodeById.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              const isMergeEdge = edge.type === 'merge';
              const isNewEdge = newEdgeIdsRef.current.has(edge.id);

              return (
                <path
                  key={edge.id}
                  d={buildEdgePath(sourceNode, targetNode)}
                  fill='none'
                  strokeWidth={1.5}
                  markerEnd={isMergeEdge ? 'url(#vgraph-arrow-merge)' : 'url(#vgraph-arrow)'}
                  stroke={isMergeEdge ? '#a855f7' : '#6b7280'}
                  strokeOpacity={isMergeEdge ? 0.6 : 0.5}
                  strokeDasharray={isMergeEdge ? '4 3' : undefined}
                  style={isNewEdge ? {
                    strokeDasharray: 1000,
                    strokeDashoffset: 1000,
                    animation: 'vgraph-edge-draw 0.6s ease forwards 0.2s',
                  } : undefined}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isHovered = node.id === hoveredNodeId;
              const isMergeSelected = mergeSelectedSet.has(node.id);
              const isNewNode = newNodeIdsRef.current.has(node.id);
              const isCollapsed = collapsedNodeIds.has(node.id);
              const isFilteredOut = filteredNodeIds !== null && !filteredNodeIds.has(node.id);
              const imageSrc = getSlotImageSrc(node.slot);
              const nx = node.x - NODE_WIDTH / 2;
              const ny = node.y - NODE_HEIGHT / 2;

              const dimmed = (mergeMode && !isMergeSelected && !isHovered) || isFilteredOut;
              const hasChildren = node.childIds.length > 0;

              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  className='cursor-pointer'
                  onClick={(e) => handleNodeClick(e, node.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!mergeMode) onActivateNode(node.id);
                  }}
                  onPointerEnter={() => onHoverNode(node.id)}
                  onPointerLeave={() => onHoverNode(null)}
                  style={{
                    transform: `translate(${nx}px, ${ny}px) scale(${isHovered && !mergeMode ? 1.08 : 1})`,
                    transformOrigin: `${nx + NODE_WIDTH / 2}px ${ny + NODE_HEIGHT / 2}px`,
                    transition: 'transform 0.3s ease-out, opacity 0.2s ease',
                    opacity: dimmed ? (isFilteredOut ? 0.2 : 0.4) : isHovered ? 1 : 0.85,
                    animation: isNewNode
                      ? 'vgraph-fade-in 0.5s ease forwards'
                      : isSelected
                        ? 'vgraph-glow-pulse 2s ease-in-out infinite'
                        : undefined,
                  }}
                >
                  {/* Background */}
                  <rect
                    x={0}
                    y={0}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={8}
                    ry={8}
                    strokeWidth={isSelected || isMergeSelected ? 2 : 1}
                    strokeDasharray={isMergeSelected ? '4 3' : undefined}
                    className={getNodeStrokeClass(node, isSelected, isMergeSelected)}
                  />

                  {/* Thumbnail */}
                  {imageSrc ? (
                    <image
                      href={imageSrc}
                      x={(NODE_WIDTH - THUMB_SIZE) / 2}
                      y={6}
                      width={THUMB_SIZE}
                      height={THUMB_SIZE}
                      preserveAspectRatio='xMidYMid slice'
                      clipPath='inset(0 round 4px)'
                    />
                  ) : (
                    <rect
                      x={(NODE_WIDTH - THUMB_SIZE) / 2}
                      y={6}
                      width={THUMB_SIZE}
                      height={THUMB_SIZE}
                      rx={4}
                      ry={4}
                      fill='#374151'
                      fillOpacity={0.4}
                    />
                  )}

                  {/* Label */}
                  <text
                    x={NODE_WIDTH / 2}
                    y={THUMB_SIZE + 6 + LABEL_OFFSET_Y}
                    textAnchor='middle'
                    fill='#d1d5db'
                    fontSize={9}
                  >
                    {node.label.length > 10 ? `${node.label.slice(0, 9)}...` : node.label}
                  </text>

                  {/* Mask badge */}
                  {node.hasMask ? (
                    <circle
                      cx={NODE_WIDTH - 6}
                      cy={8}
                      r={4}
                      fill='#a855f7'
                    />
                  ) : null}

                  {/* Merge type badge */}
                  {node.type === 'merge' ? (
                    <text
                      x={6}
                      y={12}
                      fontSize={8}
                      fill='#a855f7'
                      fontWeight='bold'
                    >
                      M
                    </text>
                  ) : null}

                  {/* Collapse toggle button */}
                  {hasChildren && !mergeMode ? (
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCollapse(node.id);
                      }}
                      className='cursor-pointer'
                    >
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
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    );
  },
);
