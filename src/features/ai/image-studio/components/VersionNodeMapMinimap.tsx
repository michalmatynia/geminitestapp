'use client';

import React, { useCallback, useRef } from 'react';

import { NODE_HEIGHT, NODE_WIDTH } from '../utils/version-graph';

import type { VersionEdge, VersionNode } from '../context/VersionGraphContext';

// ── Constants ────────────────────────────────────────────────────────────────

const MINIMAP_W = 120;
const MINIMAP_H = 80;
const DOT_R = 3;
const PADDING = 8;

// ── Component ────────────────────────────────────────────────────────────────

export interface VersionNodeMapMinimapProps {
  nodes: VersionNode[];
  edges: VersionEdge[];
  selectedNodeId: string | null;
  pan: { x: number; y: number };
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  onPanTo: (x: number, y: number) => void;
}

export function VersionNodeMapMinimap({
  nodes,
  edges,
  selectedNodeId,
  pan,
  zoom,
  viewportWidth,
  viewportHeight,
  onPanTo,
}: VersionNodeMapMinimapProps): React.JSX.Element | null {
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute graph bounds
  const offsetX = 200;
  const offsetY = 40;

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

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickMiniX = e.clientX - rect.left;
      const clickMiniY = e.clientY - rect.top;

      // Convert back to world coords
      const worldX = (clickMiniX - PADDING) / scale + minX;
      const worldY = (clickMiniY - PADDING) / scale + minY;

      // Center viewport on this point
      const newPanX = viewportWidth / 2 - worldX * zoom;
      const newPanY = viewportHeight / 2 - worldY * zoom;
      onPanTo(newPanX, newPanY);
    },
    [scale, minX, minY, viewportWidth, viewportHeight, zoom, onPanTo],
  );

  return (
    <svg
      ref={svgRef}
      width={MINIMAP_W}
      height={MINIMAP_H}
      className='cursor-crosshair rounded border border-border/40 bg-card/90 backdrop-blur-sm'
      onClick={handleClick}
    >
      {/* Edges */}
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
            stroke='#4b5563'
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

      {/* Viewport indicator */}
      <rect
        x={vpMiniX}
        y={vpMiniY}
        width={Math.max(vpMiniW, 4)}
        height={Math.max(vpMiniH, 4)}
        fill='white'
        fillOpacity={0.08}
        stroke='white'
        strokeOpacity={0.3}
        strokeWidth={1}
        rx={1}
      />
    </svg>
  );
}
