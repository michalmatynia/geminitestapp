'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type VectorPoint,
  type VectorShape,
  type VectorShapeType,
  type VectorToolMode,
} from '@/shared/contracts/vector';
import { cn } from '@/shared/utils';

import { Button } from './button';
import {
  DEFAULT_VECTOR_VIEWBOX,
  clampUnit,
  resolveRectDragPoints,
  resolveRectResizePoints,
  screenPointToWorld,
  worldPointToScreen,
  type VectorCanvasImageContentFrame,
  type VectorCanvasViewCropRect,
} from './vector-canvas.geometry';
import { useVectorCanvasInteractions } from './vector-canvas.hooks';
import { VectorToolbar, VectorShapeOverlay } from './vector-canvas.rendering';

export { type VectorPoint, type VectorShape, type VectorShapeType, type VectorToolMode };
export type { VectorCanvasImageContentFrame, VectorCanvasViewCropRect };
export {
  DEFAULT_VECTOR_VIEWBOX,
  resolveRectDragPoints,
  resolveRectResizePoints,
  vectorShapeToPath,
  vectorShapesToPath,
  vectorShapeToPathWithBounds,
  vectorShapesToPathWithBounds,
} from './vector-canvas.geometry';

export interface VectorCanvasProps {
  src?: string | null;
  tool: VectorToolMode;
  selectionEnabled?: boolean;
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
  showCenterGuides?: boolean;
  enableTwoFingerRotate?: boolean;
  baseCanvasWidthPx?: number | null;
  baseCanvasHeightPx?: number | null;
  onViewCropRectChange?: (cropRect: VectorCanvasViewCropRect | null) => void;
  onImageContentFrameChange?: (frame: VectorCanvasImageContentFrame | null) => void;
  showCanvasGrid?: boolean;
  imageMoveEnabled?: boolean;
  imageOffset?: { x: number; y: number };
  onImageOffsetChange?: (offset: { x: number; y: number }) => void;
  backgroundLayerEnabled?: boolean;
  backgroundColor?: string;
  className?: string;
}

const MIN_VIEW_SCALE = 0.25;
const MAX_VIEW_SCALE = 8;

export function VectorCanvas(props: VectorCanvasProps): React.JSX.Element {
  const {
    src,
    tool,
    selectionEnabled = true,
    shapes,
    activeShapeId,
    selectedPointIndex,
    onChange,
    onSelectShape,
    onSelectPoint,
    brushRadius,
    allowWithoutImage = false,
    showEmptyState: _showEmptyState = true,
    emptyStateLabel: _emptyStateLabel = 'Select an image slot to preview.',
    maskPreviewEnabled = false,
    maskPreviewShapes = [],
    maskPreviewInvert = false,
    maskPreviewOpacity = 0.48,
    maskPreviewFeather = 0,
    showCenterGuides = false,
    enableTwoFingerRotate = false,
    baseCanvasWidthPx = null,
    baseCanvasHeightPx = null,
    onViewCropRectChange,
    onImageContentFrameChange,
    showCanvasGrid = false,
    imageMoveEnabled = false,
    imageOffset = { x: 0, y: 0 },
    onImageOffsetChange,
    backgroundLayerEnabled = true,
    backgroundColor = '#ffffff',
    className,
  } = props;

  const SHAPE_VIEWBOX_SIZE = DEFAULT_VECTOR_VIEWBOX;
  const [canvasRenderSize, setCanvasRenderSize] = useState<{ width: number; height: number }>({
    width: 1,
    height: 1,
  });

  const resolvedBaseCanvasWidth = useMemo(() => {
    if (typeof baseCanvasWidthPx !== 'number' || !Number.isFinite(baseCanvasWidthPx)) {
      return null;
    }
    const normalized = Math.floor(baseCanvasWidthPx);
    if (normalized < 64 || normalized > 32_768) return null;
    return normalized;
  }, [baseCanvasWidthPx]);

  const resolvedBaseCanvasHeight = useMemo(() => {
    if (typeof baseCanvasHeightPx !== 'number' || !Number.isFinite(baseCanvasHeightPx)) {
      return null;
    }
    const normalized = Math.floor(baseCanvasHeightPx);
    if (normalized < 64 || normalized > 32_768) return null;
    return normalized;
  }, [baseCanvasHeightPx]);

  const rafIdRef = useRef<number>(0);
  const drawRef = useRef<(() => void) | null>(null);

  const scheduleDraw = useCallback((): void => {
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0;
      drawRef.current?.();
    });
  }, []);

  const interactions = useVectorCanvasInteractions({
    tool,
    selectionEnabled,
    shapes,
    activeShapeId,
    selectedPointIndex,
    onChange,
    onSelectShape,
    onSelectPoint,
    brushRadius,
    src,
    allowWithoutImage,
    enableTwoFingerRotate,
    imageMoveEnabled,
    imageOffset,
    onImageOffsetChange,
    canvasRenderSize,
    syncCanvasSize: () => scheduleDraw(),
  });

  const {
    containerRef,
    imgRef,
    canvasRef,
    viewportRef,
    viewTransform,
    setViewTransform,
    isPanning,
    isDraggingImage,
    setIsDraggingImage,
    isHoveringEditablePoint,
    isHoveringMovableShape,
    isDraggingEditablePoint,
    setIsDraggingEditablePoint,
    spaceDownRef,
    panningRef,
    imageDragRef,
    dragRef,
    dragShapeRef,
    drawingRef,
    beginPan,
    stopPan,
    updatePanFromPointer,
    toPoint,
    hitTestPoint,
    hitTestSegment,
    hitTestShape,
    getInteractionRect,
  } = interactions;

  const resolvedImageOffset = useMemo(
    () => ({
      x: Number.isFinite(imageOffset.x) ? imageOffset.x : 0,
      y: Number.isFinite(imageOffset.y) ? imageOffset.y : 0,
    }),
    [imageOffset.x, imageOffset.y]
  );

  const resolvedBackgroundColor = useMemo(() => {
    const normalized = backgroundColor.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
    return '#ffffff';
  }, [backgroundColor]);

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
    let fitMaxWidth = cw;
    let fitMaxHeight = ch;

    let targetAspect: number | null = null;

    let referenceWidth = resolvedBaseCanvasWidth;
    let referenceHeight = resolvedBaseCanvasHeight;

    if ((referenceWidth === null || referenceHeight === null) && src && imgRef.current) {
      const image = imgRef.current;
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      if (naturalWidth > 0 && naturalHeight > 0) {
        referenceWidth = naturalWidth;
        referenceHeight = naturalHeight;
      }
    }

    if (
      typeof referenceWidth === 'number' &&
      Number.isFinite(referenceWidth) &&
      referenceWidth > 0 &&
      typeof referenceHeight === 'number' &&
      Number.isFinite(referenceHeight) &&
      referenceHeight > 0
    ) {
      targetAspect = referenceWidth / referenceHeight;
      fitMaxWidth = Math.max(1, Math.min(cw, Math.round(referenceWidth)));
      fitMaxHeight = Math.max(1, Math.min(ch, Math.round(referenceHeight)));
    }

    if (targetAspect && targetAspect > 0) {
      const containerAspect = fitMaxWidth / fitMaxHeight;
      if (targetAspect > containerAspect) {
        width = fitMaxWidth;
        height = Math.max(1, Math.round(fitMaxWidth / targetAspect));
      } else {
        height = fitMaxHeight;
        width = Math.max(1, Math.round(fitMaxHeight * targetAspect));
      }
    }

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    setCanvasRenderSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
    scheduleDraw();
  }, [
    resolvedBaseCanvasHeight,
    resolvedBaseCanvasWidth,
    scheduleDraw,
    src,
    canvasRef,
    containerRef,
    imgRef,
  ]);

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
      const isNonMaskType =
        shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'brush';

      ctx.lineWidth = isActive ? 2.5 : 2;
      ctx.setLineDash([]);

      if (isMaskEligible) {
        ctx.strokeStyle = isActive ? 'rgba(16, 185, 129, 0.95)' : 'rgba(56, 189, 248, 0.95)';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      } else if (isNonMaskType) {
        ctx.strokeStyle = isActive ? 'rgba(251, 146, 60, 0.95)' : 'rgba(251, 146, 60, 0.7)';
        ctx.fillStyle = 'rgba(251, 146, 60, 0.08)';
        ctx.setLineDash([6, 4]);
      } else {
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

      if (isMaskEligible) {
        const firstPt = toPx(shape.points[0]!);
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
        ctx.fillText('M', firstPt.x + 8, firstPt.y - 6);
      }

      if (
        shape.type === 'polygon' ||
        shape.type === 'lasso' ||
        shape.type === 'brush' ||
        shape.type === 'rect' ||
        shape.type === 'ellipse'
      ) {
        const visiblePoints =
          shape.type === 'rect' || shape.type === 'ellipse'
            ? shape.points.slice(0, 2)
            : shape.points;
        visiblePoints.forEach((p: VectorPoint, index: number) => {
          const px = toPx(p);
          const pointRadius =
            shape.type === 'rect' || shape.type === 'ellipse' ? 5.5 : index === 0 ? 5.5 : 4.5;
          ctx.beginPath();
          ctx.arc(px.x, px.y, pointRadius + 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(px.x, px.y, pointRadius, 0, Math.PI * 2);
          const isSelected = isActive && index === (selectedPointIndex ?? -1);
          ctx.fillStyle = isSelected
            ? 'rgba(251, 191, 36, 0.98)'
            : shape.type === 'rect' || shape.type === 'ellipse'
              ? 'rgba(251, 146, 60, 0.98)'
              : index === 0
                ? 'rgba(16, 185, 129, 0.98)'
                : 'rgba(56, 189, 248, 0.98)';
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
    canvasRef,
  ]);

  drawRef.current = draw;

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
  }, [src, syncCanvasSize, imgRef]);

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
  }, [syncCanvasSize, containerRef]);

  const resolveVisibleViewCropRect = useCallback((): VectorCanvasViewCropRect | null => {
    if (!src) return null;
    const container = containerRef.current;
    const image = imgRef.current;
    if (!container || !image) return null;

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!(sourceWidth > 0 && sourceHeight > 0)) return null;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    if (!(containerWidth > 0 && containerHeight > 0)) return null;

    const imageRenderWidth = canvasRenderSize.width;
    const imageRenderHeight = canvasRenderSize.height;
    if (!(imageRenderWidth > 0 && imageRenderHeight > 0)) return null;

    const imageElementLeft = (containerWidth - imageRenderWidth) / 2 + resolvedImageOffset.x;
    const imageElementTop = resolvedImageOffset.y;
    const renderAspect = imageRenderWidth / imageRenderHeight;
    const sourceAspect = sourceWidth / sourceHeight;
    let contentWidth = imageRenderWidth;
    let contentHeight = imageRenderHeight;

    if (sourceAspect > 0 && Number.isFinite(sourceAspect)) {
      if (sourceAspect > renderAspect) {
        contentHeight = imageRenderWidth / sourceAspect;
      } else {
        contentWidth = imageRenderHeight * sourceAspect;
      }
    }
    if (!(contentWidth > 0 && contentHeight > 0)) return null;

    const imageLeft = imageElementLeft + (imageRenderWidth - contentWidth) / 2;
    const imageRight = imageLeft + contentWidth;
    const imageTop = imageElementTop;
    const imageBottom = imageTop + contentHeight;

    const viewTransformSnapshot = viewTransform;
    const visibleQuad = [
      { x: 0, y: 0 },
      { x: containerWidth, y: 0 },
      { x: containerWidth, y: containerHeight },
      { x: 0, y: containerHeight },
    ].map((point) => screenPointToWorld(point, viewTransformSnapshot));

    const xs = visibleQuad.map((point) => point.x);
    const ys = visibleQuad.map((point) => point.y);
    const visibleMinX = Math.max(imageLeft, Math.min(...xs));
    const visibleMaxX = Math.min(imageRight, Math.max(...xs));
    const visibleMinY = Math.max(imageTop, Math.min(...ys));
    const visibleMaxY = Math.min(imageBottom, Math.max(...ys));
    if (!(visibleMaxX > visibleMinX && visibleMaxY > visibleMinY)) return null;

    const normalizedLeft = clampUnit((visibleMinX - imageLeft) / contentWidth);
    const normalizedRight = clampUnit((visibleMaxX - imageLeft) / contentWidth);
    const normalizedTop = clampUnit((visibleMinY - imageTop) / contentHeight);
    const normalizedBottom = clampUnit((visibleMaxY - imageTop) / contentHeight);
    if (!(normalizedRight > normalizedLeft && normalizedBottom > normalizedTop)) return null;

    const cropLeft = Math.max(
      0,
      Math.min(Math.floor(normalizedLeft * sourceWidth), sourceWidth - 1)
    );
    const cropTop = Math.max(
      0,
      Math.min(Math.floor(normalizedTop * sourceHeight), sourceHeight - 1)
    );
    const cropRight = Math.max(
      cropLeft + 1,
      Math.min(sourceWidth, Math.ceil(normalizedRight * sourceWidth))
    );
    const cropBottom = Math.max(
      cropTop + 1,
      Math.min(sourceHeight, Math.ceil(normalizedBottom * sourceHeight))
    );
    const cropWidth = Math.max(1, cropRight - cropLeft);
    const cropHeight = Math.max(1, cropBottom - cropTop);

    return {
      x: cropLeft,
      y: cropTop,
      width: cropWidth,
      height: cropHeight,
    };
  }, [
    canvasRenderSize.height,
    canvasRenderSize.width,
    resolvedImageOffset.x,
    resolvedImageOffset.y,
    src,
    viewTransform,
    containerRef,
    imgRef,
  ]);

  const resolveImageContentFrame = useCallback((): VectorCanvasImageContentFrame | null => {
    if (!src) return null;
    const image = imgRef.current;
    if (!image) return null;
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!(sourceWidth > 0 && sourceHeight > 0)) return null;

    const canvasWidth = canvasRenderSize.width;
    const canvasHeight = canvasRenderSize.height;
    if (!(canvasWidth > 0 && canvasHeight > 0)) return null;

    const sourceAspect = sourceWidth / sourceHeight;
    const renderAspect = canvasWidth / canvasHeight;

    let contentWidth = canvasWidth;
    let contentHeight = canvasHeight;
    if (sourceAspect > 0 && Number.isFinite(sourceAspect)) {
      if (sourceAspect > renderAspect) {
        contentHeight = canvasWidth / sourceAspect;
      } else {
        contentWidth = canvasHeight * sourceAspect;
      }
    }
    if (!(contentWidth > 0 && contentHeight > 0)) return null;

    return {
      x: (resolvedImageOffset.x + (canvasWidth - contentWidth) / 2) / canvasWidth,
      y: (resolvedImageOffset.y + (canvasHeight - contentHeight) / 2) / canvasHeight,
      width: contentWidth / canvasWidth,
      height: contentHeight / canvasHeight,
    };
  }, [
    canvasRenderSize.height,
    canvasRenderSize.width,
    resolvedImageOffset.x,
    resolvedImageOffset.y,
    src,
    imgRef,
  ]);

  useEffect(() => {
    if (!onViewCropRectChange) return;
    onViewCropRectChange(resolveVisibleViewCropRect());
  }, [
    onViewCropRectChange,
    resolveVisibleViewCropRect,
    src,
    viewTransform,
    canvasRenderSize.width,
    canvasRenderSize.height,
  ]);

  useEffect(() => {
    if (!onImageContentFrameChange) return;
    onImageContentFrameChange(resolveImageContentFrame());
  }, [
    canvasRenderSize.height,
    canvasRenderSize.width,
    onImageContentFrameChange,
    resolveImageContentFrame,
    src,
    viewTransform,
  ]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
      const canvas = canvasRef.current;
      if (canvas && (canvas.width <= 1 || canvas.height <= 1)) {
        syncCanvasSize();
      }
      const shouldPanWithSpace = event.button === 0 && spaceDownRef.current;
      if (event.button === 1 || event.button === 2 || shouldPanWithSpace) {
        event.preventDefault();
        beginPan(event.clientX, event.clientY);
        return;
      }
      if (imageMoveEnabled && src && event.button === 0) {
        event.preventDefault();
        imageDragRef.current = {
          startClientX: event.clientX,
          startClientY: event.clientY,
          startOffsetX: resolvedImageOffset.x,
          startOffsetY: resolvedImageOffset.y,
        };
        setIsDraggingImage(true);
        return;
      }
      if (tool === 'select' && !selectionEnabled && event.button === 0) {
        event.preventDefault();
        beginPan(event.clientX, event.clientY);
        return;
      }
      if (tool === 'select' && selectionEnabled) {
        if (event.shiftKey) {
          const hitSegment = hitTestSegment(event.clientX, event.clientY);
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
        const hit = hitTestPoint(event.clientX, event.clientY);
        if (hit) {
          dragRef.current = hit;
          setIsDraggingEditablePoint(true);
          onSelectShape(hit.shapeId);
          onSelectPoint?.(hit.pointIndex);
          return;
        }
        const hitShape = hitTestShape(event.clientX, event.clientY);
        if (hitShape) {
          const startPoint = toPoint(event.clientX, event.clientY);
          onSelectShape(hitShape.shapeId);
          onSelectPoint?.(null);
          if (startPoint && event.button === 0) {
            dragShapeRef.current = { shapeId: hitShape.shapeId, lastPoint: startPoint };
          }
          return;
        }
        if (event.button === 0) {
          beginPan(event.clientX, event.clientY);
        }
        return;
      }

      if (tool === 'polygon') {
        const nextPoint = toPoint(event.clientX, event.clientY);
        if (!nextPoint) return;
        const activeShape = shapes.find(
          (s: VectorShape) => s.id === activeShapeId && s.type === 'polygon' && !s.closed
        );
        if (!activeShape) {
          const newShape: VectorShape = {
            id: `shape_${Date.now().toString(36)}`,
            name: `Polygon ${shapes.length + 1}`,
            type: 'polygon',
            role: 'custom',
            points: [nextPoint],
            style: {},
            closed: false,
            visible: true,
          };
          onSelectShape(newShape.id);
          onChange([...shapes, newShape]);
          return;
        }
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && activeShape.points.length >= 3) {
          const first = activeShape.points[0]!;
          const dist = Math.hypot(
            (first.x - nextPoint.x) * rect.width,
            (first.y - nextPoint.y) * rect.height
          );
          if (dist < 10) {
            onChange(shapes.map((s) => (s.id === activeShape.id ? { ...s, closed: true } : s)));
            return;
          }
        }
        onChange(
          shapes.map((s) =>
            s.id === activeShape.id ? { ...s, points: [...s.points, nextPoint] } : s
          )
        );
      } else if (tool === 'lasso' || tool === 'brush') {
        const nextPoint = toPoint(event.clientX, event.clientY);
        if (!nextPoint) return;
        const newShape: VectorShape = {
          id: `shape_${Date.now().toString(36)}`,
          name: `${tool.charAt(0).toUpperCase() + tool.slice(1)} ${shapes.length + 1}`,
          type: tool === 'brush' ? 'brush' : 'lasso',
          role: 'custom',
          points: [nextPoint],
          style: {},
          closed: false,
          visible: true,
        };
        drawingRef.current = { shapeId: newShape.id, type: newShape.type };
        onSelectShape(newShape.id);
        onChange([...shapes, newShape]);
      } else if (tool === 'rect' || tool === 'ellipse') {
        const nextPoint = toPoint(event.clientX, event.clientY);
        if (!nextPoint) return;
        const newShape: VectorShape = {
          id: `shape_${Date.now().toString(36)}`,
          name: `${tool.charAt(0).toUpperCase() + tool.slice(1)} ${shapes.length + 1}`,
          type: tool,
          role: 'custom',
          points: [nextPoint, nextPoint],
          style: {},
          closed: true,
          visible: true,
        };
        drawingRef.current = { shapeId: newShape.id, type: newShape.type, anchor: nextPoint };
        onSelectShape(newShape.id);
        onChange([...shapes, newShape]);
      }
    },
    [
      activeShapeId,
      beginPan,
      imageMoveEnabled,
      onChange,
      onSelectPoint,
      onSelectShape,
      resolvedImageOffset,
      selectionEnabled,
      shapes,
      src,
      syncCanvasSize,
      toPoint,
      tool,
      hitTestPoint,
      hitTestSegment,
      hitTestShape,
      canvasRef,
      spaceDownRef,
      imageDragRef,
      dragRef,
      dragShapeRef,
      drawingRef,
      setIsDraggingImage,
      setIsDraggingEditablePoint,
    ]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
      if (panningRef.current) {
        updatePanFromPointer(event.clientX, event.clientY);
        return;
      }
      if (isDraggingImage) {
        const dragState = imageDragRef.current;
        if (dragState) {
          const dx = event.clientX - dragState.startClientX;
          const dy = event.clientY - dragState.startClientY;
          onImageOffsetChange?.({ x: dragState.startOffsetX + dx, y: dragState.startOffsetY + dy });
        }
        return;
      }
      if (dragRef.current) {
        const currentDrag = dragRef.current;
        const nextPoint = toPoint(event.clientX, event.clientY);
        if (!nextPoint) return;
        onChange(
          shapes.map((shape: VectorShape) => {
            if (shape.id !== currentDrag.shapeId) return shape;
            if (shape.type === 'rect' && (event.shiftKey || event.altKey)) {
              const rect = getInteractionRect();
              const nextRectPoints = resolveRectResizePoints(
                shape.points,
                currentDrag.pointIndex,
                nextPoint,
                {
                  scaleFromCenter: event.altKey,
                  lockSquare: event.shiftKey,
                  viewportWidth: rect?.width,
                  viewportHeight: rect?.height,
                }
              );
              return nextRectPoints ? { ...shape, points: nextRectPoints } : shape;
            }
            const nextPoints = [...shape.points];
            nextPoints[currentDrag.pointIndex] = nextPoint;
            return { ...shape, points: nextPoints };
          })
        );
        return;
      }
      if (dragShapeRef.current) {
        const nextPoint = toPoint(event.clientX, event.clientY);
        if (!nextPoint) return;
        const { shapeId, lastPoint } = dragShapeRef.current;
        const dx = nextPoint.x - lastPoint.x;
        const dy = nextPoint.y - lastPoint.y;
        if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return;
        onChange(
          shapes.map((shape: VectorShape) => {
            if (shape.id !== shapeId) return shape;
            return { ...shape, points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
          })
        );
        dragShapeRef.current = { shapeId, lastPoint: nextPoint };
        return;
      }
      if (drawingRef.current) {
        const nextPoint = toPoint(event.clientX, event.clientY);
        if (!nextPoint) return;
        const drawState = drawingRef.current;
        onChange(
          shapes.map((shape: VectorShape) => {
            if (shape.id !== drawState.shapeId) return shape;
            if (shape.type === 'lasso' || shape.type === 'brush') {
              return { ...shape, points: [...shape.points, nextPoint] };
            }
            if (shape.type === 'rect') {
              const rect = getInteractionRect();
              const nextPoints = resolveRectDragPoints(
                drawState.anchor ?? shape.points[0]!,
                nextPoint,
                {
                  scaleFromCenter: event.altKey,
                  lockSquare: event.shiftKey,
                  viewportWidth: rect?.width,
                  viewportHeight: rect?.height,
                }
              );
              return { ...shape, points: nextPoints };
            }
            if (shape.type === 'ellipse') {
              return { ...shape, points: [shape.points[0]!, nextPoint] };
            }
            return shape;
          })
        );
      }
    },
    [
      panningRef,
      updatePanFromPointer,
      isDraggingImage,
      imageDragRef,
      onImageOffsetChange,
      dragRef,
      toPoint,
      onChange,
      shapes,
      getInteractionRect,
      dragShapeRef,
      drawingRef,
    ]
  );

  const handleMouseUp = useCallback((): void => {
    stopPan();
    interactions.setIsDraggingImage(false);
    interactions.setIsDraggingEditablePoint(false);
    if (drawingRef.current) {
      onChange(
        shapes.map((s) => (s.id === drawingRef.current?.shapeId ? { ...s, closed: true } : s))
      );
    }
    interactions.dragRef.current = null;
    interactions.dragShapeRef.current = null;
    interactions.drawingRef.current = null;
  }, [stopPan, interactions, onChange, shapes, drawingRef]);

  const handleFitToScreen = useCallback(() => {
    stopPan();
    setViewTransform({ scale: 1, panX: 0, panY: 0, rotateDeg: 0 });
  }, [stopPan, setViewTransform]);

  const applyScaleAtAnchor = useCallback(
    (scaleFactor: number, anchor: { x: number; y: number }): void => {
      if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) return;
      setViewTransform((prev) => {
        const nextScale = Math.max(
          MIN_VIEW_SCALE,
          Math.min(MAX_VIEW_SCALE, prev.scale * scaleFactor)
        );
        if (Math.abs(nextScale - prev.scale) < 1e-4) return prev;

        const anchorWorld = screenPointToWorld(anchor, prev);
        const shifted = worldPointToScreen(anchorWorld, { ...prev, scale: nextScale });
        return {
          ...prev,
          scale: nextScale,
          panX: prev.panX + (anchor.x - shifted.x),
          panY: prev.panY + (anchor.y - shifted.y),
        };
      });
    },
    [setViewTransform]
  );

  const resolveViewportCenter = useCallback((): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: rect.width / 2,
      y: rect.height / 2,
    };
  }, [containerRef]);

  const handleZoomIn = useCallback((): void => {
    applyScaleAtAnchor(1.15, resolveViewportCenter());
  }, [applyScaleAtAnchor, resolveViewportCenter]);

  const handleZoomOut = useCallback((): void => {
    applyScaleAtAnchor(1 / 1.15, resolveViewportCenter());
  }, [applyScaleAtAnchor, resolveViewportCenter]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>): void => {
      if (!src) return;
      event.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) return;

      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const magnitude = Math.max(0.04, Math.min(0.45, Math.abs(event.deltaY) * 0.0015));
      const zoomFactor = event.deltaY < 0 ? 1 + magnitude : 1 / (1 + magnitude);
      applyScaleAtAnchor(zoomFactor, anchor);
    },
    [applyScaleAtAnchor, containerRef, src]
  );

  const showViewTransformHud = Boolean(src);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden rounded border border-border bg-black/20',
        className
      )}
      style={enableTwoFingerRotate ? { touchAction: 'none' } : undefined}
      onWheel={handleWheel}
    >
      <div
        ref={viewportRef}
        className='relative h-full w-full'
        style={
          showViewTransformHud
            ? {
                transform: `translate(${viewTransform.panX}px, ${viewTransform.panY}px) scale(${viewTransform.scale}) rotate(${viewTransform.rotateDeg}deg)`,
                transformOrigin: '0 0',
                transition: isPanning ? 'none' : 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)',
              }
            : undefined
        }
      >
        {backgroundLayerEnabled && (
          <div
            className='pointer-events-none absolute left-1/2 top-0 z-[1] -translate-x-1/2 border border-slate-700/70'
            style={{
              width: `${canvasRenderSize.width}px`,
              height: `${canvasRenderSize.height}px`,
              backgroundColor: resolvedBackgroundColor,
            }}
          />
        )}
        {showCanvasGrid && (
          <div
            className='pointer-events-none absolute left-1/2 top-0 z-[5] -translate-x-1/2 border border-slate-700/70 bg-transparent [background-size:24px_24px] [background-image:linear-gradient(to_right,rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.22)_1px,transparent_1px)]'
            style={{ width: `${canvasRenderSize.width}px`, height: `${canvasRenderSize.height}px` }}
          />
        )}
        {showCenterGuides && (
          <div
            data-testid='vector-canvas-center-guides'
            className='pointer-events-none absolute left-1/2 top-0 z-[16] -translate-x-1/2'
            style={{ width: `${canvasRenderSize.width}px`, height: `${canvasRenderSize.height}px` }}
          >
            <div
              data-testid='vector-canvas-center-guides-vertical'
              className='absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-300/70'
            />
            <div
              data-testid='vector-canvas-center-guides-horizontal'
              className='absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan-300/70'
            />
          </div>
        )}
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={src}
            alt='Canvas Source'
            className='pointer-events-none absolute z-[2] select-none object-contain object-top'
            style={{
              width: `${canvasRenderSize.width}px`,
              height: `${canvasRenderSize.height}px`,
              left: `calc(50% + ${resolvedImageOffset.x}px)`,
              top: `${resolvedImageOffset.y}px`,
              transform: 'translateX(-50%)',
            }}
            onLoad={() => syncCanvasSize()}
            draggable={false}
          />
        )}
        <canvas
          ref={canvasRef}
          className={cn(
            'absolute left-1/2 top-0 z-20 -translate-x-1/2',
            isPanning || isDraggingImage || isDraggingEditablePoint
              ? 'cursor-grabbing'
              : isHoveringEditablePoint
                ? 'cursor-pointer'
                : isHoveringMovableShape
                  ? 'cursor-move'
                  : 'cursor-crosshair'
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={() => setViewTransform({ scale: 1, panX: 0, panY: 0, rotateDeg: 0 })}
          onContextMenu={(e) => e.preventDefault()}
        />
        <VectorShapeOverlay
          shapes={shapes}
          activeShapeId={activeShapeId}
          selectedPointIndex={selectedPointIndex}
          viewboxSize={SHAPE_VIEWBOX_SIZE}
        />
      </div>
      {showViewTransformHud && (
        <div className='absolute bottom-2 right-2 z-10 flex items-center gap-1'>
          <Button
            variant='outline'
            size='sm'
            className='h-6 bg-black/60 px-2 text-[11px] text-white/90'
            onClick={handleZoomOut}
            title='Zoom out'
            aria-label='Zoom out'
          >
            -
          </Button>
          <div className='rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white/90'>
            {Math.round(viewTransform.scale * 100)}%
          </div>
          <Button
            variant='outline'
            size='sm'
            className='h-6 bg-black/60 px-2 text-[11px] text-white/90'
            onClick={handleZoomIn}
            title='Zoom in'
            aria-label='Zoom in'
          >
            +
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-6 bg-black/60 px-2 text-[11px] text-white/90'
            onClick={handleFitToScreen}
          >
            Fit
          </Button>
        </div>
      )}
    </div>
  );
}

export { VectorToolbar };
