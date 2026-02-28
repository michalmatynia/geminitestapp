'use client';

import React, { createContext, useContext } from 'react';

import type { VectorShape, VectorToolMode } from '../types';

export interface VectorDrawingContextValue {
  shapes: VectorShape[];
  tool: VectorToolMode;
  activeShapeId: string | null;
  selectedPointIndex: number | null;
  brushRadius: number;
  imageSrc: string | null;
  allowWithoutImage: boolean;
  showEmptyState: boolean;
  emptyStateLabel: string;
  setShapes: (shapes: VectorShape[]) => void;
  setTool: (tool: VectorToolMode) => void;
  setActiveShapeId: (id: string | null) => void;
  setSelectedPointIndex: (index: number | null) => void;
  onSmooth?: () => void;
  onSimplify?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  onCloseShape?: () => void;
  onDetach?: () => void;
  disableUndo?: boolean;
  disableRedo?: boolean;
  disableClear?: boolean;
  disableClose?: boolean;
  disableDetach?: boolean;
  disableSmooth?: boolean;
  disableSimplify?: boolean;
}

const VectorDrawingContext = createContext<VectorDrawingContextValue | null>(null);

export function useVectorDrawing(): VectorDrawingContextValue {
  const context = useContext(VectorDrawingContext);
  if (!context) {
    throw new Error('useVectorDrawing must be used within a VectorDrawingProvider');
  }
  return context;
}

export function useOptionalVectorDrawing(): VectorDrawingContextValue | null {
  return useContext(VectorDrawingContext);
}

export interface VectorDrawingProviderProps {
  children: React.ReactNode;
  value: VectorDrawingContextValue;
}

export function VectorDrawingProvider({
  children,
  value,
}: VectorDrawingProviderProps): React.JSX.Element {
  return <VectorDrawingContext.Provider value={value}>{children}</VectorDrawingContext.Provider>;
}
