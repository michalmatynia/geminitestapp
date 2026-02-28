'use client';

import React, { useMemo } from 'react';

import {
  VectorDrawingProvider,
  type VectorDrawingContextValue,
} from '../context/VectorDrawingContext';
import { VectorDrawingCanvas } from './VectorDrawingCanvas';
import { VectorDrawingToolbar, type VectorDrawingToolbarVariant } from './VectorDrawingToolbar';
import { useVectorDrawingShortcuts } from '../hooks/useVectorDrawingShortcuts';
import { useVectorDrawingState, type VectorDrawingOutput } from '../hooks/useVectorDrawingState';

import type { VectorShape, VectorToolMode } from '../types';

export type { VectorDrawingOutput };

export type VectorDrawingProps = {
  value?: VectorShape[];
  defaultValue?: VectorShape[];
  onChange?: (next: VectorShape[]) => void;
  onOutput?: (output: VectorDrawingOutput) => void;
  tool?: VectorToolMode;
  defaultTool?: VectorToolMode;
  onToolChange?: (tool: VectorToolMode) => void;
  toolbarVariant?: VectorDrawingToolbarVariant;
  toolbarClassName?: string;
  className?: string;
  canvasClassName?: string;
  allowWithoutImage?: boolean;
  showEmptyState?: boolean;
  emptyStateLabel?: string;
  imageSrc?: string | null;
  brushRadius?: number;
  activeShapeId?: string | null;
  selectedPointIndex?: number | null;
  onSelectShape?: (id: string | null) => void;
  onSelectPoint?: (index: number | null) => void;
};

export function VectorDrawing(props: VectorDrawingProps): React.JSX.Element {
  const {
    toolbarVariant = 'full',
    toolbarClassName,
    className,
    canvasClassName,
    allowWithoutImage,
    showEmptyState,
    emptyStateLabel,
    imageSrc,
    brushRadius,
    onOutput,
  } = props;

  const {
    shapes,
    currentTool,
    resolvedActiveShapeId,
    resolvedSelectedPointIndex,
    handleChange,
    handleToolChange,
    handleSelectShape,
    handleSelectPoint,
    handleSmooth,
    handleSimplify,
    handleUndo,
    handleRedo,
    output,
    canUndo,
    canRedo,
  } = useVectorDrawingState(props);

  useVectorDrawingShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToolChange: handleToolChange,
  });

  const contextValue = useMemo<VectorDrawingContextValue>(
    () => ({
      shapes,
      tool: currentTool,
      activeShapeId: resolvedActiveShapeId,
      selectedPointIndex: resolvedSelectedPointIndex,
      brushRadius: brushRadius ?? 6,
      imageSrc: imageSrc ?? null,
      allowWithoutImage: allowWithoutImage ?? false,
      showEmptyState: showEmptyState ?? true,
      emptyStateLabel: emptyStateLabel ?? 'Select an image slot to preview.',
      setShapes: handleChange,
      setTool: handleToolChange,
      setActiveShapeId: handleSelectShape,
      setSelectedPointIndex: handleSelectPoint,
      onSmooth: handleSmooth,
      onSimplify: handleSimplify,
      onUndo: handleUndo,
      onRedo: handleRedo,
      disableUndo: !canUndo,
      disableRedo: !canRedo,
    }),
    [
      shapes,
      currentTool,
      resolvedActiveShapeId,
      resolvedSelectedPointIndex,
      brushRadius,
      imageSrc,
      allowWithoutImage,
      showEmptyState,
      emptyStateLabel,
      handleChange,
      handleToolChange,
      handleSelectShape,
      handleSelectPoint,
      handleSmooth,
      handleSimplify,
      handleUndo,
      handleRedo,
      canUndo,
      canRedo,
    ]
  );

  return (
    <VectorDrawingProvider value={contextValue}>
      <div className={className}>
        <VectorDrawingCanvas {...(canvasClassName ? { className: canvasClassName } : {})} />
        <VectorDrawingToolbar
          {...(toolbarClassName ? { className: toolbarClassName } : {})}
          variant={toolbarVariant}
        />
        {onOutput ? null : <span className='sr-only'>{output.path}</span>}
      </div>
    </VectorDrawingProvider>
  );
}
