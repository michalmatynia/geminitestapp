'use client';

import {
  type UseKangurManagedDrawingActionsOptions,
} from '@/features/kangur/ui/components/drawing-engine/useKangurManagedDrawingActions';
import {
  useKangurManagedStoredFreeformCanvasDrawing,
} from '@/features/kangur/ui/components/drawing-engine/useKangurManagedStoredFreeformCanvasDrawing';
import type {
  UseKangurFreeformCanvasDrawingOptions,
  UseKangurFreeformCanvasDrawingResult,
} from '@/features/kangur/ui/components/drawing-engine/useKangurFreeformCanvasDrawing';

type UseKangurManagedFreeformCanvasDrawingOptions = {
  actions: Omit<
    UseKangurManagedDrawingActionsOptions<HTMLCanvasElement>,
    | 'canExport'
    | 'canRedo'
    | 'canUndo'
    | 'clearStrokes'
    | 'exportDataUrl'
    | 'redoLastStroke'
    | 'undoLastStroke'
  > & {
    resolveCanExport?: (drawing: UseKangurFreeformCanvasDrawingResult) => boolean;
    resolveCanRedo?: (drawing: UseKangurFreeformCanvasDrawingResult) => boolean;
    resolveCanUndo?: (drawing: UseKangurFreeformCanvasDrawingResult) => boolean;
  };
  drawing: UseKangurFreeformCanvasDrawingOptions;
};

export const useKangurManagedFreeformCanvasDrawing = ({
  actions,
  drawing: drawingOptions,
}: UseKangurManagedFreeformCanvasDrawingOptions) => {
  const {
    resolveCanExport = (current) => current.hasDrawableContent,
    resolveCanRedo = (current) => current.canRedo,
    resolveCanUndo = (current) => current.canUndo,
    ...actionOptions
  } = actions;

  return useKangurManagedStoredFreeformCanvasDrawing({
    actions: {
      ...actionOptions,
      resolveCanExport: (drawing) => resolveCanExport(drawing),
      resolveCanRedo: (drawing) => resolveCanRedo(drawing),
      resolveCanUndo: (drawing) => resolveCanUndo(drawing),
    },
    drawing: drawingOptions,
  });
};
