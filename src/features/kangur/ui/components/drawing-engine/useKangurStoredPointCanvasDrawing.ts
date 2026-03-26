'use client';

import {
  type KangurDrawingDraftStorageController,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import {
  useKangurPointCanvasDrawing,
  type UseKangurPointCanvasDrawingOptions,
  type UseKangurPointCanvasDrawingResult,
} from '@/features/kangur/ui/components/drawing-engine/useKangurPointCanvasDrawing';
import { useKangurResolvedDrawingDraftStorage } from '@/features/kangur/ui/components/drawing-engine/useKangurResolvedDrawingDraftStorage';

export type UseKangurStoredPointCanvasDrawingOptions = Omit<
  UseKangurPointCanvasDrawingOptions,
  'initialSerializedSnapshot' | 'onSerializedSnapshotChange'
> & {
  draftStorage?: KangurDrawingDraftStorageController;
  storageKey?: string | null;
};

export type UseKangurStoredPointCanvasDrawingResult =
  UseKangurPointCanvasDrawingResult & KangurDrawingDraftStorageController;

export const useKangurStoredPointCanvasDrawing = ({
  draftStorage,
  storageKey = null,
  ...options
}: UseKangurStoredPointCanvasDrawingOptions): UseKangurStoredPointCanvasDrawingResult => {
  const resolvedDraftStorage = useKangurResolvedDrawingDraftStorage({
    draftStorage,
    storageKey,
  });
  const drawing = useKangurPointCanvasDrawing({
    ...options,
    initialSerializedSnapshot: resolvedDraftStorage.draftSnapshot,
    onSerializedSnapshotChange: resolvedDraftStorage.setDraftSnapshot,
  });

  return {
    ...drawing,
    ...resolvedDraftStorage,
  };
};
