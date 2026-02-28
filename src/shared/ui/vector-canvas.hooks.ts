import { useCallback, useRef, useState } from 'react';
import {
  type VectorPoint,
  type VectorShape,
  type VectorShapeType,
  type VectorToolMode,
} from '@/shared/contracts/vector';
import { type VectorViewTransform } from './vector-canvas.geometry';

export interface UseVectorCanvasInteractionsProps {
  tool: VectorToolMode;
  selectionEnabled: boolean;
  shapes: VectorShape[];
  activeShapeId: string | null;
  selectedPointIndex: number | null;
  onChange: (nextShapes: VectorShape[]) => void;
  onSelectShape: (id: string | null) => void;
  onSelectPoint?: (index: number | null) => void;
  brushRadius: number;
  src?: string | null;
  allowWithoutImage: boolean;
  enableTwoFingerRotate: boolean;
  imageMoveEnabled: boolean;
  imageOffset: { x: number; y: number };
  onImageOffsetChange?: (offset: { x: number; y: number }) => void;
  canvasRenderSize: { width: number; height: number };
  syncCanvasSize: () => void;
}

export function useVectorCanvasInteractions({
  tool: _tool,
  selectionEnabled: _selectionEnabled,
  shapes,
  activeShapeId: _activeShapeId,
  selectedPointIndex: _selectedPointIndex,
  onChange: _onChange,
  onSelectShape: _onSelectShape,
  onSelectPoint: _onSelectPoint,
  brushRadius: _brushRadius,
  src: _src,
  allowWithoutImage: _allowWithoutImage,
  enableTwoFingerRotate: _enableTwoFingerRotate,
  imageMoveEnabled: _imageMoveEnabled,
  imageOffset: _imageOffset,
  onImageOffsetChange: _onImageOffsetChange,
  canvasRenderSize: _canvasRenderSize,
  syncCanvasSize: _syncCanvasSize,
}: UseVectorCanvasInteractionsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [viewTransform, setViewTransform] = useState<VectorViewTransform>({
    scale: 1,
    panX: 0,
    panY: 0,
    rotateDeg: 0,
  });
  const viewTransformRef = useRef(viewTransform);
  viewTransformRef.current = viewTransform;

  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isHoveringEditablePoint, setIsHoveringEditablePoint] = useState(false);
  const [isHoveringMovableShape, setIsHoveringMovableShape] = useState(false);
  const [isDraggingEditablePoint, setIsDraggingEditablePoint] = useState(false);

  const panningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const spaceDownRef = useRef(false);
  const imageDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const dragRef = useRef<{ shapeId: string; pointIndex: number } | null>(null);
  const dragShapeRef = useRef<{ shapeId: string; lastPoint: VectorPoint } | null>(null);
  const drawingRef = useRef<{
    shapeId: string;
    type: VectorShapeType;
    anchor?: VectorPoint;
  } | null>(null);
  const touchGestureRef = useRef<{
    initialDistance: number;
    initialAngleRad: number;
    anchorWorld: { x: number; y: number };
    startTransform: VectorViewTransform;
  } | null>(null);

  const panRafIdRef = useRef<number>(0);
  const pendingPanRef = useRef<{ panX: number; panY: number } | null>(null);

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
    panningRef.current = false;
    setIsPanning(false);
  }, []);

  const updatePanFromPointer = useCallback(
    (clientX: number, clientY: number): void => {
      if (!panningRef.current) return;
      const dx = clientX - panStartRef.current.x;
      const dy = clientY - panStartRef.current.y;
      schedulePanUpdate(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
    },
    [schedulePanUpdate]
  );

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

  const toPoint = useCallback(
    (clientX: number, clientY: number): VectorPoint | null => {
      const rect = getInteractionRect();
      if (!rect) return null;
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      return {
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      };
    },
    [getInteractionRect]
  );

  const hitTestPoint = useCallback(
    (clientX: number, clientY: number): { shapeId: string; pointIndex: number } | null => {
      const rect = getInteractionRect();
      if (!rect) return null;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const radius = 8;
      for (const shape of shapes) {
        if (!shape.visible) continue;
        const supportsEditablePoints =
          shape.type === 'polygon' ||
          shape.type === 'lasso' ||
          shape.type === 'brush' ||
          shape.type === 'rect' ||
          shape.type === 'ellipse';
        if (!supportsEditablePoints) continue;
        const maxPointCount =
          shape.type === 'rect' || shape.type === 'ellipse'
            ? Math.min(shape.points.length, 2)
            : shape.points.length;
        for (let idx = 0; idx < maxPointCount; idx += 1) {
          const p = shape.points[idx]!;
          const px = p.x * rect.width;
          const py = p.y * rect.height;
          if (Math.hypot(px - x, py - y) <= radius) {
            return { shapeId: shape.id, pointIndex: idx };
          }
        }
      }
      return null;
    },
    [getInteractionRect, shapes]
  );

  const hitTestSegment = useCallback(
    (
      clientX: number,
      clientY: number
    ): { shapeId: string; insertIndex: number; point: VectorPoint } | null => {
      const rect = getInteractionRect();
      if (!rect) return null;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
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
        if (!(shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush'))
          continue;
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
    },
    [getInteractionRect, shapes]
  );

  const hitTestShape = useCallback(
    (clientX: number, clientY: number): { shapeId: string } | null => {
      const rect = getInteractionRect();
      if (!rect) return null;

      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const strokeThreshold = 8;

      const pointToSegment = (ax: number, ay: number, bx: number, by: number): number => {
        const abx = bx - ax;
        const aby = by - ay;
        const apx = px - ax;
        const apy = py - ay;
        const abLenSq = abx * abx + aby * aby;
        if (abLenSq === 0) return Math.hypot(px - ax, py - ay);
        const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
        const nx = ax + abx * t;
        const ny = ay + aby * t;
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
            yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-6) + xi;
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
          const ellipseEq =
            ((px - cx) * (px - cx)) / (rx * rx) + ((py - cy) * (py - cy)) / (ry * ry);
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
    },
    [getInteractionRect, shapes]
  );

  return {
    containerRef,
    imgRef,
    canvasRef,
    viewportRef,
    viewTransform,
    setViewTransform,
    isPanning,
    setIsPanning,
    isDraggingImage,
    setIsDraggingImage,
    isHoveringEditablePoint,
    setIsHoveringEditablePoint,
    isHoveringMovableShape,
    setIsHoveringMovableShape,
    isDraggingEditablePoint,
    setIsDraggingEditablePoint,
    spaceDownRef,
    panningRef,
    imageDragRef,
    dragRef,
    dragShapeRef,
    drawingRef,
    touchGestureRef,
    beginPan,
    stopPan,
    updatePanFromPointer,
    toPoint,
    hitTestPoint,
    hitTestSegment,
    hitTestShape,
    getInteractionRect,
  };
}
