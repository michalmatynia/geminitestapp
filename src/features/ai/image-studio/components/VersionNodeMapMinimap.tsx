'use client';

import React, { useCallback, useRef, useState } from 'react';

import { useVersionNodeMapContext } from './VersionNodeMapContext';
import { CONTENT_OFFSET_X, CONTENT_OFFSET_Y, NODE_HEIGHT, NODE_WIDTH } from '../utils/version-graph';

import type { VersionEdge } from '../context/VersionGraphContext';

// ── Constants ────────────────────────────────────────────────────────────────

const MINIMAP_W = 120;
const MINIMAP_H = 80;
const DOT_R = 3;
const PADDING = 8;

// ── Edge color by type ───────────────────────────────────────────────────────

const EDGE_COLORS: Record<VersionEdge['type'], string> = {
  generation: '#34d399',
  merge: '#a855f7',
  composite: '#14b8a6',
};

export function VersionNodeMapMinimap(): React.JSX.Element | null {
  const {
    nodes,
    edges,
    selectedNodeId,
    pan,
    zoom,
    viewportWidth,
    viewportHeight,
    onPanTo,
  } = useVersionNodeMapContext();

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  // Compute graph bounds
  const offsetX = CONTENT_OFFSET_X;
  const offsetY = CONTENT_OFFSET_Y;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const nx = n.x + offsetX - NODE_WIDTH / 2;
    const ny = n.y + offsetY - NODE_HEIGHT / 2;
    if (nx < minX) minX = nx;
    if (ny < minY) minY = ny;
    if (nx + NODE_WIDTH > maxX) maxX = nx + NODE_WIDTH;
    if (ny + NODE_HEIGHT > maxY) maxY = ny + NODE_HEIGHT;
  }

  if (nodes.length === 0) return null;

  const graphW = maxX - minX || 1;
  const graphH = maxY - minY || 1;

  // Scale to fit minimap
  const scale = Math.min(
    (MINIMAP_W - PADDING * 2) / graphW,
    (MINIMAP_H - PADDING * 2) / graphH,
  );

  const toMiniX = (wx: number) => PADDING + (wx - minX) * scale;
  const toMiniY = (wy: number) => PADDING + (wy - minY) * scale;

  // Viewport rect in world coords
  const vpWorldX = -pan.x / zoom;
  const vpWorldY = -pan.y / zoom;
  const vpWorldW = viewportWidth / zoom;
  const vpWorldH = viewportHeight / zoom;

  const vpMiniX = toMiniX(vpWorldX);
  const vpMiniY = toMiniY(vpWorldY);
  const vpMiniW = vpWorldW * scale;
  const vpMiniH = vpWorldH * scale;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Convert minimap coords to pan values and center viewport
  const panFromMiniCoords = useCallback(
    (miniX: number, miniY: number) => {
      const worldX = (miniX - PADDING) / scale + minX;
      const worldY = (miniY - PADDING) / scale + minY;
      const newPanX = viewportWidth / 2 - worldX * zoom;
      const newPanY = viewportHeight / 2 - worldY * zoom;
      onPanTo(newPanX, newPanY);
    },
    [scale, minX, minY, viewportWidth, viewportHeight, zoom, onPanTo],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (dragging) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      panFromMiniCoords(e.clientX - rect.left, e.clientY - rect.top);
    },
    [dragging, panFromMiniCoords],
  );

  // Drag-to-pan on viewport rect
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      e.stopPropagation();
      e.preventDefault();
      setDragging(true);
      (e.target as SVGRectElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!dragging) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      panFromMiniCoords(e.clientX - rect.left, e.clientY - rect.top);
    },
    [dragging, panFromMiniCoords],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <svg
      ref={svgRef}
      width={MINIMAP_W}
      height={MINIMAP_H}
      className='cursor-crosshair rounded border border-border/40 bg-card/90 backdrop-blur-sm'
      onClick={handleClick}
    >
      {/* Edges — colored by type */}
      {edges.map((edge) => {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) return null;
        return (
          <line
            key={edge.id}
            x1={toMiniX(source.x + offsetX)}
            y1={toMiniY(source.y + offsetY)}
            x2={toMiniX(target.x + offsetX)}
            y2={toMiniY(target.y + offsetY)}
            stroke={EDGE_COLORS[edge.type] ?? '#4b5563'}
            strokeWidth={0.5}
            strokeOpacity={0.6}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const cx = toMiniX(n.x + offsetX);
        const cy = toMiniY(n.y + offsetY);
        const fill = n.id === selectedNodeId
          ? '#facc15'
          : n.type === 'composite'
            ? '#14b8a6'
            : n.type === 'merge'
              ? '#a855f7'
              : n.type === 'generation'
                ? '#34d399'
                : '#60a5fa';
        return (
          <circle
            key={n.id}
            cx={cx}
            cy={cy}
            r={DOT_R}
            fill={fill}
            fillOpacity={0.8}
          />
        );
      })}

      {/* Viewport indicator — draggable */}
      <rect
        x={vpMiniX}
        y={vpMiniY}
        width={Math.max(vpMiniW, 4)}
        height={Math.max(vpMiniH, 4)}
        fill='white'
        fillOpacity={0.08}
        stroke='white'
        strokeOpacity={dragging ? 0.6 : 0.3}
        strokeWidth={dragging ? 1.5 : 1}
        rx={1}
        style={{ cursor: 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </svg>
  );
}
