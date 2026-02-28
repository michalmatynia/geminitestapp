import { useCallback } from 'react';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import {
  type StudioSlotsResponse,
  type ImageStudioSlotRecord,
} from '@/shared/contracts/image-studio';
import {
  UPSCALE_REQUEST_TIMEOUT_MS,
} from '../GenerationToolbar.utils';
import {
  loadImageElement,
} from '../GenerationToolbarImageUtils';
import { studioKeys } from '../../../hooks/useImageStudioQueries';
import {
  type GenerationToolbarState,
} from '../GenerationToolbar.types';

export function useUpscaleHandlers(state: GenerationToolbarState, helpers: any) {
  const {
    workingSlot,
    projectId,
    toast,
    queryClient,
    upscaleMode,
    upscaleStrategy,
    upscaleScale,
    upscaleSmoothingQuality,
    upscaleTargetHeight,
    upscaleTargetWidth,
    setUpscaleBusy,
    setUpscaleStatus,
    setWorkingSlotId,
    setSelectedSlotId,
    workingSlotImageSrc,
  } = state;

  const { fetchProjectSlots } = helpers;

  const resolveUpscaleSourceDimensions = useCallback(async (): Promise<{
    width: number;
    height: number;
  }> => {
    if (!workingSlotImageSrc) throw new Error('Working slot has no image source.');
    const img = await loadImageElement(workingSlotImageSrc);
    return { width: img.naturalWidth, height: img.naturalHeight };
  }, [workingSlotImageSrc]);

  const handleCancelUpscale = useCallback((): void => {
    setUpscaleBusy(false);
    setUpscaleStatus('idle');
  }, [setUpscaleBusy, setUpscaleStatus]);

  const handleUpscale = useCallback(async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    setUpscaleBusy(true);
    setUpscaleStatus('resolving');
    try {
      const sourceDim = await resolveUpscaleSourceDimensions();
      setUpscaleStatus('processing');
      const response = await api.post<any>(
        `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/upscale`,
        {
          mode: upscaleMode,
          strategy: upscaleStrategy,
          scale: upscaleScale,
          smoothingQuality: upscaleSmoothingQuality,
          targetWidth: upscaleTargetWidth,
          targetHeight: upscaleTargetHeight,
          sourceWidth: sourceDim.width,
          sourceHeight: sourceDim.height,
        },
        { timeout: UPSCALE_REQUEST_TIMEOUT_MS }
      );

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        setUpscaleStatus('persisting');
        void invalidateImageStudioSlots(queryClient, normalizedProjectId);
        const slotsSnapshot = await fetchProjectSlots(normalizedProjectId);
        queryClient.setQueryData<StudioSlotsResponse>(studioKeys.slots(normalizedProjectId), {
          slots: [
            response.slot,
            ...slotsSnapshot.filter((s: ImageStudioSlotRecord) => s.id !== response.slot.id),
          ],
        });
      }

      setWorkingSlotId(response.slot.id);
      setSelectedSlotId(response.slot.id);
      toast('Upscale completed.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to upscale image.', { variant: 'error' });
    } finally {
      setUpscaleBusy(false);
      setUpscaleStatus('idle');
    }
  }, [
    workingSlot?.id,
    setUpscaleBusy,
    setUpscaleStatus,
    resolveUpscaleSourceDimensions,
    upscaleMode,
    upscaleStrategy,
    upscaleScale,
    upscaleSmoothingQuality,
    upscaleTargetWidth,
    upscaleTargetHeight,
    projectId,
    queryClient,
    fetchProjectSlots,
    setWorkingSlotId,
    setSelectedSlotId,
    toast,
  ]);

  return {
    handleCancelUpscale,
    handleUpscale,
  };
}
