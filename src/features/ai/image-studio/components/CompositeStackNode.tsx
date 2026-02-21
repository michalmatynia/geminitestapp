'use client';

import React, { useCallback, useRef, useState } from 'react';

import { NODE_WIDTH, COMPOSITE_LAYER_ROW_HEIGHT, getCompositeNodeHeight } from '../utils/version-graph';

import type { VersionNode } from '../context/VersionGraphContext';
import type { CompositeLayerConfig } from '@/shared/contracts/image-studio';

// ── Constants ────────────────────────────────────────────────────────────────

const LAYER_THUMB_SIZE = 16;
const LAYER_PADDING_X = 6;
const LAYER_LABEL_MAX = 8;
const BADGE_FONT_SIZE = 8;
const DROP_INDICATOR_COLOR = '#14b8a6';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CompositeStackNodeProps {
  node: VersionNode;
  isSelected: boolean;
  isHovered: boolean;
  layers: CompositeLayerConfig[];
  zoom?: number | undefined;
  getSlotLabel: (slotId: string) => string;
  getSlotImageSrc: (slotId: string) => string | null;
  onReorderLayer: (fromIndex: number, toIndex: number) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CompositeStackNode({
  node,
  isSelected,
  isHovered,
  layers,
  zoom = 1,
  getSlotLabel,
  getSlotImageSrc,
  onReorderLayer,
}: CompositeStackNodeProps): React.JSX.Element {
  const totalHeight = getCompositeNodeHeight(layers.length);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragStartY = useRef<number>(0);
  const layerStartY = 56; // Below thumbnail area

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.stopPropagation();
      setDragIndex(index);
      setDropIndex(index);
      dragStartY.current = e.clientY;
      (e.target as SVGElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragIndex === null) return;
      // Divide by zoom to compensate for canvas scale
      const deltaY = (e.clientY - dragStartY.current) / zoom;
      const rawTarget = dragIndex + Math.round(deltaY / COMPOSITE_LAYER_ROW_HEIGHT);
      const clampedTarget = Math.max(0, Math.min(layers.length - 1, rawTarget));
      setDropIndex(clampedTarget);
    },
    [dragIndex, layers.length, zoom],
  );

  const handlePointerUp = useCallback(() => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      onReorderLayer(dragIndex, dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, dropIndex, onReorderLayer]);

  return (
    <>
      {/* Background */}
      <rect
        x={0}
        y={0}
        width={NODE_WIDTH}
        height={totalHeight}
        rx={8}
        ry={8}
        strokeWidth={isSelected ? 2 : 1}
        className={
          isSelected
            ? 'fill-card/80 stroke-yellow-400'
            : 'fill-card/80 stroke-teal-400/60'
        }
      />

      {/* Teal accent bar at top */}
      <rect
        x={0}
        y={0}
        width={NODE_WIDTH}
        height={3}
        rx={2}
        fill='#14b8a6'
        fillOpacity={0.7}
      />

      {/* "C" badge top-left */}
      <text
        x={LAYER_PADDING_X}
        y={12}
        fontSize={BADGE_FONT_SIZE}
        fill='#14b8a6'
        fontWeight='bold'
      >
        C
      </text>

      {/* Node label */}
      <text
        x={NODE_WIDTH / 2}
        y={24}
        textAnchor='middle'
        fill='#d1d5db'
        fontSize={9}
        fontWeight='500'
      >
        {node.label.length > 10 ? `${node.label.slice(0, 9)}...` : node.label}
      </text>

      {/* Layer count */}
      <text
        x={NODE_WIDTH / 2}
        y={38}
        textAnchor='middle'
        fill='#14b8a6'
        fontSize={7}
        fillOpacity={0.8}
      >
        {layers.length} layers
      </text>

      {/* Separator */}
      <line
        x1={4}
        y1={layerStartY - 6}
        x2={NODE_WIDTH - 4}
        y2={layerStartY - 6}
        stroke='#4b5563'
        strokeWidth={0.5}
        strokeOpacity={0.5}
      />

      {/* Layer rows */}
      {layers.map((layer, index) => {
        const rowY = layerStartY + index * COMPOSITE_LAYER_ROW_HEIGHT;
        const label = getSlotLabel(layer.slotId);
        const imgSrc = getSlotImageSrc(layer.slotId);
        const isDragging = dragIndex === index;

        return (
          <g
            key={layer.slotId}
            style={{
              opacity: isDragging ? 0.5 : 1,
              cursor: 'grab',
            }}
            onPointerDown={(e) => handlePointerDown(e, index)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Row background on hover */}
            {isHovered ? (
              <rect
                x={2}
                y={rowY}
                width={NODE_WIDTH - 4}
                height={COMPOSITE_LAYER_ROW_HEIGHT - 2}
                rx={3}
                fill='#374151'
                fillOpacity={0.3}
              />
            ) : null}

            {/* Layer thumbnail */}
            {imgSrc ? (
              <image
                href={imgSrc}
                x={LAYER_PADDING_X}
                y={rowY + 2}
                width={LAYER_THUMB_SIZE}
                height={LAYER_THUMB_SIZE}
                preserveAspectRatio='xMidYMid slice'
                clipPath='inset(0 round 2px)'
              />
            ) : (
              <rect
                x={LAYER_PADDING_X}
                y={rowY + 2}
                width={LAYER_THUMB_SIZE}
                height={LAYER_THUMB_SIZE}
                rx={2}
                fill='#374151'
                fillOpacity={0.5}
              />
            )}

            {/* Layer label */}
            <text
              x={LAYER_PADDING_X + LAYER_THUMB_SIZE + 4}
              y={rowY + 13}
              fill='#9ca3af'
              fontSize={7}
            >
              {label.length > LAYER_LABEL_MAX
                ? `${label.slice(0, LAYER_LABEL_MAX - 1)}…`
                : label}
            </text>

            {/* Order number */}
            <text
              x={NODE_WIDTH - 8}
              y={rowY + 13}
              textAnchor='end'
              fill='#6b7280'
              fontSize={6}
            >
              {index + 1}
            </text>
          </g>
        );
      })}

      {/* Drop indicator line */}
      {dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex ? (
        <line
          x1={4}
          y1={layerStartY + dropIndex * COMPOSITE_LAYER_ROW_HEIGHT - 1}
          x2={NODE_WIDTH - 4}
          y2={layerStartY + dropIndex * COMPOSITE_LAYER_ROW_HEIGHT - 1}
          stroke={DROP_INDICATOR_COLOR}
          strokeWidth={2}
          strokeLinecap='round'
        />
      ) : null}
    </>
  );
}
