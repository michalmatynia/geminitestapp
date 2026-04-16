/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/naming-convention */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  type VectorPoint,
  type VectorShape,
  type VectorShapeType,
  type VectorToolMode,
} from '@/shared/contracts/vector';
import type { VectorCanvasProps } from '@/shared/contracts/ui/canvas';
import { cn } from '@/shared/utils/ui-utils';

import { type VectorCanvasRect } from '../vector-canvas.geometry';
import { useVectorCanvasInteractions } from '../vector-canvas.hooks';
import { VectorToolbar, VectorShapeOverlay } from '../vector-canvas.rendering';
import { CanvasBackgroundLayer } from './components/CanvasBackgroundLayer';
import { CanvasCenterGuides } from './components/CanvasCenterGuides';
import { CanvasGridLayer } from './components/CanvasGridLayer';
import { CanvasHud } from './components/CanvasHud';
import { CanvasImageLayer } from './components/CanvasImageLayer';
import {
  VectorCanvasProvider,
  useOptionalVectorCanvasContext,
  type VectorCanvasContextValue,
} from './VectorCanvasContext';

export { type VectorPoint, type VectorShape, type VectorShapeType, type VectorToolMode };
export type { VectorCanvasRect };
export type { VectorCanvasProps };
export {
  DEFAULT_VECTOR_VIEWBOX,
  resolveRectDragPoints,
  resolveRectResizePoints,
  vectorShapeToPath,
  vectorShapesToPath,
  vectorShapeToPathWithBounds,
  vectorShapesToPathWithBounds,
} from '../vector-canvas.geometry';

const MIN_VIEW_SCALE = 0.25;
const MAX_VIEW_SCALE = 8;

export function VectorCanvas(props: VectorCanvasProps): React.JSX.Element {
  const context = useOptionalVectorCanvasContext();

  const {
    src = props.src ?? context?.src,
    tool = props.tool ?? context?.tool ?? 'select',
    selectionEnabled = props.selectionEnabled ?? context?.selectionEnabled ?? true,
    shapes = props.shapes ?? context?.shapes ?? [],
    activeShapeId = props.activeShapeId ?? context?.activeShapeId ?? null,
    selectedPointIndex = props.selectedPointIndex ?? context?.selectedPointIndex ?? null,
    onChange = props.onChange ?? context?.onChange ?? ((): void => {}),
    onSelectShape = props.onSelectShape ?? context?.onSelectShape ?? ((): void => {}),
    onSelectPoint = props.onSelectPoint ?? context?.onSelectPoint,
    brushRadius = props.brushRadius ?? context?.brushRadius ?? 40,
    allowWithoutImage = props.allowWithoutImage ?? context?.allowWithoutImage ?? false,
    showEmptyState: _showEmptyState = props.showEmptyState ?? context?.showEmptyState ?? true,
    emptyStateLabel: _emptyStateLabel = props.emptyStateLabel ??
      context?.emptyStateLabel ??
      'Select an image slot to preview.',
    maskPreviewEnabled: _maskPreviewEnabled = props.maskPreviewEnabled ??
      context?.maskPreviewEnabled ??
      false,
    maskPreviewShapes: _maskPreviewShapes = props.maskPreviewShapes ??
      context?.maskPreviewShapes ??
      [],
    maskPreviewInvert: _maskPreviewInvert = props.maskPreviewInvert ??
      context?.maskPreviewInvert ??
      false,
    maskPreviewOpacity: _maskPreviewOpacity = props.maskPreviewOpacity ??
      context?.maskPreviewOpacity ??
      0.48,
    maskPreviewFeather: _maskPreviewFeather = props.maskPreviewFeather ??
      context?.maskPreviewFeather ??
      0,
    showCenterGuides = props.showCenterGuides ?? context?.showCenterGuides ?? false,
    enableTwoFingerRotate = props.enableTwoFingerRotate ?? context?.enableTwoFingerRotate ?? false,
    baseCanvasWidthPx = props.baseCanvasWidthPx ?? context?.baseCanvasWidthPx ?? null,
    baseCanvasHeightPx = props.baseCanvasHeightPx ?? context?.baseCanvasHeightPx ?? null,
    onViewCropRectChange = props.onViewCropRectChange ?? context?.onViewCropRectChange,
    onImageContentFrameChange = props.onImageContentFrameChange ??
      context?.onImageContentFrameChange,
    showCanvasGrid = props.showCanvasGrid ?? context?.showCanvasGrid ?? false,
    imageMoveEnabled = props.imageMoveEnabled ?? context?.imageMoveEnabled ?? false,
    imageOffset = props.imageOffset ?? context?.imageOffset,
    onImageOffsetChange = props.onImageOffsetChange ?? context?.onImageOffsetChange,
    backgroundLayerEnabled = props.backgroundLayerEnabled ??
      context?.backgroundLayerEnabled ??
      false,
    backgroundColor = props.backgroundColor ?? context?.backgroundColor ?? 'transparent',
    className = props.className ?? context?.className,
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

  const contextValue = useMemo<VectorCanvasContextValue>(
    () => ({
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
      showEmptyState: _showEmptyState,
      emptyStateLabel: _emptyStateLabel,
      maskPreviewEnabled: _maskPreviewEnabled,
      maskPreviewShapes: _maskPreviewShapes,
      maskPreviewInvert: _maskPreviewInvert,
      maskPreviewOpacity: _maskPreviewOpacity,
      maskPreviewFeather: _maskPreviewFeather,
      showCenterGuides,
      enableTwoFingerRotate,
      baseCanvasWidthPx,
      baseCanvasHeightPx,
      onViewCropRectChange,
      onImageContentFrameChange,
      showCanvasGrid,
      imageMoveEnabled,
      imageOffset,
      onImageOffsetChange,
      backgroundLayerEnabled,
      backgroundColor,
      className,
      viewTransform,
      canvasRenderSize,
      resolvedImageOffset,
      isPanning,
      isDraggingImage,
      isDraggingEditablePoint,
      isHoveringEditablePoint,
      isHoveringMovableShape,
      handleZoomIn,
      handleZoomOut,
      handleFitToScreen,
      syncCanvasSize,
    }),
    [
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
      _showEmptyState,
      _emptyStateLabel,
      _maskPreviewEnabled,
      _maskPreviewShapes,
      _maskPreviewInvert,
      _maskPreviewOpacity,
      _maskPreviewFeather,
      showCenterGuides,
      enableTwoFingerRotate,
      baseCanvasWidthPx,
      baseCanvasHeightPx,
      onViewCropRectChange,
      onImageContentFrameChange,
      showCanvasGrid,
      imageMoveEnabled,
      imageOffset,
      onImageOffsetChange,
      backgroundLayerEnabled,
      backgroundColor,
      className,
      viewTransform,
      canvasRenderSize,
      resolvedImageOffset,
      isPanning,
      isDraggingImage,
      isDraggingEditablePoint,
      isHoveringEditablePoint,
      isHoveringMovableShape,
      handleZoomIn,
      handleZoomOut,
      handleFitToScreen,
      syncCanvasSize,
    ]
  );

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) return undefined;
    const handleNativeWheel = (event: WheelEvent): void => {
      handleWheel(event);
    };
    containerElement.addEventListener('wheel', handleNativeWheel, { passive: false });
    return (): void => {
      containerElement.removeEventListener('wheel', handleNativeWheel);
    };
  }, [handleWheel]);

  const getCursorClass = (): string => {
    if (isPanning || isDraggingImage || isDraggingEditablePoint) {
      return 'cursor-grabbing';
    }
    if (isHoveringEditablePoint) {
      return 'cursor-pointer';
    }
    if (isHoveringMovableShape) {
      return 'cursor-move';
    }
    return 'cursor-crosshair';
  };

  const showViewTransformHudValue = true;

  return (
    <VectorCanvasProvider value={contextValue}>
      <div
        ref={containerRef}
        data-vector-canvas-root='true'
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden overscroll-contain rounded border border-border bg-black/20',
          className
        )}
        style={enableTwoFingerRotate ? { touchAction: 'none' } : undefined}
      >
          <div
          ref={viewportRef}
          className='relative h-full w-full'
          style={{
            transform: `translate(${viewTransform.panX}px, ${viewTransform.panY}px) scale(${viewTransform.scale}) rotate(${viewTransform.rotateDeg}deg)`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <CanvasBackgroundLayer />
          <CanvasGridLayer />
          <CanvasCenterGuides />
          <CanvasImageLayer ref={imgRef} />
          <canvas
            ref={canvasRef}
            className={cn(
              'absolute left-1/2 top-0 z-20 -translate-x-1/2',
              getCursorClass()
            )}
            aria-label='Drawing canvas'
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={() => setViewTransform({ scale: 1, panX: 0, panY: 0, rotateDeg: 0 })}
            onContextMenu={(e) => e.preventDefault()}
          />
          <VectorShapeOverlay viewboxSize={SHAPE_VIEWBOX_SIZE} />
        </div>
        <CanvasHud show={showViewTransformHudValue} />
      </div>
    </VectorCanvasProvider>
  );
}

export { VectorToolbar };
