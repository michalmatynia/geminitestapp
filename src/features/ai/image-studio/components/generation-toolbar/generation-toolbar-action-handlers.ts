import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { api, type ApiError } from '@/shared/lib/api-client';
import {
  invalidateImageStudioSlots,
  patchImageStudioSlotsCache,
} from '@/shared/lib/query-invalidation';

import {
  buildCropRequestId,
  buildUpscaleRequestId,
  cropCanvasImage,
  dataUrlToUploadBlob,
  isClientCropCrossOriginError,
  isClientUpscaleCrossOriginError,
  isCropAbortError,
  isUpscaleAbortError,
  upscaleCanvasImage,
  withCropRetry,
  withUpscaleRetry,
  type CropCanvasContext,
  type CropRect,
  type CropRectResolutionDiagnostics,
  type UpscaleRequestStrategyPayload,
  type UpscaleSmoothingQuality,
} from './GenerationToolbarImageUtils';
import { imageStudioCropResponseSchema, type ImageStudioCropResponse } from '../../contracts/crop';
import {
  imageStudioUpscaleResponseSchema,
  type ImageStudioUpscaleResponse,
} from '../../contracts/upscale';
import type { QueryClient } from '@tanstack/react-query';

type Toast = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'warning' | 'info' }
) => void;

type UpscaleMode = 'client_canvas' | 'server_sharp';
type UpscaleStatus = 'idle' | 'resolving' | 'preparing' | 'uploading' | 'processing' | 'persisting';
type CropMode = 'client_bbox' | 'server_bbox';
type CropStatus = 'idle' | 'resolving' | 'preparing' | 'uploading' | 'processing' | 'persisting';
type UpscaleStrategy = 'scale' | 'target_resolution';

type UpscaleActionResponse = ImageStudioUpscaleResponse;
type CropActionResponse = ImageStudioCropResponse;

type CreateGenerationToolbarActionHandlersDeps = {
  clientProcessingImageSrc: string | null;
  cropAbortControllerRef: React.MutableRefObject<AbortController | null>;
  cropMode: CropMode;
  cropRequestInFlightRef: React.MutableRefObject<boolean>;
  fetchProjectSlots: (projectIdOverride?: string) => Promise<ImageStudioSlotRecord[]>;
  getCropDiagnostics: () => CropRectResolutionDiagnostics | null;
  hasCropBoundary: boolean;
  projectId: string | null;
  queryClient: QueryClient;
  resolveCropRect: () => Promise<{
    cropRect: CropRect;
    diagnostics: CropRectResolutionDiagnostics | null;
  }>;
  resolveCropCanvasContext: () => Promise<CropCanvasContext | null>;
  resolveUpscaleSourceDimensions: () => Promise<{ width: number; height: number }>;
  setCropBusy: (value: boolean) => void;
  setCropStatus: (value: CropStatus) => void;
  setSelectedSlotId: (slotId: string | null) => void;
  setUpscaleBusy: (value: boolean) => void;
  setUpscaleStatus: (value: UpscaleStatus) => void;
  setWorkingSlotId: (slotId: string | null) => void;
  toast: Toast;
  upscaleAbortControllerRef: React.MutableRefObject<AbortController | null>;
  upscaleMode: UpscaleMode;
  upscaleRequestInFlightRef: React.MutableRefObject<boolean>;
  upscaleScale: string;
  upscaleSmoothingQuality: UpscaleSmoothingQuality;
  upscaleStrategy: UpscaleStrategy;
  upscaleTargetHeight: string;
  upscaleTargetWidth: string;
  workingSlot: ImageStudioSlotRecord | null;
  workingSlotImageSrc: string | null;
  cropRequestTimeoutMs: number;
  upscaleRequestTimeoutMs: number;
  upscaleMaxOutputSide: number;
};

type CropDiagnosticsPayload = {
  rawCanvasBounds?: CropRect | null;
  mappedImageBounds?: CropRect | null;
  imageContentFrame?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  usedImageContentFrameMapping?: boolean;
};

type CropCanvasContextPayload = {
  canvasWidth: number;
  canvasHeight: number;
  imageFrame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

const toCropDiagnosticsPayload = (
  diagnostics: CropRectResolutionDiagnostics | null
): CropDiagnosticsPayload | null => {
  if (!diagnostics) return null;
  return {
    rawCanvasBounds: diagnostics.rawCanvasBounds ?? null,
    mappedImageBounds: diagnostics.mappedImageBounds ?? null,
    imageContentFrame: diagnostics.imageContentFrame
      ? {
        x: diagnostics.imageContentFrame.x,
        y: diagnostics.imageContentFrame.y,
        width: diagnostics.imageContentFrame.width,
        height: diagnostics.imageContentFrame.height,
      }
      : null,
    usedImageContentFrameMapping: diagnostics.usedImageContentFrameMapping,
  };
};

const toCropCanvasContextPayload = (
  canvasContext: CropCanvasContext | null
): CropCanvasContextPayload | null => {
  if (!canvasContext) return null;
  const canvasWidth = Math.floor(canvasContext.canvasWidth);
  const canvasHeight = Math.floor(canvasContext.canvasHeight);
  if (!(canvasWidth > 0 && canvasHeight > 0)) return null;
  const frame = canvasContext.imageFrame;
  if (
    !Number.isFinite(frame.x) ||
    !Number.isFinite(frame.y) ||
    !Number.isFinite(frame.width) ||
    !Number.isFinite(frame.height) ||
    !(frame.width > 0 && frame.height > 0)
  ) {
    return null;
  }
  return {
    canvasWidth,
    canvasHeight,
    imageFrame: {
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
    },
  };
};

const appendUpscaleStrategyToFormData = (
  formData: FormData,
  request: UpscaleRequestStrategyPayload
): void => {
  formData.append('strategy', request.strategy);
  if (request.strategy === 'scale') {
    formData.append('scale', String(request.scale));
    return;
  }
  formData.append('targetWidth', String(request.targetWidth));
  formData.append('targetHeight', String(request.targetHeight));
};

const buildUpscaleRequestBody = (
  mode: 'client_data_url' | 'server_sharp',
  request: UpscaleRequestStrategyPayload,
  requestId: string
): Record<string, unknown> => ({
  mode,
  strategy: request.strategy,
  ...(request.strategy === 'scale'
    ? { scale: request.scale }
    : { targetWidth: request.targetWidth, targetHeight: request.targetHeight }),
  requestId,
});

const shouldFallbackToServerUpscale = (error: unknown): boolean => {
  if (isClientUpscaleCrossOriginError(error)) return true;
  const apiError = error as ApiError | null;
  if (apiError?.status !== 400) return false;
  return /invalid request payload|invalid upscale payload/i.test(apiError.message);
};

export const createGenerationToolbarActionHandlers = (
  deps: CreateGenerationToolbarActionHandlersDeps
): {
  handleUpscale: () => Promise<void>;
  handleCrop: (
    cropRectOverride?: CropRect,
    options?: { includeCanvasContext?: boolean }
  ) => Promise<void>;
} => {
  const handleUpscale = async (): Promise<void> => {
    if (!deps.workingSlot?.id) {
      deps.toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    const workingSlotId = deps.workingSlot.id;
    if (!deps.workingSlotImageSrc) {
      deps.toast('Select a slot image before upscaling.', { variant: 'info' });
      return;
    }
    if (deps.upscaleRequestInFlightRef.current) {
      return;
    }

    let upscaleRequestPayload: UpscaleRequestStrategyPayload;
    if (deps.upscaleStrategy === 'scale') {
      const scale = Number(deps.upscaleScale);
      if (!Number.isFinite(scale) || scale <= 1 || scale > 8) {
        deps.toast('Upscale multiplier must be greater than 1 and at most 8.', { variant: 'info' });
        return;
      }
      upscaleRequestPayload = { strategy: 'scale', scale };
    } else {
      const parsedTargetWidth = Math.floor(Number(deps.upscaleTargetWidth));
      const parsedTargetHeight = Math.floor(Number(deps.upscaleTargetHeight));
      if (!(parsedTargetWidth > 0 && parsedTargetHeight > 0)) {
        deps.toast('Enter both target width and target height as positive integers.', {
          variant: 'info',
        });
        return;
      }
      if (
        parsedTargetWidth > deps.upscaleMaxOutputSide ||
        parsedTargetHeight > deps.upscaleMaxOutputSide
      ) {
        deps.toast(`Target resolution side cannot exceed ${deps.upscaleMaxOutputSide}px.`, {
          variant: 'info',
        });
        return;
      }
      const sourceDimensions = await deps.resolveUpscaleSourceDimensions();
      if (
        parsedTargetWidth < sourceDimensions.width ||
        parsedTargetHeight < sourceDimensions.height ||
        (parsedTargetWidth === sourceDimensions.width &&
          parsedTargetHeight === sourceDimensions.height)
      ) {
        deps.toast(
          'Target resolution must upscale at least one side and not reduce source dimensions.',
          { variant: 'info' }
        );
        return;
      }
      upscaleRequestPayload = {
        strategy: 'target_resolution',
        targetWidth: parsedTargetWidth,
        targetHeight: parsedTargetHeight,
      };
    }

    deps.upscaleRequestInFlightRef.current = true;
    deps.setUpscaleBusy(true);
    deps.setUpscaleStatus('resolving');
    const upscaleRequestId = buildUpscaleRequestId();
    const abortController = new AbortController();
    deps.upscaleAbortControllerRef.current = abortController;
    try {
      const mode = deps.upscaleMode === 'client_canvas' ? 'client_data_url' : 'server_sharp';
      let response: UpscaleActionResponse;
      let resolvedMode: 'client_data_url' | 'server_sharp' = mode;
      if (mode === 'client_data_url') {
        const sourceForClientUpscale = deps.clientProcessingImageSrc || deps.workingSlotImageSrc;
        if (!sourceForClientUpscale) {
          throw new Error('No client image source is available for upscale.');
        }
        try {
          deps.setUpscaleStatus('preparing');
          const clientUpscale = await upscaleCanvasImage(
            sourceForClientUpscale,
            upscaleRequestPayload,
            deps.upscaleSmoothingQuality
          );
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(clientUpscale.dataUrl);
          } catch {
            throw new Error('Failed to prepare client upscaled image for upload.');
          }

          deps.setUpscaleStatus('uploading');
          response = await withUpscaleRetry(() => {
            const formData = new FormData();
            formData.append('mode', mode);
            appendUpscaleStrategyToFormData(formData, upscaleRequestPayload);
            formData.append('smoothingQuality', deps.upscaleSmoothingQuality);
            formData.append('requestId', upscaleRequestId);
            formData.append('image', uploadBlob, `upscale-client-${Date.now()}.png`);
            return api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlotId)}/upscale`,
                formData,
                {
                  signal: abortController.signal,
                  timeout: deps.upscaleRequestTimeoutMs,
                  headers: { 'x-idempotency-key': upscaleRequestId },
                }
              )
              .then((raw) => imageStudioUpscaleResponseSchema.parse(raw));
          }, abortController.signal);
        } catch (error) {
          if (!shouldFallbackToServerUpscale(error)) {
            throw error;
          }
          deps.setUpscaleStatus('processing');
          response = await withUpscaleRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlotId)}/upscale`,
                  buildUpscaleRequestBody('server_sharp', upscaleRequestPayload, upscaleRequestId),
                  {
                    signal: abortController.signal,
                    timeout: deps.upscaleRequestTimeoutMs,
                    headers: { 'x-idempotency-key': upscaleRequestId },
                  }
                )
                .then((raw) => imageStudioUpscaleResponseSchema.parse(raw)),
            abortController.signal
          );
          resolvedMode = 'server_sharp';
          const fallbackMessage = isClientUpscaleCrossOriginError(error)
            ? 'Client upscale was blocked by cross-origin restrictions; used server upscale instead.'
            : 'Client upscale upload payload was rejected; used server upscale instead.';
          deps.toast(fallbackMessage, { variant: 'info' });
        }
      } else {
        deps.setUpscaleStatus('processing');
        response = await withUpscaleRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlotId)}/upscale`,
                buildUpscaleRequestBody(mode, upscaleRequestPayload, upscaleRequestId),
                {
                  signal: abortController.signal,
                  timeout: deps.upscaleRequestTimeoutMs,
                  headers: { 'x-idempotency-key': upscaleRequestId },
                }
              )
              .then((raw) => imageStudioUpscaleResponseSchema.parse(raw)),
          abortController.signal
        );
      }

      const normalizedProjectId = deps.projectId?.trim() ?? '';
      if (normalizedProjectId) {
        deps.setUpscaleStatus('persisting');
        await invalidateImageStudioSlots(deps.queryClient, normalizedProjectId);
        const slotsSnapshot = await deps.fetchProjectSlots(normalizedProjectId);
        const createdSlotId = response.slot?.id ?? '';
        const mergedSlots = createdSlotId
          ? [response.slot, ...slotsSnapshot.filter((slot) => slot.id !== createdSlotId)]
          : slotsSnapshot;
        patchImageStudioSlotsCache(deps.queryClient, normalizedProjectId, (current) => ({
          ...current,
          slots: mergedSlots,
        }));
      }

      if (response.slot?.id) {
        deps.setSelectedSlotId(response.slot.id);
        deps.setWorkingSlotId(response.slot.id);
      }

      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel = effectiveMode === 'client_data_url' ? 'Client' : 'Server';
      const effectiveStrategy = response.strategy ?? upscaleRequestPayload.strategy;
      const fallbackTargetWidth =
        upscaleRequestPayload.strategy === 'target_resolution'
          ? upscaleRequestPayload.targetWidth
          : null;
      const fallbackTargetHeight =
        upscaleRequestPayload.strategy === 'target_resolution'
          ? upscaleRequestPayload.targetHeight
          : null;
      const upscaleLabel =
        effectiveStrategy === 'target_resolution'
          ? `${response.targetWidth ?? fallbackTargetWidth}x${response.targetHeight ?? fallbackTargetHeight}`
          : `${Number(
            (
              response.scale ??
                (upscaleRequestPayload.strategy === 'scale' ? upscaleRequestPayload.scale : 2)
            ).toFixed(2)
          )}x`;
      const createdLabel = response.slot?.name?.trim() || `Upscale ${upscaleLabel}`;
      deps.toast(`Created ${createdLabel} (${modeLabel} upscale).`, { variant: 'success' });
    } catch (error) {
      if (isUpscaleAbortError(error)) {
        deps.toast('Upscale canceled.', { variant: 'info' });
        return;
      }
      deps.toast(error instanceof Error ? error.message : 'Failed to upscale image.', {
        variant: 'error',
      });
    } finally {
      deps.upscaleRequestInFlightRef.current = false;
      deps.upscaleAbortControllerRef.current = null;
      deps.setUpscaleBusy(false);
      deps.setUpscaleStatus('idle');
    }
  };

  const handleCrop = async (
    cropRectOverride?: CropRect,
    options?: { includeCanvasContext?: boolean }
  ): Promise<void> => {
    if (!deps.workingSlot?.id) {
      deps.toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    const workingSlotId = deps.workingSlot.id;
    if (!deps.workingSlotImageSrc) {
      deps.toast('Select a slot image before cropping.', { variant: 'info' });
      return;
    }
    if (!cropRectOverride && !deps.hasCropBoundary) {
      deps.toast('Set a valid crop boundary or move image outside canvas first.', {
        variant: 'info',
      });
      return;
    }
    if (deps.cropRequestInFlightRef.current) {
      return;
    }

    deps.cropRequestInFlightRef.current = true;
    deps.setCropBusy(true);
    deps.setCropStatus('resolving');
    const cropRequestId = buildCropRequestId();
    const abortController = new AbortController();
    deps.cropAbortControllerRef.current = abortController;
    try {
      const resolvedCrop = cropRectOverride
        ? { cropRect: cropRectOverride, diagnostics: null }
        : await deps.resolveCropRect();
      const cropRect = resolvedCrop.cropRect;
      const cropDiagnostics = resolvedCrop.diagnostics ?? deps.getCropDiagnostics();
      const cropDiagnosticsPayload = toCropDiagnosticsPayload(cropDiagnostics);
      const includeCanvasContext = options?.includeCanvasContext ?? !cropRectOverride;
      const cropCanvasContext = includeCanvasContext
        ? toCropCanvasContextPayload(await deps.resolveCropCanvasContext())
        : null;
      let response: CropActionResponse;
      let resolvedMode: CropMode = deps.cropMode;
      if (deps.cropMode === 'client_bbox') {
        const sourceForClientCrop = deps.clientProcessingImageSrc || deps.workingSlotImageSrc;
        if (!sourceForClientCrop) {
          throw new Error('No client image source is available for crop.');
        }
        try {
          deps.setCropStatus('preparing');
          const croppedDataUrl = await cropCanvasImage(
            sourceForClientCrop,
            cropRect,
            cropCanvasContext
          );
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(croppedDataUrl);
          } catch {
            throw new Error('Failed to prepare client crop image for upload.');
          }

          deps.setCropStatus('uploading');
          response = await withCropRetry(() => {
            const formData = new FormData();
            formData.append('mode', deps.cropMode);
            formData.append('cropRect', JSON.stringify(cropRect));
            formData.append('requestId', cropRequestId);
            if (cropDiagnosticsPayload) {
              formData.append('diagnostics', JSON.stringify(cropDiagnosticsPayload));
            }
            if (cropCanvasContext) {
              formData.append('canvasContext', JSON.stringify(cropCanvasContext));
            }
            formData.append('image', uploadBlob, `crop-client-${Date.now()}.png`);
            return api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlotId)}/crop`,
                formData,
                {
                  signal: abortController.signal,
                  timeout: deps.cropRequestTimeoutMs,
                  headers: { 'x-idempotency-key': cropRequestId },
                }
              )
              .then((raw) => imageStudioCropResponseSchema.parse(raw));
          }, abortController.signal);
        } catch (error) {
          if (!isClientCropCrossOriginError(error)) {
            throw error;
          }
          deps.setCropStatus('processing');
          response = await withCropRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlotId)}/crop`,
                  {
                    mode: 'server_bbox',
                    cropRect,
                    requestId: cropRequestId,
                    ...(cropCanvasContext ? { canvasContext: cropCanvasContext } : {}),
                    ...(cropDiagnosticsPayload ? { diagnostics: cropDiagnosticsPayload } : {}),
                  },
                  {
                    signal: abortController.signal,
                    timeout: deps.cropRequestTimeoutMs,
                    headers: { 'x-idempotency-key': cropRequestId },
                  }
                )
                .then((raw) => imageStudioCropResponseSchema.parse(raw)),
            abortController.signal
          );
          resolvedMode = 'server_bbox';
          deps.toast(
            'Client crop was blocked by cross-origin restrictions; used server crop instead.',
            {
              variant: 'info',
            }
          );
        }
      } else {
        deps.setCropStatus('processing');
        response = await withCropRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlotId)}/crop`,
                {
                  mode: deps.cropMode,
                  cropRect,
                  requestId: cropRequestId,
                  ...(cropCanvasContext ? { canvasContext: cropCanvasContext } : {}),
                  ...(cropDiagnosticsPayload ? { diagnostics: cropDiagnosticsPayload } : {}),
                },
                {
                  signal: abortController.signal,
                  timeout: deps.cropRequestTimeoutMs,
                  headers: { 'x-idempotency-key': cropRequestId },
                }
              )
              .then((raw) => imageStudioCropResponseSchema.parse(raw)),
          abortController.signal
        );
      }

      const normalizedProjectId = deps.projectId?.trim() ?? '';
      if (normalizedProjectId) {
        deps.setCropStatus('persisting');
        await invalidateImageStudioSlots(deps.queryClient, normalizedProjectId);
        const slotsSnapshot = await deps.fetchProjectSlots(normalizedProjectId);
        const createdSlotId = response.slot?.id ?? '';
        const mergedSlots = createdSlotId
          ? [response.slot, ...slotsSnapshot.filter((slot) => slot.id !== createdSlotId)]
          : slotsSnapshot;
        patchImageStudioSlotsCache(deps.queryClient, normalizedProjectId, (current) => ({
          ...current,
          slots: mergedSlots,
        }));
      }

      if (response.slot?.id) {
        deps.setSelectedSlotId(response.slot.id);
        deps.setWorkingSlotId(response.slot.id);
      }

      const createdLabel = response.slot?.name?.trim() || 'Cropped variant';
      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel = effectiveMode === 'client_bbox' ? 'Client' : 'Server';
      deps.toast(`Created ${createdLabel} (${modeLabel} crop).`, { variant: 'success' });
    } catch (error) {
      if (isCropAbortError(error)) {
        deps.toast('Crop canceled.', { variant: 'info' });
        return;
      }
      deps.toast(error instanceof Error ? error.message : 'Failed to crop image.', {
        variant: 'error',
      });
    } finally {
      deps.cropRequestInFlightRef.current = false;
      deps.cropAbortControllerRef.current = null;
      deps.setCropBusy(false);
      deps.setCropStatus('idle');
    }
  };

  return { handleUpscale, handleCrop };
};
