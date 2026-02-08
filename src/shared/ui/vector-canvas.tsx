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
import Image from 'next/image';
import React, { useCallback, useEffect, useRef } from 'react';

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
  className,
}: VectorCanvasProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ shapeId: string; pointIndex: number } | null>(null);
  const drawingRef = useRef<{ shapeId: string; type: VectorShapeType } | null>(null);

  const canDraw = allowWithoutImage || Boolean(src);

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

    shapes.forEach((shape: VectorShape) => {
      if (!shape.visible) return;
      if (shape.points.length === 0) return;
      const isActive = shape.id === activeShapeId;
      ctx.lineWidth = isActive ? 2.5 : 2;
      ctx.strokeStyle = isActive ? 'rgba(16, 185, 129, 0.95)' : 'rgba(56, 189, 248, 0.95)';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';

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

      if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
        shape.points.forEach((p: VectorPoint, index: number) => {
          const px = toPx(p);
          ctx.beginPath();
          ctx.arc(px.x, px.y, index === 0 ? 5 : 4, 0, Math.PI * 2);
          const isSelected = isActive && index === (selectedPointIndex ?? -1);
          ctx.fillStyle = isSelected ? 'rgba(251, 191, 36, 0.95)' : (index === 0 ? 'rgba(16, 185, 129, 0.95)' : 'rgba(56, 189, 248, 0.95)');
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.stroke();
        });
      }
    });
  }, [activeShapeId, selectedPointIndex, shapes]);

  const syncCanvasSize = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const target = src ? imgRef.current : containerRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    draw();
  }, [draw, src]);

  useEffect(() => {
    syncCanvasSize();
  }, [syncCanvasSize, src, shapes.length]);

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

  const toPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>): VectorPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }, []);

  const hitTestPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>): { shapeId: string; pointIndex: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
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
  }, [shapes]);

  const hitTestSegment = useCallback((
    event: React.MouseEvent<HTMLCanvasElement>
  ): { shapeId: string; insertIndex: number; point: VectorPoint } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
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
  }, [shapes]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
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
          onSelectShape(hit.shapeId);
          onSelectPoint?.(hit.pointIndex);
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
    [activeShapeId, canDraw, hitTestPoint, hitTestSegment, onChange, onSelectPoint, onSelectShape, shapes, toPoint, tool]
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
    [brushRadius, canDraw, onChange, shapes, toPoint]
  );

  const handleMouseUp = useCallback((): void => {
    if (drawingRef.current) {
      onChange(
        shapes.map((shape: VectorShape) =>
          shape.id === drawingRef.current?.shapeId ? { ...shape, closed: true } : shape
        )
      );
    }
    dragRef.current = null;
    drawingRef.current = null;
  }, [onChange, shapes]);

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
          <div className='relative h-full w-full'>
            <Image
              ref={imgRef}
              src={src}
              alt='Selected slot'
              fill
              className='select-none object-contain'
              onLoadingComplete={() => syncCanvasSize()}
              draggable={false}
              unoptimized
            />
          </div>
          <canvas
            ref={canvasRef}
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              tool === 'select' ? 'cursor-default' : 'cursor-crosshair'
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </>
      ) : (
        <>
          {allowWithoutImage ? (
            <canvas
              ref={canvasRef}
              className={cn(
                'absolute inset-0',
                tool === 'select' ? 'cursor-default' : 'cursor-crosshair'
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          ) : null}
          {showEmptyState && !allowWithoutImage ? (
            <div className='text-sm text-gray-400'>{emptyStateLabel}</div>
          ) : null}
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
