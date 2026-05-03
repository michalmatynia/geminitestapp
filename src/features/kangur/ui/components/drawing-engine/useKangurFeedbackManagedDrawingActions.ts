'use client';

import { useCallback } from 'react';

import {
  useKangurManagedDrawingActions,
  type UseKangurManagedDrawingActionsResult,
  type UseKangurManagedDrawingActionsOptions,
} from '@/features/kangur/ui/components/drawing-engine/useKangurManagedDrawingActions';

export type UseKangurFeedbackManagedDrawingActionsOptions<
  TElement extends HTMLElement | SVGElement = HTMLCanvasElement,
> = Omit<
  UseKangurManagedDrawingActionsOptions<TElement>,
  'onAfterClear' | 'onAfterRedo' | 'onAfterUndo'
> & {
  clearFeedback?: () => void;
  onAfterClearExtra?: () => void;
  onAfterRedoExtra?: () => void;
  onAfterUndoExtra?: () => void;
};

export const useKangurFeedbackManagedDrawingActions = <
  TElement extends HTMLElement | SVGElement = HTMLCanvasElement,
>({
  clearFeedback,
  onAfterClearExtra,
  onAfterRedoExtra,
  onAfterUndoExtra,
  ...options
}: UseKangurFeedbackManagedDrawingActionsOptions<TElement>): UseKangurManagedDrawingActionsResult<TElement> => {
  const handleAfterClear = useCallback((): void => {
    clearFeedback?.();
    onAfterClearExtra?.();
  }, [clearFeedback, onAfterClearExtra]);

  const handleAfterRedo = useCallback((): void => {
    clearFeedback?.();
    onAfterRedoExtra?.();
  }, [clearFeedback, onAfterRedoExtra]);

  const handleAfterUndo = useCallback((): void => {
    clearFeedback?.();
    onAfterUndoExtra?.();
  }, [clearFeedback, onAfterUndoExtra]);

  return useKangurManagedDrawingActions<TElement>({
    ...options,
    onAfterClear: handleAfterClear,
    onAfterRedo: handleAfterRedo,
    onAfterUndo: handleAfterUndo,
  });
};
