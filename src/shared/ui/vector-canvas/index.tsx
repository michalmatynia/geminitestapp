'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  type VectorPoint,
  type VectorShape,
  type VectorShapeType,
  type VectorToolMode,
} from '@/shared/contracts/vector';
import { cn } from '@/shared/utils';

import {
  type VectorCanvasImageContentFrame,
  type VectorCanvasViewCropRect,
} from '../vector-canvas.geometry';
import { useVectorCanvasInteractions } from '../vector-canvas.hooks';
import { VectorToolbar, VectorShapeOverlay } from '../vector-canvas.rendering';

import { CanvasBackgroundLayer } from './components/CanvasBackgroundLayer';
import { CanvasGridLayer } from './components/CanvasGridLayer';
import { CanvasCenterGuides } from './components/CanvasCenterGuides';
import { CanvasImageLayer } from './components/CanvasImageLayer';
import { CanvasHud } from './components/CanvasHud';

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
} from '../vector-canvas.geometry';

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
    maskPreviewEnabled: _maskPreviewEnabled = false,
    maskPreviewShapes: _maskPreviewShapes = [],
    maskPreviewInvert: _maskPreviewInvert = false,
    maskPreviewOpacity: _maskPreviewOpacity = 0.48,
    maskPreviewFeather: _maskPreviewFeather = 0,
    showCenterGuides = false,
    enableTwoFingerRotate = false,
    baseCanvasWidthPx = null,
    baseCanvasHeightPx = null,
    onViewCropRectChange,
    onImageContentFrameChange,
    showCanvasGrid = false,
    imageMoveEnabled = false,
    imageOffset,
    onImageOffsetChange,
    backgroundLayerEnabled = false,
    backgroundColor = 'transparent',
    className,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [viewTransform, setViewTransform] = useState({
    scale: 1,
    panX: 0,
    panY: 0,
    rotateDeg: 0,
  });

  const [canvasRenderSize, setCanvasRenderSize] = useState({ width: 0, height: 0 });
  const [resolvedImageOffset, setResolvedImageOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (imageOffset) {
      setResolvedImageOffset(imageOffset);
    }
  }, [imageOffset]);

  const syncCanvasSize = React.useCallback(() => {
    if (imgRef.current) {
      setCanvasRenderSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  }, []);

  const SHAPE_VIEWBOX_SIZE = 1000;

  const {
    isPanning,
    isDraggingImage,
    isDraggingEditablePoint,
    isHoveringEditablePoint,
    isHoveringMovableShape,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleZoomIn,
    handleZoomOut,
    handleFitToScreen,
  } = useVectorCanvasInteractions({
    containerRef,
    viewportRef,
    canvasRef,
    imgRef,
    viewTransform,
    setViewTransform,
    canvasRenderSize,
    setCanvasRenderSize,
    resolvedImageOffset,
    setResolvedImageOffset,
    src,
    tool,
    selectionEnabled,
    shapes,
    activeShapeId,
    selectedPointIndex,
    onChange,
    onSelectShape,
    onSelectPoint,
    brushRadius,
    allowWithoutImage,
    enableTwoFingerRotate,
    baseCanvasWidthPx,
    baseCanvasHeightPx,
    onViewCropRectChange,
    onImageContentFrameChange,
    imageMoveEnabled,
    onImageOffsetChange,
    minViewScale: MIN_VIEW_SCALE,
    maxViewScale: MAX_VIEW_SCALE,
    viewboxSize: SHAPE_VIEWBOX_SIZE,
    syncCanvasSize,
  });

  const resolvedBackgroundColor = useMemo(() => {
    if (backgroundColor === 'transparent') return 'transparent';
    return backgroundColor;
  }, [backgroundColor]);

  const showViewTransformHud = true;

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
        <CanvasBackgroundLayer
          enabled={backgroundLayerEnabled}
          color={resolvedBackgroundColor}
          width={canvasRenderSize.width}
          height={canvasRenderSize.height}
        />
        <CanvasGridLayer
          show={showCanvasGrid}
          width={canvasRenderSize.width}
          height={canvasRenderSize.height}
        />
        <CanvasCenterGuides
          show={showCenterGuides}
          width={canvasRenderSize.width}
          height={canvasRenderSize.height}
        />
        <CanvasImageLayer
          ref={imgRef}
          src={src}
          width={canvasRenderSize.width}
          height={canvasRenderSize.height}
          offsetX={resolvedImageOffset.x}
          offsetY={resolvedImageOffset.y}
          onLoad={syncCanvasSize}
        />
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
      <CanvasHud
        show={showViewTransformHud}
        scale={viewTransform.scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFitToScreen}
      />
    </div>
  );
}

export { VectorToolbar };
