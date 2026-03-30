'use client';

import {
  useKangurDrawingDraftStorage,
  type KangurDrawingDraftStorageController,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';

type UseKangurResolvedDrawingDraftStorageOptions = {
  draftStorage?: KangurDrawingDraftStorageController;
  storageKey?: string | null;
};

export const useKangurResolvedDrawingDraftStorage = ({
  draftStorage,
  storageKey = null,
}: UseKangurResolvedDrawingDraftStorageOptions): KangurDrawingDraftStorageController => {
  const internalDraftStorage = useKangurDrawingDraftStorage(storageKey);
  return draftStorage ?? internalDraftStorage;
};
