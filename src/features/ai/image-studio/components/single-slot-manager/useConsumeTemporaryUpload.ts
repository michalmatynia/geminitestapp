/* eslint-disable */
// @ts-nocheck
'use client';

import { useCallback, useRef } from 'react';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { studioKeys } from '../../hooks/useImageStudioQueries';
import { 
  slotHasRenderableImage, 
  resolveSlotIdCandidates, 
  REVEAL_IN_TREE_EVENT 
} from './single-slot-manager-utils';
import { 
  isImageStudioSlotImageLocked, 
  setImageStudioSlotImageLocked 
} from '../../utils/slot-image-lock';

export function useConsumeTemporaryUpload({
  temporaryObjectUpload,
  projectId,
  objectSlot,
  queryClient,
  updateSlotMutation,
  setTemporaryObjectUpload,
  setSelectedSlotId,
  setWorkingSlotId,
  setPreviewMode,
  getFolderForNewSlot,
  setUploadError,
}) {
  const consumeTemporaryUploadInFlightRef = useRef(null);
  const consumeTemporaryUploadInFlightIdRef = useRef(null);
  const lastConsumedTemporaryUploadIdRef = useRef(null);
  const lastConsumedSlotIdRef = useRef(null);

  const consumeTemporaryObjectUpload = useCallback(
    async (options) => {
      if (!temporaryObjectUpload) return false;
      const temporaryUploadSnapshot = temporaryObjectUpload;
      const currentTemporaryUploadId = temporaryUploadSnapshot.id.trim();
      const normalizedTemporaryFilepath = temporaryUploadSnapshot.filepath.trim();
      if (!currentTemporaryUploadId && !normalizedTemporaryFilepath) return false;
      void options;

      if (
        currentTemporaryUploadId &&
        lastConsumedTemporaryUploadIdRef.current === currentTemporaryUploadId &&
        lastConsumedSlotIdRef.current
      ) {
        const lastConsumedSlotId = lastConsumedSlotIdRef.current;
        setTemporaryObjectUpload(null);
        setSelectedSlotId(lastConsumedSlotId);
        setWorkingSlotId(lastConsumedSlotId);
        setPreviewMode('image');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: lastConsumedSlotId } }));
        }
        return true;
      }

      if (
        consumeTemporaryUploadInFlightRef.current &&
        consumeTemporaryUploadInFlightIdRef.current === (currentTemporaryUploadId || normalizedTemporaryFilepath)
      ) {
        return consumeTemporaryUploadInFlightRef.current;
      }

      const consumePromise = (async () => {
        setUploadError(null);
        try {
          const normalizedProjectId = projectId.trim();
          if (!normalizedProjectId) {
            throw new Error('Select a project first.');
          }
          const selectedSlotIdBeforeEnsure = objectSlot?.id?.trim() ?? '';
          const selectedSlotWasEmpty = Boolean(
            selectedSlotIdBeforeEnsure && !slotHasRenderableImage(objectSlot)
          );
          const selectedSlotCandidateSet = new Set(
            resolveSlotIdCandidates(selectedSlotIdBeforeEnsure)
          );

          const findMatchingSlot = (slotsToScan) => {
            const matches = slotsToScan.filter((slot) => {
              const slotImageFileId = slot.imageFileId?.trim() ?? '';
              if (currentTemporaryUploadId && slotImageFileId === currentTemporaryUploadId) return true;
              if (!normalizedTemporaryFilepath) return false;
              const slotPath = (slot.imageFile?.url ?? slot.imageUrl ?? '').trim();
              return slotPath === normalizedTemporaryFilepath;
            });
            return matches[0] ?? null;
          };

          const resolveFallbackSlot = async () => {
            await invalidateImageStudioSlots(queryClient, normalizedProjectId);
            const refreshed = queryClient.getQueryData(studioKeys.slots(normalizedProjectId));
            const refreshedSlots = refreshed?.slots ?? [];
            const existingMatch = findMatchingSlot(refreshedSlots);
            if (existingMatch) {
              if (slotHasRenderableImage(existingMatch)) return existingMatch;
              const patchedExisting = await updateSlotMutation.mutateAsync({
                id: existingMatch.id,
                data: {
                  ...(currentTemporaryUploadId ? { imageFileId: currentTemporaryUploadId } : {}),
                  ...(normalizedTemporaryFilepath ? { imageUrl: normalizedTemporaryFilepath } : {}),
                  imageBase64: null,
                },
              });
              return patchedExisting;
            }

            if (objectSlot?.id && !slotHasRenderableImage(objectSlot)) {
              const patchedSelected = await updateSlotMutation.mutateAsync({
                id: objectSlot.id,
                data: {
                  ...(currentTemporaryUploadId ? { imageFileId: currentTemporaryUploadId } : {}),
                  ...(normalizedTemporaryFilepath ? { imageUrl: normalizedTemporaryFilepath } : {}),
                  imageBase64: null,
                },
              });
              return patchedSelected;
            }

            const created = await api.post(
              `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots`,
              {
                slots: [
                  {
                    name: temporaryUploadSnapshot.filename?.trim() || `Card ${Date.now()}`,
                    ...(getFolderForNewSlot() ? { folderPath: getFolderForNewSlot() } : {}),
                    ...(currentTemporaryUploadId ? { imageFileId: currentTemporaryUploadId } : {}),
                    ...(normalizedTemporaryFilepath ? { imageUrl: normalizedTemporaryFilepath } : {}),
                    imageBase64: null,
                  },
                ],
              }
            );
            return created.slots[0] ?? null;
          };

          let ensuredSlot = null;
          try {
            const ensured = await api.post(
              `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots/ensure-from-upload`,
              {
                uploadId: currentTemporaryUploadId || null,
                filepath: normalizedTemporaryFilepath || null,
                filename: temporaryUploadSnapshot.filename?.trim() || null,
                folderPath: getFolderForNewSlot() || null,
                selectedSlotId: objectSlot?.id ?? null,
              }
            );
            ensuredSlot = ensured.slot ?? null;
          } catch {
            ensuredSlot = await resolveFallbackSlot();
          }
          if (!ensuredSlot?.id) {
            ensuredSlot = await resolveFallbackSlot();
          }
          const targetSlotId = ensuredSlot?.id?.trim() ?? '';
          if (!targetSlotId) {
            throw new Error('Failed to create or resolve card from temporary upload');
          }

          if (
            selectedSlotWasEmpty &&
            selectedSlotCandidateSet.has(targetSlotId) &&
            !isImageStudioSlotImageLocked(ensuredSlot)
          ) {
            try {
              ensuredSlot = await updateSlotMutation.mutateAsync({
                id: targetSlotId,
                data: {
                  metadata: setImageStudioSlotImageLocked(
                    ensuredSlot?.metadata ?? objectSlot?.metadata ?? null,
                    true
                  ),
                },
              });
            } catch {
              // Non-blocking
            }
          }

          queryClient.setQueryData(
            studioKeys.slots(normalizedProjectId),
            (current) => {
              if (!current || !Array.isArray(current.slots)) {
                return { slots: ensuredSlot ? [ensuredSlot] : [] };
              }
              if (!ensuredSlot) return current;
              const existingIndex = current.slots.findIndex(
                (slot) => slot.id === ensuredSlot.id
              );
              if (existingIndex < 0) {
                return {
                  ...current,
                  slots: [...current.slots, ensuredSlot],
                };
              }
              const nextSlots = [...current.slots];
              nextSlots[existingIndex] = ensuredSlot;
              return {
                ...current,
                slots: nextSlots,
              };
            }
          );

          setTemporaryObjectUpload(null);
          setSelectedSlotId(targetSlotId);
          setWorkingSlotId(targetSlotId);
          setPreviewMode('image');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: targetSlotId } }));
          }

          if (currentTemporaryUploadId) {
            lastConsumedTemporaryUploadIdRef.current = currentTemporaryUploadId;
            lastConsumedSlotIdRef.current = targetSlotId;
          }
          void invalidateImageStudioSlots(queryClient, normalizedProjectId);
          return true;
        } catch (error) {
          setTemporaryObjectUpload((current) => current ?? temporaryUploadSnapshot);
          setUploadError(error instanceof Error ? error.message : 'Failed to create card from temporary upload');
          return false;
        }
      })();

      consumeTemporaryUploadInFlightRef.current = consumePromise;
      consumeTemporaryUploadInFlightIdRef.current = currentTemporaryUploadId || normalizedTemporaryFilepath;

      try {
        return await consumePromise;
      } finally {
        if (consumeTemporaryUploadInFlightRef.current === consumePromise) {
          consumeTemporaryUploadInFlightRef.current = null;
          consumeTemporaryUploadInFlightIdRef.current = null;
        }
      }
    },
    [
      getFolderForNewSlot,
      objectSlot,
      projectId,
      queryClient,
      setPreviewMode,
      setSelectedSlotId,
      setTemporaryObjectUpload,
      setWorkingSlotId,
      temporaryObjectUpload,
      updateSlotMutation,
    ]
  );

  return {
    consumeTemporaryObjectUpload,
    lastConsumedTemporaryUploadIdRef,
    lastConsumedSlotIdRef,
  };
}
