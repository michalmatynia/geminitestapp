'use client';

import { useCallback, useMemo } from 'react';

import {
  studioSlotsResponseSchema,
  type ImageStudioSlotRecord,
  type StudioSlotsResponse,
} from '@/shared/contracts/image-studio';
import { api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

import {
  type GenerationToolbarState,
  type GenerationToolbarHandlers,
} from './GenerationToolbar.types';
import { describeSchemaValidationIssue } from './GenerationToolbar.utils';
import { useAnalysisHandlers } from './handlers/useAnalysisHandlers';
import { useCenterAndScaleHandlers } from './handlers/useCenterAndScaleHandlers';
import { useCropHandlers } from './handlers/useCropHandlers';
import { useUpscaleHandlers } from './handlers/useUpscaleHandlers';
import { studioKeys } from '../../hooks/useImageStudioQueries';

export function useGenerationToolbarHandlers(
  state: GenerationToolbarState
): GenerationToolbarHandlers {
  const { queryClient } = state;

  const fetchProjectSlots = useCallback(
    async (id: string): Promise<ImageStudioSlotRecord[]> => {
      const data = await fetchQueryV2<StudioSlotsResponse>(queryClient, {
        queryKey: normalizeQueryKey(studioKeys.slots(id)),
        queryFn: async () =>
          studioSlotsResponseSchema.parse(
            await api.get<unknown>(`/api/image-studio/projects/${id}/slots`)
          ),
        staleTime: 0,
        meta: {
          source: 'imageStudio.toolbar.handlers.fetchProjectSlots',
          operation: 'list',
          resource: 'image-studio.slots',
          domain: 'image_studio',
          queryKey: normalizeQueryKey(studioKeys.slots(id)),
          tags: ['image-studio', 'slots', 'fetch'],
          description: 'Loads image studio slots.',
        },
      })();
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
