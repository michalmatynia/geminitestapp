'use client';

import {
  useKangurManagedDrawingActions,
  type UseKangurManagedDrawingActionsOptions,
} from '@/features/kangur/ui/components/drawing-engine/useKangurManagedDrawingActions';
import {
  useKangurFreeformCanvasDrawing,
  type UseKangurFreeformCanvasDrawingOptions,
  type UseKangurFreeformCanvasDrawingResult,
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
  const drawing = useKangurFreeformCanvasDrawing(drawingOptions);
  const {
    resolveCanExport = (current) => current.hasDrawableContent,
    resolveCanRedo = (current) => current.canRedo,
    resolveCanUndo = (current) => current.canUndo,
    ...actionOptions
  } = actions;

  const managedActions = useKangurManagedDrawingActions<HTMLCanvasElement>({
    ...actionOptions,
    canExport: resolveCanExport(drawing),
    canRedo: resolveCanRedo(drawing),
    canUndo: resolveCanUndo(drawing),
    clearStrokes: drawing.clearStrokes,
    exportDataUrl: drawing.exportDataUrl,
    redoLastStroke: drawing.redoLastStroke,
    undoLastStroke: drawing.undoLastStroke,
  });

  return {
    ...drawing,
    ...managedActions,
  };
};
