/* eslint-disable */
// @ts-nocheck
'use client';

import { useCallback } from 'react';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { studioKeys } from '../../hooks/useImageStudioQueries';
import { 
  OBJECT_SLOT_INDEX, 
  slotHasRenderableImage, 
  resolveSlotIdCandidates 
} from './single-slot-manager-utils';

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
}) {
  const handleSlotDisconnectImage = useCallback(
    async (index) => {
      if (index !== OBJECT_SLOT_INDEX) return;
      lastConsumedTemporaryUploadIdRef.current = null;
      lastConsumedSlotIdRef.current = null;
      clearObjectDraftSyncTimeouts();
      setUploadError(null);
      const previousTemporaryUpload = temporaryObjectUpload;
      const selectedSlotImageLocked = Boolean(
        objectSlot &&
        !previousTemporaryUpload &&
        slotHasRenderableImage(objectSlot)
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
          let patchedSlot = null;

          if (projectId.trim() && slotIdCandidates.length > 0) {
            const candidateSet = new Set(slotIdCandidates);
            queryClient.setQueryData(
              studioKeys.slots(projectId),
              (current) => {
                if (!current) return current;
                return {
                  ...current,
                  slots: current.slots.map((slot) => {
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

          const patchBySlotId = async (slotId) => {
            if (!slotId) return null;
            try {
              const response = await api.patch(
                `/api/image-studio/slots/${encodeURIComponent(slotId)}`,
                clearPayload
              );
              return response.slot ?? null;
            } catch {
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
              .filter((candidate) => candidate && candidate !== patchedSlot?.id)
              .map((candidate) =>
                patchBySlotId(candidate).catch(() => null)
              )
          );

          if (projectId.trim()) {
            const candidateSet = new Set(followupCandidateIds);
            queryClient.setQueryData(
              studioKeys.slots(projectId),
              (current) => {
                if (!current) return current;
                return {
                  ...current,
                  slots: current.slots.map((slot) => {
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
