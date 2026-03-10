import { useCallback } from 'react';

import {
  imageStudioCenterRequestSchema,
  imageStudioCenterResponseSchema,
  type ImageStudioCenterResponse,
  type ImageStudioCenterMode,
} from '@/features/ai/image-studio/contracts/center';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';

import {
  type GenerationToolbarState,
  type GenerationToolbarHelpers,
} from '../GenerationToolbar.types';
import {
  buildCenterRequestId,
  layoutCanvasImageObject,
  centerCanvasImageObjectWhiteBg,
  centerCanvasImageObject,
  dataUrlToUploadBlob,
  withCenterRetry,
  isCenterAbortError,
} from '../GenerationToolbarImageUtils';

export function useCenterAndScaleHandlers(
  state: GenerationToolbarState,
  helpers: GenerationToolbarHelpers
) {
  const {
    workingSlot,
    projectId,
    toast,
    queryClient,
    centerMode,
    centerLayoutPayload,
    centerLayoutWhiteThresholdValue,
    setCenterBusy,
    setCenterStatus,
    setWorkingSlotId,
    setSelectedSlotId,
    workingSlotImageSrc,
    clientProcessingImageSrc,
    centerAbortControllerRef,
    centerRequestInFlightRef,
  } = state;

  const { fetchProjectSlots, describeSchemaValidationIssue } = helpers;

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
      centerMode === 'client_alpha_bbox' ||
      centerMode === 'client_object_layout' ||
      centerMode === 'client_white_bg_bbox';

    if (isClientCenterMode && !clientProcessingImageSrc) {
      toast('No client image source is available for centering/layouting.', { variant: 'info' });
      return;
    }
    if (centerRequestInFlightRef.current) return;

    centerRequestInFlightRef.current = true;
    setCenterBusy(true);
    setCenterStatus('resolving');
    const centerRequestId = buildCenterRequestId();

    const buildValidatedCenterRequestPayload = (mode: ImageStudioCenterMode) => {
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
      return validation.data;
    };

    const abortController = new AbortController();
    centerAbortControllerRef.current = abortController;

    try {
      let response: ImageStudioCenterResponse;
      if (isClientCenterMode) {
        const sourceForClientCenter = clientProcessingImageSrc || workingSlotImageSrc;
        setCenterStatus('preparing');
        const centeredDataUrl =
          centerMode === 'client_object_layout'
            ? (await layoutCanvasImageObject(sourceForClientCenter, centerLayoutPayload)).dataUrl
            : centerMode === 'client_white_bg_bbox'
              ? await centerCanvasImageObjectWhiteBg(
                sourceForClientCenter,
                centerLayoutWhiteThresholdValue
              )
              : await centerCanvasImageObject(sourceForClientCenter);

        const uploadBlob = await dataUrlToUploadBlob(centeredDataUrl);
        setCenterStatus('uploading');

        response = await withCenterRetry(() => {
          const formData = new FormData();
          formData.append('mode', centerMode);
          formData.append('requestId', centerRequestId);
          if (centerLayoutPayload) {
            formData.append('center', JSON.stringify({ layout: centerLayoutPayload }));
          }
          formData.append('image', uploadBlob, `center-client-${Date.now()}.png`);
          return api
            .post<unknown>(
              `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
              formData,
              {
                signal: abortController.signal,
                timeout: 60000,
                headers: { 'x-idempotency-key': centerRequestId },
              }
            )
            .then((raw) => imageStudioCenterResponseSchema.parse(raw));
        }, abortController.signal);
      } else {
        setCenterStatus('processing');
        const payload = buildValidatedCenterRequestPayload(centerMode as ImageStudioCenterMode);
        response = await withCenterRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                payload,
                {
                  signal: abortController.signal,
                  timeout: 60000,
                  headers: { 'x-idempotency-key': centerRequestId },
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
        await fetchProjectSlots(normalizedProjectId);
      }

      setWorkingSlotId(response.slot.id);
      setSelectedSlotId(response.slot.id);
      toast('Centering/Layouting completed.', { variant: 'success' });
    } catch (error) {
      if (isCenterAbortError(error)) {
        toast('Centering canceled.', { variant: 'info' });
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to center image object.', {
        variant: 'error',
      });
    } finally {
      centerRequestInFlightRef.current = false;
      centerAbortControllerRef.current = null;
      setCenterBusy(false);
      setCenterStatus('idle');
    }
  }, [
    centerLayoutPayload,
    centerLayoutWhiteThresholdValue,
    centerMode,
    clientProcessingImageSrc,
    fetchProjectSlots,
    projectId,
    queryClient,
    setCenterBusy,
    setCenterStatus,
    setSelectedSlotId,
    setWorkingSlotId,
    toast,
    workingSlot?.id,
    workingSlotImageSrc,
    centerAbortControllerRef,
    centerRequestInFlightRef,
    describeSchemaValidationIssue,
  ]);

  const handleCancelCenter = useCallback((): void => {
    centerAbortControllerRef.current?.abort();
  }, [centerAbortControllerRef]);

  return {
    handleCenterObject,
    handleCancelCenter,
  };
}
