import { useCallback } from 'react';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import {
  polygonsFromShapes,
  renderMaskDataUrlFromPolygons,
  mapImageCropRectToCanvasRect,
  loadImageElement,
  type CropRect,
} from './GenerationToolbarImageUtils';
import { type GenerationToolbarState } from './GenerationToolbar.types';
import { type VectorShape } from '@/shared/contracts/vector';
import { useGenerationToolbarResolution } from './useGenerationToolbarResolution';

export function useGenerationToolbarActions(
  state: GenerationToolbarState,
  resolution: ReturnType<typeof useGenerationToolbarResolution>
) {
  const {
    setMaskShapes,
    setActiveMaskId,
    setTool,
    setCanvasSelectionEnabled,
    toast,
    workingSlotImageSrc,
    exportMaskShapes,
    workingSlot,
    maskAttachMode,
    queryClient,
    projectId,
    upscaleAbortControllerRef,
    cropAbortControllerRef,
    centerAbortControllerRef,
    autoScaleAbortControllerRef,
    getPreviewCanvasViewportCrop,
    cropDiagnosticsRef,
  } = state;

  const {
    resolveWorkingSlotImageContentFrame,
    resolveWorkingSourceDimensions,
    resolveWorkingCropCanvasContext,
    resolveCenteredSquareCropRect,
  } = resolution;

  const handleCreateCropBox = useCallback((): void => {
    const shapeId = `crop_${Date.now().toString(36)}`;
    setMaskShapes((previous: VectorShape[]) => [
      ...previous,
      {
        id: shapeId,
        name: `Crop Box ${previous.length + 1}`,
        type: 'rect' as const,
        points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }],
        closed: true,
        visible: true,
        role: 'custom' as const,
        style: {},
      },
    ]);
    setActiveMaskId(shapeId);
    setTool('select');
    setCanvasSelectionEnabled(true);
    toast('Crop box created. Adjust the rectangle, then click Crop.', { variant: 'success' });
  }, [setActiveMaskId, setCanvasSelectionEnabled, setMaskShapes, setTool, toast]);

  const attachMaskVariantsFromSelection = useCallback(async (): Promise<void> => {
    if (!workingSlotImageSrc) {
      toast('Select a slot image before attaching masks.', { variant: 'info' });
      return;
    }

    const shapes = exportMaskShapes;
    if (shapes.length === 0) {
      toast('Draw at least one visible shape first.', {
        variant: 'info',
      });
      return;
    }

    try {
      let width = workingSlot?.imageFile?.width ?? 0;
      let height = workingSlot?.imageFile?.height ?? 0;
      if (!(width > 0 && height > 0)) {
        const image = await loadImageElement(workingSlotImageSrc);
        width = image.naturalWidth || image.width;
        height = image.naturalHeight || image.height;
      }
      if (!(width > 0 && height > 0)) {
        width = 1024;
        height = 1024;
      }

      const polygons = polygonsFromShapes(shapes, width, height, {
        imageFrame: resolveWorkingSlotImageContentFrame(),
      });
      if (polygons.length === 0) {
        toast('No closed polygon-compatible shapes are available for mask export.', { variant: 'info' });
        return;
      }

      if (!workingSlot?.id) {
        toast('No active source slot selected.', { variant: 'info' });
        return;
      }

      const variants: Array<{ variant: 'white' | 'black'; inverted: boolean }> = [
        { variant: 'white', inverted: false },
        { variant: 'black', inverted: false },
        { variant: 'white', inverted: true },
        { variant: 'black', inverted: true },
      ];

      const payloadMasks = variants.map(({ variant, inverted }) =>
        maskAttachMode === 'client_canvas_polygon'
          ? {
            variant,
            inverted,
            dataUrl: renderMaskDataUrlFromPolygons(polygons, width, height, variant, inverted),
          }
          : {
            variant,
            inverted,
            polygons,
          }
      );

      const response = await api.post<{
        masks?: Array<{
          slot?: { id: string; name: string | null };
          relationType?: string;
        }>;
      }>(`/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/masks`, {
        mode: maskAttachMode === 'client_canvas_polygon' ? 'client_data_url' : 'server_polygon',
        masks: payloadMasks,
      });

      void invalidateImageStudioSlots(queryClient, projectId);

      const createdCount = Array.isArray(response.masks) ? response.masks.length : 0;
      if (createdCount === 0) {
        toast('Mask slot creation returned no records.', { variant: 'error' });
        return;
      }

      toast(`Attached ${createdCount} linked mask slot${createdCount === 1 ? '' : 's'}.`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to attach mask variants.',
        { variant: 'error' }
      );
    }
  }, [exportMaskShapes, maskAttachMode, projectId, queryClient, resolveWorkingSlotImageContentFrame, toast, workingSlot?.id, workingSlot?.imageFile?.height, workingSlot?.imageFile?.width, workingSlotImageSrc]);

  const handleCancelUpscale = useCallback((): void => {
    const controller = upscaleAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [upscaleAbortControllerRef]);

  const handleCancelCrop = useCallback((): void => {
    const controller = cropAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [cropAbortControllerRef]);

  const handleCancelCenter = useCallback((): void => {
    const controller = centerAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [centerAbortControllerRef]);

  const handleCancelAutoScale = useCallback((): void => {
    const controller = autoScaleAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [autoScaleAbortControllerRef]);

  const handleSquareCrop = useCallback(async (handleCrop: (cropRect: CropRect, options: { includeCanvasContext: boolean }) => Promise<void>): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before cropping.', { variant: 'info' });
      return;
    }
    try {
      const squareCropRect = await resolveCenteredSquareCropRect();
      cropDiagnosticsRef.current = null;
      handleCrop(squareCropRect, { includeCanvasContext: false }).catch(() => {});
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to prepare square crop.', { variant: 'error' });
    }
  }, [resolveCenteredSquareCropRect, toast, workingSlot?.id, workingSlotImageSrc, cropDiagnosticsRef]);

  const handlePreviewViewCrop = useCallback(async (handleCrop: (cropRect: CropRect, options: { includeCanvasContext: boolean }) => Promise<void>): Promise<void> => {
    const activeSlotId = workingSlot?.id?.trim() ?? '';
    if (!activeSlotId) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before cropping.', { variant: 'info' });
      return;
    }

    const previewCrop = getPreviewCanvasViewportCrop();
    if (!previewCrop) {
      toast('Preview Canvas crop view is unavailable. Load a slot image in Preview Canvas first.', {
        variant: 'info',
      });
      return;
    }
    if (previewCrop.slotId !== activeSlotId) {
      toast('Preview Canvas is showing a different slot. Switch back to the working slot and try again.', {
        variant: 'info',
      });
      return;
    }

    try {
      cropDiagnosticsRef.current = null;
      const cropCanvasContext = await resolveWorkingCropCanvasContext();
      if (cropCanvasContext) {
        const sourceDimensions = await resolveWorkingSourceDimensions();
        const canvasCropRect = mapImageCropRectToCanvasRect(
          previewCrop.cropRect,
          sourceDimensions.width,
          sourceDimensions.height,
          cropCanvasContext
        );
        if (canvasCropRect) {
          handleCrop(canvasCropRect, { includeCanvasContext: true }).catch(() => {});
          return;
        }
      }

      handleCrop(previewCrop.cropRect, { includeCanvasContext: false }).catch(() => {});
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to prepare crop from preview view.', { variant: 'error' });
    }
  }, [getPreviewCanvasViewportCrop, resolveWorkingCropCanvasContext, resolveWorkingSourceDimensions, toast, workingSlot?.id, workingSlotImageSrc, cropDiagnosticsRef]);

  return {
    handleCreateCropBox,
    attachMaskVariantsFromSelection,
    handleCancelUpscale,
    handleCancelCrop,
    handleCancelCenter,
    handleCancelAutoScale,
    handleSquareCrop,
    handlePreviewViewCrop,
  };
}
