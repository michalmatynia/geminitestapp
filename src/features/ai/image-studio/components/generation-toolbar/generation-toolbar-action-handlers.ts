import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { Toast } from '@/shared/contracts/ui/ui/base';
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
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type {
  CropMode as GenerationToolbarCropMode,
  ImageStudioOperationStatus,
  UpscaleMode,
  UpscaleStrategy,
} from './GenerationToolbarContext';

type CropMode = Exclude<GenerationToolbarCropMode, 'canvas_overflow'>;

type UpscaleActionResponse = ImageStudioUpscaleResponse;
type CropActionResponse = ImageStudioCropResponse;
type UpscaleActionMode = 'client_data_url' | 'server_sharp';

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
  setCropStatus: (value: ImageStudioOperationStatus) => void;
  setSelectedSlotId: (slotId: string | null) => void;
  setUpscaleBusy: (value: boolean) => void;
  setUpscaleStatus: (value: ImageStudioOperationStatus) => void;
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

type UpscaleRequestPayloadResolution =
  | {
    errorMessage: null;
    payload: UpscaleRequestStrategyPayload;
  }
  | {
    errorMessage: string;
    payload: null;
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
  mode: UpscaleActionMode,
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

const normalizeProjectId = (projectId: string | null): string => projectId?.trim() ?? '';

const mergeCreatedSlotIntoSnapshot = (
  createdSlot: ImageStudioSlotRecord | null | undefined,
  slotsSnapshot: ImageStudioSlotRecord[]
): ImageStudioSlotRecord[] => {
  if (!createdSlot?.id) {
    return slotsSnapshot;
  }
  return [createdSlot, ...slotsSnapshot.filter((slot) => slot.id !== createdSlot.id)];
};

const persistMutationProjectSlots = async ({
  createdSlot,
  fetchProjectSlots,
  projectId,
  queryClient,
}: {
  createdSlot: ImageStudioSlotRecord | null | undefined;
  fetchProjectSlots: CreateGenerationToolbarActionHandlersDeps['fetchProjectSlots'];
  projectId: string | null;
  queryClient: QueryClient;
}): Promise<void> => {
  const normalizedProjectId = normalizeProjectId(projectId);
  if (!normalizedProjectId) return;
  await invalidateImageStudioSlots(queryClient, normalizedProjectId);
  const slotsSnapshot = await fetchProjectSlots(normalizedProjectId);
  patchImageStudioSlotsCache(queryClient, normalizedProjectId, (current) => ({
    ...current,
    slots: mergeCreatedSlotIntoSnapshot(createdSlot, slotsSnapshot),
  }));
};

const syncCreatedSlotSelection = ({
  createdSlot,
  setSelectedSlotId,
  setWorkingSlotId,
}: {
  createdSlot: ImageStudioSlotRecord | null | undefined;
  setSelectedSlotId: CreateGenerationToolbarActionHandlersDeps['setSelectedSlotId'];
  setWorkingSlotId: CreateGenerationToolbarActionHandlersDeps['setWorkingSlotId'];
}): void => {
  if (!createdSlot?.id) return;
  setSelectedSlotId(createdSlot.id);
  setWorkingSlotId(createdSlot.id);
};

export const resolveUpscaleRequestPayload = async ({
  resolveUpscaleSourceDimensions,
  upscaleMaxOutputSide,
  upscaleScale,
  upscaleStrategy,
  upscaleTargetHeight,
  upscaleTargetWidth,
}: Pick<
  CreateGenerationToolbarActionHandlersDeps,
  | 'resolveUpscaleSourceDimensions'
  | 'upscaleMaxOutputSide'
  | 'upscaleScale'
  | 'upscaleStrategy'
  | 'upscaleTargetHeight'
  | 'upscaleTargetWidth'
>): Promise<UpscaleRequestPayloadResolution> => {
  if (upscaleStrategy === 'scale') {
    const scale = Number(upscaleScale);
    if (!Number.isFinite(scale) || scale <= 1 || scale > 8) {
      return {
        errorMessage: 'Upscale multiplier must be greater than 1 and at most 8.',
        payload: null,
      };
    }
    return {
      errorMessage: null,
      payload: { strategy: 'scale', scale },
    };
  }

  const parsedTargetWidth = Math.floor(Number(upscaleTargetWidth));
  const parsedTargetHeight = Math.floor(Number(upscaleTargetHeight));
  if (!(parsedTargetWidth > 0 && parsedTargetHeight > 0)) {
    return {
      errorMessage: 'Enter both target width and target height as positive integers.',
      payload: null,
    };
  }
  if (parsedTargetWidth > upscaleMaxOutputSide || parsedTargetHeight > upscaleMaxOutputSide) {
    return {
      errorMessage: `Target resolution side cannot exceed ${upscaleMaxOutputSide}px.`,
      payload: null,
    };
  }

  const sourceDimensions = await resolveUpscaleSourceDimensions();
  const isWidthUpscaled = parsedTargetWidth > sourceDimensions.width;
  const isHeightUpscaled = parsedTargetHeight > sourceDimensions.height;
  if (
    parsedTargetWidth < sourceDimensions.width ||
    parsedTargetHeight < sourceDimensions.height ||
    (!isWidthUpscaled && !isHeightUpscaled)
  ) {
    return {
      errorMessage:
        'Target resolution must upscale at least one side and not reduce source dimensions.',
      payload: null,
    };
  }

  return {
    errorMessage: null,
    payload: {
      strategy: 'target_resolution',
      targetWidth: parsedTargetWidth,
      targetHeight: parsedTargetHeight,
    },
  };
};

const resolveRequestedUpscaleMode = (mode: UpscaleMode): UpscaleActionMode =>
  mode === 'client_canvas' ? 'client_data_url' : 'server_sharp';

const resolveUpscaleFallbackMessage = (error: unknown): string =>
  isClientUpscaleCrossOriginError(error)
    ? 'Client upscale was blocked by cross-origin restrictions; used server upscale instead.'
    : 'Client upscale upload payload was rejected; used server upscale instead.';

const formatUpscaleFactorLabel = (scale: number): string => `${Number(scale.toFixed(2))}x`;

const resolveUpscaleLabel = ({
  request,
  response,
}: {
  request: UpscaleRequestStrategyPayload;
  response: UpscaleActionResponse;
}): string => {
  const effectiveStrategy = response.strategy ?? request.strategy;
  if (effectiveStrategy === 'target_resolution') {
    const fallbackTargetWidth = request.strategy === 'target_resolution' ? request.targetWidth : null;
    const fallbackTargetHeight =
      request.strategy === 'target_resolution' ? request.targetHeight : null;
    return `${response.targetWidth ?? fallbackTargetWidth}x${response.targetHeight ?? fallbackTargetHeight}`;
  }
  const resolvedScale = response.scale ?? (request.strategy === 'scale' ? request.scale : 2);
  return formatUpscaleFactorLabel(resolvedScale);
};

const resolveUpscaleModeLabel = (mode: UpscaleActionMode): 'Client' | 'Server' =>
  mode === 'client_data_url' ? 'Client' : 'Server';

export const buildUpscaleSuccessToastMessage = ({
  request,
  resolvedMode,
  response,
}: {
  request: UpscaleRequestStrategyPayload;
  resolvedMode: UpscaleActionMode;
  response: UpscaleActionResponse;
}): string => {
  const effectiveMode = response.effectiveMode ?? resolvedMode;
  const createdLabel = response.slot?.name?.trim() || `Upscale ${resolveUpscaleLabel({
    request,
    response,
  })}`;
  return `Created ${createdLabel} (${resolveUpscaleModeLabel(effectiveMode)} upscale).`;
};

const postServerUpscale = async ({
  abortController,
  deps,
  mode,
  request,
  requestId,
  workingSlotId,
}: {
  abortController: AbortController;
  deps: CreateGenerationToolbarActionHandlersDeps;
  mode: UpscaleActionMode;
  request: UpscaleRequestStrategyPayload;
  requestId: string;
  workingSlotId: string;
}): Promise<UpscaleActionResponse> => {
  deps.setUpscaleStatus('processing');
  return withUpscaleRetry(
    () =>
      api
        .post<unknown>(
          `/api/image-studio/slots/${encodeURIComponent(workingSlotId)}/upscale`,
          buildUpscaleRequestBody(mode, request, requestId),
          {
            signal: abortController.signal,
            timeout: deps.upscaleRequestTimeoutMs,
            headers: { 'x-idempotency-key': requestId },
          }
        )
        .then((raw) => imageStudioUpscaleResponseSchema.parse(raw)),
    abortController.signal
  );
};

const postClientUpscale = async ({
  abortController,
  deps,
  request,
  requestId,
  sourceImageSrc,
  workingSlotId,
}: {
  abortController: AbortController;
  deps: CreateGenerationToolbarActionHandlersDeps;
  request: UpscaleRequestStrategyPayload;
  requestId: string;
  sourceImageSrc: string;
  workingSlotId: string;
}): Promise<UpscaleActionResponse> => {
  deps.setUpscaleStatus('preparing');
  const clientUpscale = await upscaleCanvasImage(
    sourceImageSrc,
    request,
    deps.upscaleSmoothingQuality
  );
  let uploadBlob: Blob;
  try {
    uploadBlob = await dataUrlToUploadBlob(clientUpscale.dataUrl);
  } catch (error) {
    logClientError(error);
    throw new Error('Failed to prepare client upscaled image for upload.');
  }

  deps.setUpscaleStatus('uploading');
  return withUpscaleRetry(() => {
    const formData = new FormData();
    formData.append('mode', 'client_data_url');
    appendUpscaleStrategyToFormData(formData, request);
    formData.append('smoothingQuality', deps.upscaleSmoothingQuality);
    formData.append('requestId', requestId);
    formData.append('image', uploadBlob, `upscale-client-${Date.now()}.png`);
    return api
      .post<unknown>(
        `/api/image-studio/slots/${encodeURIComponent(workingSlotId)}/upscale`,
        formData,
        {
          signal: abortController.signal,
          timeout: deps.upscaleRequestTimeoutMs,
          headers: { 'x-idempotency-key': requestId },
        }
      )
      .then((raw) => imageStudioUpscaleResponseSchema.parse(raw));
  }, abortController.signal);
};

const runUpscaleRequest = async ({
  abortController,
  deps,
  request,
  requestId,
  workingSlotId,
}: {
  abortController: AbortController;
  deps: CreateGenerationToolbarActionHandlersDeps;
  request: UpscaleRequestStrategyPayload;
  requestId: string;
  workingSlotId: string;
}): Promise<{
  resolvedMode: UpscaleActionMode;
  response: UpscaleActionResponse;
}> => {
  const requestedMode = resolveRequestedUpscaleMode(deps.upscaleMode);
  if (requestedMode === 'server_sharp') {
    return {
      resolvedMode: requestedMode,
      response: await postServerUpscale({
        abortController,
        deps,
        mode: requestedMode,
        request,
        requestId,
        workingSlotId,
      }),
    };
  }

  const sourceForClientUpscale = deps.clientProcessingImageSrc || deps.workingSlotImageSrc;
  if (!sourceForClientUpscale) {
    throw new Error('No client image source is available for upscale.');
  }

  try {
    return {
      resolvedMode: requestedMode,
      response: await postClientUpscale({
        abortController,
        deps,
        request,
        requestId,
        sourceImageSrc: sourceForClientUpscale,
        workingSlotId,
      }),
    };
  } catch (error) {
    logClientError(error);
    if (!shouldFallbackToServerUpscale(error)) {
      throw error;
    }
    const response = await postServerUpscale({
      abortController,
      deps,
      mode: 'server_sharp',
      request,
      requestId,
      workingSlotId,
    });
    deps.toast(resolveUpscaleFallbackMessage(error), { variant: 'info' });
    return {
      resolvedMode: 'server_sharp',
      response,
    };
  }
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

    const upscaleRequestResolution = await resolveUpscaleRequestPayload(deps);
    if (upscaleRequestResolution.errorMessage) {
      deps.toast(upscaleRequestResolution.errorMessage, { variant: 'info' });
      return;
    }
    const upscaleRequestPayload = upscaleRequestResolution.payload;
    if (!upscaleRequestPayload) {
      deps.toast('Failed to resolve upscale request.', { variant: 'error' });
      return;
    }

    deps.upscaleRequestInFlightRef.current = true;
    deps.setUpscaleBusy(true);
    deps.setUpscaleStatus('resolving');
    const upscaleRequestId = buildUpscaleRequestId();
    const abortController = new AbortController();
    deps.upscaleAbortControllerRef.current = abortController;
    try {
      const { response, resolvedMode } = await runUpscaleRequest({
        abortController,
        deps,
        request: upscaleRequestPayload,
        requestId: upscaleRequestId,
        workingSlotId,
      });

      deps.setUpscaleStatus('persisting');
      await persistMutationProjectSlots({
        createdSlot: response.slot,
        fetchProjectSlots: deps.fetchProjectSlots,
        projectId: deps.projectId,
        queryClient: deps.queryClient,
      });

      syncCreatedSlotSelection({
        createdSlot: response.slot,
        setSelectedSlotId: deps.setSelectedSlotId,
        setWorkingSlotId: deps.setWorkingSlotId,
      });

      deps.toast(
        buildUpscaleSuccessToastMessage({
          request: upscaleRequestPayload,
          resolvedMode,
          response,
        }),
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
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
          } catch (error) {
            logClientError(error);
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
          logClientError(error);
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

      deps.setCropStatus('persisting');
      await persistMutationProjectSlots({
        createdSlot: response.slot,
        fetchProjectSlots: deps.fetchProjectSlots,
        projectId: deps.projectId,
        queryClient: deps.queryClient,
      });

      syncCreatedSlotSelection({
        createdSlot: response.slot,
        setSelectedSlotId: deps.setSelectedSlotId,
        setWorkingSlotId: deps.setWorkingSlotId,
      });

      const createdLabel = response.slot?.name?.trim() || 'Cropped variant';
      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel = effectiveMode === 'client_bbox' ? 'Client' : 'Server';
      deps.toast(`Created ${createdLabel} (${modeLabel} crop).`, { variant: 'success' });
    } catch (error) {
      logClientError(error);
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
