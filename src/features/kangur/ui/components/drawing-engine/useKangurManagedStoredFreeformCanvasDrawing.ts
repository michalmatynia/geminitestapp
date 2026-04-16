import {
  useKangurManagedDrawingActions,
  type UseKangurManagedDrawingActionsResult,
  type UseKangurManagedDrawingActionsOptions,
} from '@/features/kangur/ui/components/drawing-engine/useKangurManagedDrawingActions';
import {
  useKangurStoredFreeformCanvasDrawing,
  type UseKangurStoredFreeformCanvasDrawingOptions,
  type UseKangurStoredFreeformCanvasDrawingResult,
} from '@/features/kangur/ui/components/drawing-engine/useKangurStoredFreeformCanvasDrawing';

type UseKangurManagedStoredFreeformCanvasDrawingOptions = {
  actions: Omit<
    UseKangurManagedDrawingActionsOptions<HTMLCanvasElement>,
    | 'canExport'
    | 'canRedo'
    | 'canUndo'
    | 'clearDraftSnapshot'
    | 'clearStrokes'
    | 'exportDataUrl'
    | 'redoLastStroke'
    | 'undoLastStroke'
  > & {
    resolveCanExport?: (drawing: UseKangurStoredFreeformCanvasDrawingResult) => boolean;
    resolveCanRedo?: (drawing: UseKangurStoredFreeformCanvasDrawingResult) => boolean;
    resolveCanUndo?: (drawing: UseKangurStoredFreeformCanvasDrawingResult) => boolean;
  };
  drawing: UseKangurStoredFreeformCanvasDrawingOptions;
};

export const useKangurManagedStoredFreeformCanvasDrawing = ({
  actions,
  drawing: drawingOptions,
}: UseKangurManagedStoredFreeformCanvasDrawingOptions): UseKangurStoredFreeformCanvasDrawingResult &
  UseKangurManagedDrawingActionsResult<HTMLCanvasElement> => {
  const drawing = useKangurStoredFreeformCanvasDrawing(drawingOptions);
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
