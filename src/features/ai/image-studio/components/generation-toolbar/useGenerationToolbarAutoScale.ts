'use client';

import type React from 'react';
import { useCallback } from 'react';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { api } from '@/shared/lib/api-client';
import {
  invalidateImageStudioSlots,
  patchImageStudioSlotsCache,
} from '@/shared/lib/query-invalidation';

import { describeSchemaValidationIssue } from './GenerationToolbar.utils';
import {
  buildAutoScalerRequestId,
  dataUrlToUploadBlob,
  withAutoScalerRetry,
  isClientAutoScalerCrossOriginError,
  isAutoScalerAbortError,
  autoScaleCanvasImageObject,
  shouldFallbackToServerAutoScaler,
} from './GenerationToolbarImageUtils';
import {
  imageStudioAutoScalerRequestSchema,
  imageStudioAutoScalerResponseSchema,
  type ImageStudioAutoScalerMode,
} from '../../contracts/autoscaler';

import type { QueryClient } from '@tanstack/react-query';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


interface UseGenerationToolbarAutoScaleProps {
  workingSlot: ImageStudioSlotRecord | null;
  workingSlotImageSrc: string | null;
  autoScaleMode: ImageStudioAutoScalerMode;
  clientProcessingImageSrc: string | null;
  autoScaleRequestInFlightRef: React.MutableRefObject<boolean>;
  setAutoScaleBusy: (busy: boolean) => void;
  setAutoScaleStatus: (
    status: 'idle' | 'resolving' | 'preparing' | 'uploading' | 'processing' | 'persisting'
  ) => void;
  autoScaleLayoutPayload?: Record<string, unknown> | null;
  autoScaleAbortControllerRef: React.MutableRefObject<AbortController | null>;
  projectId: string;
  queryClient: QueryClient;
  setSelectedSlotId: (id: string | null) => void;
  setWorkingSlotId: (id: string | null) => void;
  toast: (
    message: string,
    options?: { variant?: 'default' | 'destructive' | 'success' | 'error' | 'info' | 'warning' }
  ) => void;
}

export function useGenerationToolbarAutoScale({
  workingSlot,
  workingSlotImageSrc,
  autoScaleMode,
  clientProcessingImageSrc,
  autoScaleRequestInFlightRef,
  setAutoScaleBusy,
  setAutoScaleStatus,
  autoScaleLayoutPayload,
  autoScaleAbortControllerRef,
  projectId,
  queryClient,
  setSelectedSlotId,
  setWorkingSlotId,
  toast,
}: UseGenerationToolbarAutoScaleProps) {
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
    const isClientAutoMode = requestedMode === 'client_auto_scaler';
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
    const buildValidatedAutoScaleRequestPayload = (
      mode: ImageStudioAutoScalerMode
    ): {
      mode: ImageStudioAutoScalerMode;
      requestId: string;
      layout?: Record<string, unknown>;
    } => {
      const validation = imageStudioAutoScalerRequestSchema.safeParse({
        mode,
        requestId: autoScaleRequestId,
        layout: autoScaleLayoutPayload,
      });
      if (!validation.success) {
        throw new Error(
          `Auto scaler request payload is invalid (${describeSchemaValidationIssue(validation.error.issues)}).`
        );
      }
      return {
        mode: validation.data.mode,
        requestId: validation.data.requestId ?? autoScaleRequestId,
        layout: validation.data.layout as Record<string, unknown> | undefined,
      };
    };
    const abortController = new AbortController();
    autoScaleAbortControllerRef.current = abortController;
    try {
      let response;
      let resolvedMode = requestedMode;
      if (isClientAutoMode) {
        const sourceForClientAutoScale = clientProcessingImageSrc || workingSlotImageSrc;
        if (!sourceForClientAutoScale) {
          throw new Error('No client image source is available for auto scaling.');
        }
        try {
          setAutoScaleStatus('preparing');
          const autoScaledDataUrl = (
            await autoScaleCanvasImageObject(sourceForClientAutoScale, autoScaleLayoutPayload)
          ).dataUrl;
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(autoScaledDataUrl);
          } catch (error) {
            logClientError(error);
            throw new Error('Failed to prepare client auto scaler output for upload.');
          }

          setAutoScaleStatus('uploading');
          const autoScaleRequestPayload = buildValidatedAutoScaleRequestPayload(requestedMode);
          response = await withAutoScalerRetry(() => {
            const formData = new FormData();
            formData.append('mode', autoScaleRequestPayload.mode);
            formData.append('requestId', autoScaleRequestPayload.requestId);
            if (autoScaleRequestPayload.layout) {
              formData.append('layout', JSON.stringify(autoScaleRequestPayload.layout));
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
          }, abortController.signal);
        } catch (error) {
          logClientError(error);
          const fallbackDueToCrossOrigin = isClientAutoScalerCrossOriginError(error);
          const fallbackDueToInvalidPayload = shouldFallbackToServerAutoScaler(error);
          if (!fallbackDueToCrossOrigin && !fallbackDueToInvalidPayload) {
            throw error;
          }
          setAutoScaleStatus('processing');
          const fallbackMode = 'server_auto_scaler';
          const fallbackRequestPayload = buildValidatedAutoScaleRequestPayload(fallbackMode);
          response = await withAutoScalerRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                  fallbackRequestPayload,
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
          resolvedMode = fallbackMode;
          toast(
            fallbackDueToCrossOrigin
              ? 'Client auto scaler was blocked by cross-origin restrictions; used server auto scaler instead.'
              : 'Client auto scaler payload was rejected; used server auto scaler instead.',
            { variant: 'info' }
          );
        }
      } else {
        setAutoScaleStatus('processing');
        const autoScaleRequestPayload = buildValidatedAutoScaleRequestPayload(requestedMode);
        response = await withAutoScalerRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                autoScaleRequestPayload,
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
        const responseSlot = response.slot;
        if (responseSlot) {
          const responseSlotId = responseSlot.id;
          patchImageStudioSlotsCache(queryClient, normalizedProjectId, (old) => {
            if (!old) return old;
            return {
              ...old,
              slots: [responseSlot, ...(old.slots || []).filter((s) => s.id !== responseSlotId)],
            };
          });
        }
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      const createdLabel = response.slot?.name?.trim() || 'Auto-scaled variant';
      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel =
        effectiveMode === 'client_auto_scaler' ? 'Client auto scaler' : 'Server auto scaler';
      const sourceBounds = response.sourceObjectBounds ?? null;
      const targetBounds = response.targetObjectBounds ?? null;
      const autoScaleShiftedObject = Boolean(
        sourceBounds &&
        targetBounds &&
        (sourceBounds.left !== targetBounds.left ||
          sourceBounds.top !== targetBounds.top ||
          sourceBounds.width !== targetBounds.width ||
          sourceBounds.height !== targetBounds.height)
      );
      if (autoScaleShiftedObject) {
        toast(`Created ${createdLabel} (${modeLabel}).`, { variant: 'success' });
      } else {
        toast(`${createdLabel} created, but the object already matched current canvas/padding.`, {
          variant: 'info',
        });
      }
      if (response.detectionDetails?.fallbackApplied) {
        const reason =
          response.detectionDetails.policyReason ?? response.layout?.detectionPolicyDecision;
        toast(
          reason
            ? `Auto scaler policy fallback applied (${reason}).`
            : 'Auto scaler policy fallback applied.',
          { variant: 'info' }
        );
      } else if (
        typeof response.confidenceBefore === 'number' &&
        response.confidenceBefore < 0.35
      ) {
        toast(
          'Auto scaler confidence is low. Run Analysis tab and tune detection mode or thresholds.',
          { variant: 'info' }
        );
      }
    } catch (error) {
      logClientError(error);
      if (isAutoScalerAbortError(error)) {
        toast('Auto scaler canceled.', { variant: 'info' });
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to auto scale image object.', {
        variant: 'error',
      });
    } finally {
      autoScaleRequestInFlightRef.current = false;
      autoScaleAbortControllerRef.current = null;
      setAutoScaleBusy(false);
      setAutoScaleStatus('idle');
    }
  }, [
    autoScaleLayoutPayload,
    autoScaleMode,
    clientProcessingImageSrc,
    projectId,
    queryClient,
    setAutoScaleBusy,
    setAutoScaleStatus,
    setSelectedSlotId,
    setWorkingSlotId,
    toast,
    workingSlot?.id,
    workingSlotImageSrc,
    autoScaleAbortControllerRef,
    autoScaleRequestInFlightRef,
  ]);

  return { handleAutoScale };
}
