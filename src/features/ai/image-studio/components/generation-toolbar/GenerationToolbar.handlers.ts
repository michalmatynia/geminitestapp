import { useCallback, useMemo } from 'react';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { type StudioSlotsResponse, type ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { type VectorShape } from '@/shared/contracts/vector';
import {
  CROP_REQUEST_TIMEOUT_MS,
  UPSCALE_MAX_OUTPUT_SIDE,
  UPSCALE_REQUEST_TIMEOUT_MS,
  describeSchemaValidationIssue,
} from './GenerationToolbar.utils';
import {
  polygonsFromShapes,
  renderMaskDataUrlFromPolygons,
  loadImageElement,
  mapImageCropRectToCanvasRect,
  resolveCropRectFromShapesWithDiagnostics,
  resolveCanvasOverflowCropRect,
  buildCenterRequestId,
  buildAutoScalerRequestId,
  layoutCanvasImageObject,
  centerCanvasImageObject,
  dataUrlToUploadBlob,
  withCenterRetry,
  withAutoScalerRetry,
  isClientCenterCrossOriginError,
  isCenterAbortError,
  isAutoScalerAbortError,
  autoScaleCanvasImageObject,
  hasCanvasOverflowFromImageFrame,
  type ImageContentFrame,
  type CropCanvasContext,
  type CropRect,
  type CropRectResolutionDiagnostics,
} from './GenerationToolbarImageUtils';
import {
  imageStudioCenterRequestSchema,
  imageStudioCenterResponseSchema,
  type ImageStudioCenterResponse,
  type ImageStudioCenterMode,
} from '../../contracts/center';
import {
  imageStudioAutoScalerResponseSchema,
  type ImageStudioAutoScalerResponse,
} from '../../contracts/autoscaler';
import { createGenerationToolbarActionHandlers } from './generation-toolbar-action-handlers';
import { studioKeys } from '../../hooks/useImageStudioQueries';
import { type GenerationToolbarState, type GenerationToolbarHandlers } from './GenerationToolbar.types';

export function useGenerationToolbarHandlers(state: GenerationToolbarState): GenerationToolbarHandlers {
  const {
    projectId,
    workingSlot,
    setSelectedSlotId,
    setWorkingSlotId,
    setMaskShapes,
    setTool,
    setActiveMaskId,
    activeMaskId,
    setCanvasSelectionEnabled,
    toast,
    queryClient,
    maskAttachMode,
    upscaleMode,
    upscaleStrategy,
    cropMode,
    centerMode,
    autoScaleMode,
    upscaleScale,
    upscaleSmoothingQuality,
    upscaleTargetHeight,
    upscaleTargetWidth,
    setUpscaleBusy,
    setUpscaleStatus,
    setCenterBusy,
    setCenterStatus,
    setAutoScaleBusy,
    setAutoScaleStatus,
    setCropBusy,
    setCropStatus,
    upscaleRequestInFlightRef,
    upscaleAbortControllerRef,
    cropRequestInFlightRef,
    cropAbortControllerRef,
    centerRequestInFlightRef,
    centerAbortControllerRef,
    autoScaleRequestInFlightRef,
    autoScaleAbortControllerRef,
    cropDiagnosticsRef,
    exportMaskShapes,
    hasShapeCropBoundary,
    workingSlotImageSrc,
    clientProcessingImageSrc,
    workingSourceSignature,
    projectCanvasSize,
    getPreviewCanvasViewportCrop,
    getPreviewCanvasImageFrame,
  } = state;

  const centerLayoutPayload = undefined;
  const autoScaleLayoutPayload = undefined;

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
      imageFrame: imageContentFrame!,
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
  }, [setActiveMaskId, setCanvasSelectionEnabled, setMaskShapes, state, toast]);

  const fetchProjectSlots = useCallback(async (projectIdOverride?: string): Promise<ImageStudioSlotRecord[]> => {
    const resolvedProjectId = projectIdOverride?.trim() ?? projectId?.trim() ?? '';
    if (!resolvedProjectId) return [];
    const response = await api.get<StudioSlotsResponse>(
      `/api/image-studio/projects/${encodeURIComponent(resolvedProjectId)}/slots`
    );
    return Array.isArray(response.slots) ? response.slots : [];
  }, [projectId]);

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

      await api.post<{
        masks?: Array<{
          slot?: { id: string; name: string | null };
          relationType?: string;
        }>;
      }>(`/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/masks`, {
        mode: maskAttachMode === 'client_canvas_polygon' ? 'client_data_url' : 'server_polygon',
        masks: payloadMasks,
      });

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        void invalidateImageStudioSlots(queryClient, normalizedProjectId);
      }

      toast('Attached linked mask slots.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to attach mask variants.',
        { variant: 'error' }
      );
    }
  }, [exportMaskShapes, maskAttachMode, projectId, queryClient, resolveWorkingSlotImageContentFrame, toast, workingSlot?.id, workingSlot?.imageFile?.height, workingSlot?.imageFile?.width, workingSlotImageSrc]);

  const resolveUpscaleSourceDimensions = useCallback(async (): Promise<{ width: number; height: number }> => {
    return resolveWorkingSourceDimensions();
  }, [resolveWorkingSourceDimensions]);

  const actionHandlers = useMemo(() => createGenerationToolbarActionHandlers({
    clientProcessingImageSrc,
    cropAbortControllerRef,
    cropMode,
    cropRequestInFlightRef,
    cropRequestTimeoutMs: CROP_REQUEST_TIMEOUT_MS,
    fetchProjectSlots,
    getCropDiagnostics: (): CropRectResolutionDiagnostics | null => cropDiagnosticsRef.current,
    hasCropBoundary: hasShapeCropBoundary || hasCanvasOverflowFromImageFrame(resolveWorkingSlotImageContentFrame()),
    projectId,
    queryClient,
    resolveCropRect,
    resolveCropCanvasContext: resolveWorkingCropCanvasContext,
    resolveUpscaleSourceDimensions,
    setCropBusy,
    setCropStatus,
    setSelectedSlotId,
    setUpscaleBusy,
    setUpscaleStatus,
    setWorkingSlotId,
    toast,
    upscaleAbortControllerRef,
    upscaleMaxOutputSide: UPSCALE_MAX_OUTPUT_SIDE,
    upscaleMode,
    upscaleRequestInFlightRef,
    upscaleRequestTimeoutMs: UPSCALE_REQUEST_TIMEOUT_MS,
    upscaleScale,
    upscaleSmoothingQuality,
    upscaleStrategy,
    upscaleTargetHeight,
    upscaleTargetWidth,
    workingSlot,
    workingSlotImageSrc,
  }), [clientProcessingImageSrc, cropAbortControllerRef, cropMode, cropRequestInFlightRef, fetchProjectSlots, hasShapeCropBoundary, projectId, queryClient, resolveCropRect, resolveWorkingCropCanvasContext, resolveUpscaleSourceDimensions, setCropBusy, setCropStatus, setSelectedSlotId, setUpscaleBusy, setUpscaleStatus, setWorkingSlotId, toast, upscaleAbortControllerRef, upscaleMode, upscaleRequestInFlightRef, upscaleScale, upscaleSmoothingQuality, upscaleStrategy, upscaleTargetHeight, upscaleTargetWidth, workingSlot, workingSlotImageSrc, cropDiagnosticsRef, resolveWorkingSlotImageContentFrame]);

  const { handleUpscale, handleCrop } = actionHandlers;

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

  const handleSquareCrop = useCallback(async (): Promise<void> => {
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
      await handleCrop(squareCropRect, { includeCanvasContext: false });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to prepare square crop.', { variant: 'error' });
    }
  }, [handleCrop, resolveCenteredSquareCropRect, toast, workingSlot?.id, workingSlotImageSrc, cropDiagnosticsRef]);

  const handlePreviewViewCrop = useCallback(async (): Promise<void> => {
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
          await handleCrop(canvasCropRect, { includeCanvasContext: true });
          return;
        }
      }

      await handleCrop(previewCrop.cropRect, { includeCanvasContext: false });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to prepare crop from preview view.', { variant: 'error' });
    }
  }, [getPreviewCanvasViewportCrop, handleCrop, resolveWorkingCropCanvasContext, resolveWorkingSourceDimensions, toast, workingSlot?.id, workingSlotImageSrc, cropDiagnosticsRef]);

  const handleCenterObject = useCallback(async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before centering.', { variant: 'info' });
      return;
    }
    const isClientCenterMode =
      centerMode === 'client_alpha_bbox' || centerMode === 'client_object_layout_v1';
    if (isClientCenterMode && !clientProcessingImageSrc) {
      toast('No client image source is available for centering/layouting.', { variant: 'info' });
      return;
    }
    if (centerRequestInFlightRef.current) {
      return;
    }

    centerRequestInFlightRef.current = true;
    setCenterBusy(true);
    setCenterStatus('resolving');
    const centerRequestId = buildCenterRequestId();
    const buildValidatedCenterRequestPayload = (mode: ImageStudioCenterMode): {
      mode: ImageStudioCenterMode;
      requestId: string;
      layout?: Record<string, unknown>;
    } => {
      const validation = imageStudioCenterRequestSchema.safeParse({
        mode,
        requestId: centerRequestId,
        ...(centerLayoutPayload ? { layout: centerLayoutPayload } : {}),
      });
      if (!validation.success) {
        throw new Error(
          `Center request payload is invalid (${describeSchemaValidationIssue(validation.error.issues)}).`
        );
      }
      return validation.data as unknown as ImageStudioCenterResponse;
    };
    const abortController = new AbortController();
    centerAbortControllerRef.current = abortController;
    try {
      let response: ImageStudioCenterResponse;
      if (isClientCenterMode) {
        const sourceForClientCenter = clientProcessingImageSrc || workingSlotImageSrc;
        if (!sourceForClientCenter) {
          throw new Error('No client image source is available for centering/layouting.');
        }
        try {
          setCenterStatus('preparing');
          const centeredDataUrl =
            centerMode === 'client_object_layout_v1'
              ? (await layoutCanvasImageObject(sourceForClientCenter, centerLayoutPayload)).dataUrl
              : await centerCanvasImageObject(sourceForClientCenter);
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(centeredDataUrl);
          } catch {
            throw new Error(
              centerMode === 'client_object_layout_v1'
                ? 'Failed to prepare client layout output for upload.'
                : 'Failed to prepare client centered image for upload.'
            );
          }

          setCenterStatus('uploading');
           
          response = await withCenterRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', centerMode);
              formData.append('requestId', centerRequestId);
              if (centerLayoutPayload) {
                formData.append(
                  'center',
                  JSON.stringify({
                    layout: centerLayoutPayload,
                  })
                );
              }
              formData.append('image', uploadBlob, `center-client-${Date.now()}.png`);
              return api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                  formData,
                  {
                    signal: abortController.signal,
                    timeout: 60000,
                    headers: {
                      'x-idempotency-key': centerRequestId,
                    },
                  }
                )
                .then((raw) => imageStudioCenterResponseSchema.parse(raw));
            },
            abortController.signal
          );
        } catch (error) {
          if (!isClientCenterCrossOriginError(error)) {
            throw error;
          }
          setCenterStatus('processing');
          const fallbackMode: ImageStudioCenterMode =
            centerMode === 'client_object_layout_v1'
              ? 'server_object_layout_v1'
              : 'server_alpha_bbox';
          const fallbackRequestPayload = buildValidatedCenterRequestPayload(fallbackMode);
           
          response = await withCenterRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                  fallbackRequestPayload,
                  {
                    signal: abortController.signal,
                    timeout: 60000,
                    headers: {
                      'x-idempotency-key': centerRequestId,
                    },
                  }
                )
                .then((raw) => imageStudioCenterResponseSchema.parse(raw)),
            abortController.signal
          );
          toast(
            centerMode === 'client_object_layout_v1'
              ? 'Client object layouting was blocked by cross-origin restrictions; used server layouting instead.'
              : 'Client centering was blocked by cross-origin restrictions; used server centering instead.',
            { variant: 'info' }
          );
        }
      } else {
        setCenterStatus('processing');
        const centerRequestPayload = buildValidatedCenterRequestPayload(centerMode as ImageStudioCenterMode);
         
        response = await withCenterRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                centerRequestPayload,
                {
                  signal: abortController.signal,
                  timeout: 60000,
                  headers: {
                    'x-idempotency-key': centerRequestId,
                  },
                }
              )
              .then((raw) => imageStudioCenterResponseSchema.parse(raw)),
          abortController.signal
        );
      }

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        setCenterStatus('persisting');
        void invalidateImageStudioSlots(queryClient, normalizedProjectId);
        const slotsSnapshot = await fetchProjectSlots(normalizedProjectId);
        const createdSlotId = response.slot?.id ?? '';
        const mergedSlots =
          createdSlotId
            ? [response.slot, ...slotsSnapshot.filter((slot: ImageStudioSlotRecord) => slot.id !== createdSlotId)]
            : slotsSnapshot;
        queryClient.setQueryData<StudioSlotsResponse>(
          studioKeys.slots(normalizedProjectId),
          { slots: mergedSlots }
        );
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      toast('Centering/Layouting completed.', { variant: 'success' });
    } catch (error) {
      if (isCenterAbortError(error)) {
        toast('Centering canceled.', { variant: 'info' });
        return;
      }
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to center image object.',
        { variant: 'error' }
      );
    } finally {
      centerRequestInFlightRef.current = false;
      centerAbortControllerRef.current = null;
      setCenterBusy(false);
      setCenterStatus('idle');
    }
  }, [centerLayoutPayload, centerMode, clientProcessingImageSrc, fetchProjectSlots, projectId, queryClient, setCenterBusy, setCenterStatus, setSelectedSlotId, setWorkingSlotId, toast, workingSlot?.id, workingSlotImageSrc, centerAbortControllerRef, centerRequestInFlightRef]);

  const handleCancelCenter = useCallback((): void => {
    const controller = centerAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [centerAbortControllerRef]);

  const handleAutoScale = useCallback(async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before auto scaling.', { variant: 'info' });
      return;
    }
    const requestedMode = autoScaleMode;
    const isClientAutoMode = requestedMode === 'client_auto_scaler_v1';
    if (isClientAutoMode && !clientProcessingImageSrc) {
      toast('No client image source is available for auto scaling.', { variant: 'info' });
      return;
    }
    if (autoScaleRequestInFlightRef.current) {
      return;
    }

    autoScaleRequestInFlightRef.current = true;
    setAutoScaleBusy(true);
    setAutoScaleStatus('resolving');
    const autoScaleRequestId = buildAutoScalerRequestId();
    const abortController = new AbortController();
    autoScaleAbortControllerRef.current = abortController;
    try {
      let response: ImageStudioAutoScalerResponse;
      if (isClientAutoMode) {
        const sourceForClientAutoScale = clientProcessingImageSrc || workingSlotImageSrc;
        if (!sourceForClientAutoScale) {
          throw new Error('No client image source is available for auto scaling.');
        }
        try {
          setAutoScaleStatus('preparing');
          const autoScaledDataUrl = (
            await autoScaleCanvasImageObject(
              sourceForClientAutoScale,
              autoScaleLayoutPayload,
              { preferTargetCanvas: true }
            )
          ).dataUrl;
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(autoScaledDataUrl);
          } catch {
            throw new Error('Failed to prepare client auto scaler output for upload.');
          }

          setAutoScaleStatus('uploading');
           
          response = await withAutoScalerRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', autoScaleMode);
              formData.append('requestId', autoScaleRequestId);
              if (autoScaleLayoutPayload) {
                formData.append('layout', JSON.stringify(autoScaleLayoutPayload));
              }
              formData.append('image', uploadBlob, `autoscale-client-${Date.now()}.png`);
              return api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                  formData,
                  {
                    signal: abortController.signal,
                    timeout: 60000,
                    headers: {
                      'x-idempotency-key': autoScaleRequestId,
                    },
                  }
                )
                .then((raw) => imageStudioAutoScalerResponseSchema.parse(raw));
            },
            abortController.signal
          );
        } catch (_error) {
          setAutoScaleStatus('processing');
           
          response = await withAutoScalerRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                  {
                    mode: 'server_auto_scaler_v1',
                    requestId: autoScaleRequestId,
                    layout: autoScaleLayoutPayload,
                  },
                  {
                    signal: abortController.signal,
                    timeout: 60000,
                    headers: {
                      'x-idempotency-key': autoScaleRequestId,
                    },
                  }
                )
                .then((raw) => imageStudioAutoScalerResponseSchema.parse(raw)),
            abortController.signal
          );
          toast('Auto scaling completed with fallback.', { variant: 'info' });
        }
      } else {
        setAutoScaleStatus('processing');
         
        response = await withAutoScalerRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                {
                  mode: autoScaleMode,
                  requestId: autoScaleRequestId,
                  layout: autoScaleLayoutPayload,
                },
                {
                  signal: abortController.signal,
                  timeout: 60000,
                  headers: {
                    'x-idempotency-key': autoScaleRequestId,
                  },
                }
              )
              .then((raw) => imageStudioAutoScalerResponseSchema.parse(raw)),
          abortController.signal
        );
      }

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        setAutoScaleStatus('persisting');
        void invalidateImageStudioSlots(queryClient, normalizedProjectId);
        const slotsSnapshot = await fetchProjectSlots(normalizedProjectId);
        const createdSlotId = response.slot?.id ?? '';
        const mergedSlots =
          createdSlotId
            ? [response.slot, ...slotsSnapshot.filter((slot: ImageStudioSlotRecord) => slot.id !== createdSlotId)]
            : slotsSnapshot;
        queryClient.setQueryData<StudioSlotsResponse>(
          studioKeys.slots(normalizedProjectId),
          { slots: mergedSlots }
        );
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      toast('Auto scaling completed.', { variant: 'success' });
    } catch (error) {
      if (isAutoScalerAbortError(error)) {
        toast('Auto scaler canceled.', { variant: 'info' });
        return;
      }
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to auto scale image object.',
        { variant: 'error' }
      );
    } finally {
      autoScaleRequestInFlightRef.current = false;
      autoScaleAbortControllerRef.current = null;
      setAutoScaleBusy(false);
      setAutoScaleStatus('idle');
    }
  }, [autoScaleLayoutPayload, autoScaleMode, clientProcessingImageSrc, fetchProjectSlots, projectId, queryClient, setAutoScaleBusy, setAutoScaleStatus, setSelectedSlotId, setWorkingSlotId, toast, workingSlot?.id, workingSlotImageSrc, autoScaleAbortControllerRef, autoScaleRequestInFlightRef]);

  const handleCancelAutoScale = useCallback((): void => {
    const controller = autoScaleAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [autoScaleAbortControllerRef]);

  const handleAiMaskGeneration = useCallback(async (mode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges'): Promise<void> => {
    await state.handleAiMaskGeneration(mode);
  }, [state]);

  const handleApplyAnalysisPlanToCenter = useCallback((): void => {
    if (!state.analysisPlanSnapshot) {
      toast('No analysis plan is available yet. Run analysis first.', { variant: 'info' });
      return;
    }
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    const analysisPlanSlotId = state.analysisPlanSnapshot?.slotId?.trim() ?? '';
    if (!normalizedWorkingSlotId || analysisPlanSlotId !== normalizedWorkingSlotId) {
      toast('Latest analysis plan belongs to a different slot. Select that slot first.', { variant: 'info' });
      return;
    }
    const analysisPlanSourceSignature = state.analysisPlanSnapshot?.sourceSignature?.trim() ?? '';
    if (!analysisPlanSourceSignature) {
      toast('Analysis plan is missing source metadata. Rerun analysis first.', { variant: 'info' });
      return;
    }
    if (!workingSourceSignature || analysisPlanSourceSignature !== workingSourceSignature) {
      toast('Latest analysis plan is stale for the current slot image. Rerun analysis first.', { variant: 'info' });
      return;
    }
    state.applyAnalysisLayoutToCenter(state.analysisPlanSnapshot.layout, 'manual');
  }, [state, toast, workingSlot?.id, workingSourceSignature]);

  const handleApplyAnalysisPlanToAutoScaler = useCallback((): void => {
    if (!state.analysisPlanSnapshot) {
      toast('No analysis plan is available yet. Run analysis first.', { variant: 'info' });
      return;
    }
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    const analysisPlanSlotId = state.analysisPlanSnapshot?.slotId?.trim() ?? '';
    if (!normalizedWorkingSlotId || analysisPlanSlotId !== normalizedWorkingSlotId) {
      toast('Latest analysis plan belongs to a different slot. Select that slot first.', { variant: 'info' });
      return;
    }
    const analysisPlanSourceSignature = state.analysisPlanSnapshot?.sourceSignature?.trim() ?? '';
    if (!analysisPlanSourceSignature) {
      toast('Analysis plan is missing source metadata. Rerun analysis first.', { variant: 'info' });
      return;
    }
    if (!workingSourceSignature || analysisPlanSourceSignature !== workingSourceSignature) {
      toast('Latest analysis plan is stale for the current slot image. Rerun analysis first.', { variant: 'info' });
      return;
    }
    state.applyAnalysisLayoutToAutoScaler(state.analysisPlanSnapshot.layout, 'manual');
  }, [state, toast, workingSlot?.id, workingSourceSignature]);

  return {
    handleUpscale,
    handleCrop,
    handleCancelUpscale,
    handleCancelCrop,
    handleSquareCrop,
    handlePreviewViewCrop,
    handleCreateCropBox,
    attachMaskVariantsFromSelection,
    handleCenterObject,
    handleCancelCenter,
    handleAutoScale,
    handleCancelAutoScale,
    handleAiMaskGeneration,
    handleApplyAnalysisPlanToCenter,
    handleApplyAnalysisPlanToAutoScaler,
  };
}
