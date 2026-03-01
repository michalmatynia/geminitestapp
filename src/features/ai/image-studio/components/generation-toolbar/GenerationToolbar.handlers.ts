import { useCallback, useMemo } from 'react';
import { studioKeys } from '../../hooks/useImageStudioQueries';
import {
  type GenerationToolbarState,
  type GenerationToolbarHandlers,
} from './GenerationToolbar.types';
import { describeSchemaValidationIssue } from './GenerationToolbar.utils';
import { type ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

import { useCropHandlers } from './handlers/useCropHandlers';
import { useUpscaleHandlers } from './handlers/useUpscaleHandlers';
import { useCenterAndScaleHandlers } from './handlers/useCenterAndScaleHandlers';
import { useAnalysisHandlers } from './handlers/useAnalysisHandlers';

export function useGenerationToolbarHandlers(
  state: GenerationToolbarState
): GenerationToolbarHandlers {
  const { queryClient } = state;

  const fetchProjectSlots = useCallback(
    async (id: string): Promise<ImageStudioSlotRecord[]> => {
      const data = await queryClient.fetchQuery<{ slots: ImageStudioSlotRecord[] }>({
        queryKey: studioKeys.slots(id),
      });
      return data?.slots ?? [];
    },
    [queryClient]
  );

  const helpers = useMemo(
    () => ({
      fetchProjectSlots,
      describeSchemaValidationIssue,
    }),
    [fetchProjectSlots]
  );

  const crop = useCropHandlers(state, helpers);
  const upscale = useUpscaleHandlers(state, helpers);
  const center = useCenterAndScaleHandlers(state, helpers);
  const analysis = useAnalysisHandlers(state, helpers);

  const handleAiMaskGeneration = useCallback(async () => {}, []);
  const runAnalysisFromToolbar = useCallback(async () => {}, []);
  const attachMaskVariantsFromSelection = useCallback(async () => {}, []);
  const handleCreateCropBox = useCallback(() => {}, []);
  const handleSquareCrop = useCallback(async () => {}, []);
  const handlePreviewViewCrop = useCallback(async () => {}, []);
  const handleCrop = useCallback(async () => {}, []);
  const handleCancelCrop = useCallback(() => {}, []);
  const handleAutoScale = useCallback(async () => {}, []);
  const handleCancelAutoScale = useCallback(() => {}, []);

  return {
    ...crop,
    ...upscale,
    ...center,
    ...analysis,
    handleCrop,
    handleCancelCrop,
    handleAutoScale,
    handleCancelAutoScale,
    handleAiMaskGeneration,
    runAnalysisFromToolbar,
    attachMaskVariantsFromSelection,
    handleSquareCrop,
    handlePreviewViewCrop,
    handleCreateCropBox,
  };
}
