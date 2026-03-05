'use client';

import React from 'react';

import { VectorCanvas, type VectorCanvasProps } from '@/shared/ui';

import {
  useOptionalVectorDrawingActions,
  useOptionalVectorDrawingState,
} from '../context/VectorDrawingContext';

export type { VectorCanvasProps } from '@/shared/ui';

export function VectorDrawingCanvas(props: Partial<VectorCanvasProps>): React.JSX.Element {
  const {
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
    onImageContentFrameChange,
    showCanvasGrid: propShowCanvasGrid,
    imageMoveEnabled,
    selectionEnabled,
    imageOffset,
    onImageOffsetChange,
    backgroundLayerEnabled,
    backgroundColor,
    className,
  } = props;

  const stateContext = useOptionalVectorDrawingState();
  const actionsContext = useOptionalVectorDrawingActions();

  const shapes = propShapes ?? stateContext?.shapes;
  const tool = propTool ?? stateContext?.tool;
  const activeShapeId = propActiveShapeId ?? stateContext?.activeShapeId;
  const selectedPointIndex = propSelectedPointIndex ?? stateContext?.selectedPointIndex;
  const onChange = propOnChange ?? actionsContext?.setShapes;
  const onSelectShape = propOnSelectShape ?? actionsContext?.setActiveShapeId;
  const onSelectPoint = propOnSelectPoint ?? actionsContext?.setSelectedPointIndex;
  const brushRadius = propBrushRadius ?? stateContext?.brushRadius;
  const src = propSrc ?? stateContext?.imageSrc;
  const allowWithoutImage = propAllowWithoutImage ?? stateContext?.allowWithoutImage;
  const showEmptyState = propShowEmptyState ?? stateContext?.showEmptyState;
  const emptyStateLabel = propEmptyStateLabel ?? stateContext?.emptyStateLabel;
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
      {...(onImageContentFrameChange !== undefined ? { onImageContentFrameChange } : {})}
      {...(showCanvasGrid !== undefined ? { showCanvasGrid } : {})}
      {...(imageMoveEnabled !== undefined ? { imageMoveEnabled } : {})}
      {...(selectionEnabled !== undefined ? { selectionEnabled } : {})}
      {...(imageOffset !== undefined ? { imageOffset } : {})}
      {...(onImageOffsetChange !== undefined ? { onImageOffsetChange } : {})}
      {...(backgroundLayerEnabled !== undefined ? { backgroundLayerEnabled } : {})}
      {...(backgroundColor !== undefined ? { backgroundColor } : {})}
      {...(className !== undefined ? { className } : {})}
    />
  );
}
