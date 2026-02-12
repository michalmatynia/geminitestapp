'use client';

import {
  Brush,
  Check,
  Circle,
  Lasso,
  MousePointer2,
  Pentagon,
  RectangleHorizontal,
  RotateCcw,
  Trash2,
  Unlink,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { VectorPoint, VectorShape, VectorShapeType, VectorToolMode } from '@/shared/types/domain/vector';
import { cn } from '@/shared/utils';

import { Button } from './button';
import { Tooltip } from './tooltip';

export { type VectorPoint, type VectorShape, type VectorShapeType, type VectorToolMode };

export const DEFAULT_VECTOR_VIEWBOX = 1000;

const formatPathNumber = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Number.isFinite(rounded) ? String(rounded) : '0';
};

const toSvgCoord = (value: number, viewBoxSize: number): number => value * viewBoxSize;

export function vectorShapeToPath(shape: VectorShape, viewBoxSize = DEFAULT_VECTOR_VIEWBOX): string | null {
  if (!shape.visible || shape.points.length === 0) return null;
  if (shape.type === 'rect' && shape.points.length >= 2) {
    const a = shape.points[0]!;
    const b = shape.points[1]!;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const x1 = formatPathNumber(toSvgCoord(minX, viewBoxSize));
    const x2 = formatPathNumber(toSvgCoord(maxX, viewBoxSize));
    const y1 = formatPathNumber(toSvgCoord(minY, viewBoxSize));
    const y2 = formatPathNumber(toSvgCoord(maxY, viewBoxSize));
    return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`;
  }
  if (shape.type === 'ellipse' && shape.points.length >= 2) {
    const a = shape.points[0]!;
    const b = shape.points[1]!;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const rx = Math.abs(a.x - b.x) / 2;
    const ry = Math.abs(a.y - b.y) / 2;
    if (rx === 0 || ry === 0) return null;
    const cySvg = formatPathNumber(toSvgCoord(cy, viewBoxSize));
    const rxSvg = formatPathNumber(toSvgCoord(rx, viewBoxSize));
    const rySvg = formatPathNumber(toSvgCoord(ry, viewBoxSize));
    const startX = formatPathNumber(toSvgCoord(cx + rx, viewBoxSize));
    return `M ${startX} ${cySvg} A ${rxSvg} ${rySvg} 0 1 0 ${formatPathNumber(toSvgCoord(cx - rx, viewBoxSize))} ${cySvg} A ${rxSvg} ${rySvg} 0 1 0 ${startX} ${cySvg} Z`;
  }

  const points = shape.points;
  const start = points[0]!;
  const commands: string[] = [
    `M ${formatPathNumber(toSvgCoord(start.x, viewBoxSize))} ${formatPathNumber(toSvgCoord(start.y, viewBoxSize))}`,
  ];
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i]!;
    commands.push(`L ${formatPathNumber(toSvgCoord(p.x, viewBoxSize))} ${formatPathNumber(toSvgCoord(p.y, viewBoxSize))}`);
  }
  if (shape.closed && points.length >= 3) commands.push('Z');
  return commands.join(' ');
}

export function vectorShapesToPath(shapes: VectorShape[], viewBoxSize = DEFAULT_VECTOR_VIEWBOX): string {
  return shapes
    .map((shape) => vectorShapeToPath(shape, viewBoxSize))
    .filter((value): value is string => Boolean(value))
    .join(' ');
}

export function vectorShapeToPathWithBounds(
  shape: VectorShape,
  width: number,
  height: number
): string | null {
  if (!shape.visible || shape.points.length === 0) return null;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (shape.type === 'rect' && shape.points.length >= 2) {
    const a = shape.points[0]!;
    const b = shape.points[1]!;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const x1 = formatPathNumber(minX * width);
    const x2 = formatPathNumber(maxX * width);
    const y1 = formatPathNumber(minY * height);
    const y2 = formatPathNumber(maxY * height);
    return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`;
  }
  if (shape.type === 'ellipse' && shape.points.length >= 2) {
    const a = shape.points[0]!;
    const b = shape.points[1]!;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const rx = Math.abs(a.x - b.x) / 2;
    const ry = Math.abs(a.y - b.y) / 2;
    if (rx === 0 || ry === 0) return null;
    const cySvg = formatPathNumber(cy * height);
    const rxSvg = formatPathNumber(rx * width);
    const rySvg = formatPathNumber(ry * height);
    const startX = formatPathNumber((cx + rx) * width);
    const endX = formatPathNumber((cx - rx) * width);
    return `M ${startX} ${cySvg} A ${rxSvg} ${rySvg} 0 1 0 ${endX} ${cySvg} A ${rxSvg} ${rySvg} 0 1 0 ${startX} ${cySvg} Z`;
  }

  const points = shape.points;
  const start = points[0]!;
  const commands: string[] = [
    `M ${formatPathNumber(start.x * width)} ${formatPathNumber(start.y * height)}`,
  ];
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i]!;
    commands.push(`L ${formatPathNumber(p.x * width)} ${formatPathNumber(p.y * height)}`);
  }
  if (shape.closed && points.length >= 3) commands.push('Z');
  return commands.join(' ');
}

export function vectorShapesToPathWithBounds(
  shapes: VectorShape[],
  width: number,
  height: number
): string {
  return shapes
    .map((shape) => vectorShapeToPathWithBounds(shape, width, height))
    .filter((value): value is string => Boolean(value))
    .join(' ');
}

export interface VectorCanvasProps {
  src?: string | null;
  tool: VectorToolMode;
  shapes: VectorShape[];
  activeShapeId: string | null;
  selectedPointIndex: number | null;
  onChange: (nextShapes: VectorShape[]) => void;
  onSelectShape: (id: string | null) => void;
  onSelectPoint?: (index: number | null) => void;
  brushRadius: number;
  allowWithoutImage?: boolean;
  showEmptyState?: boolean;
  emptyStateLabel?: string;
  maskPreviewEnabled?: boolean;
  maskPreviewShapes?: VectorShape[];
  maskPreviewInvert?: boolean;
  maskPreviewOpacity?: number;
  maskPreviewFeather?: number;
  className?: string;
}

export function VectorCanvas({
  src,
  tool,
  shapes,
  activeShapeId,
  selectedPointIndex,
  onChange,
  onSelectShape,
  onSelectPoint,
  brushRadius,
  allowWithoutImage = false,
  showEmptyState = true,
  emptyStateLabel = 'Select an image slot to preview.',
  maskPreviewEnabled = false,
  maskPreviewShapes = [],
  maskPreviewInvert = false,
  maskPreviewOpacity = 0.48,
  maskPreviewFeather = 0,
  className,
}: VectorCanvasProps): React.JSX.Element {
  const SHAPE_VIEWBOX_SIZE = 1000;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ shapeId: string; pointIndex: number } | null>(null);
  const dragShapeRef = useRef<{ shapeId: string; lastPoint: VectorPoint } | null>(null);
  const drawingRef = useRef<{ shapeId: string; type: VectorShapeType } | null>(null);

  // --- Zoom & Pan ---
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewTransform, setViewTransform] = useState({ scale: 1, panX: 0, panY: 0 });
  const viewTransformRef = useRef(viewTransform);
  viewTransformRef.current = viewTransform;
  const panningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const spaceDownRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isHoveringEditablePoint, setIsHoveringEditablePoint] = useState(false);
  const [isDraggingEditablePoint, setIsDraggingEditablePoint] = useState(false);
  const [canvasRenderSize, setCanvasRenderSize] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const panRafIdRef = useRef<number>(0);
  const pendingPanRef = useRef<{ panX: number; panY: number } | null>(null);

  // --- rAF draw batching ---
  const rafIdRef = useRef<number>(0);
  const drawRef = useRef<(() => void) | null>(null);

  const scheduleDraw = useCallback((): void => {
    if (rafIdRef.current) return; // Already queued
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0;
      drawRef.current?.();
    });
  }, []);

  // Clean up pending rAF on unmount
  useEffect(() => {
    return (): void => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (panRafIdRef.current) cancelAnimationFrame(panRafIdRef.current);
    };
  }, []);

  const schedulePanUpdate = useCallback((panX: number, panY: number): void => {
    pendingPanRef.current = { panX, panY };
    if (panRafIdRef.current) return;
    panRafIdRef.current = requestAnimationFrame(() => {
      panRafIdRef.current = 0;
      const pending = pendingPanRef.current;
      if (!pending) return;
      setViewTransform((prev) => ({ ...prev, panX: pending.panX, panY: pending.panY }));
    });
  }, []);

  const beginPan = useCallback((clientX: number, clientY: number): void => {
    panningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      x: clientX,
      y: clientY,
      panX: viewTransformRef.current.panX,
      panY: viewTransformRef.current.panY,
    };
  }, []);

  const stopPan = useCallback((): void => {
    if (panningRef.current) {
      panningRef.current = false;
    }
    setIsPanning(false);
  }, []);

  const updatePanFromPointer = useCallback(
    (clientX: number, clientY: number): void => {
      if (!panningRef.current) return;
      const dx = clientX - panStartRef.current.x;
      const dy = clientY - panStartRef.current.y;
      schedulePanUpdate(
        panStartRef.current.panX + dx,
        panStartRef.current.panY + dy
      );
    },
    [schedulePanUpdate]
  );

  const canDraw = allowWithoutImage || Boolean(src);

  const getInteractionRect = useCallback((): DOMRect | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width >= 8 && canvasRect.height >= 8) {
      return canvasRect;
    }
    const containerRect = containerRef.current?.getBoundingClientRect() ?? null;
    if (!containerRect) return canvasRect;
    return containerRect;
  }, []);

  const draw = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const toPx = (p: VectorPoint): { x: number; y: number } => ({
      x: p.x * canvas.width,
      y: p.y * canvas.height,
    });

    const drawMaskPath = (shape: VectorShape): boolean => {
      if (!shape.visible || shape.points.length === 0) return false;

      if (shape.type === 'rect') {
        if (shape.points.length < 2) return false;
        const a = toPx(shape.points[0]!);
        const b = toPx(shape.points[1]!);
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const w = Math.abs(a.x - b.x);
        const h = Math.abs(a.y - b.y);
        if (w <= 0 || h <= 0) return false;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        return true;
      }

      if (shape.type === 'ellipse') {
        if (shape.points.length < 2) return false;
        const a = toPx(shape.points[0]!);
        const b = toPx(shape.points[1]!);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const rx = Math.abs(a.x - b.x) / 2;
        const ry = Math.abs(a.y - b.y) / 2;
        if (rx <= 0 || ry <= 0) return false;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        return true;
      }

      if (!shape.closed || shape.points.length < 3) return false;
      const first = toPx(shape.points[0]!);
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      shape.points.slice(1).forEach((p: VectorPoint) => {
        const px = toPx(p);
        ctx.lineTo(px.x, px.y);
      });
      ctx.closePath();
      return true;
    };

    const previewShapes = maskPreviewShapes.filter((shape: VectorShape) => shape.visible);
    if (maskPreviewEnabled && previewShapes.length > 0) {
      const opacity = Math.max(0, Math.min(maskPreviewOpacity, 1));
      const shade = `rgba(2, 6, 23, ${opacity})`;
      const featherPx = Math.max(0, Math.min(maskPreviewFeather, 100));
      ctx.save();
      if (featherPx > 0) {
        ctx.filter = `blur(${(featherPx / 100) * 6}px)`;
      }
      if (maskPreviewInvert) {
        ctx.fillStyle = shade;
        previewShapes.forEach((shape: VectorShape) => {
          if (drawMaskPath(shape)) {
            ctx.fill();
          }
        });
      } else {
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-out';
        previewShapes.forEach((shape: VectorShape) => {
          if (drawMaskPath(shape)) {
            ctx.fill();
          }
        });
      }
      ctx.restore();
    }

    shapes.forEach((shape: VectorShape) => {
      if (!shape.visible) return;
      if (shape.points.length === 0) return;
      const isActive = shape.id === activeShapeId;
      const isMaskEligible =
        (shape.type === 'polygon' || shape.type === 'lasso') &&
        shape.closed &&
        shape.points.length >= 3;
      const isNonMaskType = shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'brush';

      ctx.lineWidth = isActive ? 2.5 : 2;
      ctx.setLineDash([]);

      if (isMaskEligible) {
        // Mask-eligible: solid stroke + fill
        ctx.strokeStyle = isActive ? 'rgba(16, 185, 129, 0.95)' : 'rgba(56, 189, 248, 0.95)';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      } else if (isNonMaskType) {
        // Non-mask types: dashed orange stroke
        ctx.strokeStyle = isActive ? 'rgba(251, 146, 60, 0.95)' : 'rgba(251, 146, 60, 0.7)';
        ctx.fillStyle = 'rgba(251, 146, 60, 0.08)';
        ctx.setLineDash([6, 4]);
      } else {
        // Open polygon/lasso: dashed blue stroke, no fill
        ctx.strokeStyle = isActive ? 'rgba(34, 211, 238, 0.98)' : 'rgba(56, 189, 248, 0.9)';
        ctx.fillStyle = 'transparent';
        ctx.setLineDash([8, 4]);
      }

      ctx.beginPath();
      if (shape.type === 'rect' && shape.points.length >= 2) {
        const a = toPx(shape.points[0]!);
        const b = toPx(shape.points[1]!);
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const w = Math.abs(a.x - b.x);
        const h = Math.abs(a.y - b.y);
        ctx.rect(x, y, w, h);
      } else if (shape.type === 'ellipse' && shape.points.length >= 2) {
        const a = toPx(shape.points[0]!);
        const b = toPx(shape.points[1]!);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const rx = Math.abs(a.x - b.x) / 2;
        const ry = Math.abs(a.y - b.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      } else {
        const first = toPx(shape.points[0]!);
        ctx.moveTo(first.x, first.y);
        shape.points.slice(1).forEach((p: VectorPoint) => {
          const px = toPx(p);
          ctx.lineTo(px.x, px.y);
        });
      }

      if (shape.closed && shape.points.length >= 3) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw "M" badge on mask-eligible shapes
      if (isMaskEligible) {
        const firstPt = toPx(shape.points[0]!);
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
        ctx.fillText('M', firstPt.x + 8, firstPt.y - 6);
      }

      if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
        shape.points.forEach((p: VectorPoint, index: number) => {
          const px = toPx(p);
          const pointRadius = index === 0 ? 5.5 : 4.5;
          // Dark halo first, then bright core marker to keep points visible on any image.
          ctx.beginPath();
          ctx.arc(px.x, px.y, pointRadius + 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(px.x, px.y, pointRadius, 0, Math.PI * 2);
          const isSelected = isActive && index === (selectedPointIndex ?? -1);
          ctx.fillStyle = isSelected
            ? 'rgba(251, 191, 36, 0.98)'
            : (index === 0 ? 'rgba(16, 185, 129, 0.98)' : 'rgba(56, 189, 248, 0.98)');
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.stroke();
        });
      }
    });
  }, [
    activeShapeId,
    maskPreviewEnabled,
    maskPreviewFeather,
    maskPreviewInvert,
    maskPreviewOpacity,
    maskPreviewShapes,
    selectedPointIndex,
    shapes,
  ]);

  // Keep drawRef in sync with latest draw callback
  drawRef.current = draw;

  const syncCanvasSize = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const cw = Math.max(1, Math.round(containerRect.width));
    const ch = Math.max(1, Math.round(containerRect.height));

    let width = cw;
    let height = ch;

    if (src && imgRef.current) {
      const img = imgRef.current;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (nw > 0 && nh > 0) {
        const imageAspect = nw / nh;
        const containerAspect = cw / ch;
        if (imageAspect > containerAspect) {
          width = cw;
          height = Math.max(1, Math.round(cw / imageAspect));
        } else {
          height = ch;
          width = Math.max(1, Math.round(ch * imageAspect));
        }
      }
    }

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    setCanvasRenderSize((prev) =>
      prev.width === width && prev.height === height
        ? prev
        : { width, height }
    );
    scheduleDraw();
  }, [scheduleDraw, src]);

  useEffect(() => {
    syncCanvasSize();
  }, [syncCanvasSize, src, shapes.length]);

  useEffect(() => {
    if (!src) return;
    const imageElement = imgRef.current;
    if (!imageElement) return;
    if (imageElement.complete) {
      syncCanvasSize();
    }
  }, [src, syncCanvasSize]);

  useEffect(() => {
    setViewTransform({ scale: 1, panX: 0, panY: 0 });
    setIsPanning(false);
    panningRef.current = false;
  }, [src]);

  // Re-draw when shapes/selection/mask-preview change (draw callback updates)
  useEffect(() => {
    scheduleDraw();
  }, [draw, scheduleDraw]);

  useEffect(() => {
    const onResize = (): void => syncCanvasSize();
    window.addEventListener('resize', onResize);
    return (): void => window.removeEventListener('resize', onResize);
  }, [syncCanvasSize]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      syncCanvasSize();
    });
    observer.observe(containerRef.current);
    return (): void => observer.disconnect();
  }, [syncCanvasSize]);

  useEffect(() => {
    if (!isPanning) return;
    const onWindowMouseMove = (event: MouseEvent): void => {
      updatePanFromPointer(event.clientX, event.clientY);
    };
    const onWindowMouseUp = (): void => {
      stopPan();
    };
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return (): void => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isPanning, stopPan, updatePanFromPointer]);

  // --- Wheel zoom (attached with passive:false to prevent page scroll) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const prev = viewTransformRef.current;
      const zoomDelta = Math.max(-220, Math.min(220, e.deltaY));
      const factor = Math.exp(-zoomDelta * 0.00135);
      const newScale = Math.min(8, Math.max(0.5, prev.scale * factor));
      if (newScale === prev.scale) return;
      // Keep the point under cursor fixed
      const newPanX = mouseX - (mouseX - prev.panX) * (newScale / prev.scale);
      const newPanY = mouseY - (mouseY - prev.panY) * (newScale / prev.scale);
      setViewTransform({ scale: newScale, panX: newPanX, panY: newPanY });
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return (): void => container.removeEventListener('wheel', onWheel);
  }, []);

  // --- Space key for pan mode + zoom shortcuts ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      // Skip zoom shortcuts if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      const isTypingTarget = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      if (isTypingTarget) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        spaceDownRef.current = true;
      }
      // Zoom in: + or =
      if (!e.ctrlKey && !e.metaKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setViewTransform((prev) => {
          const newScale = Math.min(8, prev.scale * 1.2);
          // Zoom toward center of container
          const container = containerRef.current;
          if (!container) return { ...prev, scale: newScale };
          const rect = container.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          return {
            scale: newScale,
            panX: cx - (cx - prev.panX) * (newScale / prev.scale),
            panY: cy - (cy - prev.panY) * (newScale / prev.scale),
          };
        });
      }
      // Zoom out: -
      if (!e.ctrlKey && !e.metaKey && e.key === '-') {
        e.preventDefault();
        setViewTransform((prev) => {
          const newScale = Math.max(0.5, prev.scale / 1.2);
          const container = containerRef.current;
          if (!container) return { ...prev, scale: newScale };
          const rect = container.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          return {
            scale: newScale,
            panX: cx - (cx - prev.panX) * (newScale / prev.scale),
            panY: cy - (cy - prev.panY) * (newScale / prev.scale),
          };
        });
      }
      // Reset zoom: 0
      if (!e.ctrlKey && !e.metaKey && e.key === '0') {
        e.preventDefault();
        setViewTransform({ scale: 1, panX: 0, panY: 0 });
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
      }
    };
    const resetPanHotkeys = (): void => {
      spaceDownRef.current = false;
      panningRef.current = false;
      setIsPanning(false);
    };
    const onVisibilityChange = (): void => {
      if (document.hidden) {
        resetPanHotkeys();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', resetPanHotkeys);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return (): void => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', resetPanHotkeys);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const toPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>): VectorPoint | null => {
    const rect = getInteractionRect();
    if (!rect) return null;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }, [getInteractionRect]);

  const hitTestPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>): { shapeId: string; pointIndex: number } | null => {
    const rect = getInteractionRect();
    if (!rect) return null;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const radius = 8;
    for (const shape of shapes) {
      if (!shape.visible) continue;
      if (!(shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush')) continue;
      for (let idx = 0; idx < shape.points.length; idx += 1) {
        const p = shape.points[idx]!;
        const px = p.x * rect.width;
        const py = p.y * rect.height;
        if (Math.hypot(px - x, py - y) <= radius) {
          return { shapeId: shape.id, pointIndex: idx };
        }
      }
    }
    return null;
  }, [getInteractionRect, shapes]);

  const hitTestSegment = useCallback((
    event: React.MouseEvent<HTMLCanvasElement>
  ): { shapeId: string; insertIndex: number; point: VectorPoint } | null => {
    const rect = getInteractionRect();
    if (!rect) return null;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const maxDist = 8;

    const pointToSegment = (ax: number, ay: number, bx: number, by: number): number => {
      const abx = bx - ax;
      const aby = by - ay;
      const apx = x - ax;
      const apy = y - ay;
      const abLenSq = abx * abx + aby * aby;
      if (abLenSq === 0) return Math.hypot(x - ax, y - ay);
      const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
      const px = ax + abx * t;
      const py = ay + aby * t;
      return Math.hypot(x - px, y - py);
    };

    for (const shape of shapes) {
      if (!shape.visible) continue;
      if (!(shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush')) continue;
      if (shape.points.length < 2) continue;
      const pts = shape.points;
      for (let idx = 0; idx < pts.length - 1; idx += 1) {
        const a = pts[idx]!;
        const b = pts[idx + 1]!;
        const ax = a.x * rect.width;
        const ay = a.y * rect.height;
        const bx = b.x * rect.width;
        const by = b.y * rect.height;
        if (pointToSegment(ax, ay, bx, by) <= maxDist) {
          return {
            shapeId: shape.id,
            insertIndex: idx + 1,
            point: { x: x / rect.width, y: y / rect.height },
          };
        }
      }
      if (shape.closed && shape.points.length >= 3) {
        const a = pts[pts.length - 1]!;
        const b = pts[0]!;
        const ax = a.x * rect.width;
        const ay = a.y * rect.height;
        const bx = b.x * rect.width;
        const by = b.y * rect.height;
        if (pointToSegment(ax, ay, bx, by) <= maxDist) {
          return {
            shapeId: shape.id,
            insertIndex: pts.length,
            point: { x: x / rect.width, y: y / rect.height },
          };
        }
      }
    }
    return null;
  }, [getInteractionRect, shapes]);

  const hitTestShape = useCallback((event: React.MouseEvent<HTMLCanvasElement>): { shapeId: string } | null => {
    const rect = getInteractionRect();
    if (!rect) return null;

    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const strokeThreshold = 8;

    const pointToSegment = (ax: number, ay: number, bx: number, by: number): number => {
      const abx = bx - ax;
      const aby = by - ay;
      const apx = px - ax;
      const apy = py - ay;
      const abLenSq = (abx * abx) + (aby * aby);
      if (abLenSq === 0) return Math.hypot(px - ax, py - ay);
      const t = Math.max(0, Math.min(1, ((apx * abx) + (apy * aby)) / abLenSq));
      const nx = ax + (abx * t);
      const ny = ay + (aby * t);
      return Math.hypot(px - nx, py - ny);
    };

    const pointInPolygon = (points: VectorPoint[]): boolean => {
      if (points.length < 3) return false;
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const pi = points[i]!;
        const pj = points[j]!;
        const xi = pi.x * rect.width;
        const yi = pi.y * rect.height;
        const xj = pj.x * rect.width;
        const yj = pj.y * rect.height;
        const intersects =
          ((yi > py) !== (yj > py)) &&
          (px < (((xj - xi) * (py - yi)) / ((yj - yi) || 1e-6)) + xi);
        if (intersects) inside = !inside;
      }
      return inside;
    };

    for (let idx = shapes.length - 1; idx >= 0; idx -= 1) {
      const shape = shapes[idx]!;
      if (!shape.visible || shape.points.length === 0) continue;

      if (shape.type === 'rect' && shape.points.length >= 2) {
        const a = shape.points[0]!;
        const b = shape.points[1]!;
        const left = Math.min(a.x, b.x) * rect.width;
        const right = Math.max(a.x, b.x) * rect.width;
        const top = Math.min(a.y, b.y) * rect.height;
        const bottom = Math.max(a.y, b.y) * rect.height;
        const inRect = px >= left && px <= right && py >= top && py <= bottom;
        if (!inRect) continue;
        return { shapeId: shape.id };
      }

      if (shape.type === 'ellipse' && shape.points.length >= 2) {
        const a = shape.points[0]!;
        const b = shape.points[1]!;
        const cx = ((a.x + b.x) / 2) * rect.width;
        const cy = ((a.y + b.y) / 2) * rect.height;
        const rx = Math.max(1e-6, (Math.abs(a.x - b.x) / 2) * rect.width);
        const ry = Math.max(1e-6, (Math.abs(a.y - b.y) / 2) * rect.height);
        const ellipseEq = (((px - cx) * (px - cx)) / (rx * rx)) + (((py - cy) * (py - cy)) / (ry * ry));
        if (ellipseEq <= 1.03) return { shapeId: shape.id };
        continue;
      }

      const points = shape.points;
      if (points.length < 2) continue;

      let onStroke = false;
      for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
        const a = points[pointIndex]!;
        const b = points[pointIndex + 1]!;
        const dist = pointToSegment(
          a.x * rect.width,
          a.y * rect.height,
          b.x * rect.width,
          b.y * rect.height
        );
        if (dist <= strokeThreshold) {
          onStroke = true;
          break;
        }
      }

      if (!onStroke && shape.closed && points.length >= 3) {
        const a = points[points.length - 1]!;
        const b = points[0]!;
        const dist = pointToSegment(
          a.x * rect.width,
          a.y * rect.height,
          b.x * rect.width,
          b.y * rect.height
        );
        if (dist <= strokeThreshold) onStroke = true;
      }

      if (onStroke || (shape.closed && pointInPolygon(points))) {
        return { shapeId: shape.id };
      }
    }

    return null;
  }, [getInteractionRect, shapes]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
      const canvas = canvasRef.current;
      if (canvas && (canvas.width <= 1 || canvas.height <= 1)) {
        syncCanvasSize();
      }
      // Pan: middle mouse button, right mouse button, or Space + left click.
      const shouldPanWithSpace = event.button === 0 && spaceDownRef.current;
      if (event.button === 1 || event.button === 2 || shouldPanWithSpace) {
        event.preventDefault();
        beginPan(event.clientX, event.clientY);
        return;
      }
      if (!canDraw) return;
      if (tool === 'select') {
        if (event.shiftKey) {
          const hitSegment = hitTestSegment(event);
          if (hitSegment) {
            onSelectShape(hitSegment.shapeId);
            onChange(
              shapes.map((shape: VectorShape) => {
                if (shape.id !== hitSegment.shapeId) return shape;
                const nextPoints = [...shape.points];
                nextPoints.splice(hitSegment.insertIndex, 0, hitSegment.point);
                return { ...shape, points: nextPoints };
              })
            );
            onSelectPoint?.(hitSegment.insertIndex);
            return;
          }
        }
        const hit = hitTestPoint(event);
        if (hit) {
          dragRef.current = hit;
          setIsDraggingEditablePoint(true);
          dragShapeRef.current = null;
          onSelectShape(hit.shapeId);
          onSelectPoint?.(hit.pointIndex);
          return;
        }
        const hitShape = hitTestShape(event);
        if (hitShape) {
          const startPoint = toPoint(event);
          onSelectShape(hitShape.shapeId);
          onSelectPoint?.(null);
          if (startPoint && event.button === 0) {
            dragShapeRef.current = { shapeId: hitShape.shapeId, lastPoint: startPoint };
          } else {
            dragShapeRef.current = null;
          }
          return;
        }
        // Select mode acts like hand tool on empty area
        if (event.button === 0) {
          beginPan(event.clientX, event.clientY);
        }
        return;
      }
      if (tool === 'polygon') {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        const activeShape = shapes.find((s: VectorShape) => s.id === activeShapeId && s.type === 'polygon' && !s.closed);
        if (!activeShape) {
          const newShape: VectorShape = {
            id: `shape_${Date.now().toString(36)}`,
            name: `Polygon ${shapes.length + 1}`,
            type: 'polygon',
            points: [nextPoint],
            closed: false,
            visible: true,
          };
          onSelectShape(newShape.id);
          onChange([...shapes, newShape]);
          return;
        }
        if (activeShape.points.length >= 3) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const first = activeShape.points[0]!;
          const dx = (first.x - nextPoint.x) * rect.width;
          const dy = (first.y - nextPoint.y) * rect.height;
          const dist = Math.hypot(dx, dy);
          if (dist < 10) {
            onChange(
              shapes.map((shape: VectorShape) =>
                shape.id === activeShape.id ? { ...shape, closed: true } : shape
              )
            );
            return;
          }
        }
        onChange(
          shapes.map((shape: VectorShape) =>
            shape.id === activeShape.id ? { ...shape, points: [...shape.points, nextPoint] } : shape
          )
        );
        return;
      }

      if (tool === 'lasso' || tool === 'brush') {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        const newShape: VectorShape = {
          id: `shape_${Date.now().toString(36)}`,
          name: tool === 'brush' ? `Brush ${shapes.length + 1}` : `Lasso ${shapes.length + 1}`,
          type: tool === 'brush' ? 'brush' : 'lasso',
          points: [nextPoint],
          closed: false,
          visible: true,
        };
        drawingRef.current = { shapeId: newShape.id, type: newShape.type };
        onSelectShape(newShape.id);
        onChange([...shapes, newShape]);
        return;
      }

      if (tool === 'rect' || tool === 'ellipse') {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        const newShape: VectorShape = {
          id: `shape_${Date.now().toString(36)}`,
          name: tool === 'rect' ? `Rect ${shapes.length + 1}` : `Ellipse ${shapes.length + 1}`,
          type: tool,
          points: [nextPoint, nextPoint],
          closed: true,
          visible: true,
        };
        drawingRef.current = { shapeId: newShape.id, type: newShape.type };
        onSelectShape(newShape.id);
        onChange([...shapes, newShape]);
      }
    },
    [activeShapeId, beginPan, canDraw, hitTestPoint, hitTestSegment, hitTestShape, onChange, onSelectPoint, onSelectShape, shapes, syncCanvasSize, toPoint, tool]
  );

  useEffect(() => {
    if (!activeShapeId || selectedPointIndex === null) return;
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onChange(
          shapes.map((shape: VectorShape) => {
            if (shape.id !== activeShapeId) return shape;
            const nextPoints = shape.points.filter((_: VectorPoint, idx: number) => idx !== selectedPointIndex);
            return { ...shape, points: nextPoints, closed: nextPoints.length >= 3 ? shape.closed : false };
          })
        );
        onSelectPoint?.(null);
      } else if (event.key === 'Escape') {
        onSelectPoint?.(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return (): void => window.removeEventListener('keydown', handleKey);
  }, [activeShapeId, onChange, onSelectPoint, selectedPointIndex, shapes]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
      if (panningRef.current) {
        updatePanFromPointer(event.clientX, event.clientY);
        return;
      }
      if (!canDraw) return;
      if (dragRef.current) {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        onChange(
          shapes.map((shape: VectorShape) => {
            if (shape.id !== dragRef.current?.shapeId) return shape;
            const nextPoints = [...shape.points];
            nextPoints[dragRef.current.pointIndex] = nextPoint;
            return { ...shape, points: nextPoints };
          })
        );
        return;
      }
      if (tool === 'select') {
        const hoveredPoint = hitTestPoint(event);
        setIsHoveringEditablePoint((prev) => (prev === Boolean(hoveredPoint) ? prev : Boolean(hoveredPoint)));
      } else {
        setIsHoveringEditablePoint((prev) => (prev ? false : prev));
      }
      if (dragShapeRef.current) {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;

        const { shapeId, lastPoint } = dragShapeRef.current;
        const rawDx = nextPoint.x - lastPoint.x;
        const rawDy = nextPoint.y - lastPoint.y;
        if (Math.abs(rawDx) < 1e-6 && Math.abs(rawDy) < 1e-6) return;

        const targetShape = shapes.find((shape: VectorShape) => shape.id === shapeId) ?? null;
        if (!targetShape || targetShape.points.length === 0) {
          dragShapeRef.current = null;
          return;
        }

        const xs = targetShape.points.map((point: VectorPoint) => point.x);
        const ys = targetShape.points.map((point: VectorPoint) => point.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const dx = Math.min(1 - maxX, Math.max(-minX, rawDx));
        const dy = Math.min(1 - maxY, Math.max(-minY, rawDy));

        if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return;

        onChange(
          shapes.map((shape: VectorShape) => {
            if (shape.id !== shapeId) return shape;
            return {
              ...shape,
              points: shape.points.map((point: VectorPoint) => ({
                x: point.x + dx,
                y: point.y + dy,
              })),
            };
          })
        );

        dragShapeRef.current = {
          shapeId,
          lastPoint: {
            x: lastPoint.x + dx,
            y: lastPoint.y + dy,
          },
        };
        return;
      }
      if (drawingRef.current) {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        onChange(
          shapes.map((shape: VectorShape) => {
            if (shape.id !== drawingRef.current?.shapeId) return shape;
            if (shape.type === 'lasso' || shape.type === 'brush') {
              const last = shape.points[shape.points.length - 1];
              if (last) {
                const dx = (last.x - nextPoint.x);
                const dy = (last.y - nextPoint.y);
                if (Math.hypot(dx, dy) < brushRadius / 200) {
                  return shape;
                }
              }
              return { ...shape, points: [...shape.points, nextPoint] };
            }
            if (shape.type === 'rect' || shape.type === 'ellipse') {
              const nextPoints = shape.points.length >= 2 ? [shape.points[0]!, nextPoint] : [nextPoint, nextPoint];
              return { ...shape, points: nextPoints };
            }
            return shape;
          })
        );
      }
    },
    [brushRadius, canDraw, hitTestPoint, onChange, shapes, toPoint, tool, updatePanFromPointer]
  );

  const handleDoubleClick = useCallback((): void => {
    setViewTransform({ scale: 1, panX: 0, panY: 0 });
  }, []);

  const handleMouseUp = useCallback((): void => {
    if (panningRef.current || isPanning) {
      stopPan();
      return;
    }
    if (drawingRef.current) {
      onChange(
        shapes.map((shape: VectorShape) =>
          shape.id === drawingRef.current?.shapeId ? { ...shape, closed: true } : shape
        )
      );
    }
    dragRef.current = null;
    setIsDraggingEditablePoint(false);
    dragShapeRef.current = null;
    drawingRef.current = null;
  }, [isPanning, onChange, shapes, stopPan]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden rounded border border-border bg-black/20',
        className
      )}
    >
      {src ? (
        <>
          <div
            ref={viewportRef}
            className='relative h-full w-full'
            style={
              viewTransform.scale !== 1 || viewTransform.panX !== 0 || viewTransform.panY !== 0
                ? {
                  transform: `translate(${viewTransform.panX}px, ${viewTransform.panY}px) scale(${viewTransform.scale})`,
                  transformOrigin: '0 0',
                  transition: isPanning ? 'none' : 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)',
                }
                : undefined
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt='Selected slot'
              className='pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-top'
              onLoad={() => syncCanvasSize()}
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              className={cn(
                'absolute left-1/2 top-0 z-20 -translate-x-1/2',
                isPanning
                  ? 'cursor-grabbing'
                  : isDraggingEditablePoint
                    ? 'cursor-grabbing'
                    : isHoveringEditablePoint
                      ? 'cursor-pointer'
                      : spaceDownRef.current || tool === 'select'
                        ? 'cursor-grab'
                        : 'cursor-crosshair'
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                setIsHoveringEditablePoint(false);
                handleMouseUp();
              }}
              onDoubleClick={handleDoubleClick}
              onContextMenu={(event) => event.preventDefault()}
            />
            <svg
              className='pointer-events-none absolute left-1/2 top-0 z-[21] -translate-x-1/2'
              style={{ width: `${canvasRenderSize.width}px`, height: `${canvasRenderSize.height}px` }}
              viewBox={`0 0 ${SHAPE_VIEWBOX_SIZE} ${SHAPE_VIEWBOX_SIZE}`}
              preserveAspectRatio='none'
              aria-hidden='true'
            >
              {shapes.filter((shape) => shape.visible).map((shape: VectorShape) => {
                const path = vectorShapeToPath(shape, SHAPE_VIEWBOX_SIZE);
                if (!path) return null;
                const isActive = shape.id === activeShapeId;
                const isMaskEligible =
                  (shape.type === 'polygon' || shape.type === 'lasso') &&
                  shape.closed &&
                  shape.points.length >= 3;
                const isNonMaskType = shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'brush';
                const stroke = isMaskEligible
                  ? (isActive ? 'rgba(16,185,129,0.95)' : 'rgba(56,189,248,0.95)')
                  : isNonMaskType
                    ? (isActive ? 'rgba(251,146,60,0.95)' : 'rgba(251,146,60,0.75)')
                    : (isActive ? 'rgba(34,211,238,0.98)' : 'rgba(56,189,248,0.9)');
                const fill = shape.closed && shape.points.length >= 3
                  ? (isMaskEligible ? 'rgba(56,189,248,0.14)' : 'rgba(251,146,60,0.08)')
                  : 'transparent';
                const dash = isMaskEligible ? undefined : (isNonMaskType ? '6 4' : '8 4');
                return (
                  <g key={shape.id}>
                    <path
                      d={path}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isActive ? 2.5 : 2}
                      strokeDasharray={dash}
                      vectorEffect='non-scaling-stroke'
                    />
                    {(shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush')
                      ? shape.points.map((point: VectorPoint, index: number) => {
                        const cx = point.x * SHAPE_VIEWBOX_SIZE;
                        const cy = point.y * SHAPE_VIEWBOX_SIZE;
                        const selected = isActive && index === (selectedPointIndex ?? -1);
                        return (
                          <g key={`${shape.id}-${index.toString(36)}`}>
                            <circle cx={cx} cy={cy} r={index === 0 ? 7.5 : 6.5} fill='rgba(2,6,23,0.55)' />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={index === 0 ? 5.5 : 4.5}
                              fill={selected
                                ? 'rgba(251,191,36,0.98)'
                                : (index === 0 ? 'rgba(16,185,129,0.98)' : 'rgba(56,189,248,0.98)')}
                              stroke='rgba(255,255,255,0.9)'
                              strokeWidth={1.5}
                              vectorEffect='non-scaling-stroke'
                            />
                          </g>
                        );
                      })
                      : null}
                  </g>
                );
              })}
            </svg>
          </div>
          {viewTransform.scale !== 1 && (
            <div className='absolute bottom-2 right-2 z-10 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white/90 pointer-events-none'>
              {Math.round(viewTransform.scale * 100)}%
            </div>
          )}
        </>
      ) : (
        <>
          {allowWithoutImage ? (
            <div
              ref={viewportRef}
              className='absolute inset-0'
              style={
                viewTransform.scale !== 1 || viewTransform.panX !== 0 || viewTransform.panY !== 0
                  ? {
                    transform: `translate(${viewTransform.panX}px, ${viewTransform.panY}px) scale(${viewTransform.scale})`,
                    transformOrigin: '0 0',
                    transition: isPanning ? 'none' : 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }
                  : undefined
              }
            >
              <canvas
                ref={canvasRef}
                className={cn(
                  'absolute inset-0 z-20',
                  isPanning
                    ? 'cursor-grabbing'
                    : isDraggingEditablePoint
                      ? 'cursor-grabbing'
                      : isHoveringEditablePoint
                        ? 'cursor-pointer'
                        : spaceDownRef.current || tool === 'select'
                          ? 'cursor-grab'
                          : 'cursor-crosshair'
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  setIsHoveringEditablePoint(false);
                  handleMouseUp();
                }}
                onDoubleClick={handleDoubleClick}
                onContextMenu={(event) => event.preventDefault()}
              />
              <svg
                className='pointer-events-none absolute inset-0 z-[21]'
                viewBox={`0 0 ${SHAPE_VIEWBOX_SIZE} ${SHAPE_VIEWBOX_SIZE}`}
                preserveAspectRatio='none'
                aria-hidden='true'
              >
                {shapes.filter((shape) => shape.visible).map((shape: VectorShape) => {
                  const path = vectorShapeToPath(shape, SHAPE_VIEWBOX_SIZE);
                  if (!path) return null;
                  const isActive = shape.id === activeShapeId;
                  const isMaskEligible =
                    (shape.type === 'polygon' || shape.type === 'lasso') &&
                    shape.closed &&
                    shape.points.length >= 3;
                  const isNonMaskType = shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'brush';
                  const stroke = isMaskEligible
                    ? (isActive ? 'rgba(16,185,129,0.95)' : 'rgba(56,189,248,0.95)')
                    : isNonMaskType
                      ? (isActive ? 'rgba(251,146,60,0.95)' : 'rgba(251,146,60,0.75)')
                      : (isActive ? 'rgba(34,211,238,0.98)' : 'rgba(56,189,248,0.9)');
                  const fill = shape.closed && shape.points.length >= 3
                    ? (isMaskEligible ? 'rgba(56,189,248,0.14)' : 'rgba(251,146,60,0.08)')
                    : 'transparent';
                  const dash = isMaskEligible ? undefined : (isNonMaskType ? '6 4' : '8 4');
                  return (
                    <path
                      key={shape.id}
                      d={path}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isActive ? 2.5 : 2}
                      strokeDasharray={dash}
                      vectorEffect='non-scaling-stroke'
                    />
                  );
                })}
              </svg>
            </div>
          ) : null}
          {showEmptyState && !allowWithoutImage ? (
            <div className='text-sm text-gray-400'>{emptyStateLabel}</div>
          ) : null}
          {viewTransform.scale !== 1 && (
            <div className='absolute bottom-2 right-2 z-10 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white/90 pointer-events-none'>
              {Math.round(viewTransform.scale * 100)}%
            </div>
          )}
        </>
      )}
    </div>
  );
}

export interface VectorToolbarProps {
  tool: VectorToolMode;
  onSelectTool: (tool: VectorToolMode) => void;
  onUndo?: () => void;
  onClose?: () => void;
  onDetach?: () => void;
  onClear?: () => void;
  disableUndo?: boolean;
  disableClose?: boolean;
  disableDetach?: boolean;
  disableClear?: boolean;
  className?: string;
}

export function VectorToolbar({
  tool,
  onSelectTool,
  onUndo,
  onClose,
  onDetach,
  onClear,
  disableUndo,
  disableClose,
  disableDetach,
  disableClear,
  className,
}: VectorToolbarProps): React.JSX.Element {
  const hasActions = Boolean(onUndo || onClose || onDetach || onClear);
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 shadow-lg',
        className
      )}
    >
      <Tooltip content='Select'>
        <Button
          type='button'
          variant={tool === 'select' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('select')}
        >
          <MousePointer2 className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Polygon'>
        <Button
          type='button'
          variant={tool === 'polygon' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('polygon')}
        >
          <Pentagon className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Lasso'>
        <Button
          type='button'
          variant={tool === 'lasso' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('lasso')}
        >
          <Lasso className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Rectangle'>
        <Button
          type='button'
          variant={tool === 'rect' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('rect')}
        >
          <RectangleHorizontal className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Ellipse'>
        <Button
          type='button'
          variant={tool === 'ellipse' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('ellipse')}
        >
          <Circle className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Brush'>
        <Button
          type='button'
          variant={tool === 'brush' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('brush')}
        >
          <Brush className='size-4' />
        </Button>
      </Tooltip>
      {hasActions ? <div className='mx-1 h-6 w-px bg-border' /> : null}
      {onUndo ? (
        <Tooltip content='Undo last point'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onUndo}
            disabled={disableUndo}
          >
            <RotateCcw className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onClose ? (
        <Tooltip content='Close polygon'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onClose}
            disabled={disableClose}
          >
            <Check className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onDetach ? (
        <Tooltip content='Detach polygon'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onDetach}
            disabled={disableDetach}
          >
            <Unlink className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onClear ? (
        <Tooltip content='Clear shapes'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onClear}
            disabled={disableClear}
          >
            <Trash2 className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
    </div>
  );
}
