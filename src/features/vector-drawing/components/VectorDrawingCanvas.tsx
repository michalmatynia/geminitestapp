'use client';

import React from 'react';

import { VectorCanvas, type VectorCanvasProps } from '@/shared/ui';

import { useOptionalVectorDrawing } from '../context/VectorDrawingContext';

export type { VectorCanvasProps } from '@/shared/ui';

export function VectorDrawingCanvas(props: Partial<VectorCanvasProps>): React.JSX.Element {
  const context = useOptionalVectorDrawing();
  const contextValues: Partial<VectorCanvasProps> = context
    ? {
      shapes: context.shapes,
      tool: context.tool,
      activeShapeId: context.activeShapeId,
      selectedPointIndex: context.selectedPointIndex,
      onChange: context.setShapes,
      onSelectShape: context.setActiveShapeId,
      onSelectPoint: context.setSelectedPointIndex,
      brushRadius: context.brushRadius,
      src: context.imageSrc,
      allowWithoutImage: context.allowWithoutImage,
      showEmptyState: context.showEmptyState,
      emptyStateLabel: context.emptyStateLabel,
    }
    : {};

  const mergedProps = {
    ...contextValues,
    ...props,
  } as VectorCanvasProps;

  return <VectorCanvas {...mergedProps} />;
}
