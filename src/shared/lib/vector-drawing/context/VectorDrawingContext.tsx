'use client';

import React, { useMemo } from 'react';
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

type VectorDrawingActionKey =
  | 'setShapes'
  | 'setTool'
  | 'setActiveShapeId'
  | 'setSelectedPointIndex'
  | 'onSmooth'
  | 'onSimplify'
  | 'onUndo'
  | 'onRedo'
  | 'onClear'
  | 'onCloseShape'
  | 'onDetach';

export type VectorDrawingStateContextValue = Omit<VectorDrawingContextValue, VectorDrawingActionKey>;
export type VectorDrawingActionsContextValue = Pick<VectorDrawingContextValue, VectorDrawingActionKey>;

export const {
  Context: VectorDrawingStateContext,
  useStrictContext: useVectorDrawingState,
  useOptionalContext: useOptionalVectorDrawingState,
} = createStrictContext<VectorDrawingStateContextValue>({
  hookName: 'useVectorDrawingState',
  providerName: 'a VectorDrawingProvider',
  displayName: 'VectorDrawingStateContext',
});

export const {
  Context: VectorDrawingActionsContext,
  useStrictContext: useVectorDrawingActions,
  useOptionalContext: useOptionalVectorDrawingActions,
} = createStrictContext<VectorDrawingActionsContextValue>({
  hookName: 'useVectorDrawingActions',
  providerName: 'a VectorDrawingProvider',
  displayName: 'VectorDrawingActionsContext',
});

interface VectorDrawingProviderProps {
  children: React.ReactNode;
  value: VectorDrawingContextValue;
}

export function VectorDrawingProvider({
  children,
  value,
}: VectorDrawingProviderProps): React.JSX.Element {
  const {
    shapes,
    tool,
    activeShapeId,
    selectedPointIndex,
    brushRadius,
    imageSrc,
    allowWithoutImage,
    showEmptyState,
    emptyStateLabel,
    disableUndo,
    disableRedo,
    disableClear,
    disableClose,
    disableDetach,
    disableSmooth,
    disableSimplify,
    setShapes,
    setTool,
    setActiveShapeId,
    setSelectedPointIndex,
    onSmooth,
    onSimplify,
    onUndo,
    onRedo,
    onClear,
    onCloseShape,
    onDetach,
  } = value;

  const stateValue = useMemo<VectorDrawingStateContextValue>(
    () => ({
      shapes,
      tool,
      activeShapeId,
      selectedPointIndex,
      brushRadius,
      imageSrc,
      allowWithoutImage,
      showEmptyState,
      emptyStateLabel,
      disableUndo,
      disableRedo,
      disableClear,
      disableClose,
      disableDetach,
      disableSmooth,
      disableSimplify,
    }),
    [
      shapes,
      tool,
      activeShapeId,
      selectedPointIndex,
      brushRadius,
      imageSrc,
      allowWithoutImage,
      showEmptyState,
      emptyStateLabel,
      disableUndo,
      disableRedo,
      disableClear,
      disableClose,
      disableDetach,
      disableSmooth,
      disableSimplify,
    ]
  );

  const actionsValue = useMemo<VectorDrawingActionsContextValue>(
    () => ({
      setShapes,
      setTool,
      setActiveShapeId,
      setSelectedPointIndex,
      onSmooth,
      onSimplify,
      onUndo,
      onRedo,
      onClear,
      onCloseShape,
      onDetach,
    }),
    [
      setShapes,
      setTool,
      setActiveShapeId,
      setSelectedPointIndex,
      onSmooth,
      onSimplify,
      onUndo,
      onRedo,
      onClear,
      onCloseShape,
      onDetach,
    ]
  );

  return (
    <VectorDrawingActionsContext.Provider value={actionsValue}>
      <VectorDrawingStateContext.Provider value={stateValue}>{children}</VectorDrawingStateContext.Provider>
    </VectorDrawingActionsContext.Provider>
  );
}

export function useVectorDrawing(): VectorDrawingContextValue {
  const state = useVectorDrawingState();
  const actions = useVectorDrawingActions();
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}

export function useOptionalVectorDrawing(): VectorDrawingContextValue | null {
  const state = useOptionalVectorDrawingState();
  const actions = useOptionalVectorDrawingActions();
  return useMemo(() => {
    if (!state || !actions) {
      return null;
    }
    return { ...state, ...actions };
  }, [actions, state]);
}
