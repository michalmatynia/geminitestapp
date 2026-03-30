import {
  type KangurDrawingDraftStorageController,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import {
  useKangurFreeformCanvasDrawing,
  type UseKangurFreeformCanvasDrawingOptions,
  type UseKangurFreeformCanvasDrawingResult,
} from '@/features/kangur/ui/components/drawing-engine/useKangurFreeformCanvasDrawing';
import { useKangurResolvedDrawingDraftStorage } from '@/features/kangur/ui/components/drawing-engine/useKangurResolvedDrawingDraftStorage';

export type UseKangurStoredFreeformCanvasDrawingOptions = Omit<
  UseKangurFreeformCanvasDrawingOptions,
  'initialSerializedSnapshot' | 'onSerializedSnapshotChange'
> & {
  draftStorage?: KangurDrawingDraftStorageController;
  storageKey?: string | null;
};

export type UseKangurStoredFreeformCanvasDrawingResult =
  UseKangurFreeformCanvasDrawingResult & KangurDrawingDraftStorageController;

export const useKangurStoredFreeformCanvasDrawing = ({
  draftStorage,
  storageKey = null,
  ...options
}: UseKangurStoredFreeformCanvasDrawingOptions): UseKangurStoredFreeformCanvasDrawingResult => {
  const resolvedDraftStorage = useKangurResolvedDrawingDraftStorage({
    draftStorage,
    storageKey,
  });
  const drawing = useKangurFreeformCanvasDrawing({
    ...options,
    initialSerializedSnapshot: resolvedDraftStorage.draftSnapshot,
    onSerializedSnapshotChange: resolvedDraftStorage.setDraftSnapshot,
  });

  return {
    ...drawing,
    ...resolvedDraftStorage,
  };
};
