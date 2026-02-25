/* eslint-disable */
// @ts-nocheck
'use client';

import { useCallback } from 'react';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { studioKeys } from '../../hooks/useImageStudioQueries';
import {
  buildCenterRequestId,
  layoutCanvasImageObject,
  centerCanvasImageObject,
  dataUrlToUploadBlob,
  withCenterRetry,
  isClientCenterCrossOriginError,
  isCenterAbortError,
} from './GenerationToolbarImageUtils';
import {
  imageStudioCenterRequestSchema,
  imageStudioCenterResponseSchema,
} from '../../contracts/center';
import { describeSchemaValidationIssue } from './GenerationToolbar.utils';

export function useGenerationToolbarCenter({
  workingSlot,
  workingSlotImageSrc,
  centerMode,
  clientProcessingImageSrc,
  centerRequestInFlightRef,
  setCenterBusy,
  setCenterStatus,
  centerLayoutPayload,
  centerAbortControllerRef,
  projectId,
  queryClient,
  setSelectedSlotId,
  setWorkingSlotId,
  toast,
  centerIsObjectLayoutMode,
}) {
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
    const buildValidatedCenterRequestPayload = (mode): {
      mode: any;
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
          `Center request payload is invalid (\${describeSchemaValidationIssue(validation.error.issues)}).`
        );
      }
      return validation.data;
    };
    const abortController = new AbortController();
    centerAbortControllerRef.current = abortController;
    try {
      let response;
      let resolvedMode = centerMode;
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
          const centerRequestPayload = buildValidatedCenterRequestPayload(centerMode);
          response = await withCenterRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', centerRequestPayload.mode);
              formData.append('requestId', centerRequestPayload.requestId);
              if (centerRequestPayload.layout) {
                formData.append(
                  'center',
                  JSON.stringify({
                    layout: centerRequestPayload.layout,
                  })
                );
              }
              formData.append('image', uploadBlob, `center-client-\${Date.now()}.png`);
              return api
                .post<unknown>(
                  `/api/image-studio/slots/\${encodeURIComponent(workingSlot.id)}/center`,
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
          const fallbackMode =
            centerMode === 'client_object_layout_v1'
              ? 'server_object_layout_v1'
              : 'server_alpha_bbox';
          const fallbackRequestPayload = buildValidatedCenterRequestPayload(fallbackMode);
          response = await withCenterRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/\${encodeURIComponent(workingSlot.id)}/center`,
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
          resolvedMode = fallbackMode;
          toast(
            centerMode === 'client_object_layout_v1'
              ? 'Client object layouting was blocked by cross-origin restrictions; used server layouting instead.'
              : 'Client centering was blocked by cross-origin restrictions; used server centering instead.',
            { variant: 'info' }
          );
        }
      } else {
        setCenterStatus('processing');
        const centerRequestPayload = buildValidatedCenterRequestPayload(centerMode);
        response = await withCenterRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/\${encodeURIComponent(workingSlot.id)}/center`,
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
        const responseSlot = response.slot;
        if (responseSlot) {
          const responseSlotId = responseSlot.id;
          queryClient.setQueryData(
            studioKeys.slots(normalizedProjectId),
            (old) => {
              if (!old) return old;
              return {
                ...old,
                slots: [
                  responseSlot,
                  ...(old.slots || []).filter((s) => s.id !== responseSlotId)
                ]
              };
            }
          );
        }
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      const createdLabel = response.slot?.name?.trim() || (
        centerIsObjectLayoutMode ? 'Object layout variant' : 'Centered variant'
      );
      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel =
        effectiveMode === 'client_alpha_bbox'
          ? 'Client center'
          : effectiveMode === 'server_alpha_bbox'
            ? 'Server center'
            : effectiveMode === 'client_object_layout_v1'
              ? 'Client layout'
              : 'Server layout';
      const sourceBounds = response.sourceObjectBounds ?? null;
      const targetBounds = response.targetObjectBounds ?? null;
      const centerShiftedObject = Boolean(
        sourceBounds &&
        targetBounds &&
        (
          sourceBounds.left !== targetBounds.left ||
          sourceBounds.top !== targetBounds.top ||
          sourceBounds.width !== targetBounds.width ||
          sourceBounds.height !== targetBounds.height
        )
      );
      if (centerShiftedObject) {
        toast(`Created \${createdLabel} (\${modeLabel}).`, { variant: 'success' });
      } else {
        toast(
          centerIsObjectLayoutMode
            ? `\${createdLabel} created, but the object was already well-positioned with current padding.`
            : `\${createdLabel} created, but the object was already centered in-frame.`,
          { variant: 'info' }
        );
      }
      if (centerIsObjectLayoutMode && response.detectionDetails?.fallbackApplied) {
        const reason = response.detectionDetails.policyReason ?? response.layout?.detectionPolicyDecision;
        toast(
          reason
            ? `Object layout policy fallback applied (\${reason}).`
            : 'Object layout policy fallback applied.',
          { variant: 'info' }
        );
      } else if (
        centerIsObjectLayoutMode &&
        typeof response.confidenceBefore === 'number' &&
        response.confidenceBefore < 0.35
      ) {
        toast(
          'Object layout confidence is low. Try detection override or threshold adjustments in Analysis tab.',
          { variant: 'info' }
        );
      }
    } catch (error) {
      if (isCenterAbortError(error)) {
        toast(centerIsObjectLayoutMode ? 'Object layouting canceled.' : 'Centering canceled.', { variant: 'info' });
        return;
      }
      toast(
        error instanceof Error
          ? error.message
          : centerIsObjectLayoutMode
            ? 'Failed to layout image object.'
            : 'Failed to center image object.',
        { variant: 'error' }
      );
    } finally {
      centerRequestInFlightRef.current = false;
      centerAbortControllerRef.current = null;
      setCenterBusy(false);
      setCenterStatus('idle');
    }
  }, [centerLayoutPayload, centerMode, clientProcessingImageSrc, projectId, queryClient, centerIsObjectLayoutMode, setCenterBusy, setCenterStatus, setSelectedSlotId, setWorkingSlotId, toast, workingSlot?.id, workingSlotImageSrc, centerAbortControllerRef, centerRequestInFlightRef]);

  return { handleCenterObject };
}
