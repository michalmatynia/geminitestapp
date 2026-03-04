'use client';

import { useCallback, useState } from 'react';
import {
  AiNode,
  VIEW_MARGIN,
  NODE_WIDTH,
  NODE_MIN_HEIGHT,
  clampScale,
  clampTranslate,
} from '@/shared/lib/ai-paths';

export function useCanvasView(viewportRef: React.RefObject<HTMLDivElement | null>) {
  const [view, setView] = useState({ x: -600, y: -320, scale: 1 });
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const setViewClamped = useCallback(
    (next: { x: number; y: number; scale: number }): void => {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      const clampedScale = clampScale(next.scale);
      const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
      setView({ x: clamped.x, y: clamped.y, scale: clampedScale });
    },
    [viewportRef]
  );

  const zoomTo = useCallback(
    (targetScale: number): void => {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) {
        setViewClamped({ ...view, scale: targetScale });
        return;
      }
      const centerX = viewport.width / 2;
      const centerY = viewport.height / 2;
      const nextScale = clampScale(targetScale);
      const canvasX = (centerX - view.x) / view.scale;
      const canvasY = (centerY - view.y) / view.scale;
      const nextX = centerX - canvasX * nextScale;
      const nextY = centerY - canvasY * nextScale;
      const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
      setView({ x: clamped.x, y: clamped.y, scale: nextScale });
    },
    [view, setViewClamped, viewportRef]
  );

  const resetView = useCallback((): void => {
    setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  }, [setViewClamped]);

  const fitToNodes = useCallback(
    (nodes: AiNode[]): void => {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport || nodes.length === 0) {
        resetView();
        return;
      }
      const padding = 120;
      const bounds = nodes.reduce(
        (acc: { minX: number; minY: number; maxX: number; maxY: number }, node: AiNode) => {
          const pos = node.position ?? { x: 0, y: 0 };
          const x1 = pos.x;
          const y1 = pos.y;
          const x2 = pos.x + NODE_WIDTH;
          const y2 = pos.y + NODE_MIN_HEIGHT;
          return {
            minX: Math.min(acc.minX, x1),
            minY: Math.min(acc.minY, y1),
            maxX: Math.max(acc.maxX, x2),
            maxY: Math.max(acc.maxY, y2),
          };
        },
        {
          minX: Number.POSITIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
        }
      );
      const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
      const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
      const scaleX = viewport.width / width;
      const scaleY = viewport.height / height;
      const nextScale = clampScale(Math.min(scaleX, scaleY));
      const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
      const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
      const nextX = viewport.width / 2 - centerX * nextScale;
      const nextY = viewport.height / 2 - centerY * nextScale;
      const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
      setView({ x: clamped.x, y: clamped.y, scale: nextScale });
    },
    [resetView, viewportRef]
  );

  const ensureNodeVisible = useCallback(
    (node: AiNode): void => {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return;
      const pos = node.position ?? { x: 0, y: 0 };
      const nodeLeft = pos.x * view.scale + view.x;
      const nodeTop = pos.y * view.scale + view.y;
      const nodeRight = nodeLeft + NODE_WIDTH * view.scale;
      const nodeBottom = nodeTop + NODE_MIN_HEIGHT * view.scale;
      let nextX = view.x;
      let nextY = view.y;
      if (nodeLeft < VIEW_MARGIN) {
        nextX += VIEW_MARGIN - nodeLeft;
      } else if (nodeRight > viewport.width - VIEW_MARGIN) {
        nextX -= nodeRight - (viewport.width - VIEW_MARGIN);
      }
      if (nodeTop < VIEW_MARGIN) {
        nextY += VIEW_MARGIN - nodeTop;
      } else if (nodeBottom > viewport.height - VIEW_MARGIN) {
        nextY -= nodeBottom - (viewport.height - VIEW_MARGIN);
      }
      const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
      setView({ x: clamped.x, y: clamped.y, scale: view.scale });
    },
    [view, viewportRef]
  );

  const handlePanStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      if (event.button !== 0 && event.button !== 1) return;
      if ((event.target as HTMLElement).closest('[data-node-id]')) return;
      setPanState({
        startX: event.clientX,
        startY: event.clientY,
        originX: view.x,
        originY: view.y,
      });
    },
    [view.x, view.y]
  );

  const handlePanMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      if (!panState) return;
      const dx = event.clientX - panState.startX;
      const dy = event.clientY - panState.startY;
      setViewClamped({
        ...view,
        x: panState.originX + dx,
        y: panState.originY + dy,
      });
    },
    [panState, setViewClamped, view]
  );

  const handlePanEnd = useCallback((): void => {
    setPanState(null);
  }, []);

  const getCanvasCenterPosition = useCallback((): { x: number; y: number } => {
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return { x: 0, y: 0 };
    return {
      x: (viewport.width / 2 - view.x) / view.scale,
      y: (viewport.height / 2 - view.y) / view.scale,
    };
  }, [view, viewportRef]);

  return {
    view,
    setView,
    panState,
    zoomTo,
    fitToNodes,
    resetView,
    ensureNodeVisible,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    getCanvasCenterPosition,
  };
}
