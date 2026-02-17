'use client';

import React from 'react';

import { VectorCanvas, type VectorCanvasProps } from '@/shared/ui';

import { useOptionalVectorDrawing } from '../context/VectorDrawingContext';

export type { VectorCanvasProps } from '@/shared/ui';

export function VectorDrawingCanvas({
  shapes: propShapes,
  tool: propTool,
  activeShapeId: propActiveShapeId,
  selectedPointIndex: propSelectedPointIndex,
  onChange: propOnChange,
  onSelectShape: propOnSelectShape,
  onSelectPoint: propOnSelectPoint,
  brushRadius: propBrushRadius,
  src: propSrc,
  allowWithoutImage: propAllowWithoutImage,
  showEmptyState: propShowEmptyState,
  emptyStateLabel: propEmptyStateLabel,
  maskPreviewEnabled,
  maskPreviewShapes,
  maskPreviewInvert,
  maskPreviewOpacity,
  maskPreviewFeather,
  showCenterGuides,
  enableTwoFingerRotate,
  baseCanvasWidthPx,
  baseCanvasHeightPx,
  onViewCropRectChange,
  showCanvasGrid: propShowCanvasGrid,
  className,
}: Partial<VectorCanvasProps>): React.JSX.Element {
  const context = useOptionalVectorDrawing();

  const shapes = propShapes ?? context?.shapes;
  const tool = propTool ?? context?.tool;
  const activeShapeId = propActiveShapeId ?? context?.activeShapeId;
  const selectedPointIndex = propSelectedPointIndex ?? context?.selectedPointIndex;
  const onChange = propOnChange ?? context?.setShapes;
  const onSelectShape = propOnSelectShape ?? context?.setActiveShapeId;
  const onSelectPoint = propOnSelectPoint ?? context?.setSelectedPointIndex;
  const brushRadius = propBrushRadius ?? context?.brushRadius;
  const src = propSrc ?? context?.imageSrc;
  const allowWithoutImage = propAllowWithoutImage ?? context?.allowWithoutImage;
  const showEmptyState = propShowEmptyState ?? context?.showEmptyState;
  const emptyStateLabel = propEmptyStateLabel ?? context?.emptyStateLabel;
  const showCanvasGrid = propShowCanvasGrid;

  if (
    !shapes ||
    tool === undefined ||
    activeShapeId === undefined ||
    selectedPointIndex === undefined ||
    onChange === undefined ||
    onSelectShape === undefined ||
    brushRadius === undefined
  ) {
    return <div />;
  }

  return (
    <VectorCanvas
      shapes={shapes}
      tool={tool}
      activeShapeId={activeShapeId}
      selectedPointIndex={selectedPointIndex}
      onChange={onChange}
      onSelectShape={onSelectShape}
      {...(onSelectPoint !== undefined ? { onSelectPoint } : {})}
      brushRadius={brushRadius}
      {...(src !== undefined ? { src } : {})}
      {...(allowWithoutImage !== undefined ? { allowWithoutImage } : {})}
      {...(showEmptyState !== undefined ? { showEmptyState } : {})}
      {...(emptyStateLabel !== undefined ? { emptyStateLabel } : {})}
      {...(maskPreviewEnabled !== undefined ? { maskPreviewEnabled } : {})}
      {...(maskPreviewShapes !== undefined ? { maskPreviewShapes } : {})}
      {...(maskPreviewInvert !== undefined ? { maskPreviewInvert } : {})}
      {...(maskPreviewOpacity !== undefined ? { maskPreviewOpacity } : {})}
      {...(maskPreviewFeather !== undefined ? { maskPreviewFeather } : {})}
      {...(showCenterGuides !== undefined ? { showCenterGuides } : {})}
      {...(enableTwoFingerRotate !== undefined ? { enableTwoFingerRotate } : {})}
      {...(baseCanvasWidthPx !== undefined ? { baseCanvasWidthPx } : {})}
      {...(baseCanvasHeightPx !== undefined ? { baseCanvasHeightPx } : {})}
      {...(onViewCropRectChange !== undefined ? { onViewCropRectChange } : {})}
      {...(showCanvasGrid !== undefined ? { showCanvasGrid } : {})}
      {...(className !== undefined ? { className } : {})}
    />
  );
}
