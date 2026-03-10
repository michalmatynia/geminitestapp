'use client';

import React, { createContext, useContext } from 'react';

import { type VectorShape, type VectorToolMode } from '@/shared/contracts/vector';
import { internalError } from '@/shared/errors/app-error';

import {
  type VectorCanvasImageContentFrame,
  type VectorCanvasViewCropRect,
} from '../vector-canvas.geometry';

export interface VectorCanvasContextValue {
  // Props
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

  // Internal State
  viewTransform: { scale: number; panX: number; panY: number; rotateDeg: number };
  canvasRenderSize: { width: number; height: number };
  resolvedImageOffset: { x: number; y: number };
  isPanning: boolean;
  isDraggingImage: boolean;
  isDraggingEditablePoint: boolean;
  isHoveringEditablePoint: boolean;
  isHoveringMovableShape: boolean;

  // Handlers
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleFitToScreen: () => void;
  syncCanvasSize: () => void;
}

export const VectorCanvasContext = createContext<VectorCanvasContextValue | null>(null);

export function VectorCanvasProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: VectorCanvasContextValue;
}) {
  return <VectorCanvasContext.Provider value={value}>{children}</VectorCanvasContext.Provider>;
}

export function useVectorCanvasContext() {
  const context = useContext(VectorCanvasContext);
  if (!context) {
    throw internalError('useVectorCanvasContext must be used within VectorCanvasProvider');
  }
  return context;
}

export function useOptionalVectorCanvasContext() {
  return useContext(VectorCanvasContext);
}
