'use client';

import React from 'react';

import type { VectorCanvasProps } from '@/shared/contracts/ui';
import { VectorCanvas } from '@/shared/ui';
import {
  VectorCanvasProvider,
  type VectorCanvasContextValue,
} from '@/shared/ui/vector-canvas/VectorCanvasContext';

import {
  useOptionalVectorDrawingActions,
  useOptionalVectorDrawingState,
} from '../context/VectorDrawingContext';

export type { VectorCanvasProps } from '@/shared/contracts/ui';

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

  const contextValue = {
    shapes,
    tool,
    activeShapeId,
    selectedPointIndex,
    onChange,
    onSelectShape,
    onSelectPoint,
    brushRadius,
    src,
    allowWithoutImage,
    showEmptyState,
    emptyStateLabel,
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
    // Note: internal state and handlers will be populated by VectorCanvasInner
  } as VectorCanvasContextValue;

  return (
    <VectorCanvasProvider value={contextValue}>
      <VectorCanvas />
    </VectorCanvasProvider>
  );
}
