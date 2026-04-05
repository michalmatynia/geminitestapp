'use client';

import { useCallback } from 'react';

import type { ImageStudioAssetDto as ImageStudioUploadedAsset } from '@/shared/contracts/image-studio/image-studio/misc';
import type { StudioSlotsResponse } from '@/shared/contracts/image-studio/image-studio/slot';
import type { ImageStudioSlotDto as ImageStudioSlot } from '@/shared/contracts/image-studio';
import { imageStudioSlotResponseSchema } from '@/shared/contracts/image-studio/image-studio/slot';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';

import {
  OBJECT_SLOT_INDEX,
  slotHasRenderableImage,
  resolveSlotIdCandidates,
} from './single-slot-manager-utils';
import { studioKeys } from '../../hooks/useImageStudioQueries';

import type { QueryClient } from '@tanstack/react-query';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


interface SlotImageDisconnectProps {
  lastConsumedTemporaryUploadIdRef: React.MutableRefObject<string | null>;
  lastConsumedSlotIdRef: React.MutableRefObject<string | null>;
  clearObjectDraftSyncTimeouts: () => void;
  setUploadError: (error: string | null) => void;
  temporaryObjectUpload: ImageStudioUploadedAsset | null;
  objectSlot: ImageStudioSlot | null;
  deleteUploadedAsset: (asset: ImageStudioUploadedAsset) => Promise<void>;
  setTemporaryObjectUpload: (asset: ImageStudioUploadedAsset | null) => void;
  projectId: string;
  queryClient: QueryClient;
  setSelectedSlotId: (id: string | null) => void;
  setObjectImageLinkDraft: (link: string) => void;
  setObjectImageBase64Draft: (base64: string) => void;
  suppressNextDraftPersistenceOpsRef: React.MutableRefObject<number>;
}

export function useSlotImageDisconnect({
  lastConsumedTemporaryUploadIdRef,
  lastConsumedSlotIdRef,
  clearObjectDraftSyncTimeouts,
  setUploadError,
  temporaryObjectUpload,
  objectSlot,
  deleteUploadedAsset,
  setTemporaryObjectUpload,
  projectId,
  queryClient,
  setSelectedSlotId,
  setObjectImageLinkDraft,
  setObjectImageBase64Draft,
  suppressNextDraftPersistenceOpsRef,
}: SlotImageDisconnectProps) {
  const handleSlotDisconnectImage = useCallback(
    async (index: number): Promise<void> => {
      if (index !== OBJECT_SLOT_INDEX) return;
      lastConsumedTemporaryUploadIdRef.current = null;
      lastConsumedSlotIdRef.current = null;
      clearObjectDraftSyncTimeouts();
      setUploadError(null);
      const previousTemporaryUpload = temporaryObjectUpload;
      const selectedSlotImageLocked = Boolean(
        objectSlot && !previousTemporaryUpload && slotHasRenderableImage(objectSlot)
      );
      try {
        let clearedCardImage = false;
        if (!previousTemporaryUpload && selectedSlotImageLocked) {
          throw new Error('Card image is locked and can only be removed by deleting the card.');
        }

        if (previousTemporaryUpload) {
          await deleteUploadedAsset(previousTemporaryUpload).catch(() => {
            // Best effort cleanup.
          });
          setTemporaryObjectUpload(null);
        }

        if (objectSlot && !previousTemporaryUpload) {
          const clearPayload = {
            imageFileId: null,
            imageUrl: null,
            imageBase64: null,
          } as const;
          const slotIdCandidates = resolveSlotIdCandidates(objectSlot.id);
          let patchedSlot: ImageStudioSlot | null = null;

          if (projectId.trim() && slotIdCandidates.length > 0) {
            const candidateSet = new Set(slotIdCandidates);
            queryClient.setQueryData<StudioSlotsResponse>(
              studioKeys.slots(projectId),
              (current) => {
                if (!current) return current;
                return {
                  ...current,
                  slots: current.slots.map((slot: ImageStudioSlot) => {
                    if (!candidateSet.has(slot.id)) return slot;
                    return {
                      ...slot,
                      imageFileId: null,
                      imageUrl: null,
                      imageBase64: null,
                      imageFile: null,
                    };
                  }),
                };
              }
            );
          }

          const patchBySlotId = async (slotId: string): Promise<ImageStudioSlot | null> => {
            if (!slotId) return null;
            try {
              const response = imageStudioSlotResponseSchema.parse(
                await api.patch<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(slotId)}`,
                  clearPayload
                )
              );
              return response.slot ?? null;
            } catch (error) {
              logClientError(error);
              return null;
            }
          };

          for (const candidate of slotIdCandidates) {
            const nextPatchedSlot = await patchBySlotId(candidate);
            if (nextPatchedSlot) {
              patchedSlot = nextPatchedSlot;
              break;
            }
          }

          if (!patchedSlot && objectSlot.id) {
            patchedSlot = await patchBySlotId(objectSlot.id);
          }

          if (!patchedSlot) {
            throw new Error('Failed to clear slot image');
          }

          const followupCandidateIds = new Set([
            ...slotIdCandidates,
            ...resolveSlotIdCandidates(patchedSlot.id),
            objectSlot.id,
          ]);
          await Promise.all(
            Array.from(followupCandidateIds)
              .filter(
                (candidate): candidate is string =>
                  Boolean(candidate) && candidate !== patchedSlot?.id
              )
              .map((candidate) => patchBySlotId(candidate).catch(() => null))
          );

          if (projectId.trim()) {
            const candidateSet = new Set(followupCandidateIds);
            queryClient.setQueryData<StudioSlotsResponse>(
              studioKeys.slots(projectId),
              (current) => {
                if (!current) return current;
                return {
                  ...current,
                  slots: current.slots.map((slot: ImageStudioSlot) => {
                    if (!candidateSet.has(slot.id)) return slot;
                    return {
                      ...slot,
                      imageFileId: null,
                      imageUrl: null,
                      imageBase64: null,
                      imageFile: null,
                    };
                  }),
                };
              }
            );
          }
          clearedCardImage = true;
        } else if (!objectSlot && previousTemporaryUpload) {
          setSelectedSlotId(null);
        } else if (!objectSlot) {
          return;
        }

        if (clearedCardImage || !objectSlot) {
          setObjectImageLinkDraft('');
          setObjectImageBase64Draft('');
          suppressNextDraftPersistenceOpsRef.current = 2;
        } else {
          setObjectImageLinkDraft(objectSlot.imageUrl ?? objectSlot.imageFile?.url ?? '');
          setObjectImageBase64Draft(objectSlot.imageBase64 ?? '');
        }
        if (projectId.trim()) {
          await invalidateImageStudioSlots(queryClient, projectId);
        }
      } catch (error) {
        logClientError(error);
        setUploadError(error instanceof Error ? error.message : 'Failed to remove image');
        throw error;
      }
    },
    [
      lastConsumedTemporaryUploadIdRef,
      lastConsumedSlotIdRef,
      clearObjectDraftSyncTimeouts,
      setUploadError,
      temporaryObjectUpload,
      objectSlot,
      deleteUploadedAsset,
      setTemporaryObjectUpload,
      projectId,
      queryClient,
      setSelectedSlotId,
      setObjectImageLinkDraft,
      setObjectImageBase64Draft,
      suppressNextDraftPersistenceOpsRef,
    ]
  );

  return {
    handleSlotDisconnectImage,
  };
}
