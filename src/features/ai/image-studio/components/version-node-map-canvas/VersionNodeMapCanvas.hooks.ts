'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  CONTENT_OFFSET_X,
  CONTENT_OFFSET_Y,
  NODE_HEIGHT,
  NODE_WIDTH,
} from '@/features/ai/image-studio/utils/version-graph';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  MAX_WHEEL_ZOOM_DELTA,
  MIN_WHEEL_ZOOM_DELTA,
  WHEEL_ZOOM_SENSITIVITY,
} from './VersionNodeMapCanvas.constants';
import type { VersionNode } from '../../context/VersionGraphContext';

export function useVersionNodeMapCanvasViewport({
  nodes,
  zoom,
  onZoomChange,
  svgRef,
}: {
  nodes: VersionNode[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(zoom);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null
  );
  const [smoothTransition, setSmoothTransition] = useState(false);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const fitToView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || nodes.length === 0) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

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
  }, [nodes, onZoomChange, svgRef]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      if ((e.target as SVGElement).closest('[data-node-id]')) return;
      dragRef.current = { startX: e.clientX, startY: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [svgRef]
  );

  const handlePointerMove = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;

    const handleNativeWheel = (event: WheelEvent): void => {
      event.preventDefault();
      event.stopPropagation();

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
  }, [onZoomChange, svgRef]);

  return {
    pan,
    setPan,
    panRef,
    zoomRef,
    smoothTransition,
    setSmoothTransition,
    fitToView,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
