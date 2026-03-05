'use client';

import React from 'react';
import type { VectorShape, VectorToolMode } from '@/shared/contracts/vector';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

export const {
  Context: VectorDrawingContext,
  useStrictContext: useVectorDrawing,
  useOptionalContext: useOptionalVectorDrawing,
} = createStrictContext<VectorDrawingContextValue>({
  hookName: 'useVectorDrawing',
  providerName: 'a VectorDrawingProvider',
  displayName: 'VectorDrawingContext',
});

interface VectorDrawingProviderProps {
  children: React.ReactNode;
  value: VectorDrawingContextValue;
}

export function VectorDrawingProvider({
  children,
  value,
}: VectorDrawingProviderProps): React.JSX.Element {
  return <VectorDrawingContext.Provider value={value}>{children}</VectorDrawingContext.Provider>;
}
