'use client';

import { useCallback } from 'react';
import {
  loadImageElement,
  resolveCropRectFromShapesWithDiagnostics,
  resolveCanvasOverflowCropRect,
  type ImageContentFrame,
  type CropCanvasContext,
  type CropRect,
  type CropRectResolutionDiagnostics,
} from './GenerationToolbarImageUtils';
import { type GenerationToolbarState } from './GenerationToolbar.types';

export function useGenerationToolbarResolution(state: GenerationToolbarState) {
  const {
    workingSlot,
    getPreviewCanvasImageFrame,
    clientProcessingImageSrc,
    workingSlotImageSrc,
    projectCanvasSize,
    exportMaskShapes,
    activeMaskId,
    cropDiagnosticsRef,
  } = state;

  const resolveWorkingSlotImageContentFrame = useCallback((): ImageContentFrame | null => {
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    if (!normalizedWorkingSlotId) return null;
    const frameBinding = getPreviewCanvasImageFrame();
    if (!frameBinding) return null;
    if (frameBinding.slotId !== normalizedWorkingSlotId) return null;
    return frameBinding.frame as ImageContentFrame;
  }, [getPreviewCanvasImageFrame, workingSlot?.id]);

  const resolveWorkingSourceDimensions = useCallback(async (): Promise<{ width: number; height: number }> => {
    let sourceWidth = workingSlot?.imageFile?.width ?? 0;
    let sourceHeight = workingSlot?.imageFile?.height ?? 0;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      const sourceForDimensions = clientProcessingImageSrc || workingSlotImageSrc || '';
      const image = await loadImageElement(sourceForDimensions);
      sourceWidth = image.naturalWidth || image.width;
      sourceHeight = image.naturalHeight || image.height;
    }
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw new Error('Source image dimensions are invalid.');
    }
    return {
      width: sourceWidth,
      height: sourceHeight,
    };
  }, [clientProcessingImageSrc, workingSlot?.imageFile?.height, workingSlot?.imageFile?.width, workingSlotImageSrc]);

  const resolveWorkingCropCanvasContext = useCallback(async (): Promise<CropCanvasContext | null> => {
    const imageContentFrame = resolveWorkingSlotImageContentFrame();
    if (!imageContentFrame) return null;

    const sourceDimensions = await resolveWorkingSourceDimensions();
    const canvasWidth = projectCanvasSize?.width ?? sourceDimensions.width;
    const canvasHeight = projectCanvasSize?.height ?? sourceDimensions.height;
    if (!(canvasWidth > 0 && canvasHeight > 0)) return null;

    return {
      canvasWidth,
      canvasHeight,
      imageFrame: imageContentFrame,
    };
  }, [projectCanvasSize?.height, projectCanvasSize?.width, resolveWorkingSlotImageContentFrame, resolveWorkingSourceDimensions]);

  const resolveCropRect = useCallback(async (): Promise<{
    cropRect: CropRect;
    diagnostics: CropRectResolutionDiagnostics | null;
  }> => {
    const sourceDimensions = await resolveWorkingSourceDimensions();
    const canvasWidth = projectCanvasSize?.width ?? sourceDimensions.width;
    const canvasHeight = projectCanvasSize?.height ?? sourceDimensions.height;
    const imageContentFrame = resolveWorkingSlotImageContentFrame();
    const resolved = resolveCropRectFromShapesWithDiagnostics(
      exportMaskShapes,
      canvasWidth,
      canvasHeight,
      sourceDimensions.width,
      sourceDimensions.height,
      activeMaskId,
      imageContentFrame
    );
    cropDiagnosticsRef.current = resolved.diagnostics;
    if (resolved.cropRect) {
      return {
        cropRect: resolved.cropRect,
        diagnostics: resolved.diagnostics,
      };
    }
    const overflowCropRect = resolveCanvasOverflowCropRect({
      canvasWidth,
      canvasHeight,
      imageFrame: imageContentFrame,
    });
    if (overflowCropRect) {
      return {
        cropRect: overflowCropRect,
        diagnostics: resolved.diagnostics,
      };
    }

    throw new Error('Set a valid crop boundary or move image outside canvas first.');
  }, [activeMaskId, exportMaskShapes, projectCanvasSize?.height, projectCanvasSize?.width, resolveWorkingSlotImageContentFrame, resolveWorkingSourceDimensions, cropDiagnosticsRef]);

  const resolveCenteredSquareCropRect = useCallback(async (): Promise<CropRect> => {
    const { width: sourceWidth, height: sourceHeight } = await resolveWorkingSourceDimensions();

    const side = Math.max(1, Math.min(sourceWidth, sourceHeight));
    const x = Math.max(0, Math.floor((sourceWidth - side) / 2));
    const y = Math.max(0, Math.floor((sourceHeight - side) / 2));

    return {
      x,
      y,
      width: side,
      height: side,
    };
  }, [resolveWorkingSourceDimensions]);

  return {
    resolveWorkingSlotImageContentFrame,
    resolveWorkingSourceDimensions,
    resolveWorkingCropCanvasContext,
    resolveCropRect,
    resolveCenteredSquareCropRect,
  };
}
