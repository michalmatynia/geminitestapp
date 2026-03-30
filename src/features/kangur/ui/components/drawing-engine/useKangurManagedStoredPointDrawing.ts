import {
  useKangurFeedbackManagedDrawingActions,
  type UseKangurFeedbackManagedDrawingActionsOptions,
} from '@/features/kangur/ui/components/drawing-engine/useKangurFeedbackManagedDrawingActions';
import {
  useKangurStoredPointCanvasDrawing,
  type UseKangurStoredPointCanvasDrawingOptions,
  type UseKangurStoredPointCanvasDrawingResult,
} from '@/features/kangur/ui/components/drawing-engine/useKangurStoredPointCanvasDrawing';

type UseKangurManagedStoredPointDrawingOptions = {
  actions: Omit<
    UseKangurFeedbackManagedDrawingActionsOptions<HTMLCanvasElement>,
    | 'canExport'
    | 'canRedo'
    | 'canUndo'
    | 'clearDraftSnapshot'
    | 'clearStrokes'
    | 'exportDataUrl'
    | 'redoLastStroke'
    | 'undoLastStroke'
  > & {
    resolveCanExport?: (drawing: UseKangurStoredPointCanvasDrawingResult) => boolean;
    resolveCanRedo?: (drawing: UseKangurStoredPointCanvasDrawingResult) => boolean;
    resolveCanUndo?: (drawing: UseKangurStoredPointCanvasDrawingResult) => boolean;
  };
  drawing: UseKangurStoredPointCanvasDrawingOptions;
};

export const useKangurManagedStoredPointDrawing = ({
  actions,
  drawing: drawingOptions,
}: UseKangurManagedStoredPointDrawingOptions) => {
  const drawing = useKangurStoredPointCanvasDrawing(drawingOptions);
  const {
    resolveCanExport = (current) => current.hasDrawableContent,
    resolveCanRedo = (current) => current.canRedo,
    resolveCanUndo = (current) => current.canUndo,
    ...actionOptions
  } = actions;

  const managedActions = useKangurFeedbackManagedDrawingActions<HTMLCanvasElement>({
    ...actionOptions,
    canExport: resolveCanExport(drawing),
    canRedo: resolveCanRedo(drawing),
    canUndo: resolveCanUndo(drawing),
    clearDraftSnapshot: drawing.clearDraftSnapshot,
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
