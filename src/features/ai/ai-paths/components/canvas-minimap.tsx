'use client';

import React from 'react';

import type { AiNode } from '@/shared/lib/ai-paths';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  clampScale,
} from '@/shared/lib/ai-paths';

import type { EdgePath } from '../context/hooks/useEdgePaths';
import { useCanvasBoardUI } from './CanvasBoardUIContext';

const MINIMAP_WIDTH_PX = 220;
const MINIMAP_HEIGHT_PX = 132;
const MAX_MINIMAP_EDGE_RENDER_COUNT = 1400;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const CanvasMinimap = React.memo(function CanvasMinimap(): React.JSX.Element {
  const {
    nodes,
    edgePaths,
    selectedNodeIdSet,
    view,
    viewportSize,
    centerOnCanvasPoint: onNavigate,
    zoomTo: onZoomTo,
  } = useCanvasBoardUI();

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = React.useState<
    | {
        mode: 'navigate';
        pointerId: number;
      }
    | {
        mode: 'viewport';
        pointerId: number;
        centerOffsetX: number;
        centerOffsetY: number;
      }
    | null
  >(null);

  const viewportRect = React.useMemo((): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null => {
    if (!viewportSize || view.scale <= 0) return null;
    return {
      x: -view.x / view.scale,
      y: -view.y / view.scale,
      width: viewportSize.width / view.scale,
      height: viewportSize.height / view.scale,
    };
  }, [view.scale, view.x, view.y, viewportSize]);

  const resolveCanvasPoint = React.useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const rect = svgRef.current?.getBoundingClientRect() ?? null;
      if (!rect || rect.width <= 0 || rect.height <= 0) return null;
      const localX = clamp(clientX - rect.left, 0, rect.width);
      const localY = clamp(clientY - rect.top, 0, rect.height);
      return {
        x: (localX / rect.width) * CANVAS_WIDTH,
        y: (localY / rect.height) * CANVAS_HEIGHT,
      };
    },
    []
  );

  const minimapEdgePaths = React.useMemo((): EdgePath[] => {
    if (edgePaths.length <= MAX_MINIMAP_EDGE_RENDER_COUNT) return edgePaths;
    const step = Math.ceil(edgePaths.length / MAX_MINIMAP_EDGE_RENDER_COUNT);
    return edgePaths.filter((_, index: number): boolean => index % step === 0);
  }, [edgePaths]);

  const minimapNodes = React.useMemo((): AiNode[] => {
    const seenNodeIds = new Set<string>();
    return nodes.filter((node: AiNode): boolean => {
      if (seenNodeIds.has(node.id)) return false;
      seenNodeIds.add(node.id);
      return true;
    });
  }, [nodes]);

  return (
    <div
      className='absolute right-4 top-4 z-20 rounded-md border border-border/60 bg-card/45 p-1.5 backdrop-blur'
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <svg
        ref={svgRef}
        className='block cursor-crosshair select-none rounded-sm'
        width={MINIMAP_WIDTH_PX}
        height={MINIMAP_HEIGHT_PX}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        onWheel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const zoomFactor = Math.exp(-event.deltaY * 0.0018);
          onZoomTo(clampScale(view.scale * zoomFactor));
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const nextPoint = resolveCanvasPoint(event.clientX, event.clientY);
          if (!nextPoint) return;
          const target = event.target as Element | null;
          const role = target?.getAttribute('data-minimap-role');
          if (role === 'viewport' && viewportRect) {
            const centerX = viewportRect.x + viewportRect.width / 2;
            const centerY = viewportRect.y + viewportRect.height / 2;
            setDragState({
              mode: 'viewport',
              pointerId: event.pointerId,
              centerOffsetX: nextPoint.x - centerX,
              centerOffsetY: nextPoint.y - centerY,
            });
          } else {
            setDragState({ mode: 'navigate', pointerId: event.pointerId });
            onNavigate(nextPoint.x, nextPoint.y);
          }
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragState?.pointerId !== event.pointerId) return;
          event.preventDefault();
          event.stopPropagation();
          const nextPoint = resolveCanvasPoint(event.clientX, event.clientY);
          if (!nextPoint) return;
          if (dragState.mode === 'viewport') {
            onNavigate(
              nextPoint.x - dragState.centerOffsetX,
              nextPoint.y - dragState.centerOffsetY
            );
            return;
          }
          onNavigate(nextPoint.x, nextPoint.y);
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragState(null);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragState(null);
          try {
            event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            // no-op for stale pointer captures
          }
        }}
      >
        <rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill='rgba(15, 23, 42, 0.78)'
          stroke='rgba(148, 163, 184, 0.35)'
          strokeWidth={18}
          rx={20}
          ry={20}
        />
        {minimapEdgePaths.map(
          (edge: EdgePath): React.JSX.Element => (
            <path
              key={`minimap-edge-${edge.id}`}
              d={edge.path}
              stroke='rgba(148, 163, 184, 0.32)'
              strokeWidth={6}
              fill='none'
              strokeLinecap='round'
              strokeLinejoin='round'
              pointerEvents='none'
            />
          )
        )}
        {minimapNodes.map((node: AiNode): React.JSX.Element => {
          const isSelected = selectedNodeIdSet.has(node.id);
          return (
            <rect
              key={`minimap-node-${node.id}`}
              data-minimap-node-id={node.id}
              x={node.position.x}
              y={node.position.y}
              width={NODE_WIDTH}
              height={NODE_MIN_HEIGHT}
              rx={10}
              ry={10}
              fill={isSelected ? 'rgba(125, 211, 252, 0.7)' : 'rgba(148, 163, 184, 0.45)'}
              stroke={isSelected ? 'rgba(186, 230, 253, 0.95)' : 'rgba(148, 163, 184, 0.72)'}
              strokeWidth={isSelected ? 8 : 4}
            />
          );
        })}
        {viewportRect ? (
          <>
            <rect
              data-minimap-role='viewport'
              x={viewportRect.x}
              y={viewportRect.y}
              width={viewportRect.width}
              height={viewportRect.height}
              fill='rgba(56, 189, 248, 0.14)'
              stroke='rgba(56, 189, 248, 0.9)'
              strokeWidth={12}
              rx={6}
              ry={6}
              style={{ cursor: 'grab' }}
            />
            <circle
              cx={viewportRect.x + viewportRect.width / 2}
              cy={viewportRect.y + viewportRect.height / 2}
              r={14}
              fill='rgba(56, 189, 248, 0.86)'
              pointerEvents='none'
            />
          </>
        ) : null}
      </svg>
    </div>
  );
});
