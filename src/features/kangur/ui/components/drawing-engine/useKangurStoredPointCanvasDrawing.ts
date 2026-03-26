'use client';

import {
  useKangurDrawingDraftStorage,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import {
  useKangurPointCanvasDrawing,
  type UseKangurPointCanvasDrawingOptions,
  type UseKangurPointCanvasDrawingResult,
} from '@/features/kangur/ui/components/drawing-engine/useKangurPointCanvasDrawing';

export type UseKangurStoredPointCanvasDrawingOptions = Omit<
  UseKangurPointCanvasDrawingOptions,
  'initialSerializedSnapshot' | 'onSerializedSnapshotChange'
> & {
  storageKey: string | null;
};

export type UseKangurStoredPointCanvasDrawingResult = UseKangurPointCanvasDrawingResult & {
  clearDraftSnapshot: () => void;
  draftSnapshot: string | null;
  setDraftSnapshot: (snapshot: string | null | ((current: string | null) => string | null)) => void;
};

export const useKangurStoredPointCanvasDrawing = ({
  storageKey,
  ...options
}: UseKangurStoredPointCanvasDrawingOptions): UseKangurStoredPointCanvasDrawingResult => {
  const draftStorage = useKangurDrawingDraftStorage(storageKey);
  const drawing = useKangurPointCanvasDrawing({
    ...options,
    initialSerializedSnapshot: draftStorage.draftSnapshot,
    onSerializedSnapshotChange: draftStorage.setDraftSnapshot,
  });

  return {
    ...drawing,
    ...draftStorage,
  };
};
