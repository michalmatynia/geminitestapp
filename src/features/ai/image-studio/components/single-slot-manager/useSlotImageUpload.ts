/* eslint-disable */
// @ts-nocheck
'use client';

import { useCallback } from 'react';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { 
  OBJECT_SLOT_INDEX, 
  resolveSlotIdCandidates, 
  REVEAL_IN_TREE_EVENT 
} from './single-slot-manager-utils';

export function useSlotImageUpload({
  projectId,
  temporaryObjectUpload,
  uploadMutation,
  getFolderForNewSlot,
  objectSlot,
  updateSlotMutation,
  setTemporaryObjectUpload,
  setSelectedSlotId,
  setObjectImageLinkDraft,
  setObjectImageBase64Draft,
  deleteUploadedAsset,
  queryClient,
  setUploadError,
  lastConsumedTemporaryUploadIdRef,
  lastConsumedSlotIdRef,
}) {
  const handleSlotImageChange = useCallback(
    async (file, index) => {
      if (!file || index !== OBJECT_SLOT_INDEX) return;
      const normalizedProjectId = projectId.trim();
      if (!normalizedProjectId) {
        setUploadError('Select a project first.');
        return;
      }
      setUploadError(null);
      try {
        const previousTemp = temporaryObjectUpload;
        const result = await uploadMutation.mutateAsync({
          files: [file],
          folder: getFolderForNewSlot(),
        });
        const uploaded = result.uploaded?.[0] ?? null;
        if (!uploaded) {
          throw new Error(result.failures?.[0]?.error || 'Upload failed');
        }

        lastConsumedTemporaryUploadIdRef.current = null;
        lastConsumedSlotIdRef.current = null;
        const selectedSlotId = objectSlot?.id?.trim() ?? '';
        if (selectedSlotId) {
          const updatePayload = {
            imageFileId: uploaded.id,
            imageUrl: uploaded.filepath,
            imageBase64: null,
          } as const;
          const slotIdCandidates = resolveSlotIdCandidates(selectedSlotId);
          let updatedSlot = null;
          let updateError = null;
          for (const candidate of slotIdCandidates) {
            try {
              updatedSlot = await updateSlotMutation.mutateAsync({
                id: candidate,
                data: updatePayload,
              });
              if (updatedSlot) break;
            } catch (error) {
              updateError = error;
            }
          }
          if (!updatedSlot) {
            throw (updateError instanceof Error
              ? updateError
              : new Error('Failed to attach image to selected card.'));
          }

          setTemporaryObjectUpload(null);
          setSelectedSlotId(updatedSlot.id);
          setObjectImageLinkDraft(uploaded.filepath);
          setObjectImageBase64Draft('');
          if (previousTemp && previousTemp.id !== uploaded.id) {
            await deleteUploadedAsset(previousTemp).catch(() => {
              // Best effort cleanup.
            });
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: updatedSlot.id } }));
          }
          void invalidateImageStudioSlots(queryClient, normalizedProjectId);
          return;
        }

        const createdSlots = await createSlots([
          {
            name: uploaded.filename?.trim() || `Card \${Date.now()}`,
            ...(getFolderForNewSlot() ? { folderPath: getFolderForNewSlot() } : {}),
            imageFileId: uploaded.id,
            imageUrl: uploaded.filepath,
            imageBase64: null,
          },
        ]);
        const createdSlot = createdSlots[0] ?? null;
        if (!createdSlot?.id) {
          throw new Error('Failed to create card from uploaded image.');
        }

        setTemporaryObjectUpload(null);
        setSelectedSlotId(createdSlot.id);
        setObjectImageLinkDraft(uploaded.filepath);
        setObjectImageBase64Draft('');
        if (previousTemp && previousTemp.id !== uploaded.id) {
          await deleteUploadedAsset(previousTemp).catch(() => {
            // Best effort cleanup.
          });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: createdSlot.id } }));
        }
        void invalidateImageStudioSlots(queryClient, normalizedProjectId);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
      }
    },
    [
      projectId,
      setUploadError,
      temporaryObjectUpload,
      uploadMutation,
      getFolderForNewSlot,
      lastConsumedTemporaryUploadIdRef,
      lastConsumedSlotIdRef,
      objectSlot?.id,
      setTemporaryObjectUpload,
      setSelectedSlotId,
      setObjectImageLinkDraft,
      setObjectImageBase64Draft,
      deleteUploadedAsset,
      updateSlotMutation,
      queryClient,
    ]
  );

  return {
    handleSlotImageChange,
  };
}
