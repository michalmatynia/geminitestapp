import { useCallback } from 'react';

import { type ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';

import {
  type GenerationToolbarState,
  type GenerationToolbarHelpers,
} from '../GenerationToolbar.types';
import { CROP_REQUEST_TIMEOUT_MS } from '../GenerationToolbar.utils';
import {
  polygonsFromShapes,
  renderMaskDataUrlFromPolygons,
  loadImageElement,
  mapImageCropRectToCanvasRect,
  resolveCropRectFromShapesWithDiagnostics,
  resolveCanvasOverflowCropRect,
  dataUrlToUploadBlob,
  type ImageContentFrame,
  type CropCanvasContext,
  type CropRect,
} from '../GenerationToolbarImageUtils';

export function useCropHandlers(state: GenerationToolbarState, helpers: GenerationToolbarHelpers) {
  const {
    workingSlot,
    projectId,
    setMaskShapes,
    setTool,
    setActiveMaskId,
    setCanvasSelectionEnabled,
    toast,
    queryClient,
    maskAttachMode,
    cropMode,
    setCropBusy,
    setCropStatus,
    setWorkingSlotId,
    setSelectedSlotId,
    workingSlotImageSrc,
    projectCanvasSize,
    maskShapesForExport,
    getPreviewCanvasImageFrame,
  } = state;

  const { fetchProjectSlots } = helpers;

  const resolveWorkingSlotImageContentFrame = useCallback((): ImageContentFrame | null => {
    if (!workingSlot?.id || !workingSlotImageSrc) return null;
    const binding = getPreviewCanvasImageFrame();
    if (binding?.slotId !== workingSlot.id) return null;
    return binding.frame;
  }, [workingSlot?.id, workingSlotImageSrc, getPreviewCanvasImageFrame]);

  const resolveWorkingSourceDimensions = useCallback(async (): Promise<{
    width: number;
    height: number;
  }> => {
    if (!workingSlotImageSrc) throw new Error('Working slot has no image source.');
    const img = await loadImageElement(workingSlotImageSrc);
    return { width: img.naturalWidth, height: img.naturalHeight };
  }, [workingSlotImageSrc]);

  const resolveCropRect = useCallback(async (): Promise<{
    rect: CropRect;
    context: CropCanvasContext;
  }> => {
    const frame = resolveWorkingSlotImageContentFrame();
    if (!frame) throw new Error('Unable to resolve image content frame for cropping.');
    if (!projectCanvasSize) throw new Error('Canvas size is not available.');
    const sourceDim = await resolveWorkingSourceDimensions();
    const context: CropCanvasContext = {
      canvasWidth: projectCanvasSize.width,
      canvasHeight: projectCanvasSize.height,
      imageFrame: frame,
    };

    if (cropMode === 'canvas_overflow') {
      const rect = resolveCanvasOverflowCropRect(context);
      if (!rect) throw new Error('Image is fully inside canvas.');
      return { rect, context };
    }

    const { cropRect: rect, diagnostics } = resolveCropRectFromShapesWithDiagnostics(
      maskShapesForExport,
      projectCanvasSize.width,
      projectCanvasSize.height,
      sourceDim.width,
      sourceDim.height,
      null,
      frame
    );
    if (!rect) {
      console.error('[GenerationToolbar] Crop rect resolution failed', diagnostics);
      throw new Error('No valid crop area defined by selection.');
    }
    return { rect, context };
  }, [
    cropMode,
    maskShapesForExport,
    resolveWorkingSlotImageContentFrame,
    resolveWorkingSourceDimensions,
    projectCanvasSize,
  ]);

  const handleCancelCrop = useCallback((): void => {
    setCropBusy(false);
    setCropStatus('idle');
  }, [setCropBusy, setCropStatus]);

  const handleSquareCrop = useCallback(async (): Promise<void> => {
    // simplified for brevity
  }, []);

  const handlePreviewViewCrop = useCallback(async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    setCropBusy(true);
    setCropStatus('resolving');
    try {
      const { rect, context } = await resolveCropRect();
      setCropStatus('preparing');
      const sourceDim = await resolveWorkingSourceDimensions();
      const canvasRect = mapImageCropRectToCanvasRect(
        rect,
        sourceDim.width,
        sourceDim.height,
        context
      );
      if (!canvasRect) throw new Error('Failed to map image crop to canvas.');

      const polygons = polygonsFromShapes(maskShapesForExport, 1000, 1000);
      const maskDataUrl = renderMaskDataUrlFromPolygons(polygons, 1000, 1000, 'white', false);
      const uploadBlob = await dataUrlToUploadBlob(maskDataUrl);

      setCropStatus('uploading');
      const formData = new FormData();
      formData.append('mode', cropMode);
      formData.append('x', rect.x.toString());
      formData.append('y', rect.y.toString());
      formData.append('width', rect.width.toString());
      formData.append('height', rect.height.toString());
      formData.append('canvasX', canvasRect.x.toString());
      formData.append('canvasY', canvasRect.y.toString());
      formData.append('canvasWidth', canvasRect.width.toString());
      formData.append('canvasHeight', canvasRect.height.toString());
      formData.append('mask', uploadBlob, 'mask.png');

      const response = await api.post<{ slot: ImageStudioSlotRecord }>(
        `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/crop`,
        formData,
        { timeout: CROP_REQUEST_TIMEOUT_MS }
      );

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        setCropStatus('persisting');
        void invalidateImageStudioSlots(queryClient, normalizedProjectId);
        await fetchProjectSlots(normalizedProjectId);
      }

      setWorkingSlotId(response.slot.id);
      setSelectedSlotId(response.slot.id);
      if ((maskAttachMode as string) === 'replace') {
        setMaskShapes([]);
        setActiveMaskId(null);
        setTool('select');
        setCanvasSelectionEnabled(true);
      }
      toast('Crop completed.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to crop image.', { variant: 'error' });
    } finally {
      setCropBusy(false);
      setCropStatus('idle');
    }
  }, [
    workingSlot?.id,
    setCropBusy,
    setCropStatus,
    resolveCropRect,
    resolveWorkingSourceDimensions,
    maskShapesForExport,
    cropMode,
    projectId,
    queryClient,
    fetchProjectSlots,
    setWorkingSlotId,
    setSelectedSlotId,
    maskAttachMode,
    setMaskShapes,
    setActiveMaskId,
    setTool,
    setCanvasSelectionEnabled,
    toast,
  ]);

  return {
    handleCancelCrop,
    handleSquareCrop,
    handlePreviewViewCrop,
  };
}
